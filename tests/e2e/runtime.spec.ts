import crypto from 'node:crypto'
import { test, expect, selectors, fill, clickAndResponse, enterSamples, id, runId, ownedName, observation, type RecordDTO } from './helpers'
import { OwnedResources } from './owned'
import { createJob, editJob, saveJob } from './job-ui'
import { deployFixture } from './container-ui'

test.use({ actionTimeout: 15_000 })

test('UI-012/017 · actual standalone, broadcast, map and mapreduce execution matches a bounded independent ledger', async ({ page, backend, credentials, request }, info) => {
  test.setTimeout(180_000)
  const jar = process.env.POWERJOB_E2E_CONTAINER_JAR
  const ledgerBase = process.env.POWERJOB_E2E_LEDGER
  const ledgerWorkerURL = process.env.POWERJOB_E2E_LEDGER_WORKER_URL
  test.skip(!jar || !ledgerBase || !ledgerWorkerURL, 'BLOCKED: configure the trusted LedgerProcessor JAR and registered synthetic business ledger')
  const owned = new OwnedResources(backend)
  try {
    await enterSamples(page, credentials)
    const deployment = await deployFixture(page, backend, owned, ownedName('runtime_jar'), jar!)
    for (const mode of ['STANDALONE', 'BROADCAST', 'MAP', 'MAP_REDUCE']) {
      const name = ownedName(`runtime_${mode.toLowerCase()}`)
      const node = `native_${mode.toLowerCase()}`
      const job = await createJob(page, backend, owned, name)
      const editor = await editJob(page, name)
      await editor.getByLabel('Execution mode', { exact: true }).selectOption(mode)
      await editor.getByLabel('Processor type', { exact: true }).selectOption('EXTERNAL')
      await fill(editor, 'Processor', `${deployment.containerId}#tech.powerjob.acceptance.fixture.LedgerProcessor`)
      const parameters = { runId, caseId: `UI-012-${mode}`, appIdentity: 'owned-native-execution-fixture', node, ledgerUrl: ledgerWorkerURL, mode, n: 9, batchSize: 3, sleepMs: 0, payload: '中文 😀 exact value' }
      await fill(editor, 'Job parameters', JSON.stringify(parameters))
      await saveJob(page)
      const saved = (await backend.job(id(job.id)))!
      expect(saved.executeType).toBe(mode)
      expect(saved.processorType).toBe('EXTERNAL')
      expect(JSON.parse(String(saved.jobParams))).toEqual(parameters)
      const run = await clickAndResponse(page, '/job/run', () => selectors.row(page, name).getByRole('button', { name: 'Run', exact: true }).click())
      expect(run.success).toBe(true)
      const instanceId = owned.trackInstance(id(run.data), id(job.id))
      const instance = await backend.waitInstance(instanceId, [5], 180_000)
      let events: RecordDTO[] = []
      await expect.poll(async () => {
        const url = new URL(ledgerBase!.replace(/\/$/, '') + '/events')
        url.searchParams.set('runId', runId); url.searchParams.set('logicalNode', node)
        const response = await request.get(url.href)
        expect(response.ok()).toBe(true)
        events = (await response.json() as RecordDTO[]).filter(event => String(event.instanceId) === instanceId)
        const commits = events.filter(event => event.event === 'COMMIT')
        return mode === 'STANDALONE' ? commits.length === 1 : mode === 'BROADCAST' ? commits.length >= 2 && events.some(event => event.event === 'POST') : commits.length === 9 && (mode !== 'MAP_REDUCE' || events.some(event => event.event === 'REDUCE'))
      }, { timeout: 30_000, intervals: [500, 1000], message: 'A successful status must have complete independent effects for this exact instance' }).toBe(true)
      const committed = events.filter(event => event.event === 'COMMIT')
      if (mode === 'STANDALONE') {
        expect(committed).toHaveLength(1)
        expect(committed[0].entityKey).toBe('single')
      } else if (mode === 'BROADCAST') {
        const addresses = new Set(committed.map(event => String(event.worker)))
        expect(addresses.size).toBeGreaterThanOrEqual(2)
        for (const worker of deployment.workers) expect(addresses.has(String(worker.address))).toBe(true)
        expect(events.filter(event => event.event === 'PRE')).toHaveLength(1)
        expect(events.filter(event => event.event === 'POST')).toHaveLength(1)
      } else {
        expect(committed).toHaveLength(9)
        expect(committed.map(event => Number(event.entityKey)).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
        for (const event of committed) expect(event.value).toEqual({ i: Number(event.entityKey), square: Number(event.entityKey) ** 2 })
        if (mode === 'MAP_REDUCE') {
          const canonical = Array.from({ length: 9 }, (_, number) => `${number}:${number ** 2}\n`).join('')
          const expected = { count: 9, uniqueCount: 9, sum: 204, sha256: crypto.createHash('sha256').update(canonical).digest('hex') }
          expect(JSON.parse(String(instance.result))).toEqual(expected)
          expect(events.find(event => event.event === 'REDUCE')?.value).toEqual(expected)
        }
      }
      await page.goto('/#/oms/instance?jobId=' + id(job.id))
      await fill(page, 'Instance ID', instanceId)
      expect((await clickAndResponse(page, '/instance/list', () => page.getByRole('button', { name: 'Search', exact: true }).click(), response => response.request().postDataJSON()?.instanceId === instanceId)).success).toBe(true)
      const row = selectors.row(page, instanceId)
      await expect(row).toContainText('Succeeded')
      await row.getByRole('button', { name: 'Details', exact: true }).click()
      const detail = selectors.dialog(page, `Instance details #${instanceId}`)
      await expect(detail).toContainText(String(instance.result))
      await detail.getByRole('button', { name: 'Close', exact: true }).click()
      await observation(info, 'UI-012', `fev3-execute-${mode.toLowerCase()}-business`, { jobId: id(job.id), exactInstanceId: instanceId, actualWorkerStatus: instance.status, sourceJARSHA256: deployment.sourceSHA256, ledgerEvents: events, boundedInput: { n: 9, batchSize: 3, sleepMs: 0 }, actualResult: instance.result, realNativeExecutionAndDetail: true, sameHostProcessesNotMultiHostHA: true })
    }
  } finally { await owned.cleanup(info) }
})
