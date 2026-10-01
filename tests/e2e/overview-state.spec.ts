import { test, expect, enterSamples, selectors, clickAndResponse, id, ownedName, processors, observation, type RecordDTO } from './helpers'
import { createJob } from './job-ui'
import { OwnedResources } from './owned'

test('UI-010 · actual overview counts follow a native Job through running and completion while every real Worker field remains readable', async ({ page, backend, credentials }, info) => {
  const owned = new OwnedResources(backend)
  const timeline: RecordDTO[] = []
  async function snapshot(phase: string) {
    await page.goto('/#/oms/home')
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
    const actual = await clickAndResponse<RecordDTO>(page, '/system/overview', () => page.getByRole('button', { name: 'Refresh', exact: true }).click())
    expect(actual.success).toBe(true)
    for (const [label, field] of [['Scheduled jobs', 'jobCount'], ['Running now', 'runningInstanceCount'], ['Recent failures', 'failedInstanceCount']]) {
      const metric = page.locator('.overview-metrics > section').filter({ has: page.getByText(label, { exact: true }) })
      await expect(metric.locator('strong')).toHaveText(String(actual.data[field]))
    }
    const independent = await backend.call<RecordDTO>('/system/overview', { query: { appId: backend.appId } })
    for (const field of ['jobCount', 'runningInstanceCount', 'failedInstanceCount']) expect(actual.data[field]).toBe(independent[field])
    timeline.push({ phase, originalOverview: actual.data, independentReadback: independent })
    return actual.data
  }
  try {
    await enterSamples(page, credentials)
    const job = await createJob(page, backend, owned, ownedName('overview_running'), processors.timeout, '20000')
    const before = await snapshot('before-run')
    await page.goto('/#/oms/job')
    await page.getByLabel('Keyword', { exact: true }).fill(String(job.jobName))
    await clickAndResponse(page, '/job/list', () => page.getByRole('button', { name: 'Search', exact: true }).click(), response => response.request().postDataJSON()?.keyword === job.jobName)
    const ran = await clickAndResponse(page, '/job/run', () => selectors.row(page, String(job.jobName)).getByRole('button', { name: 'Run', exact: true }).click())
    expect(ran.success).toBe(true)
    const instanceId = owned.trackInstance(id(ran.data), id(job.id))
    const running = await backend.waitInstance(instanceId, [3])
    const during = await snapshot('real-worker-running')
    expect(Number(during.runningInstanceCount)).toBeGreaterThan(Number(before.runningInstanceCount))
    expect(during.jobCount).toBe(before.jobCount)
    const originalWorkers = await clickAndResponse<RecordDTO[]>(page, '/system/listWorker', () => page.getByRole('button', { name: 'Refresh', exact: true }).click())
    expect(originalWorkers.success).toBe(true)
    expect(originalWorkers.data).toHaveLength(2)
    for (const worker of originalWorkers.data) {
      const row = selectors.row(page, String(worker.address))
      for (const field of ['address', 'tag', 'cpuLoad', 'memoryLoad', 'diskLoad', 'lastActiveTime']) await expect(row).toContainText(String(worker[field]))
      await expect(row.locator('.badge')).toHaveText(({ 1: 'Healthy', 2: 'Resource warning', 3: 'Resource pressure', 4: 'Resource pressure', 9999: 'Offline' } as Record<string, string>)[String(worker.status)] || 'Unknown')
    }
    const completed = await backend.waitInstance(instanceId, [5])
    const after = await snapshot('real-worker-completed')
    expect(after.runningInstanceCount).toBe(before.runningInstanceCount)
    expect(after.jobCount).toBe(before.jobCount)
    await observation(info, 'UI-010', 'overview-states', { jobId: id(job.id), instanceId, running, completed, timeline, sameActualInstanceObservedBeforeAndAfter: true })
    await observation(info, 'UI-010', 'two-workers', { originalWorkers: originalWorkers.data, allSixVisibleFieldsAndStatusMatched: true })
  } finally { await owned.cleanup(info) }
})
