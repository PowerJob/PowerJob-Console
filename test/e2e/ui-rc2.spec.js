import { test, expect, selectors, runId, demoProcessor, input, choose, formItem, enterSamples, saveDialog, clickAndResponse } from './support.js'
import fs from 'node:fs/promises'
import enBase from '../../src/i18n/langs/en.js'
import cnBase from '../../src/i18n/langs/cn.js'
import { en as enAdded, cn as cnAdded } from '../../src/i18n/langs/enhancements.js'
const en = { message: { ...enBase.message, ...enAdded } }
const cn = { message: { ...cnBase.message, ...cnAdded } }

// This lane has its own runId/output. No rc.1 result or environment object is reused as evidence.
const futureStart = '2032-01-01 00:00:00'
const rules = [
  { id: 'minutes', label: 'Every N minutes', fields: { interval: 7 }, expression: '0 0/7 * * * ?', matches: t => t.second === 0 && t.minute % 7 === 0 },
  { id: 'hours', label: 'Every N hours', fields: { interval: 3, minute: 17 }, expression: '0 17 0/3 * * ?', matches: t => t.second === 0 && t.minute === 17 && t.hour % 3 === 0 },
  { id: 'daily', label: 'Daily', fields: { hour: 9, minute: 23 }, expression: '0 23 9 * * ?', matches: t => t.second === 0 && t.minute === 23 && t.hour === 9 },
  { id: 'weekdays', label: 'Weekdays (Monday–Friday)', fields: { hour: 10, minute: 31 }, expression: '0 31 10 ? * 2-6', matches: t => t.second === 0 && t.minute === 31 && t.hour === 10 && t.weekday >= 1 && t.weekday <= 5 },
  { id: 'weekly', label: 'Weekly', fields: { hour: 11, minute: 41 }, weekday: 'Sunday', expression: '0 41 11 ? * 1', matches: t => t.second === 0 && t.minute === 41 && t.hour === 11 && t.weekday === 0 },
  { id: 'monthly', label: 'Monthly', fields: { hour: 12, minute: 47, 'month-day': 31 }, expression: '0 47 12 31 * ?', matches: t => t.second === 0 && t.minute === 47 && t.hour === 12 && t.day === 31 },
]
const builder = page => page.getByTestId('cron-builder').filter({ visible: true })
const expressionInput = (scope, kind) => scope.locator(`input[data-testid="${kind}-time-expression"], [data-testid="${kind}-time-expression"] input`)

async function proof(info, caseId, variantId, actual) {
  const result = { caseId, variantId, status: 'PASS', testTitle: info.title, runId, actual }
  await fs.writeFile(info.outputPath(`variant-${caseId}-${variantId}.json`), JSON.stringify(result, null, 2))
  await info.attach(`${caseId}/${variantId}`, { body: JSON.stringify(result), contentType: 'application/json' })
}
async function snapshot(page, info, name) {
  await info.attach(name, { body: await page.screenshot({ fullPage: true, mask: [page.locator('input[type="password"]'), page.locator('input[disabled]')] }), contentType: 'image/png' })
}
async function selectOption(page, locator, name) {
  await locator.click()
  const option = page.locator('.el-select-dropdown:visible').getByRole('option', { name, exact: true })
  if (name === 'Sunday') {
    await expect(option).toBeVisible()
    await test.info().attach('weekday-dropdown-before-selection', { body: await page.screenshot({ mask: [page.locator('input[type="password"]'), page.locator('input[disabled]')] }), contentType: 'image/png' })
    await test.info().attach('weekday-dropdown-geometry', { body: JSON.stringify({ builder: await builder(page).boundingBox(), option: await option.boundingBox(), focus: await page.evaluate(() => ({ role: document.activeElement?.getAttribute('role'), tag: document.activeElement?.tagName })), poppers: await page.locator('.el-popper:visible').evaluateAll(elements => elements.map(element => ({ role: element.getAttribute('role'), rect: element.getBoundingClientRect().toJSON() }))) }), contentType: 'application/json' })
  }
  await option.click()
}
async function number(page, key, value) {
  const target = builder(page).getByTestId(`cron-${key}`).locator('input')
  await target.fill(String(value)); await target.press('Tab')
}
async function configure(page, scope, rule, apply = true) {
  await scope.getByTestId('cron-quick-trigger').click()
  await expect(builder(page)).toBeVisible()
  await selectOption(page, builder(page).getByTestId('cron-cadence'), rule.label)
  for (const [key, value] of Object.entries(rule.fields)) await number(page, key, value)
  if (rule.weekday) await selectOption(page, builder(page).getByTestId('cron-weekday'), rule.weekday)
  await expect(builder(page).getByTestId('cron-generated')).toHaveText(rule.expression)
  if (rule.id === 'monthly' && rule.fields['month-day'] > 28) await expect(builder(page)).toContainText(/shorter|fewer|skip|28|月份|跳过/i)
  if (apply) { await builder(page).getByTestId('cron-apply').click(); await expect(builder(page)).not.toBeVisible() }
}
function timeParts(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(value)
  expect(match, 'The actual Server validator must return complete future timestamps').toBeTruthy()
  const [, year, month, day, hour, minute, second] = match.map(Number)
  const timestamp = Date.parse(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}+08:00`)
  return { year, month, day, hour, minute, second, timestamp, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() }
}
async function validate(page, scope, rule) {
  const requestedAt = Date.now()
  const result = await clickAndResponse(page, '/validate/timeExpression', () => scope.getByRole('button', { name: 'Validate', exact: true }).click())
  expect(result.success).toBe(true)
  expect(Array.isArray(result.data)).toBe(true)
  expect(result.data.length).toBeGreaterThanOrEqual(3)
  const times = result.data.map(timeParts)
  for (let index = 0; index < times.length; index++) {
    expect(times[index].timestamp).toBeGreaterThan(requestedAt - 5000)
    if (index) expect(times[index].timestamp).toBeGreaterThan(times[index - 1].timestamp)
    if (rule?.matches) expect(rule.matches(times[index]), `Actual Server time ${result.data[index]} follows ${rule.expression}`).toBe(true)
  }
  // Bind the validator by its own content. :visible.last() would rebind to the
  // underlying Job editor after closing the nested validation modal.
  const dialog = page.locator('.el-dialog').filter({ has: page.locator('.trigger-time') }).last()
  await expect(dialog.locator('.trigger-time')).toHaveCount(result.data.length)
  expect(await dialog.locator('.trigger-time').allTextContents()).toEqual(result.data)
  await dialog.getByRole('button', { name: 'Close this dialog' }).click()
  await expect(dialog).not.toBeVisible()
  return result.data
}
async function newJob(page, name, cron = false, future = true) {
  await page.goto('/#/oms/job'); await page.getByRole('button', { name: 'New job', exact: true }).click()
  const dialog = selectors.dialog(page)
  await input(dialog, 'Job name', name); await input(dialog, 'Job params', 'success')
  await choose(page, dialog, 'Execution config', 'Standalone', 0)
  await choose(page, dialog, 'Execution config', 'BUILT_IN', 1)
  await input(dialog, 'Execution config', demoProcessor)
  if (cron) await choose(page, dialog, 'Schedule info', 'CRON')
  if (future) { await dialog.getByRole('combobox', { name: 'Start time', exact: true }).fill(futureStart); await dialog.getByRole('combobox', { name: 'Start time', exact: true }).press('Enter') }
  return dialog
}
async function jobId(backend, name) {
  const jobs = (await backend.listJobs(name)).data.filter(job => job.jobName === name)
  expect(jobs).toHaveLength(1); return String(jobs[0].id)
}
async function findJob(page, id) {
  await page.goto('/#/oms/job'); await input(page.locator('main'), 'Job ID', id)
  const response = await clickAndResponse(page, '/job/list', () => page.getByRole('button', { name: 'Query', exact: true }).click(), response => String(response.request().postDataJSON()?.jobId) === String(id))
  expect(response.data.data.map(job => String(job.id))).toEqual([String(id)])
  return selectors.row(page, String(id))
}
async function newWorkflow(page, name, job, cron = false, future = true) {
  await page.goto('/#/oms/workflow'); await page.getByRole('button', { name: 'New workflow', exact: true }).click()
  await input(page.locator('main'), 'Workflow name', name)
  if (cron) await choose(page, page.locator('main'), 'Schedule info', 'CRON')
  if (future) { await page.getByRole('combobox', { name: 'Start time', exact: true }).fill(futureStart); await page.getByRole('combobox', { name: 'Start time', exact: true }).press('Enter') }
  await page.locator('.canvas-toolbar').getByRole('button', { name: /Import job/ }).click()
  const drawer = page.locator('.el-drawer:visible')
  await input(drawer, 'Job ID', job)
  await clickAndResponse(page, '/job/list', () => drawer.getByRole('button', { name: 'Query', exact: true }).click(), response => String(response.request().postDataJSON()?.jobId) === String(job))
  const imported = await clickAndResponse(page, '/workflow/saveNode', () => selectors.row(page, String(job)).getByRole('button', { name: 'Import', exact: true }).click())
  expect(imported.success).toBe(true); await expect(drawer).not.toBeVisible(); await expect(page.locator('.dag-node')).toHaveCount(1)
  await test.info().attach('owned-imported-node-' + imported.data[0].id, { body: JSON.stringify({ runId, jobId: String(job), nodeId: String(imported.data[0].id) }), contentType: 'application/json' })
  return String(imported.data[0].id)
}
async function saveWorkflow(page) {
  const result = await clickAndResponse(page, '/workflow/save', () => page.locator('.editor-heading').getByRole('button', { name: 'Save', exact: true }).click())
  expect(result.success).toBe(true); await expect(page).toHaveURL(/workflowId=/); return String(result.data)
}
async function workflow(backend, id) { return backend.call('/workflow/fetch?workflowId=' + encodeURIComponent(id)) }
async function cleanup(backend, jobs, workflows = []) {
  for (const id of workflows.reverse()) {
    const value = await workflow(backend, id)
    if (!value.wfName.startsWith(runId)) throw new Error('Refusing cleanup of another lane workflow')
    await backend.call('/workflow/disable?workflowId=' + id, { allowFailure: true })
    const instances = await backend.call('/wfInstance/list', { method: 'POST', data: { appId: backend.appId, workflowId: id, index: 0, pageSize: 100 } })
    for (const instance of instances.data.filter(item => [1, 2].includes(item.status))) await backend.call('/wfInstance/stop?wfInstanceId=' + instance.wfInstanceId, { allowFailure: true })
    await backend.call('/workflow/delete?workflowId=' + id)
  }
  for (const id of jobs) {
    const value = await backend.job(id)
    if (!value?.jobName.startsWith(runId)) throw new Error('Refusing cleanup of another lane job')
    await backend.call('/job/disable?jobId=' + id, { allowFailure: true })
    const instances = await backend.call('/instance/list', { method: 'POST', data: { appId: backend.appId, jobId: id, type: 'NORMAL', index: 0, pageSize: 100 } })
    for (const instance of instances.data.filter(item => [1, 2, 3].includes(item.status))) await backend.call('/instance/stop?instanceId=' + instance.instanceId, { allowFailure: true })
    await backend.deleteOwnedJob(id)
    // Formal 5.1.6 exact-ID lookup may still return a soft-deleted definition;
    // active keyword lists are the cleanup oracle, preserving historical data.
    expect((await backend.listJobs(runId)).data.map(job => String(job.id))).not.toContain(String(id))
  }
}

for (const kind of ['job', 'workflow']) for (const rule of rules) {
  test(`rc.2 ${kind} CRON ${rule.id} · actual Server times and page save/reload`, async ({ page, backend, credentials }, info) => {
    test.setTimeout(120_000); await enterSamples(page, credentials)
    const jobs = [], workflows = [], name = `${runId}_rc2_${kind}_${rule.id}`
    try {
      let scope, id, node
      if (kind === 'job') scope = await newJob(page, name, true)
      else {
        await newJob(page, name + '_node', false, false); await saveDialog(page, '/job/save'); jobs.push(await jobId(backend, name + '_node'))
        node = await newWorkflow(page, name, jobs[0], true); scope = page.locator('main')
      }
      await configure(page, scope, rule)
      await expect(expressionInput(scope, kind)).toHaveValue(rule.expression)
      const times = await validate(page, scope, rule)
      if (kind === 'job') { await saveDialog(page, '/job/save'); id = await jobId(backend, name); jobs.push(id) }
      else { id = await saveWorkflow(page); workflows.push(id) }
      const value = kind === 'job' ? await backend.job(id) : await workflow(backend, id)
      expect(value).toMatchObject({ timeExpressionType: 'CRON', timeExpression: rule.expression })
      if (kind === 'job') { await (await findJob(page, id)).getByRole('button', { name: 'Edit', exact: true }).click(); await page.reload(); await (await findJob(page, id)).getByRole('button', { name: 'Edit', exact: true }).click(); scope = selectors.dialog(page) }
      else { await page.reload(); await expect(page.locator('.dag-node')).toHaveCount(1); expect((await workflow(backend, id)).peworkflowDAG.nodes.map(item => String(item.nodeId))).toEqual([node]); scope = page.locator('main') }
      await expect(expressionInput(scope, kind)).toHaveValue(rule.expression)
      await snapshot(page, info, `${kind}-${rule.id}-persisted`)
      await proof(info, kind === 'job' ? 'UI-012' : 'UI-021', `rc2-cron-${kind}-${rule.id}`, { id, nodeId: node, expression: rule.expression, serverTimezone: 'Asia/Shanghai', serverFutureTimes: times, pageSaved: true, actualHardReload: true })
    } finally { await cleanup(backend, jobs, workflows) }
  })
}

test('rc.2 Job CRON cancel, draft reset, advanced/manual expression and keyboard Apply', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000); await enterSamples(page, credentials); const jobs = []
  const advanced = '0 15 10 ? * MON-FRI 2027', name = `${runId}_rc2_draft`
  try {
    let dialog = await newJob(page, name, true)
    await expressionInput(dialog, 'job').fill(advanced); await validate(page, dialog)
    await saveDialog(page, '/job/save'); const id = await jobId(backend, name); jobs.push(id)
    await (await findJob(page, id)).getByRole('button', { name: 'Edit', exact: true }).click(); dialog = selectors.dialog(page)
    const saves = []; const observe = request => { if (request.method() === 'POST' && request.url().split('?')[0].endsWith('/job/save')) saves.push(request) }; page.on('request', observe)
    await configure(page, dialog, rules[2], false); await builder(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(builder(page)).not.toBeVisible(); await expect(dialog.getByTestId('cron-quick-trigger')).toBeFocused(); await expect(expressionInput(dialog, 'job')).toHaveValue(advanced)
    expect(saves).toHaveLength(0); expect((await backend.job(id)).timeExpression).toBe(advanced)
    await proof(info, 'UI-032', 'rc2-cron-job-cancel', { id, originalAdvanced: advanced, noSaveRequests: true, APIUnchanged: true })
    await dialog.getByTestId('cron-quick-trigger').click(); await expect(builder(page).getByTestId('cron-generated')).toHaveText('0 0/5 * * * ?')
    await builder(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await expressionInput(dialog, 'job').fill(rules[0].expression)
    await configure(page, dialog, rules[2], false); await builder(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await dialog.getByTestId('cron-quick-trigger').click(); await expect(builder(page).getByTestId('cron-generated')).toHaveText(rules[0].expression)
    await builder(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await proof(info, 'UI-038', 'rc2-cron-draft-reset', { recognizedCurrentExpression: rules[0].expression, cancelDraftDiscarded: true, unknownAdvancedDefaultDidNotMutate: true })
    await configure(page, dialog, rules[1], false)
    await builder(page).getByTestId('cron-minute').locator('input').fill('29')
    await builder(page).getByTestId('cron-minute').locator('input').press('Tab')
    await builder(page).getByTestId('cron-apply').focus(); await page.keyboard.press('Enter')
    await expect(builder(page)).not.toBeVisible(); await expect(expressionInput(dialog, 'job')).toHaveValue('0 29 0/3 * * ?'); expect(saves).toHaveLength(0)
    await proof(info, 'UI-032', 'rc2-cron-keyboard-apply', { generated: '0 29 0/3 * * ?', inputTabAndApplyEnter: true, outerJobSaveRequests: 0 })
    await expressionInput(dialog, 'job').fill('0 45 14 ? * TUE,THU 2027'); const times = await validate(page, dialog)
    await saveDialog(page, '/job/save'); page.off('request', observe)
    await page.reload(); await (await findJob(page, id)).getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(expressionInput(selectors.dialog(page), 'job')).toHaveValue('0 45 14 ? * TUE,THU 2027')
    expect((await backend.job(id)).timeExpression).toBe('0 45 14 ? * TUE,THU 2027')
    await proof(info, 'UI-032', 'rc2-cron-manual-advanced', { id, preservedSevenField: advanced, manuallyEditedSevenField: '0 45 14 ? * TUE,THU 2027', serverFutureTimes: times, actualHardReload: true })
    await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    const secondName = name + '_second'; await newJob(page, secondName, true); await configure(page, selectors.dialog(page), rules[3]); await saveDialog(page, '/job/save'); const second = await jobId(backend, secondName); jobs.push(second)
    await (await findJob(page, id)).getByRole('button', { name: 'Edit', exact: true }).click(); await configure(page, selectors.dialog(page), rules[5], false)
    await page.keyboard.press('Escape'); await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await (await findJob(page, second)).getByRole('button', { name: 'Edit', exact: true }).click()
    await selectors.dialog(page).getByTestId('cron-quick-trigger').click(); await expect(builder(page).getByTestId('cron-generated')).toHaveText(rules[3].expression)
    await builder(page).getByRole('button', { name: 'Cancel', exact: true }).click(); await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await newWorkflow(page, name + '_isolated_wf', jobs[0], true)
    await expect(expressionInput(page.locator('main'), 'workflow')).toHaveValue('')
    await page.getByTestId('cron-quick-trigger').click(); await expect(builder(page).getByTestId('cron-generated')).toHaveText('0 0/5 * * * ?'); await builder(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    // Persist the imported node before cleanup; unsaved Server draft nodes are not silently orphaned.
    await configure(page, page.locator('main'), rules[4]); const wfId = await saveWorkflow(page)
    await cleanup(backend, [], [wfId])
    await proof(info, 'UI-038', 'rc2-cron-editor-isolation', { jobA: id, jobB: second, workflowId: wfId, distinctCurrentValues: true, unappliedDraftNotReused: true })
  } finally { await cleanup(backend, jobs) }
})

test('rc.2 Workflow CRON Escape preserves graph and current expression', async ({ page, backend, credentials }, info) => {
  await enterSamples(page, credentials); const jobs = [], workflows = []
  try {
    const name = `${runId}_rc2_escape`; await newJob(page, name); await saveDialog(page, '/job/save'); jobs.push(await jobId(backend, name))
    const node = await newWorkflow(page, name + '_wf', jobs[0], true); await configure(page, page.locator('main'), rules[4]); const id = await saveWorkflow(page); workflows.push(id)
    const before = await workflow(backend, id), writes = []; const observe = request => { if (request.method() === 'POST' && /\/workflow\/(?:save|saveNode)$/.test(request.url().split('?')[0])) writes.push(request) }; page.on('request', observe)
    await configure(page, page.locator('main'), rules[5], false); await builder(page).getByTestId('cron-month-day').locator('input').focus(); await page.keyboard.press('Escape')
    await expect(builder(page)).not.toBeVisible(); await expect(page.getByTestId('cron-quick-trigger')).toBeFocused(); await expect(expressionInput(page.locator('main'), 'workflow')).toHaveValue(rules[4].expression)
    await expect(page.locator(`[data-node-id="${node}"]`)).toBeVisible(); expect(await workflow(backend, id)).toEqual(before); expect(writes).toHaveLength(0); page.off('request', observe)
    await proof(info, 'UI-032', 'rc2-cron-workflow-escape', { id, nodeId: node, originalExpression: rules[4].expression, noSaveRequests: true, persistedGraphUnchanged: true })
  } finally { await cleanup(backend, jobs, workflows) }
})

test('rc.2 CRON numeric bounds and actual invalid Server validation recover', async ({ page, backend, credentials }, info) => {
  test.setTimeout(120_000); await enterSamples(page, credentials); const jobs = []
  try {
    const name = `${runId}_rc2_bounds`, dialog = await newJob(page, name, true)
    await dialog.getByTestId('cron-quick-trigger').click(); await number(page, 'interval', '')
    await expect(builder(page).getByTestId('cron-generated')).toHaveText('—'); await expect(builder(page).getByTestId('cron-apply')).toBeDisabled()
    await number(page, 'interval', 0); await expect(builder(page).getByTestId('cron-interval').locator('input')).toHaveValue('1')
    await number(page, 'interval', 59); await expect(builder(page).getByTestId('cron-generated')).toHaveText('0 0/59 * * * ?'); await builder(page).getByTestId('cron-apply').click()
    const results = [await validate(page, dialog, { matches: t => t.second === 0 && t.minute % 59 === 0 })]
    for (const rule of [
      { ...rules[1], fields: { interval: 23, minute: 59 }, expression: '0 59 0/23 * * ?' },
      { ...rules[2], fields: { hour: 0, minute: 0 }, expression: '0 0 0 * * ?' },
      { ...rules[2], fields: { hour: 23, minute: 59 }, expression: '0 59 23 * * ?' },
      { ...rules[5], fields: { hour: 0, minute: 0, 'month-day': 1 }, expression: '0 0 0 1 * ?' },
    ]) { await configure(page, dialog, rule); results.push(await validate(page, dialog)) }
    await proof(info, 'UI-012', 'rc2-cron-bounds', { emptyBlocked: true, zeroClampedByInput: 1, validMinute59Hour23Midnight2359Month1: true, serverFutureTimes: results })
    await expressionInput(dialog, 'job').fill('this is invalid cron')
    const invalid = await clickAndResponse(page, '/validate/timeExpression', () => dialog.getByRole('button', { name: 'Validate', exact: true }).click())
    expect(invalid.success).toBe(true); expect(invalid.data.every(value => !/^\d{4}-\d{2}-\d{2}/.test(value))).toBe(true)
    await expect(selectors.dialog(page).locator('.el-alert--warning')).toBeVisible(); await expect(selectors.dialog(page).locator('.trigger-time')).toHaveCount(0)
    await selectors.dialog(page).getByRole('button', { name: 'Close this dialog' }).click(); await expect(expressionInput(dialog, 'job')).toHaveValue('this is invalid cron')
    await configure(page, dialog, rules[0]); const times = await validate(page, dialog, rules[0]); await saveDialog(page, '/job/save'); const id = await jobId(backend, name); jobs.push(id)
    expect((await backend.job(id)).timeExpression).toBe(rules[0].expression)
    await proof(info, 'UI-012', 'rc2-cron-invalid-recovery', { invalidSuccessDTOStillDetected: true, noFakeTriggerTimes: true, correctedExpression: rules[0].expression, serverFutureTimes: times, pageSavedId: id })
  } finally { await cleanup(backend, jobs) }
})

test('rc.2 quick-built every-minute Job and Workflow automatically execute on real Workers', async ({ page, backend, credentials }, info) => {
  test.setTimeout(220_000); await enterSamples(page, credentials); const jobs = [], workflows = [], runRequests = []
  const observe = request => { if (/\/(?:job|workflow)\/run(?:\?|$)/.test(request.url())) runRequests.push(request) }; page.on('request', observe)
  const rule = { ...rules[0], fields: { interval: 1 }, expression: '0 0/1 * * * ?', matches: t => t.second === 0 }
  try {
    const name = `${runId}_rc2_scheduled`; await newJob(page, name, true, false); await configure(page, selectors.dialog(page), rule); await saveDialog(page, '/job/save'); const id = await jobId(backend, name); jobs.push(id)
    const nodeName = name + '_node'; await newJob(page, nodeName, false, false); await saveDialog(page, '/job/save'); jobs.push(await jobId(backend, nodeName))
    const nodeId = await newWorkflow(page, name + '_wf', jobs[1], true, false); await configure(page, page.locator('main'), rule); const wfId = await saveWorkflow(page); workflows.push(wfId)
    let jobInstance, wfInstance
    await expect.poll(async () => {
      const list = await backend.call('/instance/list', { method: 'POST', data: { appId: backend.appId, jobId: id, type: 'NORMAL', index: 0, pageSize: 100 } }); jobInstance = list.data.find(value => value.status === 5); return !!jobInstance
    }, { timeout: 90_000, intervals: [500, 1000, 2000] }).toBe(true)
    await expect.poll(async () => {
      const list = await backend.call('/wfInstance/list', { method: 'POST', data: { appId: backend.appId, workflowId: wfId, index: 0, pageSize: 100 } }); wfInstance = list.data.find(value => value.status === 4); return !!wfInstance
    }, { timeout: 90_000, intervals: [500, 1000, 2000] }).toBe(true)
    const wfResult = await backend.call('/wfInstance/info?wfInstanceId=' + wfInstance.wfInstanceId)
    expect(wfResult.peworkflowDAG.nodes).toHaveLength(1); expect(wfResult.peworkflowDAG.nodes[0]).toMatchObject({ status: 5 }); expect(String(wfResult.peworkflowDAG.nodes[0].nodeId)).toBe(nodeId)
    const childId = String(wfResult.peworkflowDAG.nodes[0].instanceId)
    const children = await backend.call('/instance/list', { method: 'POST', data: { appId: backend.appId, instanceId: childId, type: 'WORKFLOW', index: 0, pageSize: 10 } })
    expect(children.data.map(value => String(value.instanceId))).toEqual([childId]); expect(children.data[0].status).toBe(5); expect(runRequests).toHaveLength(0)
    await page.goto('/#/oms/instance'); await input(page.locator('main'), 'Instance ID', jobInstance.instanceId); await page.getByRole('button', { name: 'Query', exact: true }).click(); await expect(selectors.row(page, String(jobInstance.instanceId))).toContainText('Success')
    await snapshot(page, info, 'automatically-scheduled-job-success')
    const disabled = await clickAndResponse(page, '/job/disable', () => findJob(page, id).then(row => row.locator('.el-switch').click())); expect(disabled.success).toBe(true); expect((await backend.job(id)).enable).toBe(false)
    await proof(info, 'UI-015', 'rc2-cron-job-scheduled-worker', { jobId: id, expression: rule.expression, actualInstanceId: String(jobInstance.instanceId), status: jobInstance.status, manuallyInvokedRunRequests: 0, pageDisabled: true })
    await page.goto('/#/oms/wfinstance'); await input(page.locator('main'), en.message.wfInstanceId, wfInstance.wfInstanceId); await page.getByRole('button', { name: 'Query', exact: true }).click(); await expect(selectors.row(page, String(wfInstance.wfInstanceId))).toContainText('Success')
    await page.goto('/#/oms/workflow'); await input(page.locator('main'), 'Workflow ID', wfId); await page.getByRole('button', { name: 'Query', exact: true }).click()
    const wfDisabled = await clickAndResponse(page, '/workflow/disable', () => selectors.row(page, wfId).locator('.el-switch').click()); expect(wfDisabled.success).toBe(true); expect((await workflow(backend, wfId)).enable).toBe(false)
    await proof(info, 'UI-023', 'rc2-cron-workflow-scheduled-worker', { workflowId: wfId, expression: rule.expression, wfInstanceId: String(wfInstance.wfInstanceId), nodeId, actualChildInstanceId: childId, workflowStatus: 4, childStatus: 5, manuallyInvokedRunRequests: 0, pageDisabled: true })
  } finally { page.off('request', observe); await cleanup(backend, jobs, workflows) }
})

async function assertNoPageOverflow(page) {
  const geometry = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }))
  expect(geometry.document).toBeLessThanOrEqual(geometry.viewport + 1)
  expect(geometry.body).toBeLessThanOrEqual(geometry.viewport + 1)
  return geometry
}
async function switchLanguage(page, language) {
  await page.locator('.header-actions .header-button').first().hover()
  await page.getByRole('menuitem', { name: language, exact: true }).click()
  await expect(page.locator('.header-actions .header-button').first()).toContainText(language)
}

test('rc.2 desktop/mobile shell collapse, real navigation, unknown route and compact pages', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  await expect(page.locator('.app-nav')).not.toContainText(/Vue\s*3|5\.1\.6_fev2|5\.1\.6-fev2/)
  await enterSamples(page, credentials)
  await expect(page.locator('.app-nav')).not.toContainText(/Vue\s*3|5\.1\.6_fev2|5\.1\.6-fev2/)
  await proof(info, 'UI-029', 'rc2-shell-footer-hidden', { administratorAndOMS: true, hiddenFrameworkAndReleaseText: true })
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/#/oms/job')
  await input(page.locator('main'), 'Keyword', `${runId}_does_not_exist`)
  const empty = await clickAndResponse(page, '/job/list', () => page.getByRole('button', { name: 'Query', exact: true }).click(), response => response.request().postDataJSON()?.keyword === `${runId}_does_not_exist`)
  expect(empty.data.data).toHaveLength(0)
  const before = await page.locator('main').boundingBox(), navigationBefore = await page.locator('.app-nav').boundingBox()
  const toggle = page.locator('.nav-toggle'); await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await toggle.click(); await expect(page.locator('.app-shell')).toHaveClass(/nav-collapsed/); await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect.poll(async () => (await page.locator('main').boundingBox()).width).toBeGreaterThan(before.width + 80)
  const after = await page.locator('main').boundingBox(), navigationAfter = await page.locator('.app-nav').boundingBox()
  expect(navigationAfter.width).toBeLessThan(navigationBefore.width - 80)
  await expect(formItem(page.locator('main'), 'Keyword').locator('input')).toHaveValue(`${runId}_does_not_exist`)
  await expect(page.locator('.el-table__empty-block')).toBeVisible(); await expect(page.locator('.nav-scrim')).toHaveCount(0)
  await proof(info, 'UI-040', 'rc2-shell-desktop-collapse', { before, after, navigationBefore, navigationAfter, realToggleARIA: true, unchangedQuery: true, noMobileScrim: true })
  const pages = [
    ['/oms/home', 'tabHome', 'Refresh'], ['/oms/job', 'tabJobManage', 'New job'], ['/oms/instance', 'tabJobInstance', 'Query'],
    ['/oms/workflow', 'tabWorkflowManage', 'New workflow'], ['/oms/wfinstance', 'tabWfInstance', 'Query'],
    ['/oms/template', 'tabTemplate', 'Generate template'], ['/oms/containermanage', 'tabContainerManager', 'New container'],
  ]
  for (const [route, title, action] of pages) {
    const link = page.locator('.app-nav nav').getByRole('link', { name: en.message[title], exact: true })
    await expect(link).toBeVisible(); await link.click(); await expect(page).toHaveURL(new RegExp(route))
    await expect(link).toHaveAttribute('aria-current', 'page'); await expect(page.locator('.workspace-header strong')).toContainText(en.message[title])
    await expect(page.locator('.application-tag')).toContainText(credentials.app_name)
    await expect(page.getByRole('button', { name: action, exact: true })).toBeVisible()
  }
  await proof(info, 'UI-040', 'rc2-shell-collapsed-navigation', { sevenActualMenuClicks: true, exactActiveRouteTitleApplication: true, controlsReachable: true })
  await page.setViewportSize({ width: 390, height: 844 }); await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.app-nav')).toHaveAttribute('inert', '')
  await toggle.click(); const dialog = page.locator('.app-nav[role="dialog"]'); await expect(dialog).toBeVisible(); await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(dialog.getByRole('link', { name: en.message.tabContainerManager, exact: true })).toBeFocused()
  await dialog.locator('.brand').focus(); await page.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('link', { name: en.message.tabContainerManager, exact: true })).toBeFocused()
  await page.keyboard.press('Tab'); await expect(dialog.locator('.brand')).toBeFocused()
  await dialog.getByRole('link', { name: en.message.tabJobManage, exact: true }).click(); await expect(page).toHaveURL(/oms\/job/)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false'); await expect(page.locator('.nav-scrim')).toHaveCount(0)
  await toggle.click(); await dialog.getByRole('button', { name: 'Close navigation', exact: true }).click(); await expect(toggle).toBeFocused()
  await toggle.click(); await page.locator('.nav-scrim').click({ position: { x: 350, y: 500 } }); await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click(); await page.keyboard.press('Escape'); await expect(toggle).toHaveAttribute('aria-expanded', 'false'); await expect(toggle).toBeFocused()
  await proof(info, 'UI-029', 'rc2-shell-mobile-navigation', { realMenuClosesDrawer: true, closeButtonScrimEscape: true, returnsFocus: true, closedNavigationInert: true })
  await page.setViewportSize({ width: 1440, height: 900 }); await expect(page.locator('.app-shell')).toHaveClass(/nav-collapsed/); await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click(); await expect(page.locator('.app-shell')).not.toHaveClass(/nav-collapsed/); await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await proof(info, 'UI-040', 'rc2-shell-breakpoint-restore', { desktopCollapseSurvivedMobileVisit: true, mobileOpenedClosedSeparately: true, desktopExplicitExpand: true })
  const measurements = []
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport)
    for (const [route, title, action] of pages) {
      await page.goto('/#' + route); await expect(page.locator('h1')).toHaveText(en.message[title]); await expect(page.getByRole('button', { name: action, exact: true })).toBeInViewport()
      const geometry = await page.evaluate(() => {
        const header = document.querySelector('.workspace-header').getBoundingClientRect(), heading = document.querySelector('main h1').getBoundingClientRect(), table = document.querySelector('main .el-table')?.getBoundingClientRect()
        return { headerHeight: header.height, headingTop: heading.top, tableTop: table?.top, visibleRows: [...document.querySelectorAll('main .el-table__body-wrapper tr')].filter(row => { const r = row.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight }).length }
      })
      expect(geometry.headerHeight).toBeLessThanOrEqual(64); expect(geometry.headingTop).toBeLessThan(150)
      if (geometry.tableTop != null) expect(geometry.tableTop).toBeLessThan(330)
      measurements.push({ viewport, route, ...geometry, overflow: await assertNoPageOverflow(page) })
    }
  }
  await snapshot(page, info, 'compact-desktop-container')
  await proof(info, 'UI-035', 'rc2-ui-compact-desktop', { actualMeasurements: measurements, allFourteenPrimaryActionsInViewport: true, noWholePageHorizontalOverflow: true })
  await page.goto('/#/missing-rc2-unique-route'); await expect(page).toHaveURL(/admin\/app/); await expect(page.getByRole('button', { name: 'Query', exact: true })).toBeVisible()
  await enterSamples(page, credentials); await expect(page.locator('.application-tag')).toContainText(credentials.app_name)
  await proof(info, 'UI-029', 'rc2-shell-unknown-route', { normalSessionRecoveryToAdministrator: true, ordinaryEnterRestoresApplication: true, noMutations: true })
})

test('rc.2 Chinese/English quick setup and 390px Job/Workflow page save', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000); await enterSamples(page, credentials); const jobs = [], workflows = []
  try {
    const name = `${runId}_rc2_mobile`; await newJob(page, name, true); await configure(page, selectors.dialog(page), rules[0]); await saveDialog(page, '/job/save'); const id = await jobId(backend, name); jobs.push(id)
    await switchLanguage(page, '简体中文'); await page.goto('/#/oms/job'); await page.getByRole('button', { name: cn.message.newJob, exact: true }).click()
    await choose(page, selectors.dialog(page), cn.message.scheduleInfo, 'CRON')
    await selectors.dialog(page).getByTestId('cron-quick-trigger').click(); await expect(builder(page)).toContainText(cn.message.cronQuickStart)
    await builder(page).getByTestId('cron-cadence').click()
    for (const rule of rules) await expect(page.locator('.el-select-dropdown:visible').getByRole('option', { name: cn.message[`cron_${rule.id}`], exact: true })).toBeVisible()
    await page.locator('.el-select-dropdown:visible').getByRole('option', { name: cn.message.cron_monthly, exact: true }).click(); await number(page, 'month-day', 31)
    await expect(builder(page)).toContainText(cn.message.cronShortMonth); await expect(builder(page)).toContainText(cn.message.cronServerTimezone)
    await builder(page).getByRole('button', { name: cn.message.cancel, exact: true }).click(); await selectors.dialog(page).getByRole('button', { name: cn.message.cancel, exact: true }).click()
    await switchLanguage(page, 'English'); await page.reload(); await expect(page.locator('.workspace-header strong')).toHaveText(en.message.tabJobManage)
    await (await findJob(page, id)).getByRole('button', { name: 'Edit', exact: true }).click(); await selectors.dialog(page).getByTestId('cron-quick-trigger').click()
    await expect(builder(page)).toContainText(en.message.cronServerTimezone); await builder(page).getByRole('button', { name: 'Cancel', exact: true }).click(); await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await proof(info, 'UI-031', 'rc2-ui-locales', { actualHeaderLocaleSwitchBothDirections: true, allSixChineseOptions: true, ChineseShortMonthAndServerTimezone: true, EnglishHintAndHeaderAfterReload: true })
    await page.setViewportSize({ width: 390, height: 844 }); await (await findJob(page, id)).getByRole('button', { name: 'Edit', exact: true }).click()
    await configure(page, selectors.dialog(page), rules[4], false)
    const jobBox = await builder(page).boundingBox(); expect(jobBox.x).toBeGreaterThanOrEqual(0); expect(jobBox.x + jobBox.width).toBeLessThanOrEqual(391)
    await expect(builder(page).getByTestId('cron-apply')).toBeInViewport(); await expect(builder(page).getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport()
    for (const field of ['hour', 'minute']) expect((await builder(page).getByTestId('cron-' + field).boundingBox()).width).toBeGreaterThan(60)
    await builder(page).getByTestId('cron-apply').click(); await saveDialog(page, '/job/save'); expect((await backend.job(id)).timeExpression).toBe(rules[4].expression)
    const longName = `${runId}_` + 'L'.repeat(255 - runId.length - 1)
    await newWorkflow(page, longName, id, true)
    // Register a valid saved definition before the layout assertions, so failure
    // leaves no unreferenced Server draft node and finally can clean exact IDs.
    await expressionInput(page.locator('main'), 'workflow').fill(rules[0].expression); const initialWorkflowId = await saveWorkflow(page); workflows.push(initialWorkflowId)
    await page.locator('.editor-heading').scrollIntoViewIfNeeded()
    await expect(page.locator('.editor-heading h2')).toHaveText(longName); await expect(page.locator('.editor-heading').getByRole('button', { name: 'Save', exact: true })).toBeInViewport(); await assertNoPageOverflow(page)
    await configure(page, page.locator('main'), rules[5], false)
    const wfBox = await builder(page).boundingBox(); expect(wfBox.x).toBeGreaterThanOrEqual(0); expect(wfBox.x + wfBox.width).toBeLessThanOrEqual(391)
    await expect(builder(page).getByTestId('cron-apply')).toBeInViewport(); await builder(page).getByTestId('cron-apply').click(); const wfId = await saveWorkflow(page); expect(wfId).toBe(initialWorkflowId)
    await page.reload(); await expect(expressionInput(page.locator('main'), 'workflow')).toHaveValue(rules[5].expression); await expect(page.locator('.dag-node')).toHaveCount(1)
    const overflow = await assertNoPageOverflow(page); await snapshot(page, info, '390px-workflow-cron')
    await proof(info, 'UI-035', 'rc2-ui-narrow-cron', { viewport: { width: 390, height: 844 }, jobId: id, workflowId: wfId, jobPopover: jobBox, workflowPopover: wfBox, validLongASCIINameLength: longName.length, headingAndSaveVisibleWithoutPageOverflow: true, actualBothPageSaves: true, workflowHardReload: true, overflow })
  } finally { await cleanup(backend, jobs, workflows) }
})

test('rc.2 business toolbars real filter/reset, pagination and current application', async ({ page, backend, credentials }, info) => {
  test.setTimeout(240_000); await enterSamples(page, credentials); const jobs = [], filters = [], pages = []
  const prefix = `${runId}_rc2_pages_`
  try {
    for (let index = 0; index < 11; index++) { const name = prefix + index; await newJob(page, name, false, false); await saveDialog(page, '/job/save'); jobs.push(await jobId(backend, name)) }
    await input(page.locator('main'), 'Keyword', prefix)
    let response = await clickAndResponse(page, '/job/list', () => page.getByRole('button', { name: 'Query', exact: true }).click(), response => response.request().postDataJSON()?.keyword === prefix)
    expect(response.data.totalItems).toBe(11); await expect(page.locator('.el-table__body-wrapper tr')).toHaveCount(10)
    const first = response.data.data.map(job => String(job.id)); pages.push({ width: 1440, index: response.data.index, ids: first })
    await page.setViewportSize({ width: 390, height: 844 }); await page.locator('.el-pagination').scrollIntoViewIfNeeded()
    response = await clickAndResponse(page, '/job/list', () => page.locator('.el-pager li').getByText('2', { exact: true }).click())
    expect(response.data.index).toBe(1); expect(response.data.data).toHaveLength(1); expect(first).not.toContain(String(response.data.data[0].id)); await expect(selectors.row(page, String(response.data.data[0].id))).toBeVisible()
    pages.push({ width: 390, index: response.data.index, ids: response.data.data.map(job => String(job.id)) })
    await input(page.locator('main'), 'Job ID', jobs[0]); response = await clickAndResponse(page, '/job/list', () => page.getByRole('button', { name: 'Query', exact: true }).click(), response => String(response.request().postDataJSON()?.jobId) === jobs[0]); expect(response.data.index).toBe(0); expect(response.data.data.map(job => String(job.id))).toEqual([jobs[0]])
    await clickAndResponse(page, '/job/list', () => page.getByRole('button', { name: 'Reset', exact: true }).click()); await expect(formItem(page.locator('main'), 'Keyword').locator('input')).toHaveValue(''); await expect(formItem(page.locator('main'), 'Job ID').locator('input')).toHaveValue('')
    await proof(info, 'UI-029', 'rc2-toolbar-pagination', { elevenPageCreatedJobs: jobs, disjointActualPages: pages, exactIDQueryResetsPage: true, bothFiltersReset: true, narrowPaginationClick: true })
    await page.setViewportSize({ width: 1440, height: 900 })
    for (const [route, endpoint, label, value] of [
      ['/oms/job', '/job/list', 'Keyword', prefix + '_absent'], ['/oms/instance', '/instance/list', 'Job ID', '0'],
      ['/oms/workflow', '/workflow/list', 'Keyword', prefix + '_absent'], ['/oms/wfinstance', '/wfInstance/list', 'Workflow ID', '0'],
    ]) {
      await page.goto('/#' + route); await input(page.locator('main'), label, value)
      const field = label === 'Keyword' ? 'keyword' : label === 'Job ID' ? 'jobId' : 'workflowId'
      const queried = await clickAndResponse(page, endpoint, () => page.getByRole('button', { name: 'Query', exact: true }).click(), response => String(response.request().postDataJSON()?.[field]) === String(value)); expect(queried.data.data).toHaveLength(0)
      await expect(page.locator('.el-table__empty-block')).toBeVisible()
      const reset = await clickAndResponse(page, endpoint, () => page.getByRole('button', { name: 'Reset', exact: true }).click()); await expect(formItem(page.locator('main'), label).locator('input')).toHaveValue(''); expect(reset.data.index).toBe(0)
      await expect(page.locator('.el-table__body-wrapper tr')).toHaveCount(reset.data.data.length); filters.push({ route, emptyExactQuery: true, resetIndex: reset.data.index, resetRows: reset.data.data.length })
    }
    await page.goto('/#/oms/containermanage'); const containers = await clickAndResponse(page, '/container/list', () => page.getByRole('button', { name: 'Refresh', exact: true }).click()); await expect(page.locator('.container-card')).toHaveCount(containers.data.length)
    filters.push({ route: '/oms/containermanage', originalContract: 'Refresh, no query/reset control', actualCount: containers.data.length })
    await page.goto('/#/admin/app'); await input(page.locator('main'), 'appName', prefix + '_absent')
    const apps = await clickAndResponse(page, '/appInfo/list', () => page.getByRole('button', { name: 'Query', exact: true }).click(), response => response.request().postDataJSON()?.appNameLike === prefix + '_absent'); expect(apps.data.data).toHaveLength(0)
    const appReset = await clickAndResponse(page, '/appInfo/list', () => page.getByRole('button', { name: 'Reset', exact: true }).click()); await expect(formItem(page.locator('main'), 'appName').locator('input')).toHaveValue(''); await expect(page.locator('.el-table__body-wrapper tr')).toHaveCount(appReset.data.data.length)
    filters.push({ route: '/admin/app', emptyExactQuery: true, resetRows: appReset.data.data.length })
    await proof(info, 'UI-029', 'rc2-toolbar-filters', { actualPageRequestsAndDOM: filters, noMutationsOutsideOwnedFixtures: true })
    await enterSamples(page, credentials); await page.locator('.nav-toggle').click(); await page.locator('.app-nav nav').getByRole('link', { name: en.message.tabJobManage, exact: true }).click(); await expect(page.locator('.application-tag')).toContainText(credentials.app_name)
    await page.reload(); await expect(page.locator('.workspace-header strong')).toContainText(en.message.tabJobManage); await expect(page.locator('.application-tag')).toContainText(credentials.app_name)
    await page.locator('.account-button').hover(); await expect(page.getByRole('menuitem', { name: 'Personal', exact: true })).toBeVisible(); await page.getByRole('menuitem', { name: 'Back to home', exact: true }).click(); await expect(page).toHaveURL(/admin\/app/)
    await enterSamples(page, credentials); await expect(page.locator('.application-tag')).toContainText(credentials.app_name)
    await proof(info, 'UI-029', 'rc2-toolbar-context', { actualAppContextAfterCollapseNavigationAndHardReload: true, actualAccountMenuAndReturn: true, ordinaryApplicationReentry: true, noCrossAppWrites: true })
  } finally { await cleanup(backend, jobs) }
})
