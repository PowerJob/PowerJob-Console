import { assertNativeInstanceFacts } from './instance-oracle'
import type { Page } from '@playwright/test'
import { test, expect, selectors, fill, check, clickAndResponse, cancelDialog, confirmDialog, enterSamples, id, runId, ownedName, processors, observation, parseResult, type Backend, type RecordDTO, type PageDTO } from './helpers'
import { OwnedResources } from './owned'
import { createJob, editJob, saveJob, searchJob, moreJob, jobSection } from './job-ui'

test.use({ actionTimeout: 15_000 })

async function prepareJob(backend: Backend, owned: OwnedResources, original: RecordDTO, name: string, overrides: RecordDTO = {}) {
  await backend.call('/job/save', { method: 'POST', data: { ...original, id: null, jobName: name, enable: false, ...overrides } })
  const rows = (await backend.listJobs(name)).data.filter(row => row.jobName === name)
  expect(rows).toHaveLength(1)
  owned.track('job', id(rows[0].id), name)
  return rows[0]
}
async function exportOnPage(page: Page, name: string) {
  await moreJob(page, name, 'Export job')
  const dialog = selectors.dialog(page, 'Export job')
  await expect(dialog.getByLabel('Job JSON', { exact: true })).not.toHaveValue('')
  const result = JSON.parse(await dialog.getByLabel('Job JSON', { exact: true }).inputValue()) as RecordDTO
  await cancelDialog(page, 'Export job')
  return result
}

test('UI-011/032 · eleven exact-owned Jobs paginate, filter IDs/keywords, Reset and preserve edit-to-create isolation', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  const owned = new OwnedResources(backend)
  const prefix = ownedName('paging_job')
  try {
    await enterSamples(page, credentials)
    const original = await createJob(page, backend, owned, prefix + '_00')
    const jobs = [original]
    for (let number = 1; number < 11; number++) jobs.push(await prepareJob(backend, owned, original, prefix + '_' + String(number).padStart(2, '0')))
    await searchJob(page, prefix)
    const pager = page.getByRole('navigation', { name: 'Pagination', exact: true })
    await expect(page.locator('tbody tr')).toHaveCount(10)
    await expect(pager).toContainText('1 / 2')
    await expect(pager.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled()
    const second = await clickAndResponse<PageDTO<RecordDTO>>(page, '/job/list', () => pager.getByRole('button', { name: 'Next', exact: true }).click(), response => response.request().postDataJSON()?.index === 1)
    expect(second.success).toBe(true); expect(second.data.totalItems).toBe(11); expect(second.data.data).toHaveLength(1)
    await expect(pager).toContainText('2 / 2')
    await expect(page.locator('tbody tr')).toHaveCount(1)
    await expect(pager.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
    await expect(selectors.row(page, String(second.data.data[0].jobName))).toHaveCount(1)
    await fill(page, 'Job ID', id(original.id)); await fill(page, 'Keyword', '')
    const byID = await clickAndResponse<PageDTO<RecordDTO>>(page, '/job/list', () => page.getByRole('button', { name: 'Search', exact: true }).click(), response => response.request().postDataJSON()?.jobId === id(original.id) && response.request().postDataJSON()?.index === 0)
    expect(byID.data.data.map(value => id(value.id))).toEqual([id(original.id)])
    await expect(pager).not.toBeVisible()
    const reset = await clickAndResponse(page, '/job/list', () => page.getByRole('button', { name: 'Reset', exact: true }).click(), response => { const body = response.request().postDataJSON(); return body.index === 0 && !body.jobId && !body.keyword })
    expect(reset.success).toBe(true)
    await expect(page.getByLabel('Job ID', { exact: true })).toHaveValue(''); await expect(page.getByLabel('Keyword', { exact: true })).toHaveValue('')
    await searchJob(page, prefix)
    await expect(pager).toBeVisible(); await expect(pager).toContainText('1 / 2')
    await expect(pager.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled()
    await searchJob(page, String(original.jobName))
    await expect(pager).not.toBeVisible()
    const edit = await editJob(page, String(original.jobName))
    await fill(edit, 'Job parameters', 'discarded-instance-parameter-draft')
    await cancelDialog(page, 'Edit job')
    expect((await backend.job(id(original.id)))?.jobParams).toBe(original.jobParams)
    await page.getByRole('button', { name: 'New job', exact: true }).click()
    const fresh = selectors.dialog(page, 'New job')
    await expect(fresh.getByLabel('Job name', { exact: true })).toHaveValue('')
    await expect(fresh.getByLabel('Processor', { exact: true })).toHaveValue('')
    await expect(fresh.getByLabel('Job parameters', { exact: true })).toHaveValue('')
    const isolatedName = ownedName('after_edit_created')
    await fill(fresh, 'Job name', isolatedName); await fill(fresh, 'Processor', processors.simple); await check(fresh, 'Enable job', false)
    const created = await clickAndResponse(page, '/job/save', () => fresh.getByRole('button', { name: 'Save job', exact: true }).click(), response => { const body = response.request().postDataJSON(); return !body.id && body.jobName === isolatedName })
    expect(created.success).toBe(true); await expect(fresh).not.toBeVisible()
    const newJob = (await backend.listJobs(isolatedName)).data.find(value => value.jobName === isolatedName)!
    owned.track('job', id(newJob.id), isolatedName); expect(id(newJob.id)).not.toBe(id(original.id))
    expect((await backend.job(id(original.id)))?.jobParams).toBe(original.jobParams)
    await observation(info, 'UI-011', 'job-id-keyword-reset', { exactJobId: id(original.id), elevenOwnedJobIds: jobs.map(value => id(value.id)), nativeKeywordAndIDQueriesThenResetFirstPage: true })
    await observation(info, 'UI-011', 'job-pagination-boundary', { actualFirstPageRows: 10, actualSecondPageRows: 1, realTotal: second.data.totalItems, nextAndPreviousBoundaryDisabled: true, managementSinglePageHidden: true, multiPageVisibleAfterNativeRequery: true })
    await observation(info, 'UI-011', 'edit-then-create', { originalID: id(original.id), newID: id(newJob.id), originalParametersUnchanged: true, nativeNewDefaultsEmpty: true })
    await observation(info, 'UI-032', 'pagination-model', { nativePageControlMatchesActualZeroBasedQuery: true, tableRowsAndBoundariesVerified: true, managementSinglePageHidden: true, multiPageVisibleAfterNativeRequery: true })
    await observation(info, 'UI-032', 'form-draft-isolation', { nativeCancelledParametersAndFreshJobDoNotReusePriorIDOrValues: true })
  } finally { await owned.cleanup(info) }
})

test('UI-011/038 · missing-required drafts, original network save failure and double submit retain data then recover exactly once', async ({ page, backend, credentials }, info) => {
  const owned = new OwnedResources(backend)
  const name = ownedName('save_draft')
  let intercepted = false
  let releaseSave: (() => void) | undefined
  let committedJobId = ''
  try {
    await enterSamples(page, credentials); await page.goto('/#/oms/job')
    await page.getByRole('button', { name: 'New job', exact: true }).click()
    const dialog = selectors.dialog(page, 'New job')
    let saves = 0; page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/job/save')) saves++ })
    await fill(dialog, 'Job parameters', 'draft retained 中文 😀')
    await dialog.getByRole('button', { name: 'Save job', exact: true }).click()
    await expect(dialog.getByRole('alert')).toContainText('Job name and processor are required')
    expect(saves).toBe(0); await expect(dialog.getByLabel('Job parameters', { exact: true })).toHaveValue('draft retained 中文 😀')
    await fill(dialog, 'Job name', name); await fill(dialog, 'Processor', processors.simple); await check(dialog, 'Enable job', false)
    await page.route('**/job/save', async route => { if (!intercepted) { intercepted = true; await route.abort('failed') } else await route.continue() })
    await dialog.getByRole('button', { name: 'Save job', exact: true }).click()
    await expect(dialog.getByRole('alert')).toBeVisible(); await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('Job name', { exact: true })).toHaveValue(name); await expect(dialog.getByLabel('Job parameters', { exact: true })).toHaveValue('draft retained 中文 😀')
    expect((await backend.listJobs(name)).data).toHaveLength(0)
    await page.unroute('**/job/save')
    let forwarded = 0
    const held = new Promise<void>(resolve => { releaseSave = resolve })
    await page.route('**/job/save', async route => { forwarded++; const actual = await route.fetch(); expect(parseResult(await actual.text()).success).toBe(true); const committed = (await backend.listJobs(name)).data.filter(row => row.jobName === name); expect(committed).toHaveLength(1); committedJobId = owned.track('job', id(committed[0].id), name); await held; await route.fulfill({ response: actual }) })
    await dialog.getByRole('button', { name: 'Save job', exact: true }).click()
    await expect.poll(() => forwarded).toBe(1)
    await expect(dialog.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled()
    await page.keyboard.press('Enter')
    expect(forwarded).toBe(1)
    if (!releaseSave) throw new Error('The original held save response was not initialized')
    const savedResponse = page.waitForResponse(value => new URL(value.url()).pathname.endsWith('/job/save'))
    releaseSave(); await savedResponse; await expect(dialog).not.toBeVisible(); await page.unroute('**/job/save')
    const rows = (await backend.listJobs(name)).data.filter(row => row.jobName === name)
    expect(rows).toHaveLength(1); expect(id(rows[0].id)).toBe(committedJobId)
    expect(rows[0].jobParams).toBe('draft retained 中文 😀')
    await observation(info, 'UI-011', 'validation-draft', { invalidRequiredSubmitZeroRequest: true, draftRetainedThenCorrectedNativeCreate: true, jobId: id(rows[0].id) })
    await observation(info, 'UI-038', 'save-error-draft', { originalSaveRequestNetworkAbortNoReplacementBody: true, draftPreserved: true, subsequentActualServerResponseExactlyOneCommit: forwarded })
    await observation(info, 'UI-032', 'dialog-save-double-submit', { originalServerResponseHeldWithoutChangingBytes: true, disabledSavingButtonAndEnterMakeOneForwardedSave: forwarded, activeNewDefinitions: 1 })
  } finally { releaseSave?.(); await page.unroute('**/job/save'); await owned.cleanup(info) }
})

test('UI-013/036 · complete published Job metadata survives only-name edit, full export/import and copy while legacy integer configs remain exact', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  const owned = new OwnedResources(backend)
  const name = ownedName('full_metadata')
  try {
    await enterSamples(page, credentials)
    const seed = await createJob(page, backend, owned, ownedName('metadata_seed'))
    const extra = JSON.stringify({ future: { zero: 0, disabled: false, absent: null, text: '未来字段 中文 😀\n' } })
    const full = await prepareJob(backend, owned, seed, name, { jobDescription: 'description 中文 😀 & + % # "\nsecond line', jobParams: '参数\n{"value":"中文 &=+%#"}', tag: null, extra, timeExpressionType: 'CRON', timeExpression: '0 0 0 1 1 ? 2034', lifeCycle: { start: null, end: new Date('2035-01-01T00:00:00+08:00').getTime() }, maxInstanceNum: 3, concurrency: 2, instanceTimeLimit: 9999, instanceRetryNum: 1, taskRetryNum: 2, minCpuCores: 0.25, minMemorySpace: 0.5, minDiskSpace: 0.75, maxWorkerCount: 2, designatedWorkers: '', dispatchStrategy: 'RANDOM', dispatchStrategyConfig: 'hidden configuration 中文', alarmConfig: { alertThreshold: 1, statisticWindowLen: 20, silenceWindowLen: 30 }, logConfig: { type: 4, level: 3, loggerName: 'preserved.metadata.logger' }, advancedRuntimeConfig: { taskTrackerBehavior: 11 }, notifyUserIds: [] })
    const baseline = (await backend.job(id(full.id)))!
    expect(baseline.extra).toBe(extra); expect(baseline.lifeCycle).toEqual({ start: null, end: new Date('2035-01-01T00:00:00+08:00').getTime() })
    await searchJob(page, name); const editor = await editJob(page, name)
    const renamed = name + '_中文😀'; await fill(editor, 'Job name', renamed); await saveJob(page)
    await page.reload(); await searchJob(page, renamed)
    const reread = (await backend.job(id(full.id)))!
    for (const [key, value] of Object.entries(baseline)) if (!['jobName', 'gmtModified', 'nextTriggerTime', 'nextTriggerTimeStr'].includes(key)) expect(reread[key], 'Untouched formal Job field: ' + key).toEqual(value)
    expect(reread.jobName).toBe(renamed)
    const exported = await exportOnPage(page, renamed)
    const excluded = ['id', 'jobName', 'gmtCreate', 'gmtModified', 'nextTriggerTime', 'nextTriggerTimeStr']
    const originalServerExport = await backend.call<RecordDTO>('/job/export', { query: { jobId: id(full.id) } })
    for (const [key, value] of Object.entries(originalServerExport)) if (key !== 'jobName') expect(exported[key], 'UI export matches original formal conversion: ' + key).toEqual(value)
    expect(exported.notifyUserIds).toBeNull() // Formal JobConverter leaves an empty persisted notify string as null in SaveJobInfoRequest.
    expect(exported.enable).toBe(false); expect(exported.id).toBeNull()
    expect(Object.keys(exported).some(key => /password|jwtToken/.test(key))).toBe(false)
    const copyResponse = await clickAndResponse<RecordDTO>(page, '/job/copy', () => moreJob(page, renamed, 'Copy job'))
    expect(copyResponse.success).toBe(true)
    const copied = copyResponse.data
    expect(id(copied.id)).not.toBe(id(full.id)); expect(copied.jobName).toBe(renamed + '_COPY')
    owned.track('job', id(copied.id), String(copied.jobName))
    const copyEditor = selectors.dialog(page, 'Edit job'); const copiedName = ownedName('metadata_copy'); await fill(copyEditor, 'Job name', copiedName); await saveJob(page)
    const copyRead = (await backend.job(id(copied.id)))!
    for (const [key, value] of Object.entries(reread)) if (!excluded.includes(key)) expect(copyRead[key], 'Copied formal Job field: ' + key).toEqual(value)
    const importedName = ownedName('metadata_import'); exported.jobName = importedName; exported.id = null
    await page.getByRole('button', { name: 'Import job', exact: true }).click(); const importer = selectors.dialog(page, 'Import job'); await fill(importer, 'Job JSON', JSON.stringify(exported))
    expect((await clickAndResponse(page, '/job/save', () => importer.getByRole('button', { name: 'Import job', exact: true }).click())).success).toBe(true); await expect(importer).not.toBeVisible()
    const imported = (await backend.listJobs(importedName)).data.find(row => row.jobName === importedName)!
    owned.track('job', id(imported.id), importedName); expect(id(imported.id)).not.toBe(id(full.id)); await page.reload(); await searchJob(page, importedName)
    const importedExport = await exportOnPage(page, importedName)
    for (const [key, value] of Object.entries(exported)) if (!excluded.includes(key)) expect(importedExport[key], 'Imported/exported field: ' + key).toEqual(value)
    const legacy = await prepareJob(backend, owned, seed, ownedName('legacy_log_enum'), { logConfig: { type: 777, level: 778, loggerName: 'legacy.logger' }, advancedRuntimeConfig: { taskTrackerBehavior: 779 }, extra, tag: null })
    await searchJob(page, String(legacy.jobName)); const legacyEditor = await editJob(page, String(legacy.jobName)); await fill(legacyEditor, 'Description', 'legacy name-only equivalent edit'); await saveJob(page)
    await page.reload(); await searchJob(page, String(legacy.jobName)); const legacyActual = (await backend.job(id(legacy.id)))!
    expect(legacyActual.logConfig).toEqual(legacy.logConfig); expect(legacyActual.advancedRuntimeConfig).toEqual(legacy.advancedRuntimeConfig); expect(legacyActual.extra).toBe(extra); expect(legacyActual.tag).toBe(legacy.tag)
    await observation(info, 'UI-036', 'job-preserve-unknown', { onlyNameEditedByNativePage: true, originalReadbackFields: baseline, finalReadbackFields: reread, extraJSONZeroFalseNullUnicodeExact: true, typedFutureTopLevelNotClaimed: true })
    await observation(info, 'UI-036', 'nested-config-preserve', { originalAlarmLogAdvancedLifecycle: { alarmConfig: baseline.alarmConfig, logConfig: baseline.logConfig, advancedRuntimeConfig: baseline.advancedRuntimeConfig, lifeCycle: baseline.lifeCycle }, afterReadbackExactlyEqual: true, extraJSON: JSON.parse(extra), actualUIExportComparedEveryPersistedField: true })
    await observation(info, 'UI-036', 'legacy-enum-value', { legacyIntegerLogAndTaskTrackerReadback: { logConfig: legacyActual.logConfig, advancedRuntimeConfig: legacyActual.advancedRuntimeConfig }, nativeMetadataEditDidNotDefaultUnknownIntegers: true })
    for (const variant of ['copy-job', 'import-export-roundtrip', 'import-special-text']) await observation(info, 'UI-013', variant, { originalID: id(full.id), copyID: id(copied.id), importedID: id(imported.id), everyPersistedFormalFieldCompared: true, exactSpecialDescriptionAndParameters: { jobDescription: reread.jobDescription, jobParams: reread.jobParams }, explicitNestedAndEnableFalse: true })
    await observation(info, 'UI-011', 'edit-basic-roundtrip', { nativeOnlyNameEditHardRefresh: true, descriptionAndParamsPreviouslyPresetThenExactNativeReadbackAndExport: true, renamed })
  } finally { await owned.cleanup(info) }
})

test('UI-015 · native Run cancel/history/double action retains parameter isolation and exposes terminal business rejection', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  const owned = new OwnedResources(backend)
  const name = ownedName('run_action_parity')
  let releaseRun: (() => void) | undefined
  let committedInstance = ''
  try {
    await enterSamples(page, credentials); const job = await createJob(page, backend, owned, name, processors.timeout, '20000')
    let runRequests = 0; page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/job/run')) runRequests++ })
    await moreJob(page, name, 'Run with parameters'); const parameters = selectors.dialog(page, 'Run with parameters'); await fill(parameters, 'Instance parameters', 'cancel-only 中文 &=+%#'); await cancelDialog(page, 'Run with parameters'); expect(runRequests).toBe(0)
    const runs = await backend.call<PageDTO<RecordDTO>>('/instance/list', { method: 'POST', data: { appId: backend.appId, jobId: id(job.id), type: 'NORMAL', index: 0, pageSize: 100 } }); expect(runs.totalItems).toBe(0)
    let forwarded = 0; const held = new Promise<void>(resolve => { releaseRun = resolve })
    await page.route('**/job/run?*', async route => { forwarded++; const actual = await route.fetch(); const body = parseResult(await actual.text()); expect(body.success).toBe(true); committedInstance = owned.trackInstance(id(body.data), id(job.id)); await held; await route.fulfill({ response: actual }) })
    await selectors.row(page, name).getByRole('button', { name: 'Run', exact: true }).click()
    await expect.poll(() => forwarded).toBe(1); await expect(selectors.row(page, name).getByRole('button', { name: 'Run', exact: true })).toBeDisabled()
    await page.keyboard.press('Enter'); expect(forwarded).toBe(1)
    if (!releaseRun) throw new Error('No actual run response was held'); const replied = page.waitForResponse(value => new URL(value.url()).pathname.endsWith('/job/run')); releaseRun(); await replied; await page.unroute('**/job/run?*')
    const current = await backend.call<PageDTO<RecordDTO>>('/instance/list', { method: 'POST', data: { appId: backend.appId, jobId: id(job.id), type: 'NORMAL', index: 0, pageSize: 100 } }); expect(current.totalItems).toBe(1)
    const instanceId = id(current.data[0].instanceId); expect(instanceId).toBe(committedInstance); await backend.waitInstance(instanceId, [3])
    const snapshot = await backend.call<RecordDTO>('/instance/detailPlus', { method: 'POST', data: { instanceId, customQuery: 'status in (5,6)' } }); expect(snapshot.instanceParams == null || snapshot.instanceParams === '').toBe(true)
    await moreJob(page, name, 'Execution history'); await expect(page).toHaveURL(new RegExp('jobId=' + id(job.id))); await page.reload(); await expect(page.getByLabel('Job ID', { exact: true })).toHaveValue(id(job.id)); await expect(selectors.row(page, instanceId)).toHaveCount(1)
    const rejected = await clickAndResponse(page, '/instance/retry', () => selectors.row(page, instanceId).getByRole('button', { name: 'Retry', exact: true }).click()); expect(rejected.success).toBe(false); await expect(page.getByRole('alert')).toBeVisible(); expect((await backend.instance(instanceId))?.status).toBe(3)
    const runningDetail = await clickAndResponse<RecordDTO>(page, '/instance/detailPlus', () => selectors.row(page, instanceId).getByRole('button', { name: 'Details', exact: true }).click()); expect(runningDetail.success).toBe(true); expect(runningDetail.data.status).toBe(3); const detail = selectors.dialog(page, 'Instance details #' + instanceId); const exactRunningFacts = await assertNativeInstanceFacts(detail, instanceId, runningDetail.data); await detail.getByRole('button', { name: 'Close', exact: true }).click()
    await backend.waitInstance(instanceId, [5]); await page.getByRole('button', { name: 'Refresh', exact: true }).click(); await selectors.row(page, instanceId).getByRole('button', { name: 'Stop', exact: true }).click(); const terminal = await clickAndResponse(page, '/instance/stop', () => confirmDialog(page)); expect(terminal.success).toBe(false); await expect(page.getByRole('alert')).toBeVisible(); expect((await backend.instance(instanceId))?.status).toBe(5)
    for (const variant of ['run-cancel', 'run-double-click', 'run-history-route']) await observation(info, 'UI-015', variant, { jobId: id(job.id), instanceId, cancelledParamsNeverRunOrPolluteDefault: true, originalActualRunResponseHeldWithoutBodyChange: true, oneForwardedRunAndOneActualInstance: forwarded, historyNativeNavigationHardRefreshAndExactJobFilter: true })
    await observation(info, 'UI-017', 'detail-normal-running', { instanceId, realWorkerRunningStatus: 3, nativeDetailCorrectIDAndStatus: true, exactOriginalServerNineBusinessFactsPlusInstanceID: exactRunningFacts })
    await observation(info, 'UI-018', 'retry-terminal-feedback', { retryActualRunningInstanceRejected: true, stopActualSucceededInstanceRejected: true, statusNotFaked: true })
  } finally { releaseRun?.(); await page.unroute('**/job/run?*'); await owned.cleanup(info) }
})
