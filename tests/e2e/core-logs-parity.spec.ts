import fs from 'node:fs/promises'
import path from 'node:path'
import type { Locator, Page } from '@playwright/test'
import { test, expect, selectors, fill, clickAndResponse, enterSamples, id, ownedName, observation, fileHash, parseResult, type Backend, type RecordDTO } from './helpers'
import { OwnedResources } from './owned'
import { deployFixture } from './container-ui'
import { createJob, editJob, saveJob } from './job-ui'

test.use({ actionTimeout: 15_000 })
interface LogPage { data: string; totalPages: number; index: number }
async function openLogs(page: Page, jobId: string, instanceId: string) {
  await page.goto('/#/oms/instance?jobId=' + jobId)
  await fill(page, 'Instance ID', instanceId)
  expect((await clickAndResponse(page, '/instance/list', () => page.getByRole('button', { name: 'Search', exact: true }).click(), response => response.request().postDataJSON()?.instanceId === instanceId)).success).toBe(true)
  const actual = await clickAndResponse<LogPage>(page, '/instance/log', () => selectors.row(page, instanceId).getByRole('button', { name: 'Logs', exact: true }).click(), response => new URL(response.url()).searchParams.get('instanceId') === instanceId)
  expect(actual.success).toBe(true)
  const dialog = selectors.dialog(page, 'Instance logs #' + instanceId)
  return { dialog, region: dialog.getByRole('region', { name: 'Online logs', exact: true }), actual: actual.data }
}
async function refresh(page: Page, region: Locator, instanceId: string) {
  const actual = await clickAndResponse<LogPage>(page, '/instance/log', () => region.getByRole('button', { name: 'Refresh logs', exact: true }).click(), response => new URL(response.url()).searchParams.get('instanceId') === instanceId)
  expect(actual.success).toBe(true); return actual.data
}
async function run(page: Page, backend: Backend, owned: OwnedResources, job: RecordDTO) {
  const result = await clickAndResponse(page, '/job/run', () => selectors.row(page, String(job.jobName)).getByRole('button', { name: 'Run', exact: true }).click())
  expect(result.success).toBe(true)
  const instanceId = owned.trackInstance(id(result.data), id(job.id))
  await backend.waitInstance(instanceId, [3]); return instanceId
}
async function nativeDownload(page: Page, region: Locator, output: string) {
  const waiting = page.waitForEvent('download')
  await region.getByRole('button', { name: 'Download logs', exact: true }).click()
  await (await waiting).saveAs(output); return fileHash(output)
}

test('UI-019 · late multibatch Worker logs paginate and scroll, archive original Unicode bytes, switch IDs and recover exact legacy caches across Servers', async ({ page, backend, credentials }, info) => {
  test.setTimeout(240_000)
  const owned = new OwnedResources(backend)
  const jar = process.env.POWERJOB_E2E_LOG_JAR
  const server2 = process.env.POWERJOB_E2E_SERVER_TWO
  const rootFile = process.env.POWERJOB_E2E_SERVER_LOG_ROOTS
  if (!jar || !server2 || !rootFile) throw new Error('Configure the trusted log fixture, second Server and private exact cache-root receipt')
  const roots = JSON.parse(await fs.readFile(rootFile, 'utf8')) as Record<string, { onlineLogRoot: string; exactUserHomeVerified: boolean; rootExists: boolean }>
  const backups: { filename: string; bytes: Buffer | null; mode: number | null }[] = []
  let restored = false
  const restore = async () => {
    if (restored) return
    for (const backup of backups) {
      if (backup.bytes === null) await fs.unlink(backup.filename).catch(error => { if (error.code !== 'ENOENT') throw error })
      else { await fs.writeFile(backup.filename, backup.bytes); await fs.chmod(backup.filename, backup.mode!) }
    }
    restored = true
  }
  try {
    await enterSamples(page, credentials)
    const container = await deployFixture(page, backend, owned, ownedName('sequence_container'), jar)
    const marker = ownedName('sequence_a')
    expect(marker.length).toBeLessThanOrEqual(100)
    const job = await createJob(page, backend, owned, ownedName('sequence_job_a'), undefined, marker + '|15000|3|12000|80')
    const editor = await editJob(page, String(job.jobName)); await editor.getByLabel('Processor type', { exact: true }).selectOption('EXTERNAL')
    await fill(editor, 'Processor', container.containerId + '#tech.powerjob.acceptance.fixture.LogSequenceProcessor'); await saveJob(page)
    const instanceId = await run(page, backend, owned, job)
    const opened = await openLogs(page, id(job.id), instanceId)
    expect(opened.actual.data).not.toContain(marker)
    await expect(opened.region.locator('pre')).not.toContainText(marker)
    const actualPages: { totalPages: number; index: number; marker: boolean }[] = []
    const handler = async (response: import('@playwright/test').Response) => {
      if (!new URL(response.url()).pathname.endsWith('/instance/log') || new URL(response.url()).searchParams.get('instanceId') !== instanceId) return
      try { const result = parseResult<LogPage>(await response.text()); if (result.success) actualPages.push({ totalPages: Number(result.data.totalPages), index: Number(result.data.index), marker: result.data.data.includes(marker) }) } catch { /* The action oracle below still requires the original business response. */ }
    }
    page.on('response', handler)
    await opened.region.getByLabel('Auto refresh', { exact: true }).check()
    await expect(opened.region.locator('pre')).toContainText(marker + ' seq=000', { timeout: 45_000 })
    await expect(opened.region.getByRole('button', { name: 'Next', exact: true })).toBeEnabled()
    const next = await clickAndResponse<LogPage>(page, '/instance/log', () => opened.region.getByRole('button', { name: 'Next', exact: true }).click(), response => new URL(response.url()).searchParams.get('index') === '1')
    expect(next.success).toBe(true); expect(next.data.index).toBe(1)
    await expect(opened.region).toContainText('Page 2 /')
    const finished = await backend.waitInstance(instanceId, [5], 100_000)
    expect(finished.result).toBe(marker + ' complete 240')
    await opened.region.getByLabel('Auto refresh', { exact: true }).uncheck()
    let latest = await refresh(page, opened.region, instanceId)
    await expect.poll(async () => { latest = await refresh(page, opened.region, instanceId); return Number(latest.totalPages) }, { timeout: 45_000, intervals: [1000, 2000] }).toBeGreaterThanOrEqual(5)
    while (Number(latest.index) + 1 < Number(latest.totalPages)) {
      const expectedIndex = Number(latest.index) + 1
      const result = await clickAndResponse<LogPage>(page, '/instance/log', () => opened.region.getByRole('button', { name: 'Next', exact: true }).click(), response => new URL(response.url()).searchParams.get('index') === String(expectedIndex))
      expect(result.success).toBe(true); latest = result.data
    }
    await expect(opened.region.locator('pre')).toContainText(marker + ' seq=239')
    await expect(opened.region.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
    expect(new Set(actualPages.filter(value => value.marker).map(value => value.totalPages)).size).toBeGreaterThanOrEqual(2)
    const pre = opened.region.locator('pre')
    const scroll = await pre.evaluate(element => { element.scrollTop = 0; const before = element.scrollTop; element.scrollTop = element.scrollHeight; return { before, after: element.scrollTop, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight } })
    expect(scroll.after).toBeGreaterThan(scroll.before)
    await expect(opened.region.getByRole('button', { name: 'Download logs', exact: true })).toBeVisible()
    const original = await backend.file('/instance/downloadLog4Console', { instanceId })
    const text = original.bytes.toString('utf8')
    for (let sequence = 0; sequence < 240; sequence++) {
      const token = marker + ' seq=' + String(sequence).padStart(3, '0')
      expect(text.split(token + ' 中文😀 line-one').length - 1).toBe(1)
      expect(text.split(token + ' line-two').length - 1).toBe(1)
    }
    for (const level of ['INFO', 'WARN', 'ERROR']) expect(text).toContain(level + ' ' + marker)
    expect(await nativeDownload(page, opened.region, info.outputPath('sequence-original.log'))).toBe(original.sha256)
    await page.route('**/instance/downloadLog4Console?*', async route => {
      const current = new URL(route.request().url()); const destination = new URL(server2 + current.pathname.replace(/^\/api/, '') + current.search)
      const actual = await route.fetch({ url: destination.href }); expect(actual.ok()).toBe(true)
      await route.fulfill({ response: actual })
    })
    expect(await nativeDownload(page, opened.region, info.outputPath('sequence-server-two.log'))).toBe(original.sha256)
    await page.unroute('**/instance/downloadLog4Console?*')
    await opened.dialog.getByRole('button', { name: 'Close', exact: true }).click()
    const identity = await backend.job(id(job.id)); expect(identity?.jobName).toBe(job.jobName); expect(id(identity?.appId)).toBe(id(backend.appId))
    expect(id((await backend.instance(instanceId))?.jobId)).toBe(id(job.id))
    const placeholder = Buffer.from('SYSTEM: There is no online log for this job instance.', 'utf8'); expect(placeholder.length).toBe(53)
    for (const label of ['server1', 'server2']) {
      const root = roots[label]; if (!root || !root.exactUserHomeVerified || !root.rootExists || !path.isAbsolute(root.onlineLogRoot)) throw new Error('The private exact running Server cache-root receipt is not verified')
      const filename = path.join(root.onlineLogRoot, instanceId + '-stable.log')
      let bytes: Buffer | null = null; let mode: number | null = null
      try { bytes = await fs.readFile(filename); mode = (await fs.stat(filename)).mode & 0o777 } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
      backups.push({ filename, bytes, mode }); await fs.writeFile(filename, placeholder)
    }
    const recovered = await openLogs(page, id(job.id), instanceId)
    await expect(recovered.region.locator('pre')).toContainText(marker)
    expect(await nativeDownload(page, recovered.region, info.outputPath('sequence-legacy-recovered.log'))).toBe(original.sha256)
    await restore()
    await recovered.region.getByLabel('Auto refresh', { exact: true }).check(); await recovered.dialog.getByRole('button', { name: 'Close', exact: true }).click()
    let latePolls = 0; const listener = (request: import('@playwright/test').Request) => { if (new URL(request.url()).pathname.endsWith('/instance/log')) latePolls++ }; page.on('request', listener)
    await page.waitForTimeout(11_000); expect(latePolls).toBe(0); page.off('request', listener); page.off('response', handler)
    await page.goto('/#/oms/job')
    const markerB = ownedName('sequence_b')
    const jobB = await createJob(page, backend, owned, ownedName('sequence_job_b'), undefined, markerB + '|0|1|0|3')
    const editorB = await editJob(page, String(jobB.jobName)); await editorB.getByLabel('Processor type', { exact: true }).selectOption('EXTERNAL')
    await fill(editorB, 'Processor', container.containerId + '#tech.powerjob.acceptance.fixture.LogSequenceProcessor'); await saveJob(page)
    const runB = await clickAndResponse(page, '/job/run', () => selectors.row(page, String(jobB.jobName)).getByRole('button', { name: 'Run', exact: true }).click()); expect(runB.success).toBe(true)
    const instanceB = owned.trackInstance(id(runB.data), id(jobB.id)); await backend.waitInstance(instanceB, [5])
    const openedB = await openLogs(page, id(jobB.id), instanceB)
    await expect.poll(async () => (await refresh(page, openedB.region, instanceB)).data.includes(markerB), { timeout: 45_000, intervals: [1000, 2000] }).toBe(true)
    await expect(openedB.region.locator('pre')).not.toContainText(marker + ' seq=')
    const fileB = await backend.file('/instance/downloadLog4Console', { instanceId: instanceB })
    expect(fileB.sha256).not.toBe(original.sha256); expect(await nativeDownload(page, openedB.region, info.outputPath('sequence-switched.log'))).toBe(fileB.sha256)
    await openedB.dialog.getByRole('button', { name: 'Close', exact: true }).click()
    for (const variant of ['live-log-refresh', 'log-early-late', 'log-scroll', 'archived-download', 'cross-server-download', 'legacy-placeholder', 'log-switch-instance']) await observation(info, 'UI-019', variant, { instanceId, secondInstanceId: instanceB, containerId: container.containerId, originalSHA256: original.sha256, byteCount: original.bytes.length, actualPages, earlyNoMarkerThenThreeRealWorkerBatches: true, finalSequenceCount: 240, levels: ['INFO', 'WARN', 'ERROR'], unicodeAndMultilineEachSequenceOnce: true, actualServerTwoOriginalDownloadSameSHA: true, exact53ByteOwnedCachesRestored: restored, noOtherFilesChanged: true, scroll, latePollRequests: latePolls, secondOwnMarkerNotFirst: true })
    await observation(info, 'UI-038', 'log-poll-close', { actualPollingThenNativeClose: true, observedMilliseconds: 11000, latePolls, ownInstanceId: instanceId })
  } finally { await page.unroute('**/instance/downloadLog4Console?*'); await restore(); await owned.cleanup(info) }
})

test('UI-019 · actual permission JSON and network download failures produce no file, then original authenticated download recovers', async ({ page, backend, credentials }, info) => {
  const owned = new OwnedResources(backend)
  let downloads = 0
  try {
    await enterSamples(page, credentials)
    const marker = ownedName('download_error_marker')
    const job = await createJob(page, backend, owned, ownedName('download_error_job'), undefined, marker)
    const result = await clickAndResponse(page, '/job/run', () => selectors.row(page, String(job.jobName)).getByRole('button', { name: 'Run', exact: true }).click()); expect(result.success).toBe(true)
    const instanceId = owned.trackInstance(id(result.data), id(job.id)); await backend.waitInstance(instanceId, [5])
    const opened = await openLogs(page, id(job.id), instanceId)
    await expect.poll(async () => (await refresh(page, opened.region, instanceId)).data.includes(marker), { timeout: 45_000, intervals: [1000, 2000] }).toBe(true)
    page.on('download', () => downloads++)
    let actualError: { status: number; contentType: string; success: boolean } | undefined
    await page.route('**/instance/downloadLog4Console?*', async route => {
      const actual = await route.fetch({ headers: { ...route.request().headers(), appid: '999999999999999999' } })
      const body = parseResult(await actual.text()); expect(body.success).toBe(false)
      actualError = { status: actual.status(), contentType: actual.headers()['content-type'] || '', success: body.success }
      await route.fulfill({ response: actual })
    })
    await opened.region.getByRole('button', { name: 'Download logs', exact: true }).click(); await expect(opened.region.getByRole('alert')).toBeVisible(); expect(downloads).toBe(0)
    expect(actualError?.contentType).toMatch(/json/)
    await page.unroute('**/instance/downloadLog4Console?*')
    let actualHTTPStatus = 0
    await page.route('**/instance/downloadLog4Console?*', async route => { const actual = await route.fetch({ url: new URL('/api/error', route.request().url()).href }); actualHTTPStatus = actual.status(); expect(actualHTTPStatus).toBe(500); await route.fulfill({ response: actual }) })
    await opened.region.getByRole('button', { name: 'Download logs', exact: true }).click(); await expect.poll(() => actualHTTPStatus).toBe(500); await expect(opened.region.getByRole('alert')).toBeVisible(); expect(downloads).toBe(0)
    await page.unroute('**/instance/downloadLog4Console?*')
    await page.route('**/instance/downloadLog4Console?*', route => route.abort('failed'))
    await opened.region.getByRole('button', { name: 'Download logs', exact: true }).click(); await expect(opened.region.getByRole('alert')).toBeVisible(); expect(downloads).toBe(0)
    await page.unroute('**/instance/downloadLog4Console?*')
    await page.evaluate(() => {
      const audit = { created: 0, revoked: 0 }; (window as unknown as { __fev3DownloadURLAudit: typeof audit }).__fev3DownloadURLAudit = audit
      const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL)
      URL.createObjectURL = value => { audit.created++; return create(value) }
      URL.revokeObjectURL = value => { audit.revoked++; revoke(value) }
    })
    const original = await backend.file('/instance/downloadLog4Console', { instanceId }); expect(original.bytes.toString('utf8')).toContain(marker)
    expect(await nativeDownload(page, opened.region, info.outputPath('actual-recovered.log'))).toBe(original.sha256); expect(downloads).toBe(1)
    await expect.poll(() => page.evaluate(() => (window as unknown as { __fev3DownloadURLAudit: { created: number; revoked: number } }).__fev3DownloadURLAudit)).toEqual({ created: 1, revoked: 1 })
    await observation(info, 'UI-019', 'download-json-error', { instanceId, originalServerPermissionJSONForwardedWithoutChangingBody: actualError, failedDownloads: 0, networkAbortAlsoNoFile: true, nativeRecoverySHA: original.sha256, actualSuccessfulDownloads: downloads })
    await observation(info, 'UI-019', 'download-http-error', { instanceId, actualOriginalServerHTTPErrorStatus: actualHTTPStatus, forwardedRealServerErrorEndpoint: '/error', endpointChangedOnlyToExerciseOriginalHTTP500NoStatusOrBodyFabrication: true, originalErrorBytesNotFabricated: true, zeroFailedDownloads: true, subsequentActualGETFileSHA256: original.sha256, nativeObjectURLCreatedAndRevokedExactlyOnce: true })
  } finally { await page.unroute('**/instance/downloadLog4Console?*'); await owned.cleanup(info) }
})
