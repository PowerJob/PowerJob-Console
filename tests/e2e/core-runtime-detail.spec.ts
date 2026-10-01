import { assertNativeInstanceFacts } from './instance-oracle'
import crypto from 'node:crypto'
import { test, expect, selectors, fill, clickAndResponse, confirmDialog, enterSamples, id, runId, ownedName, observation, type RecordDTO, type Backend } from './helpers'
import { OwnedResources } from './owned'
import { createJob, editJob, saveJob } from './job-ui'
import { deployFixture } from './container-ui'

test.use({ actionTimeout: 15_000 })
async function ledgerEvents(request: import('@playwright/test').APIRequestContext, base: string, node: string, instanceId: string) {
  const url = new URL(base.replace(/\/$/, '') + '/events'); url.searchParams.set('runId', runId); url.searchParams.set('logicalNode', node)
  const response = await request.get(url.href); expect(response.ok()).toBe(true)
  return (await response.json() as RecordDTO[]).filter(item => String(item.instanceId) === instanceId)
}
async function configure(page: import('@playwright/test').Page, backend: Backend, owned: OwnedResources, containerId: string, mode: string, parameters: RecordDTO) {
  const job = await createJob(page, backend, owned, ownedName('detail_' + String(parameters.node)))
  const editor = await editJob(page, String(job.jobName)); await editor.getByLabel('Execution mode', { exact: true }).selectOption(mode); await editor.getByLabel('Processor type', { exact: true }).selectOption('EXTERNAL'); await fill(editor, 'Processor', containerId + '#tech.powerjob.acceptance.fixture.LedgerProcessor'); await fill(editor, 'Job parameters', JSON.stringify(parameters)); await saveJob(page)
  const result = await clickAndResponse(page, '/job/run', () => selectors.row(page, String(job.jobName)).getByRole('button', { name: 'Run', exact: true }).click()); expect(result.success).toBe(true)
  const instanceId = owned.trackInstance(id(result.data), id(job.id)); await backend.waitInstance(instanceId, [3]); return { job, instanceId }
}

test('UI-017 · actual Broadcast and MapReduce task fields, legal Worker SQL filters and root/shard sets reconcile with independent effects', async ({ page, backend, credentials, request }, info) => {
  test.setTimeout(240_000)
  const jar = process.env.POWERJOB_E2E_CONTAINER_JAR, ledger = process.env.POWERJOB_E2E_LEDGER, workerURL = process.env.POWERJOB_E2E_LEDGER_WORKER_URL
  if (!jar || !ledger || !workerURL) throw new Error('Configure the trusted runtime fixture and registered business ledger')
  const owned = new OwnedResources(backend)
  try {
    await enterSamples(page, credentials); const deployment = await deployFixture(page, backend, owned, ownedName('task_detail_container'), jar)
    for (const mode of ['BROADCAST', 'MAP_REDUCE']) {
      const node = mode.toLowerCase() + '_task_detail'
      const parameters = { runId, caseId: 'UI-017', appIdentity: 'owned-task-query-oracle', node, ledgerUrl: workerURL, mode, n: 9, batchSize: 3, sleepMs: mode === 'BROADCAST' ? 45000 : 15000, payload: 'task detail 中文 😀' }
      const { job, instanceId } = await configure(page, backend, owned, deployment.containerId, mode, parameters)
      const predicate = '1=1 order by task_id'
      let precondition: RecordDTO = {}
      await expect.poll(async () => { precondition = await backend.call<RecordDTO>('/instance/detailPlus', { method: 'POST', data: { instanceId, customQuery: predicate } }); const tasks = precondition.queriedTaskDetailInfoList as RecordDTO[] | undefined; return Number(precondition.status) === 3 && (mode === 'BROADCAST' ? tasks?.filter(task => task.taskName === 'OMS_BROADCAST_TASK' && Number(task.status) === 4).length === deployment.workers.length : tasks?.filter(task => task.taskName === 'fixture-square' && Number(task.status) === 4).length === 3) }, { timeout: 30_000, intervals: [200, 500] }).toBe(true)
      await page.goto('/#/oms/instance?jobId=' + id(job.id)); await fill(page, 'Instance ID', instanceId); expect((await clickAndResponse(page, '/instance/list', () => page.getByRole('button', { name: 'Search', exact: true }).click(), response => response.request().postDataJSON()?.instanceId === instanceId && response.request().postDataJSON()?.jobId === id(job.id))).success).toBe(true)
      await selectors.row(page, instanceId).getByRole('button', { name: 'Details', exact: true }).click(); const detail = selectors.dialog(page, 'Instance details #' + instanceId)
      await fill(detail, 'Query predicate', predicate)
      const original = await clickAndResponse<RecordDTO>(page, '/instance/detailPlus', () => detail.getByRole('button', { name: 'Search', exact: true }).click(), response => response.request().postDataJSON()?.customQuery === predicate); expect(original.success).toBe(true); expect(original.data.status).toBe(3); const exactRunningFacts = await assertNativeInstanceFacts(detail, instanceId, original.data)
      const tasks = original.data.queriedTaskDetailInfoList as RecordDTO[]; expect(tasks.length).toBeGreaterThan(0)
      const keys = ['taskId', 'taskName', 'taskContent', 'processorAddress', 'failedCnt', 'statusStr', 'createdTimeStr', 'lastModifiedTimeStr', 'lastReportTimeStr', 'result']
      const rows = detail.locator('tbody tr'); await expect(rows).toHaveCount(tasks.length)
      for (let index = 0; index < tasks.length; index++) expect(await rows.nth(index).locator('td').allTextContents()).toEqual(keys.map(key => String(tasks[index][key] ?? '—')))
      if (mode === 'BROADCAST') for (const worker of deployment.workers) expect(tasks.some(task => task.processorAddress === worker.address)).toBe(true)
      else {
        expect(tasks.filter(task => task.taskName === 'OMS_ROOT_TASK')).toHaveLength(1)
        const shards = tasks.filter(task => task.taskName === 'fixture-square'); expect(shards).toHaveLength(3)
        // Formal JsonUtils.toJSONString returns String inputs literally; the mapped fixture JSON String therefore needs exactly one parse.
        const ranges = shards.map(task => JSON.parse(String(task.taskContent)) as { start: number; end: number }).sort((a, b) => a.start - b.start)
        expect(ranges).toEqual([{ start: 0, end: 3 }, { start: 3, end: 6 }, { start: 6, end: 9 }])
      }
      await fill(detail, 'Query predicate', 'status = 4 order by task_id')
      const running = await clickAndResponse<RecordDTO>(page, '/instance/detailPlus', () => detail.getByRole('button', { name: 'Search', exact: true }).click()); expect(running.success).toBe(true)
      const runningTasks = running.data.queriedTaskDetailInfoList as RecordDTO[]; expect(runningTasks.length).toBeGreaterThan(0); for (const task of runningTasks) expect(task.status).toBe(4); await expect(detail.locator('tbody tr')).toHaveCount(runningTasks.length)
      await fill(detail, 'Query predicate', 'delete from task_info')
      expect((await clickAndResponse(page, '/instance/detailPlus', () => detail.getByRole('button', { name: 'Search', exact: true }).click())).success).toBe(false); await expect(detail.getByRole('alert')).toBeVisible()
      await fill(detail, 'Query predicate', predicate); expect((await clickAndResponse(page, '/instance/detailPlus', () => detail.getByRole('button', { name: 'Search', exact: true }).click())).success).toBe(true)
      const finished = await backend.waitInstance(instanceId, [5], 90_000)
      const events = await ledgerEvents(request, ledger, node, instanceId), commits = events.filter(event => event.event === 'COMMIT')
      if (mode === 'BROADCAST') { expect(commits).toHaveLength(2); for (const worker of deployment.workers) expect(commits.some(event => event.worker === worker.address)).toBe(true); expect(events.filter(event => event.event === 'PRE')).toHaveLength(1); expect(events.filter(event => event.event === 'POST')).toHaveLength(1) }
      else { expect(commits).toHaveLength(9); expect(commits.map(event => Number(event.entityKey)).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]); const expected = { count: 9, uniqueCount: 9, sum: 204, sha256: crypto.createHash('sha256').update(Array.from({ length: 9 }, (_, index) => index + ':' + index ** 2 + '\n').join('')).digest('hex') }; expect(JSON.parse(String(finished.result))).toEqual(expected) }
      const finalDetail = await clickAndResponse<RecordDTO>(page, '/instance/detailPlus', () => detail.getByRole('button', { name: 'Refresh details', exact: true }).click()); expect(finalDetail.success).toBe(true); expect(finalDetail.data.status).toBe(5); const exactFinishedFacts = await assertNativeInstanceFacts(detail, instanceId, finalDetail.data); await detail.getByRole('button', { name: 'Close', exact: true }).click()
      await observation(info, 'UI-017', mode === 'BROADCAST' ? 'detail-broadcast' : 'detail-mapreduce', { instanceId, jobId: id(job.id), actualRunningTaskRowsAllTenFieldsMatched: tasks, exactRunningFacts, exactFinishedFacts, actualSQLFilteredRunningTasks: runningTasks, originalLimitTenAndDMLRestrictionPreserved: true, exactRootAndShardRangesForMapReduce: mode === 'MAP_REDUCE', independentBusinessEffects: events, finalStatus: finished.status, actualFinalResult: finished.result })
      await observation(info, 'UI-017', 'detail-custom-query', { instanceId, mode, realWorkerWhileRunningEvaluatedBothLegalPredicates: [predicate, 'status = 4 order by task_id'], actualNonemptyRows: tasks, actualFilteredRunningRows: runningTasks, ControllerForbiddenDMLRejectedBeforeExecutionAndNativeCorrectionSucceeded: true })
    }
  } finally { await owned.cleanup(info) }
})

test('UI-018 · native Stop interrupts actual Worker before its ledger commit, Cancel is zero write and terminal status stays stopped', async ({ page, backend, credentials, request }, info) => {
  test.setTimeout(180_000)
  const jar = process.env.POWERJOB_E2E_CONTAINER_JAR, ledger = process.env.POWERJOB_E2E_LEDGER, workerURL = process.env.POWERJOB_E2E_LEDGER_WORKER_URL
  if (!jar || !ledger || !workerURL) throw new Error('Configure the trusted runtime fixture and registered independent ledger')
  const owned = new OwnedResources(backend)
  try {
    await enterSamples(page, credentials); const deployment = await deployFixture(page, backend, owned, ownedName('stop_ledger_container'), jar)
    const node = 'stop_before_effect'
    const { job, instanceId } = await configure(page, backend, owned, deployment.containerId, 'STANDALONE', { runId, caseId: 'UI-018', appIdentity: 'owned-stop-effect-oracle', node, ledgerUrl: workerURL, mode: 'STANDALONE', sleepMs: 15000, payload: 'must not commit after stop' })
    await expect.poll(async () => (await ledgerEvents(request, ledger, node, instanceId)).some(event => event.event === 'START')).toBe(true)
    await page.goto('/#/oms/instance?jobId=' + id(job.id)); await fill(page, 'Instance ID', instanceId); expect((await clickAndResponse(page, '/instance/list', () => page.getByRole('button', { name: 'Search', exact: true }).click(), response => response.request().postDataJSON()?.instanceId === instanceId && response.request().postDataJSON()?.jobId === id(job.id))).success).toBe(true)
    let stops = 0; page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/instance/stop')) stops++ })
    const row = selectors.row(page, instanceId); await row.getByRole('button', { name: 'Stop', exact: true }).click(); await confirmDialog(page, false); expect(stops).toBe(0); expect((await backend.instance(instanceId))?.status).toBe(3)
    await row.getByRole('button', { name: 'Stop', exact: true }).click(); expect((await clickAndResponse(page, '/instance/stop', () => confirmDialog(page))).success).toBe(true); expect(stops).toBe(1); await backend.waitInstance(instanceId, [10])
    await page.waitForTimeout(16_000)
    const events = await ledgerEvents(request, ledger, node, instanceId); expect(events.filter(event => event.event === 'START')).toHaveLength(1); expect(events.filter(event => event.event === 'COMMIT')).toHaveLength(0); expect(events.some(event => event.event === 'INTERRUPTED')).toBe(true); expect((await backend.instance(instanceId))?.status).toBe(10)
    await page.getByRole('button', { name: 'Refresh', exact: true }).click(); await expect(row).toContainText('Stopped')
    await observation(info, 'UI-018', 'stop-running', { jobId: id(job.id), instanceId, oneExactConfirmedStopRequest: stops, actualStartThenInterruptedEvents: events, observedBeyondOriginal15000msBusinessDelay: 16000, effectiveCommits: 0, finalServerAndNativeRowStatus: 10 })
    await observation(info, 'UI-018', 'stop-cancel', { instanceId, actualRunningBeforeAndAfterNativeCancel: 3, cancelledStopRequests: 0, subsequentExplicitConfirmTestedSeparately: true })
  } finally { await owned.cleanup(info) }
})
