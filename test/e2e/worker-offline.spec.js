import { test, expect, selectors, enterSamples, clickAndResponse } from './support.js'
import fs from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

test('UI-010 · controlled exact host Worker2 offline and restored heartbeat are visible after actual page refresh', async ({ page, backend, credentials }, info) => {
  test.setTimeout(150_000)
  test.skip(process.env.POWERJOB_E2E_ALLOW_WORKER2_WINDOW !== '1', 'NOT_RUN: shared real Worker2 offline window requires prior lane coordination')
  const control = process.env.POWERJOB_E2E_HOST_WORKER_CONTROL
  if (!control) throw new Error('The coordinated window needs the exact reviewed host Worker control helper')
  await fs.access(control)
  const address = '127.0.0.1:27772'
  await enterSamples(page, credentials)
  await expect.poll(async () => (await backend.call('/system/listWorker?appId=' + credentials.app_id)).filter(worker => worker.status !== 9999).length).toBe(2)
  let stopped = false, stoppedAt, offline
  try {
    stoppedAt = Date.now()
    execFileSync('/usr/bin/python3', [control, 'stop', 'worker2'], { timeout: 15_000, encoding: 'utf8' })
    stopped = true
    if (process.env.POWERJOB_E2E_WORKER_WINDOW_MARKER) await fs.writeFile(process.env.POWERJOB_E2E_WORKER_WINDOW_MARKER, JSON.stringify({ service: 'worker2', stoppedAt: Date.now() }), { mode: 0o600 })
    process.stderr.write('[controlled-window] Exact Worker2 process stopped; coordinated partial-deploy observer may proceed.\n')
    await expect.poll(async () => {
      const result = await clickAndResponse(page, '/system/listWorker', () => page.getByRole('button', { name: 'Refresh', exact: true }).click())
      offline = result.data.find(worker => worker.address === address)
      return offline?.status
    }, { timeout: Math.max(1000, 67_000 - (Date.now() - stoppedAt)), intervals: [2000], message: 'The published 60-second heartbeat expiry must become visible in the real Home response' }).toBe(9999)
    await expect(selectors.row(page, address)).toHaveClass(/offline-row/)
    await expect(page.locator('.workers-panel .panel-heading p')).toContainText(/1\s+active workers\s*\/\s*2\s+total workers/i)
    expect((await backend.call('/system/listWorker?appId=' + credentials.app_id)).find(worker => worker.address === address).status).toBe(9999)
    await page.screenshot({ path: info.outputPath('worker-offline.png'), fullPage: true, mask: [page.locator('input[type="password"]'), page.locator('input[disabled]')] })
  } finally {
    if (stopped) {
      execFileSync('/usr/bin/python3', [control, 'start', 'worker2'], { timeout: 15_000, encoding: 'utf8' })
      process.stderr.write('[controlled-window] Exact Worker2 process restarted in finally.\n')
    }
  }
  await expect.poll(async () => {
    const result = await clickAndResponse(page, '/system/listWorker', () => page.getByRole('button', { name: 'Refresh', exact: true }).click())
    return result.data.find(worker => worker.address === address)?.status
  }, { timeout: 60_000, intervals: [1000, 2000] }).toBeOneOf([1, 2])
  await expect(selectors.row(page, address)).not.toHaveClass(/offline-row/)
  await expect(page.locator('.workers-panel .panel-heading p')).toContainText(/2\s+active workers\s*\/\s*2\s+total workers/i)
  const restored = (await backend.call('/system/listWorker?appId=' + credentials.app_id)).find(worker => worker.address === address)
  expect(restored.status).toBeOneOf([1, 2])
  expect(restored.lastActiveTime).not.toBe(offline.lastActiveTime)
  const result = { caseId: 'UI-010', variantId: 'worker-offline-recover', status: 'PASS', testTitle: info.title, actual: { exactOwnedHostProcessOnly: true, releasedHeartbeatExpiryMS: 60000, actualOfflineStatus: 9999, realPageRefreshRowAndActiveMetricMatched: true, exactWorkerRestartedInFinally: true, changedRestoredHeartbeat: true, twoWorkersOnlineAgain: true, multiMachineEvidence: false } }
  await fs.writeFile(info.outputPath('variant-worker-offline-recover.json'), JSON.stringify(result, null, 2))
})
