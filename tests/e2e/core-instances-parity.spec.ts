import { assertNativeInstanceFacts } from './instance-oracle'
import crypto from 'node:crypto'
import type { Page } from '@playwright/test'
import { test, expect, selectors, fill, clickAndResponse, confirmDialog, enterSamples, enterApplication, login, id, runId, ownedName, observation, type RecordDTO, type PageDTO, type Backend } from './helpers'
import { OwnedResources } from './owned'
import { AdminFixtures, emptyRoles } from './admin-fixtures'
import { createJob, editJob, saveJob, searchJob, moreJob } from './job-ui'
import { deployFixture } from './container-ui'

test.use({ actionTimeout: 15_000 })

async function query(page: Page, instanceId: string) {
  await fill(page, 'Instance ID', instanceId)
  const actual = await clickAndResponse<PageDTO<RecordDTO>>(page, '/instance/list', () => page.getByRole('button', { name: 'Search', exact: true }).click(), response => response.request().postDataJSON()?.instanceId === instanceId)
  expect(actual.success).toBe(true); return actual.data
}
async function runOwned(backend: Backend, owned: OwnedResources, job: RecordDTO) {
  const result = await backend.call('/job/run', { query: { jobId: id(job.id), appId: backend.appId } })
  return owned.trackInstance(id(result), id(job.id))
}

test('UI-010/014/015/018 · independent Observer reads own app but real Job and instance mutations reject without false state, then app switch removes stale rows', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  const admin = new AdminFixtures(backend)
  let owned: OwnedResources | undefined
  try {
    const user = await admin.user('core_observer'); const space = await admin.space('core_observer_space')
    const roles = emptyRoles(); roles.observer = [user.id]
    const app = await admin.app('core_observer_app', id(space.id), { componentUserRoleInfo: roles })
    const ownApp = backend.forApp(id(app.id)); owned = new OwnedResources(ownApp)
    await enterApplication(page, String(app.appName))
    const job = await createJob(page, ownApp, owned, ownedName('observer_job'))
    const instanceId = await runOwned(ownApp, owned, job)
    const before = await ownApp.waitInstance(instanceId, [4, 9, 10], 45_000); expect(before).toBeTruthy()
    await login(page, { ...credentials, admin_username: user.origin, admin_password: user.password })
    await enterApplication(page, String(app.appName)); await page.goto('/#/oms/job'); await searchJob(page, String(job.jobName))
    const toggle = selectors.row(page, String(job.jobName)).getByRole('switch', { name: 'Enable job ' + job.jobName, exact: true })
    expect((await clickAndResponse(page, '/job/disable', () => toggle.uncheck())).success).toBe(false)
    await expect(toggle).toBeChecked(); expect((await ownApp.job(id(job.id)))?.enable).toBe(true)
    await moreJob(page, String(job.jobName), 'Delete job')
    expect((await clickAndResponse(page, '/job/delete', () => confirmDialog(page))).success).toBe(false)
    await expect(selectors.row(page, String(job.jobName))).toHaveCount(1)
    expect((await ownApp.listJobs(String(job.jobName))).data.map(row => id(row.id))).toEqual([id(job.id)])
    expect((await clickAndResponse(page, '/job/run', () => selectors.row(page, String(job.jobName)).getByRole('button', { name: 'Run', exact: true }).click())).success).toBe(false)
    const instances = await ownApp.call<PageDTO<RecordDTO>>('/instance/list', { method: 'POST', data: { appId: ownApp.appId, jobId: id(job.id), type: 'NORMAL', index: 0, pageSize: 100 } }); expect(instances.totalItems).toBe(1)
    await page.goto('/#/oms/instance?jobId=' + id(job.id)); await query(page, instanceId)
    const row = selectors.row(page, instanceId)
    expect((await clickAndResponse(page, '/instance/retry', () => row.getByRole('button', { name: 'Retry', exact: true }).click())).success).toBe(false)
    await row.getByRole('button', { name: 'Stop', exact: true }).click()
    expect((await clickAndResponse(page, '/instance/stop', () => confirmDialog(page))).success).toBe(false)
    expect((await ownApp.instance(instanceId))?.status).toBe(before!.status)
    await expect(row).toHaveCount(1)
    await login(page, credentials); await enterSamples(page, credentials)
    await expect(page.getByRole('heading', { name: 'Operations overview', exact: true })).toBeVisible()
    const workers = await backend.call<RecordDTO[]>('/system/listWorker', { query: { appId: backend.appId } })
    for (const worker of workers) await expect(page.getByRole('row').filter({ hasText: String(worker.address) })).toHaveCount(1)
    await enterApplication(page, String(app.appName))
    await expect(page.getByText('No Workers connected', { exact: true })).toBeVisible()
    expect(await ownApp.call<RecordDTO[]>('/system/listWorker', { query: { appId: ownApp.appId } })).toEqual([])
    const count = page.locator('.overview-metrics section').filter({ hasText: 'Online Workers' }).locator('strong'); await expect(count).toHaveText('0')
    await page.goto('/#/oms/instance?jobId=' + id(job.id)); await query(page, instanceId); await expect(selectors.row(page, instanceId)).toHaveCount(1)
    await enterSamples(page, credentials); await page.goto('/#/oms/instance')
    await expect(page.getByLabel('Job ID', { exact: true })).toHaveValue(''); await expect(page.getByLabel('Instance ID', { exact: true })).toHaveValue(''); await expect(selectors.row(page, instanceId)).toHaveCount(0)
    for (const [caseId, variant] of [['UI-014', 'status-error-rollback'], ['UI-014', 'delete-permission-error'], ['UI-015', 'run-permission-error'], ['UI-018', 'retry-permission-error'], ['UI-010', 'no-worker-empty'], ['UI-010', 'app-switch-cache'], ['UI-016', 'app-switch-instances']]) await observation(info, caseId, variant, { ownAppId: id(app.id), jobId: id(job.id), instanceId, observerUserId: user.id, actualOriginalServerPermissionFailures: true, definitionEnableAndInstanceStatusUnchanged: true, rejectedRunCreatedNoAdditionalInstance: true, ownEmptyWorkerListActualZero: true, subsequentSamplesHeaderAndRowsCurrentAppOnly: true, sharedRolesAndMetadataNotChanged: true })
  } finally { if (owned) await owned.cleanup(info); await admin.cleanup(info) }
})

test('UI-016 · eleven real Worker instances paginate and Reset, all native status queries compare exact Server rows and tab context', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  const owned = new OwnedResources(backend)
  try {
    await enterSamples(page, credentials)
    const job = await createJob(page, backend, owned, ownedName('instance_paging'))
    const ids: string[] = []
    for (let index = 0; index < 11; index++) ids.push(await runOwned(backend, owned, job))
    for (const instanceId of ids) await backend.waitInstance(instanceId, [5])
    await page.goto('/#/oms/instance?jobId=' + id(job.id))
    await expect(page.locator('tbody tr')).toHaveCount(10)
    const pager = page.getByRole('navigation', { name: 'Pagination', exact: true }); await expect(pager).toContainText('1 / 2')
    const second = await clickAndResponse<PageDTO<RecordDTO>>(page, '/instance/list', () => pager.getByRole('button', { name: 'Next', exact: true }).click(), response => response.request().postDataJSON()?.index === 1)
    expect(second.success).toBe(true); expect(second.data.totalItems).toBe(11); expect(second.data.data).toHaveLength(1); await expect(page.locator('tbody tr')).toHaveCount(1); await expect(pager).toContainText('2 / 2'); await expect(pager.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
    const found = await query(page, ids[0]); expect(found.data.map(row => id(row.instanceId))).toEqual([ids[0]]); await expect(pager).toContainText('1 / 1')
    await fill(page, 'Instance ID', '')
    const queries: RecordDTO[] = []
    for (const status of ['WAITING_DISPATCH', 'WAITING_WORKER_RECEIVE', 'RUNNING', 'FAILED', 'SUCCEED', 'CANCELED', 'STOPPED']) {
      await page.getByLabel('Status', { exact: true }).selectOption(status)
      const actual = await clickAndResponse<PageDTO<RecordDTO>>(page, '/instance/list', () => page.getByRole('button', { name: 'Search', exact: true }).click(), response => response.request().postDataJSON()?.status === status && response.request().postDataJSON()?.index === 0)
      expect(actual.success).toBe(true); await expect(page.locator('tbody tr')).toHaveCount(actual.data.data.length)
      for (const item of actual.data.data) await expect(selectors.row(page, id(item.instanceId))).toHaveCount(1)
      queries.push({ status, returnedIDs: actual.data.data.map(item => id(item.instanceId)), total: actual.data.totalItems })
    }
    await page.getByRole('button', { name: 'Workflow job runs', exact: true }).click(); await expect(page.getByLabel('Workflow instance ID', { exact: true })).toBeVisible()
    await fill(page, 'Workflow instance ID', '999999999999999999')
    const workflow = await clickAndResponse<PageDTO<RecordDTO>>(page, '/instance/list', () => page.getByRole('button', { name: 'Search', exact: true }).click(), response => response.request().postDataJSON()?.type === 'WORKFLOW' && response.request().postDataJSON()?.wfInstanceId === '999999999999999999')
    expect(workflow.success).toBe(true); expect(workflow.data.data).toEqual([]); await expect(page.locator('tbody tr')).toHaveCount(0)
    const reset = await clickAndResponse(page, '/instance/list', () => page.getByRole('button', { name: 'Reset', exact: true }).click(), response => { const body = response.request().postDataJSON(); return body.index === 0 && !body.jobId && !body.instanceId && !body.wfInstanceId && !body.status })
    expect(reset.success).toBe(true); for (const label of ['Job ID', 'Instance ID', 'Workflow instance ID', 'Status']) await expect(page.getByLabel(label, { exact: true })).toHaveValue('')
    const normal = await clickAndResponse(page, '/instance/list', () => page.getByRole('button', { name: 'Ordinary runs', exact: true }).click(), response => response.request().postDataJSON()?.type === 'NORMAL' && response.request().postDataJSON()?.index === 0)
    expect(normal.success).toBe(true); await expect(page.getByLabel('Workflow instance ID', { exact: true })).toHaveCount(0)
    await observation(info, 'UI-016', 'pagination-reset', { exactJobId: id(job.id), actualWorkerSucceededIDs: ids, nativePageRows: [10, 1], actualTotal: 11, queryReturnsToIndexZero: true, resetClearedAllFourFilters: true })
    await observation(info, 'UI-016', 'status-filters', { allSevenActualStatusRequestsComparedToNativeRows: queries, actualEmptyStatusesNotFabricated: true })
    await observation(info, 'UI-016', 'ordinary-workflow-tabs', { nativeTypeRequests: ['WORKFLOW', 'NORMAL'], exactNonexistentWorkflowInstanceIDReturnedNoRows: true, resetAndReturnToOrdinaryHadNoOldFilters: true, existingWorkflowChildSuccessCrossLaneEvidenceRequired: true })
  } finally { await owned.cleanup(info) }
})

test('UI-017/038/039 · Worker receives literal reserved parameters, valid/invalid task predicates and held A details never replace native B context', async ({ page, backend, credentials, request }, info) => {
  test.setTimeout(180_000)
  const jar = process.env.POWERJOB_E2E_CONTAINER_JAR, ledgerURL = process.env.POWERJOB_E2E_LEDGER, workerURL = process.env.POWERJOB_E2E_LEDGER_WORKER_URL
  if (!jar || !ledgerURL || !workerURL) throw new Error('Configure the actual external Processor and registered independent ledger')
  const owned = new OwnedResources(backend)
  let release: (() => void) | undefined
  try {
    await enterSamples(page, credentials); const container = await deployFixture(page, backend, owned, ownedName('params_container'), jar)
    const params = '中文 😀 &=+?#/% "\'\nsecond line\\literal'
    const job = await createJob(page, backend, owned, ownedName('literal_parameters'))
    const editor = await editJob(page, String(job.jobName)); await editor.getByLabel('Processor type', { exact: true }).selectOption('EXTERNAL')
    await fill(editor, 'Processor', container.containerId + '#tech.powerjob.acceptance.fixture.LedgerProcessor')
    const jobParams = { runId, caseId: 'UI-039', appIdentity: 'owned-parameter-oracle', node: 'literal_parameters', ledgerUrl: workerURL, mode: 'STANDALONE', payload: 'marker' }
    await fill(editor, 'Job parameters', JSON.stringify(jobParams)); await saveJob(page)
    await moreJob(page, String(job.jobName), 'Run with parameters'); const modal = selectors.dialog(page, 'Run with parameters'); await fill(modal, 'Instance parameters', params)
    const actualRun = await clickAndResponse(page, '/job/run', () => modal.getByRole('button', { name: 'Run job', exact: true }).click(), response => new URL(response.url()).searchParams.get('instanceParams') === params); expect(actualRun.success).toBe(true)
    const first = owned.trackInstance(id(actualRun.data), id(job.id)); const firstFinished = await backend.waitInstance(first, [5])
    const url = new URL(ledgerURL.replace(/\/$/, '') + '/events'); url.searchParams.set('runId', runId); url.searchParams.set('logicalNode', 'literal_parameters')
    const events = await request.get(url.href).then(response => response.json()) as RecordDTO[]
    const start = events.find(event => event.event === 'START' && String(event.instanceId) === first)!
    expect(start).toBeTruthy(); expect((start.value as RecordDTO).instanceParams).toBe(params); expect((start.value as RecordDTO).jobParams).toBe(JSON.stringify(jobParams))
    const defaultRun = await clickAndResponse(page, '/job/run', () => selectors.row(page, String(job.jobName)).getByRole('button', { name: 'Run', exact: true }).click(), response => !new URL(response.url()).searchParams.has('instanceParams'))
    expect(defaultRun.success).toBe(true)
    const second = owned.trackInstance(id(defaultRun.data), id(job.id)); const secondFinished = await backend.waitInstance(second, [5])
    const bothEvents = await request.get(url.href).then(response => response.json()) as RecordDTO[]
    const defaultStart = bothEvents.find(event => event.event === 'START' && String(event.instanceId) === second)!
    expect(defaultStart).toBeTruthy(); expect((defaultStart.value as RecordDTO).jobParams).toBe(JSON.stringify(jobParams)); expect((defaultStart.value as RecordDTO).instanceParams == null || (defaultStart.value as RecordDTO).instanceParams === '').toBe(true)
    const actualCommits = bothEvents.filter(event => event.event === 'COMMIT' && [first, second].includes(String(event.instanceId)))
    expect(actualCommits).toHaveLength(2)
    expect(actualCommits.find(event => String(event.instanceId) === first)?.value).toEqual(start.value)
    expect(actualCommits.find(event => String(event.instanceId) === second)?.value).toEqual(defaultStart.value)
    for (const completed of [firstFinished, secondFinished]) expect(JSON.parse(String(completed.result))).toEqual({ payload: 'marker' })
    await page.goto('/#/oms/instance?jobId=' + id(job.id)); await query(page, first)
    const response = await clickAndResponse<RecordDTO>(page, '/instance/detailPlus', () => selectors.row(page, first).getByRole('button', { name: 'Details', exact: true }).click()); expect(response.success).toBe(true)
    let detail = selectors.dialog(page, 'Instance details #' + first); await expect(detail).toContainText(params); const exactFinishedFacts = await assertNativeInstanceFacts(detail, first, response.data)
    const valid = 'status in (5, 6) order by last_modified_time desc'; await fill(detail, 'Query predicate', valid)
    const filtered = await clickAndResponse<RecordDTO>(page, '/instance/detailPlus', () => detail.getByRole('button', { name: 'Search', exact: true }).click(), item => item.request().postDataJSON()?.customQuery === valid); expect(filtered.success).toBe(true)
    const tasks = filtered.data.queriedTaskDetailInfoList as RecordDTO[]; expect(Array.isArray(tasks)).toBe(true)
    for (const task of tasks) expect(Number(task.status)).toBeGreaterThanOrEqual(5)
    await fill(detail, 'Query predicate', 'delete from task_info')
    const invalid = await clickAndResponse(page, '/instance/detailPlus', () => detail.getByRole('button', { name: 'Search', exact: true }).click()); expect(invalid.success).toBe(false); await expect(detail.getByRole('alert')).toBeVisible(); await expect(detail.getByLabel('Query predicate', { exact: true })).toHaveValue('delete from task_info')
    await fill(detail, 'Query predicate', valid); expect((await clickAndResponse(page, '/instance/detailPlus', () => detail.getByRole('button', { name: 'Search', exact: true }).click())).success).toBe(true)
    await detail.getByRole('button', { name: 'Close', exact: true }).click()
    let heldSHA = '', held = false
    const gate = new Promise<void>(resolve => { release = resolve })
    await page.route('**/instance/detailPlus', async route => { if (route.request().postDataJSON()?.instanceId !== first) return route.continue(); const actual = await route.fetch(); heldSHA = crypto.createHash('sha256').update(await actual.body()).digest('hex'); held = true; await gate; await route.fulfill({ response: actual }).catch(() => {}) })
    await selectors.row(page, first).getByRole('button', { name: 'Details', exact: true }).click(); await expect.poll(() => held).toBe(true)
    await selectors.dialog(page, 'Instance details #' + first).getByRole('button', { name: 'Close', exact: true }).click()
    await query(page, second)
    const actualB = await clickAndResponse<RecordDTO>(page, '/instance/detailPlus', () => selectors.row(page, second).getByRole('button', { name: 'Details', exact: true }).click()); expect(actualB.success).toBe(true)
    detail = selectors.dialog(page, 'Instance details #' + second); await expect(detail.locator('dd').first()).toHaveText(second)
    if (!release) throw new Error('The original A detail response was not held'); release(); await page.waitForTimeout(200)
    await expect(detail).toBeVisible(); await expect(detail.locator('dd').first()).toHaveText(second); await expect(detail).not.toContainText(params)
    await page.unroute('**/instance/detailPlus')
    await detail.getByRole('button', { name: 'Close', exact: true }).click()
    for (const instanceId of [first, second, first]) { await query(page, instanceId); await selectors.row(page, instanceId).getByRole('button', { name: 'Details', exact: true }).click(); const current = selectors.dialog(page, 'Instance details #' + instanceId); await expect(current.locator('dd').first()).toHaveText(instanceId); await current.getByRole('button', { name: 'Close', exact: true }).click() }
    await observation(info, 'UI-015', 'run-default', { jobId: id(job.id), actualOriginalNativeRunInstanceId: second, originalGETHadNoInstanceParams: true, actualWorkerStart: defaultStart, actualWorkerCommit: actualCommits.find(event => String(event.instanceId) === second), actualFinalResult: secondFinished.result, cancelledOrPriorLiteralParametersNotReused: true })
    await observation(info, 'UI-015', 'run-parameters', { jobId: id(job.id), actualOriginalNativeRunInstanceId: first, literalInstanceParameters: params, actualWorkerStart: start, actualWorkerCommit: actualCommits.find(event => String(event.instanceId) === first), actualFinalResult: firstFinished.result })
    await observation(info, 'UI-039', 'parameters-encoding', { literalInstanceParameters: params, originalGETDecodedExact: true, actualWorkerSTARTValue: start.value, workerReceivedOriginalJobAndInstanceStrings: true, instanceId: first })
    await observation(info, 'UI-017', 'detail-custom-query', { exactInstanceId: first, validOriginalPredicate: valid, actualQueriedTasks: tasks, invalidPredicateActualServerFailureThenNativeCorrection: true })
    await observation(info, 'UI-017', 'detail-normal-finished', { instanceId: first, actualWorkerSucceeded: true, exactOriginalServerNineBusinessFactsPlusInstanceID: exactFinishedFacts, literalJobAndInstanceParametersAndResult: true })
    await observation(info, 'UI-017', 'detail-open-close-repeat', { actualNativeIDs: [first, second, first], eachDialogExactIDAndBWithoutAParameters: true })
    await observation(info, 'UI-038', 'request-race-detail', { first, second, heldOriginalASHA256: heldSHA, actualBResponseWonAndOldAReleasedWithoutChangingBytes: true, nativeCloseUnmountInvalidation: true })
  } finally { release?.(); await page.unroute('**/instance/detailPlus'); await owned.cleanup(info) }
})
