import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { test, expect, selectors, clickAndResponse, enterSamples, observation, type RecordDTO } from './helpers'

const execute = promisify(execFile)
const authorized = process.env.POWERJOB_E2E_ALLOW_WORKER_RECOVERY === '1'
test.use({ actionTimeout: 15_000 })

interface ProcessIdentity { pid: number; start: string; config: string; configSha256: string; home: string }
interface HostManifest { release: string; sourceCommit: string; workerJar: string; workerJarSha256: string }

async function hash(filename: string) { return crypto.createHash('sha256').update(await fs.readFile(filename)).digest('hex') }
function alive(pid: number) { try { process.kill(pid, 0); return true } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false; throw new Error('Cannot safely establish controlled process liveness') } }
async function ps(pid: number, field: 'args' | 'lstart') {
  try { return (await execute('ps', ['-p', String(pid), '-o', field + '='])).stdout.trim() } catch { return '' }
}
async function identity(root: string, name: string, workerJar?: string): Promise<ProcessIdentity> {
  const home = path.join(root, name), config = path.join(home, 'application.properties')
  const pid = Number((await fs.readFile(path.join(home, 'pid'), 'utf8')).trim())
  if (!Number.isSafeInteger(pid) || pid < 1 || !alive(pid)) throw new Error('Expected controlled service is not alive')
  const args = await ps(pid, 'args'), start = await ps(pid, 'lstart')
  if (!start || !args.includes('--spring.config.additional-location=file:' + config) || !args.includes('-Duser.home=' + home) || (workerJar && !args.includes(workerJar))) throw new Error('Controlled service PID, configuration or home ownership differs')
  return { pid, start, config, configSha256: await hash(config), home }
}
async function preserveOriginalServices(root: string, original: Record<string, ProcessIdentity>) {
  for (const [name, expected] of Object.entries(original)) {
    const current = await identity(root, name)
    if (current.pid !== expected.pid || current.start !== expected.start || current.configSha256 !== expected.configSha256) throw new Error('An unrelated original service identity changed; no broader process operation is allowed')
  }
}
async function command(control: string, action: 'stop' | 'start') {
  try {
    const result = await execute('python3', [control, action, 'worker2'], { timeout: 30_000 })
    // The existing private control emits only service/PID/action metadata. Do not print full process output.
    const lines = result.stdout.trim().split('\n').filter(Boolean)
    const metadata = JSON.parse(lines.at(-1) || '{}') as RecordDTO
    if (metadata.service !== 'worker2' || !Number.isSafeInteger(Number(metadata.pid))) throw new Error('Unexpected controlled operation metadata')
    return { service: 'worker2', pid: Number(metadata.pid), action }
  } catch { throw new Error('Exact worker2 control did not complete; private control output is withheld') }
}
async function verifyRenderedWorkers(page: import('@playwright/test').Page, rows: RecordDTO[], active: number) {
  const metric = page.locator('.overview-metrics > section').filter({ has: page.getByText('Online Workers', { exact: true }) })
  await expect(metric.locator('strong')).toHaveText(String(active))
  await expect(metric.getByText(rows.length + ' registered Workers', { exact: true })).toBeVisible()
  await expect(page.locator('.overview-workers > header').getByText(active + ' online', { exact: true })).toBeVisible()
  for (const worker of rows) {
    const row = selectors.row(page, String(worker.address))
    await expect(row).toHaveCount(1)
    const status = Number(worker.status)
    await expect(row.getByText(status === 9999 ? 'Offline' : status === 1 ? 'Healthy' : status === 2 ? 'Resource warning' : 'Resource pressure', { exact: true })).toBeVisible()
    for (const [column, field] of [[1, 'cpuLoad'], [2, 'memoryLoad'], [3, 'diskLoad'], [4, 'tag'], [5, 'lastActiveTime']] as const) await expect(row.locator('td').nth(column)).toContainText(worker[field] ? String(worker[field]) : '—')
  }
}

test('zz · controlled Worker2 heartbeat expiry shows actual unavailable row and counts, finally restart restores both real Worker details', async ({ page, backend, credentials }, info) => {
  test.skip(!authorized, 'Requires explicit private Worker2 recovery authorization; schedule this file last and never run it concurrently with core/container execution')
  test.setTimeout(180_000)
  const manifestPath = process.env.POWERJOB_E2E_HOST_MANIFEST, controlPath = process.env.POWERJOB_E2E_HOST_CONTROL
  if (!manifestPath || !controlPath) throw new Error('Authorized recovery requires the exact isolated host manifest and control paths')
  const root = path.dirname(path.resolve(manifestPath)), control = path.resolve(controlPath)
  if (control !== path.join(root, 'control.py')) throw new Error('Control must belong to the exact supplied private runtime manifest')
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as HostManifest
  if (manifest.release !== '5.1.6' || manifest.sourceCommit !== 'd928e7c95ca69d2421dcdf19a08fd3f1f633a878' || await hash(manifest.workerJar) !== manifest.workerJarSha256) throw new Error('Exact released Worker artifact ownership guard failed')
  const controlSha256 = await hash(control)
  const original = { server1: await identity(root, 'server1'), server2: await identity(root, 'server2'), worker1: await identity(root, 'worker1', manifest.workerJar) }
  const before = await identity(root, 'worker2', manifest.workerJar)
  const properties = (await fs.readFile(before.config, 'utf8')).split('\n').find(line => line.startsWith('powerjob.worker.port='))?.split('=')[1]?.trim()
  if (!properties || !/^\d+$/.test(properties)) throw new Error('Cannot identify the original controlled Worker2 listener')
  const timeline: RecordDTO[] = []
  let stopAttempted = false
  let after: ProcessIdentity | undefined
  let worker2Address = ''
  let originalHeartbeat = ''
  try {
    await enterSamples(page, credentials)
    const initial = await clickAndResponse<RecordDTO[]>(page, '/system/listWorker', () => page.getByRole('button', { name: 'Refresh', exact: true }).click())
    expect(initial.success).toBe(true)
    expect(initial.data).toHaveLength(2)
    expect(initial.data.every(worker => Number(worker.status) !== 9999)).toBe(true)
    const targets = initial.data.filter(worker => String(worker.address).endsWith(':' + properties))
    expect(targets).toHaveLength(1)
    worker2Address = String(targets[0].address); originalHeartbeat = String(targets[0].lastActiveTime)
    await verifyRenderedWorkers(page, initial.data, 2)
    timeline.push({ phase: 'two-workers-before', at: Date.now(), workerAddresses: initial.data.map(row => row.address), statuses: initial.data.map(row => row.status), heartbeat: originalHeartbeat })
    await preserveOriginalServices(root, original)
    const current = await identity(root, 'worker2', manifest.workerJar)
    expect(current).toEqual(before)
    if (await hash(control) !== controlSha256) throw new Error('Controlled helper changed before the authorized stop')
    stopAttempted = true
    const stopped = await command(control, 'stop')
    expect(stopped.pid).toBe(before.pid)
    expect(alive(before.pid)).toBe(false)
    timeline.push({ phase: 'exact-worker2-stopped', at: Date.now(), pid: before.pid })
    let offlineRows: RecordDTO[] = []
    await expect.poll(async () => {
      const originalResponse = await clickAndResponse<RecordDTO[]>(page, '/system/listWorker', () => page.getByRole('button', { name: 'Refresh', exact: true }).click())
      expect(originalResponse.success).toBe(true)
      offlineRows = originalResponse.data
      return offlineRows.some(row => String(row.address) === worker2Address && Number(row.status) === 9999)
    }, { timeout: 70_000, intervals: [1000, 2000, 3000], message: 'The original Server heartbeat deadline must mark the exact stopped Worker unavailable in a real Home refresh response' }).toBe(true)
    expect(offlineRows).toHaveLength(2)
    expect(offlineRows.filter(row => Number(row.status) !== 9999)).toHaveLength(1)
    await verifyRenderedWorkers(page, offlineRows, 1)
    const independentOffline = await backend.call<RecordDTO[]>('/system/listWorker', { query: { appId: credentials.app_id } })
    expect(independentOffline.find(row => String(row.address) === worker2Address)?.status).toBe(9999)
    timeline.push({ phase: 'original-ui-offline-and-independent-readback', at: Date.now(), active: 1, registered: 2, originalStatus: 9999, originalHeartbeatRetained: offlineRows.find(row => String(row.address) === worker2Address)?.lastActiveTime })
  } finally {
    // Stop failure may occur after SIGTERM. Restore only the exact exited PID; never signal or replace an unrelated live process.
    if (stopAttempted) {
      const recordedPID = Number((await fs.readFile(path.join(root, 'worker2/pid'), 'utf8')).trim())
      if (recordedPID !== before.pid) throw new Error('Worker2 PID ledger changed unexpectedly; preserve evidence and refuse broader control')
      if (!alive(before.pid)) {
        if (await hash(before.config) !== before.configSha256 || await hash(control) !== controlSha256) throw new Error('Worker2 configuration/helper differs; guarded restart must be reviewed')
        await command(control, 'start')
      }
    }
    after = await identity(root, 'worker2', manifest.workerJar)
    expect(after.configSha256).toBe(before.configSha256)
    await preserveOriginalServices(root, original)
    let recovered: RecordDTO[] = []
    await expect.poll(async () => {
      recovered = await backend.call<RecordDTO[]>('/system/listWorker', { query: { appId: credentials.app_id } })
      return recovered.length === 2 && recovered.every(row => Number(row.status) !== 9999) && (!stopAttempted || String(recovered.find(row => String(row.address) === worker2Address)?.lastActiveTime) !== originalHeartbeat)
    }, { timeout: 45_000, intervals: [500, 1000, 2000], message: 'Finally must restore two actual fresh Worker heartbeats before any following work' }).toBe(true)
    const rendered = await clickAndResponse<RecordDTO[]>(page, '/system/listWorker', () => page.getByRole('button', { name: 'Refresh', exact: true }).click())
    expect(rendered.success).toBe(true)
    expect(rendered.data.map(row => String(row.address)).sort()).toEqual(recovered.map(row => String(row.address)).sort())
    await verifyRenderedWorkers(page, rendered.data, 2)
    timeline.push({ phase: 'finally-two-workers-restored', at: Date.now(), pid: after.pid, workerAddresses: rendered.data.map(row => row.address), statuses: rendered.data.map(row => row.status), lastActiveTimes: rendered.data.map(row => row.lastActiveTime) })
    const receipt = { status: 'EXACT_WORKER2_RESTORED_AND_TWO_REAL_HEARTBEATS_VERIFIED', stopAttempted, originalPID: before.pid, restoredPID: after.pid, configUnchanged: true, originalServer1Server2Worker1IdentitiesUnchanged: true, helperSha256: controlSha256, workerJarSha256: manifest.workerJarSha256, timeline, noDirectDatabaseOrWorkerConfigWrite: true, noImagesOrVolumesChanged: true }
    const filename = info.outputPath('worker-recovery-closure.json')
    await fs.writeFile(filename, JSON.stringify(receipt, null, 2) + '\n')
    await info.attach('exact-worker-recovery-closure', { path: filename, contentType: 'application/json' })
  }
  await observation(info, 'UI-010', 'worker-offline-recover', { unavailableWorkerAddress: worker2Address, originalPID: before.pid, recoveredPID: after?.pid, actualOriginalUIAndIndependentAPIStateTimeline: timeline, offlineRecordRetainedRatherThanAssumedRemoved: true, clearUnavailableTextAndOnline1Of2ThenOnline2Of2: true, actualCPUAndMemoryDiskTagHeartbeatCellsCompared: true, onlyExactPrivateWorker2Controlled: true, originalThreeServicesAndAllConfigsUnchanged: true })
})
