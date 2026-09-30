import { test, expect, Backend, runId, selectors, input, formItem, choose, enterSamples, login, demoProcessor, saveDialog, clickAndResponse } from './support.js'
import fs from 'node:fs/promises'

const read = (dto, field) => field.split('.').reduce((value, key) => value?.[key], dto)

async function proof(info, variantId, actual, caseId = 'UI-012') {
  const result = { caseId, variantId, status: 'PASS', testTitle: info.title, actual, timestamp: new Date().toISOString() }
  await fs.writeFile(info.outputPath(`variant-${variantId}.json`), JSON.stringify(result, null, 2))
  await info.attach(variantId, { body: JSON.stringify(result), contentType: 'application/json' })
}
async function create(page, backend, suffix) {
  await page.goto('/#/oms/job')
  await page.getByRole('button', { name: 'New job', exact: true }).click()
  const dialog = selectors.dialog(page)
  const name = `${runId}_${suffix}`
  await input(dialog, 'Job name', name)
  await input(dialog, 'Job params', 'unchanged 中文 😀 &+%#')
  await input(dialog, 'Execution config', demoProcessor)
  await saveDialog(page, '/job/save')
  const job = (await backend.listJobs(name)).data[0]
  await input(page.locator('main'), 'Job ID', job.id)
  await page.getByRole('button', { name: 'Query', exact: true }).click()
  await selectors.row(page, String(job.id)).locator('.el-switch').click()
  await expect.poll(async () => (await backend.job(job.id)).enable).toBe(false)
  return job.id
}
async function edit(page, id) {
  await page.goto('/#/oms/job')
  await input(page.locator('main'), 'Job ID', id)
  await page.getByRole('button', { name: 'Query', exact: true }).click()
  await selectors.row(page, String(id)).getByRole('button', { name: 'Edit', exact: true }).click()
  return selectors.dialog(page)
}
async function exportJob(page, id) {
  const row = selectors.row(page, String(id))
  await row.getByRole('button', { name: 'More', exact: true }).click()
  await page.locator('.el-dropdown-menu:visible').getByRole('button', { name: 'Export', exact: true }).click()
  const dialog = selectors.dialog(page)
  await expect(dialog.locator('textarea')).not.toHaveValue('')
  const value = JSON.parse(await dialog.locator('textarea').inputValue())
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(selectors.dialog(page)).not.toBeVisible()
  return value
}
function numberInput(dialog, field, placeholder) {
  if (field.startsWith('alarmConfig.')) {
    const index = ['alertThreshold', 'statisticWindowLen', 'silenceWindowLen'].indexOf(field.split('.')[1])
    return formItem(dialog, 'Alarm config').locator('.el-input__inner').nth(index)
  }
  return dialog.getByPlaceholder(placeholder, { exact: true })
}
const numbers = [
  ['maxInstanceNum', 'Max instance num'], ['concurrency', 'Thread concurrency'],
  ['instanceTimeLimit', 'Time limit (ms)'], ['instanceRetryNum', 'Instance retry times'],
  ['taskRetryNum', 'Task retry times'], ['minCpuCores', 'MinAvailableCPUCores'],
  ['minMemorySpace', 'MinMemory(GB)'], ['minDiskSpace', 'MinDisk(GB)'], ['maxWorkerCount', '0 means no limit'],
  ['alarmConfig.alertThreshold', 'AlertThreshold'], ['alarmConfig.statisticWindowLen', 'StatisticWindow(s)'], ['alarmConfig.silenceWindowLen', 'SilenceWindow(s)'],
]
for (const [field, placeholder] of numbers) {
  test(`UI-012 · ${field} zero/one/normal/invalid real page matrix`, async ({ page, backend, credentials }, info) => {
    test.setTimeout(180_000)
    await enterSamples(page, credentials)
    const id = await create(page, backend, field.replaceAll('.', '_'))
    const variant = field.replaceAll('.', '-')
    try {
      for (const [label, number] of [['zero', 0], ['one', 1], ['normal', field.startsWith('min') ? 0.25 : 3]]) {
        const dialog = await edit(page, id)
        await numberInput(dialog, field, placeholder).fill(String(number))
        await saveDialog(page, '/job/save')
        expect(read(await backend.job(id), field)).toBe(number)
        await page.reload()
        await edit(page, id)
        await expect(numberInput(selectors.dialog(page), field, placeholder)).toHaveValue(String(number))
        await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
        await expect(selectors.dialog(page)).not.toBeVisible()
        const exported = await exportJob(page, id)
        expect(read(exported, field)).toBe(number)
        expect(exported.jobParams).toBe('unchanged 中文 😀 &+%#')
        await proof(info, `${variant}-${label}`, { uiSaved: true, hardReloadAndExport: true, actualValue: number, unchangedParameters: true })
      }
      const before = read(await backend.job(id), field)
      const dialog = await edit(page, id)
      await numberInput(dialog, field, placeholder).fill('synthetic-not-a-number')
      const invalid = await clickAndResponse(page, '/job/save', () => dialog.getByRole('button', { name: 'Save', exact: true }).click())
      expect(invalid.success).toBe(false)
      await expect(dialog).toBeVisible()
      await expect(page.locator('.el-message').last()).toBeVisible()
      expect(read(await backend.job(id), field)).toBe(before)
      await proof(info, `${variant}-invalid`, { businessRejected: true, formRetained: true, savedValueUnchanged: true })
    } finally { await backend.deleteOwnedJob(id) }
  })
}

test('UI-012 · six scheduling types, CRON validation and real daily nested editor roundtrip', async ({ page, backend, credentials }, info) => {
  test.setTimeout(300_000)
  await enterSamples(page, credentials)
  const id = await create(page, backend, 'schedule_matrix')
  const types = [['API', 'API', ''], ['CRON', 'CRON', '0 0 0 1 1 ? 2099'], ['Fixed rate (ms)', 'FIXED_RATE', '60000'], ['Fixed delay (ms)', 'FIXED_DELAY', '60000'], ['Workflow', 'WORKFLOW', ''], ['DailyTimeInterval', 'DAILY_TIME_INTERVAL', null]]
  try {
    for (const [option, type, expression] of types) {
      const dialog = await edit(page, id)
      await choose(page, dialog, 'Schedule info', option)
      if (['CRON', 'FIXED_RATE', 'FIXED_DELAY'].includes(type)) await formItem(dialog, 'Schedule info').locator('.el-input__inner').fill(expression)
      if (type === 'DAILY_TIME_INTERVAL') {
        await formItem(dialog, 'Schedule info').getByRole('button', { name: 'Edit', exact: true }).click()
        const nested = selectors.dialog(page)
        await input(nested, 'Interval', '120')
        const time = formItem(nested, 'TimeRange').locator('input')
        await time.nth(0).fill('09:30:00'); await time.nth(0).press('Tab')
        await expect(time.nth(0)).toHaveValue('09:30:00')
        await nested.locator('.el-form-item__label').filter({ hasText: 'Interval' }).click()
        await time.nth(1).fill('17:30:00'); await time.nth(1).press('Tab')
        await expect(time.nth(1)).toHaveValue('17:30:00')
        await nested.locator('.el-form-item__label').filter({ hasText: 'Interval' }).click()
        await nested.locator('.el-checkbox').filter({ hasText: 'Friday' }).click()
        await nested.getByRole('button', { name: 'Save', exact: true }).click()
        await expect(page.getByRole('dialog').filter({ visible: true })).toHaveCount(1)
      }
      await saveDialog(page, '/job/save')
      const saved = await backend.job(id)
      expect(saved.timeExpressionType).toBe(type)
      if (expression) expect(saved.timeExpression).toBe(expression)
      if (type === 'DAILY_TIME_INTERVAL') expect(JSON.parse(saved.timeExpression)).toMatchObject({ interval: 120, startTimeOfDay: '09:30:00', endTimeOfDay: '17:30:00', daysOfWeek: [1, 2, 3, 4] })
      await page.reload()
      await edit(page, id)
      await expect(formItem(selectors.dialog(page), 'Schedule info').locator('.el-select')).toContainText(option)
      await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(selectors.dialog(page)).not.toBeVisible()
      expect((await exportJob(page, id)).timeExpressionType).toBe(type)
      if (type === 'DAILY_TIME_INTERVAL') await proof(info, 'daily-first-create', { editorFirstUse: true, interval: 120, timeRange: ['09:30:00','17:30:00'], weekdays: [1,2,3,4], saved: true })
      await proof(info, `timeExpressionType-${type.toLowerCase()}`, { uiSaved: true, hardReloadAndExport: true, actualType: type, disabledFixture: true })
    }
    let dialog = await edit(page, id)
    await choose(page, dialog, 'Schedule info', 'CRON')
    await formItem(dialog, 'Schedule info').locator('.el-input__inner').fill('0 0 0 1 1 ? 2099')
    const validated = await clickAndResponse(page, '/validate/timeExpression', () => formItem(dialog, 'Schedule info').getByRole('button', { name: 'Validate', exact: true }).click())
    expect(validated.success).toBe(true)
    await expect(selectors.dialog(page)).toContainText('2099-01-01')
    await selectors.dialog(page).getByRole('button', { name: 'Close this dialog' }).click()
    await proof(info, 'cron-preview-valid', { backendValidation: true, realTriggerShown: true })
    dialog = selectors.dialog(page)
    await formItem(dialog, 'Schedule info').locator('.el-input__inner').fill('synthetic-invalid-cron')
    await formItem(dialog, 'Schedule info').getByRole('button', { name: 'Validate', exact: true }).click()
    await expect(selectors.dialog(page).locator('.el-alert')).toBeVisible()
    await expect(selectors.dialog(page).locator('.trigger-time')).toHaveCount(0)
    await proof(info, 'cron-preview-invalid', { businessErrorShown: true, noFakeTriggerList: true })
    await selectors.dialog(page).getByRole('button', { name: 'Close this dialog' }).click()
    await expect(page.getByRole('dialog').filter({ visible: true })).toHaveCount(1)
    await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(selectors.dialog(page)).not.toBeVisible()
    dialog = await edit(page, id)
    await formItem(dialog, 'Schedule info').getByRole('button', { name: 'Edit', exact: true }).click()
    await input(selectors.dialog(page), 'Interval', '90')
    await selectors.dialog(page).locator('.el-checkbox').filter({ hasText: 'Saturday' }).click()
    await selectors.dialog(page).getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('dialog').filter({ visible: true })).toHaveCount(1)
    await saveDialog(page, '/job/save')
    const daily = JSON.parse((await backend.job(id)).timeExpression)
    expect(daily).toMatchObject({ interval: 90, daysOfWeek: [1,2,3,4,6] })
    await proof(info, 'daily-reopen-edit', { modifiedExistingJSON: true, independentReadback: daily })
    dialog = await edit(page, id)
    await formItem(dialog, 'Schedule info').getByRole('button', { name: 'Edit', exact: true }).click()
    await input(selectors.dialog(page), 'Interval', '333')
    await selectors.dialog(page).getByRole('button', { name: 'Close this dialog' }).click()
    await expect(page.getByRole('dialog').filter({ visible: true })).toHaveCount(1)
    await formItem(selectors.dialog(page), 'Schedule info').getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(formItem(selectors.dialog(page), 'Interval').locator('input')).toHaveValue('90')
    await proof(info, 'daily-cancel', { unsavedNestedDraftNotLeaked: true, currentInterval: 90 })
    const inverted = formItem(selectors.dialog(page), 'TimeRange').locator('input')
    await inverted.nth(0).fill('20:00:00'); await inverted.nth(0).press('Tab')
    await inverted.nth(1).fill('10:00:00'); await inverted.nth(1).press('Enter')
    await expect(inverted.nth(0)).toHaveValue('20:00:00')
    await expect(inverted.nth(1)).toHaveValue('10:00:00')
    await selectors.dialog(page).getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('dialog').filter({ visible: true })).toHaveCount(2)
    await expect(page.locator('.el-message').last()).toContainText(/Invalid|range|interval/i)
    expect(JSON.parse((await backend.job(id)).timeExpression)).toEqual(daily)
    await inverted.nth(0).fill('09:00:00'); await inverted.nth(0).press('Enter')
    await inverted.nth(1).fill('17:00:00'); await inverted.nth(1).press('Enter')
    const interval = formItem(selectors.dialog(page), 'Interval').locator('input')
    await interval.fill(''); await interval.press('Tab')
    await selectors.dialog(page).getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('dialog').filter({ visible: true })).toHaveCount(2)
    await expect(page.locator('.el-message').last()).toContainText(/Invalid|range|interval/i)
    expect(JSON.parse((await backend.job(id)).timeExpression)).toEqual(daily)
    await interval.fill('90'); await interval.press('Tab')
    // Tab reaches the following time control and opens its popup. Dismiss it
    // through the surrounding modal before choosing weekday checkboxes.
    await selectors.dialog(page).locator('.el-dialog__header').click()
    const selectedWeekdays = selectors.dialog(page).locator('.el-checkbox.is-checked')
    while (await selectedWeekdays.count()) await selectedWeekdays.first().click()
    await selectors.dialog(page).getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('dialog').filter({ visible: true })).toHaveCount(1)
    await saveDialog(page, '/job/save')
    expect(JSON.parse((await backend.job(id)).timeExpression)).toMatchObject({ interval: 90, startTimeOfDay: '09:00:00', endTimeOfDay: '17:00:00', daysOfWeek: [] })
    await page.reload()
    await edit(page, id)
    await formItem(selectors.dialog(page), 'Schedule info').getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(selectors.dialog(page).locator('.el-checkbox.is-checked')).toHaveCount(0)
    await proof(info, 'daily-invalid-range', { invertedTimeRejected: true, emptyIntervalRejected: true, unchangedFormalValue: true, emptyWeekMeansAllDaysSavedAndReloaded: true })

  } finally { await backend.deleteOwnedJob(id) }
})

test('UI-036 · real job hidden DTO fields and nested configuration survive page edits', async ({ page, backend, credentials }, info) => {
  await enterSamples(page, credentials)
  const id = await create(page, backend, 'dto_preserve')
  try {
    const initial = await backend.job(id)
    const supported = { ...initial, tag: 'hidden-tag', extra: JSON.stringify({ futureSetting: { text: 'hidden-extra 中文 😀', value: 0, enabled: false, empty: null } }), lifeCycle: { start: null, end: null }, alarmConfig: { alertThreshold: 2, statisticWindowLen: 3, silenceWindowLen: 4 }, logConfig: { type: 999, level: 999, loggerName: 'hidden.logger' }, advancedRuntimeConfig: { taskTrackerBehavior: 999 } }
    await backend.call('/job/save', { method: 'POST', data: supported })
    const before = await backend.job(id)
    expect(before.extra).toBe(supported.extra)
    expect(before.logConfig.type).toBe(999)
    expect(before.logConfig.level).toBe(999)
    expect(before.advancedRuntimeConfig.taskTrackerBehavior).toBe(999)
    await edit(page, id)
    await input(selectors.dialog(page), 'Job description', 'changed only description')
    await saveDialog(page, '/job/save')
    await page.reload()
    const after = await backend.job(id)
    for (const key of ['tag', 'extra', 'lifeCycle', 'alarmConfig', 'logConfig', 'advancedRuntimeConfig', 'jobParams', 'processorInfo', 'enable']) expect(after[key], key).toEqual(before[key])
    await edit(page, id)
    const exported = await exportJobAfterClosingEditor(page, id)
    for (const key of ['tag', 'extra', 'alarmConfig', 'logConfig', 'advancedRuntimeConfig']) expect(exported[key], `export.${key}`).toEqual(before[key])
    await proof(info, 'job-preserve-unknown', { trueReleasedServerReadbackFields: ['tag', 'extra', 'lifeCycle', 'alarmConfig', 'logConfig', 'advancedRuntimeConfig'], editedOnlyDescriptionByUI: true, hardReloadAndExportEquality: true, actualExtraFutureNestedJSONAndZeroFalseNullPreserved: true, arbitraryUnknownTopLevelServerFields: 'Not exposed by the locked published Server DTO; forward DTO merge is separately verified by unit contracts' }, 'UI-036')
    await proof(info, 'legacy-enum-value', { originalServerStoredUnknownLogTypeAndLevel: 999, originalServerStoredUnknownTrackerBehavior: 999, unchangedThroughUIEditReloadExport: true, jobDisabledAndNotExecuted: true }, 'UI-036')
    await proof(info, 'nested-config-preserve', { alarmLogAdvancedLifeCycleDTOsPreservedThroughRealUI: true, futureNestedJSONPreservedInServerExtraString: true, zeroFalseNullInsideJSONRetained: true, serverUnknownNestedDTOKeys: 'Published typed Server models do not return arbitrary future keys; separately tested lossless Console merge contract' }, 'UI-036')
    await info.attach('dto-preservation', { body: JSON.stringify({ supportedFields: ['tag','extra','lifeCycle','alarmConfig','logConfig','advancedRuntimeConfig'], unsupportedUnknownServerFields: 'Cannot persist unknown properties through the published Server DTO', uiSave: true, readback: true }), contentType: 'application/json' })
  } finally { await backend.deleteOwnedJob(id) }
})

async function exportJobAfterClosingEditor(page, id) {
  await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(selectors.dialog(page)).not.toBeVisible()
  return exportJob(page, id)
}

test('UI-030/032 · actual Shanghai and UTC browsers display local dates and preserve the original epoch on metadata save', async ({ page, backend, credentials, browser }, info) => {
  await enterSamples(page, credentials)
  const id = await create(page, backend, 'timezone')
  const start = Date.parse('2030-01-01T00:00:00+08:00'), end = Date.parse('2030-12-31T23:59:59+08:00')
  const contexts = [], failures = [], observations = []
  try {
    await edit(page, id)
    for (const [label, value] of [['Start time', '2030-01-01 00:00:00'], ['Finished time', '2030-12-31 23:59:59']]) {
      await selectors.dialog(page).getByRole('combobox', { name: label, exact: true }).fill(value)
      await selectors.dialog(page).getByRole('combobox', { name: label, exact: true }).press('Enter')
    }
    await saveDialog(page, '/job/save')
    expect((await backend.job(id)).lifeCycle).toEqual({ start, end })
    for (const [timezoneId, first, second] of [['UTC', '2029-12-31 16:00:00', '2030-12-31 15:59:59'], ['Asia/Shanghai', '2030-01-01 00:00:00', '2030-12-31 23:59:59']]) {
      const context = await browser.newContext({ baseURL: process.env.POWERJOB_E2E_BASE_URL, timezoneId, locale: 'en-US', viewport: { width: 1440, height: 1000 } })
      contexts.push(context)
      await context.addInitScript(() => localStorage.setItem('oms_lang', 'en'))
      const other = await context.newPage()
      other.on('pageerror', error => failures.push(error.message))
      other.on('console', message => { if (/\[Vue warn\]|\[intlify\]|Failed to resolve component/.test(message.text())) failures.push(message.text()) })
      await login(other, credentials)
      await enterSamples(other, credentials)
      await edit(other, id)
      await expect(selectors.dialog(other).getByRole('combobox', { name: 'Start time', exact: true })).toHaveValue(first)
      await expect(selectors.dialog(other).getByRole('combobox', { name: 'Finished time', exact: true })).toHaveValue(second)
      await input(selectors.dialog(other), 'Job description', `metadata edit from ${timezoneId}`)
      await saveDialog(other, '/job/save')
      const saved = await backend.job(id)
      expect(saved.lifeCycle).toEqual({ start, end })
      expect(saved.timeExpressionType).toBe('API')
      expect(saved.enable).toBe(false)
      await other.reload()
      await edit(other, id)
      await expect(selectors.dialog(other).getByRole('combobox', { name: 'Start time', exact: true })).toHaveValue(first)
      await expect(selectors.dialog(other).getByRole('combobox', { name: 'Finished time', exact: true })).toHaveValue(second)
      observations.push({ timezoneId, renderedStart: first, renderedEnd: second, persistedEpoch: { start, end }, realUILoginSaveReload: true })
      await other.screenshot({ path: info.outputPath(`timezone-${timezoneId.replace('/', '-')}.png`), fullPage: true, mask: [other.locator('input[type="password"]'), other.locator('input[disabled]')] })
      await context.close()
    }
    expect(failures).toEqual([])
    await proof(info, 'timezone-roundtrip', { actualIndependentBrowserTimezones: observations, originalScheduleAndDisableUnchanged: true, exactEpochUnchangedAfterBothMetadataSaves: true }, 'UI-030')
  } finally {
    for (const context of contexts) await context.close()
    await backend.deleteOwnedJob(id)
  }
})

test('UI-012 · lifecycle null/single/both boundaries and alarm recipients none/one/many', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  await enterSamples(page, credentials)
  const id = await create(page, backend, 'lifecycle_notify')
  try {
    const startText = '2030-01-01 00:00:00', endText = '2030-12-31 23:59:59'
    const start = Date.parse('2030-01-01T00:00:00+08:00'), end = Date.parse('2030-12-31T23:59:59+08:00')
    for (const [first, second, expected] of [[startText, '', { start, end: null }], ['', endText, { start: null, end }], [startText, endText, { start, end }], ['', '', { start: null, end: null }]]) {
      await edit(page, id)
      const dialog = selectors.dialog(page)
      await dialog.getByRole('combobox', { name: 'Start time', exact: true }).fill(first)
      await dialog.getByRole('combobox', { name: 'Start time', exact: true }).press('Enter')
      await dialog.getByRole('combobox', { name: 'Finished time', exact: true }).fill(second)
      await dialog.getByRole('combobox', { name: 'Finished time', exact: true }).press('Enter')
      await saveDialog(page, '/job/save')
      const saved = (await backend.job(id)).lifeCycle
      expect({ start: saved?.start ?? null, end: saved?.end ?? null }).toEqual(expected)
      await page.reload()
      await edit(page, id)
      await expect(selectors.dialog(page).getByRole('combobox', { name: 'Start time', exact: true })).toHaveValue(first)
      await expect(selectors.dialog(page).getByRole('combobox', { name: 'Finished time', exact: true })).toHaveValue(second)
      await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(selectors.dialog(page)).not.toBeVisible()
    }
    await proof(info, 'lifeCycle-unset', { bothCleared: true, nullKept: true, hardReload: true })
    await edit(page, id)
    const invalidLifeCycleDialog = selectors.dialog(page)
    await invalidLifeCycleDialog.getByRole('combobox', { name: 'Start time', exact: true }).fill(startText)
    await invalidLifeCycleDialog.getByRole('combobox', { name: 'Start time', exact: true }).press('Enter')
    await invalidLifeCycleDialog.getByRole('combobox', { name: 'Finished time', exact: true }).fill('2029-12-31 23:59:59')
    await invalidLifeCycleDialog.getByRole('combobox', { name: 'Finished time', exact: true }).press('Enter')
    let invalidWrites = 0
    const countInvalidWrites = request => { if (request.url().split('?')[0].endsWith('/job/save')) invalidWrites++ }
    page.on('request', countInvalidWrites)
    await invalidLifeCycleDialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.locator('.el-message').last()).toBeVisible()
    await expect(invalidLifeCycleDialog).toBeVisible()
    expect(invalidWrites).toBe(0)
    expect((await backend.job(id)).lifeCycle).toEqual({ start: null, end: null })
    page.off('request', countInvalidWrites)
    await invalidLifeCycleDialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(selectors.dialog(page)).not.toBeVisible()
    await proof(info, 'lifeCycle-invalid', { endBeforeStartRejectedBeforeSave: true, zeroInvalidWrites: true, originalNullBoundariesKept: true })
    await proof(info, 'lifeCycle-valid', { startOnly: true, endOnly: true, both: true, exactEpoch: true, hardReload: true })
    const users = []
    for (let index = 0; index < 2; index++) {
      const account = `${runId}_notify_${index}`
      await backend.call('/pwjbUser/create', { method: 'POST', data: { username: account, password: `Synthetic.${account}.Only` } })
      const auth = await backend.call('/auth/thirdPartyLoginDirect', { method: 'POST', data: { loginType: 'PWJB', originParams: JSON.stringify({ username: account, password: `Synthetic.${account}.Only`, encryption: 'none' }) } })
      const own = new Backend(backend.request, backend.server, auth.jwtToken, backend.appId)
      const user = await own.call('/user/detail')
      expect(user.id).toBeTruthy()
      users.push(user)
    }
    await page.reload()
    for (const count of [0, 1, 2, 0]) {
      await edit(page, id)
      const selector = formItem(selectors.dialog(page), 'Alarm config').locator('.el-select')
      await selector.click()
      for (const user of users) {
        const option = page.locator('.el-select-dropdown:visible .el-select-dropdown__item').filter({ hasText: user.username })
        const shouldSelect = users.indexOf(user) < count
        if ((await option.getAttribute('class')).includes('is-selected') !== shouldSelect) await option.click()
      }
      await page.keyboard.press('Escape')
      await saveDialog(page, '/job/save')
      expect((await backend.job(id)).notifyUserIds.map(String).sort()).toEqual(users.slice(0, count).map(user => String(user.id)).sort())
      await page.reload()
    }
    await proof(info, 'notify-none-one-many', { onlySyntheticRecipients: true, selections: [0,1,2,0], exactIDsReadback: true, disabledNoNotificationsSent: true })
  } finally { await backend.deleteOwnedJob(id) }
})

test('UI-012 · dispatch and logger conditional fields survive toggles and refresh', async ({ page, backend, credentials }, info) => {
  await enterSamples(page, credentials)
  const id = await create(page, backend, 'conditional_fields')
  try {
    let dialog = await edit(page, id)
    await choose(page, dialog, 'Runtime config', 'SPECIFY')
    await dialog.getByPlaceholder('Dispatch strategy config', { exact: true }).fill('synthetic-dispatch-config')
    await choose(page, dialog, 'Runtime config', 'RANDOM')
    await expect(dialog.getByPlaceholder('Dispatch strategy config', { exact: true })).toHaveCount(0)
    await choose(page, dialog, 'Runtime config', 'SPECIFY')
    await expect(dialog.getByPlaceholder('Dispatch strategy config', { exact: true })).toHaveValue('synthetic-dispatch-config')
    await saveDialog(page, '/job/save')
    expect((await backend.job(id)).dispatchStrategyConfig).toBe('synthetic-dispatch-config')
    await page.reload()
    dialog = await edit(page, id)
    await expect(dialog.getByPlaceholder('Dispatch strategy config', { exact: true })).toHaveValue('synthetic-dispatch-config')
    await proof(info, 'specify-config-toggle', { hideShow: true, exactOriginalString: true, hardReload: true })
    await choose(page, dialog, 'Log Config', 'LOCAL')
    await formItem(dialog, 'Log Config').locator('.el-input__inner').fill('synthetic.logger.中文')
    await choose(page, dialog, 'Log Config', 'ONLINE')
    await expect(formItem(dialog, 'Log Config').locator('.el-input__inner')).toHaveCount(0)
    await choose(page, dialog, 'Log Config', 'LOCAL_AND_ONLINE')
    await expect(formItem(dialog, 'Log Config').locator('.el-input__inner')).toHaveValue('synthetic.logger.中文')
    await saveDialog(page, '/job/save')
    expect((await backend.job(id)).logConfig).toMatchObject({ type: 4, loggerName: 'synthetic.logger.中文' })
    await page.reload()
    await edit(page, id)
    await expect(formItem(selectors.dialog(page), 'Log Config').locator('.el-input__inner')).toHaveValue('synthetic.logger.中文')
    await proof(info, 'logger-name-toggle', { localAndOnline: true, exactOriginalString: true, hardReload: true })
  } finally { await backend.deleteOwnedJob(id) }
})
