import { test, expect, selectors, fill, clickAndResponse, cancelDialog, confirmDialog, enterSamples, id, ownedName, observation, type Backend, type PageDTO, type RecordDTO } from './helpers'
import { OwnedResources } from './owned'
import { createJob, editJob, saveJob, searchJob, moreJob, jobSection } from './job-ui'
import { assertNativeInstanceFacts } from './instance-oracle'

test.use({ actionTimeout: 15_000 })

async function allJobInstances(backend: Backend, jobId: string) {
  const rows: { type: string; instanceId: string; status: number }[] = []
  for (const type of ['NORMAL', 'WORKFLOW']) {
    for (let index = 0; ; index++) {
      const actual = await backend.call<PageDTO<RecordDTO>>('/instance/list', { method: 'POST', data: { appId: backend.appId, jobId, type, index, pageSize: 100 } })
      expect(actual.data.every(row => id(row.jobId) === jobId)).toBe(true)
      rows.push(...actual.data.map(row => ({ type, instanceId: id(row.instanceId), status: Number(row.status) })))
      if ((index + 1) * 100 >= Number(actual.totalItems)) break
      expect(actual.data.length).toBeGreaterThan(0)
    }
  }
  return rows.sort((a, b) => (a.type + ':' + a.instanceId).localeCompare(b.type + ':' + b.instanceId))
}

test('UI-012 · native designated single Worker and SPECIFY selection run on each exact real target after save and hard reopen', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  const owned = new OwnedResources(backend)
  const name = ownedName('designated_actual_target')
  try {
    await enterSamples(page, credentials)
    const inventory = await backend.call<RecordDTO[]>('/system/listWorker', { query: { appId: backend.appId } })
    const workers = inventory.filter(worker => Number(worker.status) === 2)
    expect(workers).toHaveLength(2)
    const targets = workers.map(worker => String(worker.address)).sort()
    expect(new Set(targets).size).toBe(2)
    const job = await createJob(page, backend, owned, name)
    const runs: RecordDTO[] = []
    for (const target of targets) {
      const marker = 'CN ' + name + ' target=' + target
      let editor = await editJob(page, name)
      await fill(editor, 'Job parameters', marker)
      await jobSection(editor, 'Runtime')
      await fill(editor, 'Designated Workers', target)
      await editor.getByLabel('Dispatch strategy', { exact: true }).selectOption('SPECIFY')
      await fill(editor, 'Dispatch strategy config', target)
      await saveJob(page)
      const saved = (await backend.job(id(job.id)))!
      expect(saved.designatedWorkers).toBe(target)
      expect(saved.dispatchStrategy).toBe('SPECIFY')
      expect(saved.dispatchStrategyConfig).toBe(target)
      expect(saved.jobParams).toBe(marker)
      expect(saved.processorInfo).toBe(job.processorInfo)
      expect(saved.executeType).toBe('STANDALONE')
      await page.reload()
      await searchJob(page, name)
      editor = await editJob(page, name)
      await expect(editor.getByLabel('Job parameters', { exact: true })).toHaveValue(marker)
      await jobSection(editor, 'Runtime')
      await expect(editor.getByLabel('Designated Workers', { exact: true })).toHaveValue(target)
      await expect(editor.getByLabel('Dispatch strategy', { exact: true })).toHaveValue('SPECIFY')
      await expect(editor.getByLabel('Dispatch strategy config', { exact: true })).toHaveValue(target)
      await cancelDialog(page, 'Edit job')
      const run = await clickAndResponse(page, '/job/run', () => selectors.row(page, name).getByRole('button', { name: 'Run', exact: true }).click())
      expect(run.success).toBe(true)
      const instanceId = owned.trackInstance(id(run.data), id(job.id))
      const finished = await backend.waitInstance(instanceId, [5])
      expect(finished.taskTrackerAddress).toBe(target)
      expect(finished.result).toBe('任务成功啦！！！')
      await page.goto('/#/oms/instance?jobId=' + id(job.id))
      await fill(page, 'Instance ID', instanceId)
      const listed = await clickAndResponse<PageDTO<RecordDTO>>(page, '/instance/list', () => page.getByRole('button', { name: 'Search', exact: true }).click(), response => response.request().postDataJSON()?.instanceId === instanceId)
      expect(listed.success).toBe(true)
      expect(listed.data.data.map(row => id(row.instanceId))).toEqual([instanceId])
      const original = await clickAndResponse<RecordDTO>(page, '/instance/detailPlus', () => selectors.row(page, instanceId).getByRole('button', { name: 'Details', exact: true }).click())
      expect(original.success).toBe(true)
      expect(original.data.taskTrackerAddress).toBe(target)
      expect(original.data.jobParams).toBe(marker)
      expect(original.data.result).toBe('任务成功啦！！！')
      const detail = selectors.dialog(page, 'Instance details #' + instanceId)
      const facts = await assertNativeInstanceFacts(detail, instanceId, original.data)
      await detail.getByRole('button', { name: 'Close', exact: true }).click()
      // SimpleProcessor's actual Worker log and Chinese success result independently establish processing, not only dispatch selection.
      let actualLog = ''
      await expect.poll(async () => { const originalLog = await backend.call<{ data: string }>('/instance/log', { query: { instanceId, index: 0 } }); actualLog = originalLog.data; return actualLog.includes('Current job params:' + marker) }, { timeout: 45_000, intervals: [500, 1000, 2000] }).toBe(true)
      expect(actualLog).toContain(marker)
      runs.push({ target, instanceId, originalTaskTrackerAddress: original.data.taskTrackerAddress, originalParameters: original.data.jobParams, originalResult: original.data.result, exactNativeFacts: facts, originalWorkerLogHasUniqueMarker: true })
      await page.goto('/#/oms/job')
      await searchJob(page, name)
    }
    expect(new Set(runs.map(run => run.instanceId)).size).toBe(2)
    expect(runs.map(run => run.originalTaskTrackerAddress)).toEqual(targets)
    await observation(info, 'UI-012', 'designated-workers', { jobId: id(job.id), originalTwoWorkerInventory: inventory, runs, nativeSingleAddressSaveIndependentReadbackAndHardReopen: true, actualEachWorkerTargetMatchedTrackerParametersResultAndOriginalLog: true, noLedgerOrContainerFixtureAdded: true, sameHostProcessesNotMultiHostHA: true })
    await observation(info, 'UI-012', 'dispatchStrategy-specify', { jobId: id(job.id), originalSpecifyAddressConfigurationAndRealExecutionTargets: runs, originalServerSpecifyUtilsAddressContract: true, noFallbackTargetClaimed: true })
  } finally { await owned.cleanup(info) }
})

test('UI-014 · native owned Job deletion retains terminal history and the original Server rejects another run without creating any instance', async ({ page, backend, credentials }, info) => {
  const owned = new OwnedResources(backend)
  const name = ownedName('deleted_run_rejection')
  try {
    await enterSamples(page, credentials)
    const job = await createJob(page, backend, owned, name)
    const run = await clickAndResponse(page, '/job/run', () => selectors.row(page, name).getByRole('button', { name: 'Run', exact: true }).click())
    expect(run.success).toBe(true)
    const instanceId = owned.trackInstance(id(run.data), id(job.id))
    const terminal = await backend.waitInstance(instanceId, [5])
    expect(terminal.result).toBe('任务成功啦！！！')
    const beforeDelete = await allJobInstances(backend, id(job.id))
    expect(beforeDelete).toEqual([{ type: 'NORMAL', instanceId, status: 5 }])
    await moreJob(page, name, 'Delete job')
    const deleted = await clickAndResponse(page, '/job/delete', () => confirmDialog(page), response => new URL(response.url()).searchParams.get('jobId') === id(job.id))
    expect(deleted.success).toBe(true)
    await expect(selectors.row(page, name)).toHaveCount(0)
    await page.reload()
    await searchJob(page, name)
    expect((await backend.listJobs(name)).data.some(row => id(row.id) === id(job.id))).toBe(false)
    await expect(selectors.row(page, name)).toHaveCount(0)
    const afterDeleteBeforeRun = await allJobInstances(backend, id(job.id))
    expect(afterDeleteBeforeRun).toEqual(beforeDelete)
    // The native button has disappeared; explicitly use the real API rather than pretending an unavailable page action exists.
    const rejected = await backend.call('/job/run', { query: { jobId: id(job.id), appId: backend.appId }, allowFailure: true })
    expect(rejected.success).toBe(false)
    const afterRejectedRun = await allJobInstances(backend, id(job.id))
    expect(afterRejectedRun).toEqual(beforeDelete)
    expect((await backend.instance(instanceId))?.status).toBe(5)
    const preserved = await backend.call<RecordDTO>('/instance/detailPlus', { method: 'POST', data: { instanceId } })
    expect(preserved.jobParams).toBe(job.jobParams)
    expect(preserved.result).toBe(terminal.result)
    await observation(info, 'UI-014', 'delete-confirm', { jobId: id(job.id), instanceId, actualNativeOriginalDeleteResponseSucceeded: true, hardReloadKeywordAndNativeRowAbsent: true, beforeDelete, afterDeleteBeforeRun, afterRejectedRun, originalDeletedRunResult: rejected, directOriginalAPIAfterNativeButtonDisappeared: true, noResponseFabrication: true, everyNormalAndWorkflowInstanceIDCountAndStatusUnchanged: true, terminalParametersAndResultRetained: true, softDeletionNotHardDeletion: true })
  } finally { await owned.cleanup(info) }
})
