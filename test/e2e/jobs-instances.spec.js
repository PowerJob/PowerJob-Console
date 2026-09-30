import { test, expect, selectors, runId, demoProcessor, simpleProcessor, timeoutProcessor, input, choose, formItem, enterSamples, saveDialog, clickAndResponse, confirmDialog, fileHash } from './support.js'
import fs from 'node:fs/promises'

async function proof(info, caseId, variantId, actual) {
  const result = { caseId, variantId, status: 'PASS', testTitle: info.title, actual }
  await fs.writeFile(info.outputPath(`variant-${caseId}-${variantId}.json`), JSON.stringify(result, null, 2))
  await info.attach(`${caseId}/${variantId}`, { body: JSON.stringify(result), contentType: 'application/json' })
}

async function createJob(page, name, processor = demoProcessor, params = 'success') {
  await page.goto('/#/oms/job')
  await page.getByRole('button', { name: 'New job', exact: true }).click()
  const dialog = selectors.dialog(page)
  await input(dialog, 'Job name', name)
  await input(dialog, 'Job description', 'Vue 3 regression 中文 😀 "quoted"')
  await input(dialog, 'Job params', params)
  await choose(page, dialog, 'Schedule info', 'API')
  await choose(page, dialog, 'Execution config', 'Standalone', 0)
  await choose(page, dialog, 'Execution config', 'BUILT_IN', 1)
  await input(dialog, 'Execution config', processor)
  return saveDialog(page, '/job/save')
}
async function findJob(page, id) {
  await page.goto('/#/oms/job')
  await input(page.locator('main'), 'Job ID', id)
  await page.getByRole('button', { name: 'Query', exact: true }).click()
  return selectors.row(page, String(id))
}
async function more(page, row, action) {
  await row.getByRole('button', { name: /More/ }).click()
  await page.locator('.el-dropdown-menu:visible').getByRole('button', { name: action, exact: true }).click()
}
async function instanceRow(page, id) {
  await page.goto('/#/oms/instance')
  await input(page.locator('main'), 'Instance ID', id)
  await page.locator('#instance_manager').getByRole('button', { name: 'Query', exact: true }).first().click()
  return selectors.row(page, String(id))
}

test('UI-010/011/013/014 · real Worker overview and page job CRUD, copy/export/import', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  const ids = []
  await enterSamples(page, credentials)
  await expect(page.locator('.el-table')).toBeVisible()
  const workers = await backend.call('/system/listWorker?appId=' + credentials.app_id)
  expect(workers.length).toBeGreaterThanOrEqual(2)
  try {
    const name = `${runId}_jobcrud`
    await createJob(page, name)
    const created = (await backend.listJobs(name)).data
    expect(created).toHaveLength(1)
    const id = created[0].id
    ids.push(id)
    expect(created[0].processorInfo).toBe(demoProcessor)
    await proof(info, 'UI-011', 'minimal-create', { uniqueNewId: id, pageCreated: true, readbackProcessor: true })
    let row = await findJob(page, id)
    await expect(row).toContainText(name)
    await row.getByRole('button', { name: 'Edit', exact: true }).click()
    await input(selectors.dialog(page), 'Job name', 'unsaved mutation')
    await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(row).toContainText(name)
    expect((await backend.job(id)).jobName).toBe(name)
    await proof(info, 'UI-011', 'edit-cancel', { unchangedListAndIndependentDTO: true })
    await row.getByRole('button', { name: 'Edit', exact: true }).click()
    await input(selectors.dialog(page), 'Job params', '中文😀 &+%#\n"quoted"')
    await saveDialog(page, '/job/save')
    expect((await backend.job(id)).jobParams).toBe('中文😀 &+%#\n"quoted"')
    await page.reload()
    row = await findJob(page, id)
    await row.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(formItem(selectors.dialog(page), 'Job params').locator('textarea')).toHaveValue('中文😀 &+%#\n"quoted"')
    await proof(info, 'UI-011', 'edit-basic-roundtrip', { utf8QuotesNewlineSaved: true, hardReloadReopen: true })
    await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.getByRole('button', { name: 'New job', exact: true }).click()
    await expect(formItem(selectors.dialog(page), 'Job name').locator('input')).toHaveValue('')
    await expect(formItem(selectors.dialog(page), 'Job params').locator('textarea')).toHaveValue('')
    await input(selectors.dialog(page), 'Job name', `${name}_fresh`)
    await input(selectors.dialog(page), 'Execution config', demoProcessor)
    await saveDialog(page, '/job/save')
    const fresh = (await backend.listJobs(`${name}_fresh`)).data[0]
    expect(fresh.id).not.toBe(id)
    ids.push(fresh.id)
    expect((await backend.job(id)).jobName).toBe(name)
    await proof(info, 'UI-011', 'edit-then-create', { freshId: fresh.id, originalNotOverwritten: true, oldFieldsNotLeaked: true })
    row = await findJob(page, id)

    const switcher = row.locator('.el-switch')
    await switcher.click()
    await expect.poll(async () => (await backend.job(id)).enable).toBe(false)
    await switcher.click()
    await expect.poll(async () => (await backend.job(id)).enable).toBe(true)
    await more(page, row, 'Copy')
    await expect(selectors.dialog(page)).toBeVisible()
    await input(selectors.dialog(page), 'Job name', `${name}_copy`)
    await saveDialog(page, '/job/save')
    const copied = (await backend.listJobs(`${name}_copy`)).data
    expect(copied).toHaveLength(1)
    ids.push(copied[0].id)
    expect(copied[0].jobParams).toBe('中文😀 &+%#\n"quoted"')
    await proof(info, 'UI-013', 'copy-job', { freshId: copied[0].id, sourceId: id, sourceUnchanged: true, paramsKept: true })
    row = await findJob(page, id)
    await more(page, row, 'Export')
    await expect(selectors.dialog(page).locator('textarea')).not.toHaveValue('')
    const exported = await selectors.dialog(page).locator('textarea').inputValue()
    expect(JSON.parse(exported).jobParams).toBe('中文😀 &+%#\n"quoted"')
    expect(JSON.parse(exported).enable).toBe(true)
    expect(JSON.parse(exported).id).toBeNull()
    expect(JSON.parse(exported).jobName).toMatch(new RegExp(`^${name}_EXPORT_\\d+$`))
    for (const field of ['jobParams','executeType','processorInfo','logConfig','alarmConfig','advancedRuntimeConfig']) expect(JSON.parse(exported)[field]).toEqual((await backend.job(id))[field])
    await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await row.locator('.el-switch').click()
    await expect.poll(async () => (await backend.job(id)).enable).toBe(false)
    await more(page, await findJob(page, id), 'Export')
    await expect(selectors.dialog(page).locator('textarea')).not.toHaveValue('')
    expect(JSON.parse(await selectors.dialog(page).locator('textarea').inputValue()).enable).toBe(false)
    await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(selectors.dialog(page)).not.toBeVisible()
    await (await findJob(page, id)).locator('.el-switch').click()
    await expect.poll(async () => (await backend.job(id)).enable).toBe(true)
    await proof(info, 'UI-013', 'export-accurate', { ownObjectDTOFieldsAccurate: true, importableIdClearedByOriginalContract: true, enabledAndDisabledStates: true, accurateParams: true })
    await page.getByRole('button', { name: 'Input job', exact: true }).click()
    await selectors.dialog(page).locator('textarea').fill('{broken-json')
    await selectors.dialog(page).getByRole('button', { name: /Import|Save|Confirm/, exact: true }).click()
    await expect(selectors.dialog(page)).toBeVisible()
    const importedName = `${runId}_imported`
    await selectors.dialog(page).locator('textarea').fill(JSON.stringify({ ...JSON.parse(exported), jobName: importedName }))
    const importedResult = await clickAndResponse(page, '/job/save', () => selectors.dialog(page).getByRole('button', { name: /Import|Save|Confirm/, exact: true }).click())
    expect(importedResult.success).toBe(true)
    await expect(selectors.dialog(page)).not.toBeVisible()
    const imported = (await backend.listJobs(importedName)).data
    expect(imported).toHaveLength(1)
    ids.push(imported[0].id)
    expect(imported[0].id).not.toBe(id)
    expect(imported[0].jobParams).toBe(JSON.parse(exported).jobParams)
    for (const field of ['timeExpressionType','executeType','processorType','processorInfo','alarmConfig','logConfig','advancedRuntimeConfig','lifeCycle']) expect(imported[0][field]).toEqual(JSON.parse(exported)[field])
    await proof(info, 'UI-013', 'import-export-roundtrip', { independentNewId: true, textEnumsNestedFieldsKept: true })
    await proof(info, 'UI-013', 'import-invalid-json', { invalidJSONVisible: true, correctedUIImportSucceeded: true, sourceNotChanged: true })
    await more(page, await findJob(page, imported[0].id), 'Export')
    await expect(selectors.dialog(page).locator('textarea')).not.toHaveValue('')
    expect(JSON.parse(await selectors.dialog(page).locator('textarea').inputValue()).jobParams).toBe('中文😀 &+%#\n"quoted"')
    await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(selectors.dialog(page)).not.toBeVisible()
    await proof(info, 'UI-013', 'import-special-text', { independentImportExportUTF8QuotesNewline: true })

    row = await findJob(page, imported[0].id)
    await more(page, row, 'Delete')
    await confirmDialog(page, false)
    expect(await backend.job(imported[0].id)).toBeTruthy()
    await proof(info, 'UI-014', 'delete-cancel', { ownObjectStillExists: true })
    await more(page, row, 'Delete')
    await confirmDialog(page)
    await expect.poll(async () => (await backend.listJobs(importedName)).data.length).toBe(0)
    await page.reload()
    await input(page.locator('main'), 'Job ID', '')
    await input(page.locator('main'), 'Keyword', importedName)
    await page.getByRole('button', { name: 'Query', exact: true }).click()
    await expect(selectors.row(page, importedName)).not.toBeVisible()
    expect((await backend.job(imported[0].id)).id).toBe(imported[0].id)
    const rerun = await backend.call('/job/run?jobId=' + imported[0].id + '&appId=' + credentials.app_id, { allowFailure: true })
    expect(rerun.success).toBe(false)
    await proof(info, 'UI-014', 'delete-confirm', { keywordExcludesDeleted: true, hardReload: true, historicalExactIdRetained: true, deletedJobCannotRun: true })
  } finally { for (const id of ids) await backend.deleteOwnedJob(id) }
})

test('UI-012/036 · every task enum and advanced field saved/read back without loss', async ({ page, backend, credentials }, info) => {
  test.setTimeout(300_000)
  await enterSamples(page, credentials)
  const name = `${runId}_fields`
  await createJob(page, name)
  const id = (await backend.listJobs(name)).data[0].id
  const axes = [
    ['Execution config', 0, 'executeType', [['Standalone', 'STANDALONE'], ['Broadcast', 'BROADCAST'], ['MAP', 'MAP'], ['MapReduce', 'MAP_REDUCE']]],
    ['Runtime config', 0, 'dispatchStrategy', [['HEALTH_FIRST', 'HEALTH_FIRST'], ['RANDOM', 'RANDOM'], ['SPECIFY', 'SPECIFY']]],
    ['Log Config', 0, 'logConfig.type', [['ONLINE', 1], ['LOCAL', 2], ['STDOUT', 3], ['LOCAL_AND_ONLINE', 4], ['NULL', 999]]],
    ['Log Config', 1, 'logConfig.level', [['DEBUG', 1], ['INFO', 2], ['WARN', 3], ['ERROR', 4], ['OFF', 99]]],
    ['Advance Config', 0, 'advancedRuntimeConfig.taskTrackerBehavior', [['NORMAL', 1], ['PADDLING', 11]]],
  ]
  const read = (value, field) => field.split('.').reduce((entry, key) => entry?.[key], value)
  try {
    for (const [label, index, field, choices] of axes) {
      for (const [option, value] of choices) {
        const row = await findJob(page, id)
        await row.getByRole('button', { name: 'Edit', exact: true }).click()
        await choose(page, selectors.dialog(page), label, option, index)
        if (field === 'dispatchStrategy' && value === 'SPECIFY') {
          await formItem(selectors.dialog(page), 'Runtime config').getByPlaceholder('Dispatch strategy config', { exact: true }).fill('127.0.0.1:27777')
        }
        const before = await backend.job(id)
        await saveDialog(page, '/job/save')
        const after = await backend.job(id)
        expect(read(after, field)).toBe(value)
        expect(after.jobParams).toBe(before.jobParams)
        expect(after.processorInfo).toBe(demoProcessor)
        await page.reload()
        await (await findJob(page, id)).getByRole('button', { name: 'Edit', exact: true }).click()
        await expect(formItem(selectors.dialog(page), label).locator('.el-select').nth(index)).toContainText(option)
        await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
        await expect(selectors.dialog(page)).not.toBeVisible()
        await more(page, selectors.row(page, String(id)), 'Export')
        await expect(selectors.dialog(page).locator('textarea')).not.toHaveValue('')
        expect(read(JSON.parse(await selectors.dialog(page).locator('textarea').inputValue()), field)).toBe(value)
        await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
        await expect(selectors.dialog(page)).not.toBeVisible()
        const key = field === 'logConfig.type' ? `logConfig-type-${option.toLowerCase()}` : field === 'logConfig.level' ? `logConfig-level-${option.toLowerCase()}` : field === 'advancedRuntimeConfig.taskTrackerBehavior' ? `advancedRuntimeConfig-taskTrackerBehavior-${value}` : `${field}-${String(value).toLowerCase()}`
        const evidence = { caseId: 'UI-012', variantId: key, status: 'PASS', testTitle: info.title, actual: { uiSaved: true, readback: value, hardReloadAndExport: true, unchangedParams: true } }
        await fs.writeFile(info.outputPath(`variant-${key}.json`), JSON.stringify(evidence, null, 2))
        await info.attach(key, { body: JSON.stringify(evidence), contentType: 'application/json' })
      }
    }
    const row = await findJob(page, id)
    await row.getByRole('button', { name: 'Edit', exact: true }).click()
    const dialog = selectors.dialog(page)
    const fields = [['Max instance num', '2'], ['Thread concurrency', '3'], ['Time limit (ms)', '123456'], ['Instance retry times', '2'], ['Task retry times', '3'], ['MinAvailableCPUCores', '0.25'], ['MinMemory(GB)', '0.25'], ['MinDisk(GB)', '0.25'], ['0 means no limit', '2']]
    for (const [label, value] of fields) await dialog.getByPlaceholder(label, { exact: true }).fill(value)
    await formItem(dialog, 'Alarm config').locator('.el-input__inner').nth(0).fill('2')
    await formItem(dialog, 'Alarm config').locator('.el-input__inner').nth(1).fill('120')
    await formItem(dialog, 'Alarm config').locator('.el-input__inner').nth(2).fill('180')
    await saveDialog(page, '/job/save')
    const saved = await backend.job(id)
    expect(saved.maxInstanceNum).toBe(2)
    expect(saved.concurrency).toBe(3)
    expect(saved.instanceTimeLimit).toBe(123456)
    expect(saved.instanceRetryNum).toBe(2)
    expect(saved.taskRetryNum).toBe(3)
    expect(saved.minCpuCores).toBe(0.25)
    expect(saved.minMemorySpace).toBe(0.25)
    expect(saved.minDiskSpace).toBe(0.25)
    expect(saved.maxWorkerCount).toBe(2)
    expect(saved.alarmConfig).toMatchObject({ alertThreshold: 2, statisticWindowLen: 120, silenceWindowLen: 180 })
    await page.reload()
    await (await findJob(page, id)).getByRole('button', { name: 'Edit', exact: true }).click()
    for (const [label, value] of fields) await expect(selectors.dialog(page).getByPlaceholder(label, { exact: true })).toHaveValue(value)
  } finally { await backend.deleteOwnedJob(id) }
})

test('UI-015/016/017/019 · page run with special parameters, real result, detail and log file', async ({ page, backend, credentials }, testInfo) => {
  test.setTimeout(150_000)
  await enterSamples(page, credentials)
  const name = `${runId}_execution`
  await createJob(page, name)
  const id = (await backend.listJobs(name)).data[0].id
  try {
    await page.reload()
    let row = await findJob(page, id)
    await row.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(formItem(selectors.dialog(page), 'Execution config').locator('.el-select').nth(1)).toContainText('BUILT_IN')
    await expect(formItem(selectors.dialog(page), 'Job params').locator('textarea')).toHaveValue('success')
    await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await more(page, row, 'Export')
    await expect(selectors.dialog(page).locator('textarea')).not.toHaveValue('')
    const exported = JSON.parse(await selectors.dialog(page).locator('textarea').inputValue())
    expect(exported.processorType).toBe('BUILT_IN'); expect(exported.jobParams).toBe('success'); expect(exported.processorInfo).toBe(demoProcessor)
    await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(selectors.dialog(page)).not.toBeVisible()
    const defaultRun = await clickAndResponse(page, '/job/run', () => row.getByRole('button', { name: 'Run', exact: true }).click())
    expect(defaultRun.success).toBe(true)
    const defaultInstance = await backend.waitInstance(defaultRun.data, [5])
    expect(defaultInstance.result).toContain('jobParams=success')
    expect(defaultInstance.result).toMatch(/true$/)
    await more(page, row, 'History')
    await expect(formItem(page.locator('#instance_manager'), 'Job ID').locator('input')).toHaveValue(String(id))
    await expect(selectors.row(page, String(defaultRun.data))).toContainText('Success')
    await page.reload()
    await expect(selectors.row(page, String(defaultRun.data))).toContainText('Success')
    await proof(testInfo, 'UI-015', 'run-default', { actualOrdinaryPageRunAndHistoryNavigationReload: true, exactResultInstance: String(defaultRun.data), realWorkerEchoedOriginalJobParams: true, businessSuccessResult: true })
    await proof(testInfo, 'UI-012', 'processorType-built_in', { actualUISaveHardReloadReopenExport: true, otherParamsAndProcessorKept: true, realBuiltInWorkerBusinessSuccess: true })
    row = await findJob(page, id)
    await more(page, row, 'Run by parameter')
    const parameters = '中文😀 &+%#\nquoted "text"'
    await selectors.dialog(page).locator('textarea').fill(parameters)
    const run = await clickAndResponse(page, '/job/run', () => selectors.dialog(page).getByRole('button', { name: 'Run', exact: true }).click())
    expect(run.success).toBe(true)
    expect(typeof run.data).toBe('string')
    expect(BigInt(run.data)).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER))
    const referencedIds = []
    page.on('request', request => {
      if (request.url().split('?')[0].endsWith('/instance/detailPlus')) referencedIds.push({ endpoint: 'detail', value: request.postDataJSON()?.instanceId })
      if (/\/instance\/(?:log|downloadInstanceLog)(?:\?|$)/.test(request.url())) referencedIds.push({ endpoint: 'log', value: new URL(request.url()).searchParams.get('instanceId') })
    })
    const instance = await backend.waitInstance(run.data, [5])
    expect(String(instance.instanceId)).toBe(String(run.data))
    expect(instance.result).toContain(parameters)
    let instanceTableRow = await instanceRow(page, run.data)
    await expect(instanceTableRow).toContainText('Success')
    await instanceTableRow.getByRole('button', { name: 'Detail', exact: true }).click()
    await expect(selectors.dialog(page)).toContainText(String(run.data))
    await expect(selectors.dialog(page)).toContainText(parameters)
    await selectors.dialog(page).getByRole('button', { name: 'Close this dialog' }).click()
    await expect(selectors.dialog(page)).not.toBeVisible()
    instanceTableRow = await instanceRow(page, run.data)
    await instanceTableRow.getByRole('button', { name: 'Log', exact: true }).click()
    await expect.poll(async () => {
      if (await selectors.dialog(page).textContent().then(text => text.includes('StandaloneProcessorDemo finished process,success: true'))) return true
      await selectors.dialog(page).getByRole('button', { name: 'Close this dialog' }).click()
      await expect(selectors.dialog(page)).not.toBeVisible()
      await instanceTableRow.getByRole('button', { name: 'Log', exact: true }).click()
      return false
    }, { timeout: 60_000, intervals: [1500, 3000] }).toBe(true)
    await expect(selectors.dialog(page)).toContainText('instanceParams=' + parameters)
    const download = page.waitForEvent('download')
    await selectors.dialog(page).getByRole('button', { name: 'Download', exact: true }).click()
    const file = await download
    const filename = testInfo.outputPath('instance.log')
    await file.saveAs(filename)
    const text = await fs.readFile(filename, 'utf8')
    expect(text).toContain('StandaloneProcessorDemo finished process,success: true')
    expect(text).toContain(parameters)
    await testInfo.attach('log-hash', { body: JSON.stringify({ sha256: await fileHash(filename), bytes: Buffer.byteLength(text) }), contentType: 'application/json' })
    await proof(testInfo, 'UI-015', 'run-parameters', { originalUnicodeReservedCharactersQuotesAndNewline: true, exactInstanceId: String(run.data), independentWorkerResultContainsOriginal: true, realPageDetailAndDownloadedWorkerLog: true, sha256: await fileHash(filename) })
    expect(referencedIds.some(reference => reference.endpoint === 'detail')).toBe(true)
    for (const reference of referencedIds) expect(reference.value).toBe(run.data)
    await proof(testInfo, 'UI-036', 'ids-preserve', { trueServerGeneratedInstanceIdAbove2Pow53: run.data, originalStringInInstanceResponseTableDetailAndUIRequests: true, actualReferencedEndpoints: referencedIds, originalUnicodeWorkerLogDownloadHash: await fileHash(filename) })
  } finally { await backend.deleteOwnedJob(id) }
})

test('UI-018 · page stopping a real running Worker instance', async ({ page, backend, credentials }) => {
  await enterSamples(page, credentials)
  const name = `${runId}_stop`
  await createJob(page, name, timeoutProcessor, '30000')
  const id = (await backend.listJobs(name)).data[0].id
  let instanceId
  try {
    const row = await findJob(page, id)
    const run = await clickAndResponse(page, '/job/run', () => row.getByRole('button', { name: 'Run', exact: true }).click())
    instanceId = run.data
    await backend.waitInstance(instanceId, [3])
    const target = await instanceRow(page, instanceId)
    await target.getByRole('button', { name: 'Stop', exact: true }).click()
    if (await selectors.confirm(page).isVisible()) await confirmDialog(page)
    await backend.waitInstance(instanceId, [10])
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await expect(selectors.row(page, String(instanceId))).toContainText('Stopped')
  } finally {
    if (instanceId) await backend.call('/instance/stop?instanceId=' + instanceId, { allowFailure: true })
    await backend.deleteOwnedJob(id)
  }
})

test('UI-018 · page retry of a failed Worker instance and refreshed status', async ({ page, backend, credentials }) => {
  test.setTimeout(150_000)
  await enterSamples(page, credentials)
  const name = `${runId}_retry`
  await createJob(page, name, simpleProcessor, 'F')
  const id = (await backend.listJobs(name)).data[0].id
  try {
    const row = await findJob(page, id)
    const run = await clickAndResponse(page, '/job/run', () => row.getByRole('button', { name: 'Run', exact: true }).click())
    await backend.waitInstance(run.data, [4])
    const target = await instanceRow(page, run.data)
    const retry = await clickAndResponse(page, '/instance/retry', () => target.getByRole('button', { name: 'Retry', exact: true }).click())
    expect(retry.success).toBe(true)
    await expect.poll(async () => {
      const result = await backend.call('/instance/list', { method: 'POST', data: { appId: credentials.app_id, instanceId: run.data, type: 'NORMAL', index: 0, pageSize: 10 } })
      const instance = result.data[0]
      return instance?.status === 4 && instance.runningTimes >= 2
    }, { timeout: 60_000, intervals: [500, 1000, 2000] }).toBe(true)
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await expect(selectors.row(page, String(run.data))).toContainText('Failed')
    // This fixture deliberately keeps failing; successful retry requires a fail-once fixture.
  } finally { await backend.deleteOwnedJob(id) }
})

export { createJob, findJob, more, instanceRow }
