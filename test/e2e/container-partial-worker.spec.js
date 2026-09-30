import { test, expect, selectors, runId, input, enterSamples, saveDialog } from './support.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

test('container partial · controlled actual Worker2 offline retains original dispatch and partial Worker readback', async ({ page, backend, credentials }, info) => {
  test.setTimeout(300_000)
  const fixturePath = process.env.POWERJOB_E2E_GIT_MANIFEST, marker = process.env.POWERJOB_E2E_PARTIAL_WINDOW
  test.skip(!fixturePath || !marker, 'Opt-in controlled Worker2 offline window and Git fixture are required')
  const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf8'))
  const preparedAt = Date.now(), name = `${runId}_partial`
  let containerId
  try {
    await enterSamples(page, credentials); await page.goto('/#/oms/containermanage')
    await page.getByRole('button', { name: 'New container', exact: true }).click()
    for (const [label, value] of [['Name', name], ['Git URL', fixture.repository], ['Branch', fixture.branch], ['Username', fixture.username], ['Password', fixture.password]]) await input(selectors.dialog(page), label, value)
    await saveDialog(page, '/container/save')
    containerId = (await backend.call('/container/list?appId=' + credentials.app_id)).find(item => item.containerName === name).id
    await fs.writeFile(marker + '.ready.json', JSON.stringify({ readyAt: Date.now(), containerId, appId: credentials.app_id, runId, sourceCommit: fixture.commit }))
    let window
    await expect.poll(async () => {
      try { window = JSON.parse(await fs.readFile(marker, 'utf8')); return window.stoppedAt >= preparedAt && Date.now() - window.stoppedAt < 15_000 && window.service === 'worker2' } catch { return false }
    }, { timeout: 180_000, intervals: [500], message: 'Waiting for explicitly coordinated exact host Worker2 offline marker' }).toBe(true)
    const card = page.locator('.container-card').filter({ hasText: name })
    await card.getByRole('button', { name: 'Deploy', exact: true }).click()
    await expect(page.locator('.deployment-log')).toContainText('BUILD SUCCESS', { timeout: 60_000 })
    await expect.poll(async () => /deploy finished, congratulations|deploy failed/.test(await page.locator('.deployment-log').textContent()), { timeout: 20_000 }).toBe(true)
    const raw = await page.locator('.deployment-log').textContent()
    const alertStatus = await page.locator('.el-alert').getAttribute('data-status')
    await selectors.dialog(page).getByRole('button', { name: 'Close this dialog' }).click()
    await expect(selectors.dialog(page)).not.toBeVisible()
    let actual
    await expect.poll(async () => {
      actual = await backend.call('/container/listDeployedWorker?containerId=' + containerId + '&appId=' + credentials.app_id)
      return actual.includes('Address: 127.0.0.1:27771') && actual.includes('unDeployed worker list ==> [127.0.0.1:27772]')
    }, { timeout: 20_000, intervals: [1000] }).toBe(true)
    await card.getByRole('button', { name: 'More', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Worker list', exact: true }).click()
    await expect(page.locator('.deployment-log')).toContainText('WARN: there exists unDeployed worker')
    await expect(page.locator('.deployment-log')).toContainText('Address: 127.0.0.1:27771')
    await expect(page.locator('.deployment-log')).toContainText('unDeployed worker list ==> [127.0.0.1:27772]')
    const evidence = { caseId: 'UI-028', variantId: 'worker-partial-failure', frontendArtifact: 'candidate-versioned-08', serverRelease: '5.1.6', containerId, controlledOfflineService: window.service, stoppedAt: window.stoppedAt, elapsedSinceStopMs: Date.now() - window.stoppedAt, actualWorkers: 1, missingWorker: '127.0.0.1:27772', rawCompletionMessagePresent: raw.includes('deploy finished, congratulations!'), rawDeployErrorPresent: /deploy failed|\[ERROR\]/i.test(raw), alertStatus, actualWorkerList: actual, actualPartialEvidence: ['owned Git fixture; exact host Worker2 stopped by coordinated runner; UI real clone/Maven build/deploy; independent actual one deployed Worker plus undeployed second; real Worker list shows warning'] }
    await info.attach('actual-partial-worker-contract', { body: Buffer.from(JSON.stringify(evidence)), contentType: 'application/json' })
    const image = info.outputPath('actual-partial-worker-redacted.png'); await page.screenshot({ path: image, fullPage: true, mask: [page.locator('input[type=password]'), page.locator('input[disabled]')] }); await info.attach('actual-partial-worker-page', { path: image, contentType: 'image/png' })
    // The released Server tells Workers asynchronously. This observation alone is
    // never a PASS claim for an acknowledgement or complete-success guarantee.
  } finally {
    if (containerId) await backend.call('/container/delete?containerId=' + containerId + '&appId=' + credentials.app_id)
  }
})

test('container partial · exact owned Worker2 container directory write refusal and two Worker recovery', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  const fixturePath = process.env.POWERJOB_E2E_GIT_MANIFEST, workerHome = process.env.POWERJOB_E2E_WORKER2_HOME
  test.skip(!fixturePath || !workerHome, 'Opt-in exact isolated host Worker2 home and Git fixture are required')
  const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf8'))
  const home = await fs.realpath(workerHome), privateConfig = path.join(home, 'application.properties')
  expect(path.basename(home)).toBe('worker2'); expect(path.basename(path.dirname(home))).toBe('host-5.1.6')
  const pid = (await fs.readFile(path.join(home, 'pid'), 'utf8')).trim()
  const { stdout } = await promisify(execFile)('ps', ['-p', pid, '-o', 'args='])
  expect(stdout.includes('--spring.config.additional-location=file:' + privateConfig)).toBe(true)
  const name = `${runId}_permission_partial`
  let containerId, directory
  try {
    await enterSamples(page, credentials); await page.goto('/#/oms/containermanage')
    await page.getByRole('button', { name: 'New container', exact: true }).click()
    for (const [label, value] of [['Name', name], ['Git URL', fixture.repository], ['Branch', fixture.branch], ['Username', fixture.username], ['Password', fixture.password]]) await input(selectors.dialog(page), label, value)
    await saveDialog(page, '/container/save')
    const saved = (await backend.call('/container/list?appId=' + credentials.app_id)).find(item => item.containerName === name)
    containerId = saved.id; expect(saved.containerName).toBe(name); expect(String(containerId)).toMatch(/^\d+$/)
    const initialWorker2 = (await backend.call('/system/listWorker?appId=' + credentials.app_id)).find(worker => worker.address === '127.0.0.1:27772')
    expect(initialWorker2).toBeDefined()
    const parent = await fs.realpath(path.join(home, 'powerjob/worker/container'))
    expect(parent).toBe(path.join(home, 'powerjob/worker/container'))
    directory = path.join(parent, String(containerId))
    await expect(fs.stat(directory)).rejects.toMatchObject({ code: 'ENOENT' })
    await fs.mkdir(directory, { mode: 0o700 }); await fs.chmod(directory, 0o500)
    await expect(fs.access(directory, fs.constants.W_OK)).rejects.toMatchObject({ code: 'EACCES' })
    const card = page.locator('.container-card').filter({ hasText: name })
    await card.getByRole('button', { name: 'Deploy', exact: true }).click()
    await expect(page.locator('.deployment-log')).toContainText('BUILD SUCCESS', { timeout: 60_000 })
    await expect(page.locator('.deployment-log')).toContainText('deploy finished, congratulations!', { timeout: 30_000 })
    const alertStatus = await page.locator('.el-alert').getAttribute('data-status'), alertTitle = await page.locator('.el-alert').textContent()
    await selectors.dialog(page).getByRole('button', { name: 'Close this dialog' }).click(); await expect(selectors.dialog(page)).not.toBeVisible()
    let actual
    await expect.poll(async () => {
      actual = await backend.call('/container/listDeployedWorker?containerId=' + containerId + '&appId=' + credentials.app_id)
      return actual.includes('Address: 127.0.0.1:27771') && actual.includes('unDeployed worker list ==> [127.0.0.1:27772]')
    }, { timeout: 30_000, intervals: [1000] }).toBe(true)
    const privateLog = await fs.readFile(path.join(home, 'process.log'), 'utf8')
    expect(privateLog.includes(`[OmsContainer-${containerId}] deployContainer`)).toBe(true)
    expect(privateLog.includes(`${directory}/`) && privateLog.includes('Permission denied')).toBe(true)
    await expect.poll(async () => (await backend.call('/system/listWorker?appId=' + credentials.app_id)).find(worker => worker.address === '127.0.0.1:27772')?.lastActiveTime, { timeout: 15_000, intervals: [1000] }).not.toBe(initialWorker2.lastActiveTime)
    await card.getByRole('button', { name: 'More', exact: true }).click(); await page.getByRole('menuitem', { name: 'Worker list', exact: true }).click()
    await expect(page.locator('.deployment-log')).toContainText('WARN: there exists unDeployed worker')
    await expect(page.locator('.deployment-log')).toContainText('127.0.0.1:27772')
    const image = info.outputPath('actual-cache-partial-redacted.png'); await page.screenshot({ path: image, fullPage: true, mask: [page.locator('input[type=password]'), page.locator('input[disabled]')] }); await info.attach('actual-cache-partial-page', { path: image, contentType: 'image/png' })
    const accurateWording = alertTitle.includes('Deployment requests sent.') && !alertTitle.includes('Deployment completed.')
    if (process.env.POWERJOB_E2E_REQUIRE_DISPATCH_WORDING === '1') expect(accurateWording).toBe(true)
    const observation = { caseId: 'UI-028', variantId: 'worker-partial-failure', serverRelease: '5.1.6', frontendArtifact: process.env.POWERJOB_E2E_ARTIFACT || 'candidate-versioned-08', containerId, fault: 'Only new owned container ID directory of exact host Worker2 is mode0500', worker2StayedOnline: true, heartbeatChangedDuringFailure: true, actualWorker2PermissionDenied: true, actualWorkers: 1, missingWorker: '127.0.0.1:27772', serverCompletionMessagePresent: true, serverErrorMessagePresent: false, alertStatus, alertTitle, actualWorkerList: actual, noFullSuccessClaim: accurateWording }
    await info.attach('actual-partial-worker-contract', { body: Buffer.from(JSON.stringify(observation)), contentType: 'application/json' })
    await selectors.dialog(page).getByRole('button', { name: 'Close this dialog' }).click(); await expect(selectors.dialog(page)).not.toBeVisible()
    await fs.chmod(directory, 0o700)
    await card.getByRole('button', { name: 'Deploy', exact: true }).click()
    await expect(page.locator('.deployment-log')).toContainText('deploy finished, congratulations!', { timeout: 30_000 })
    await expect.poll(async () => ((await backend.call('/container/listDeployedWorker?containerId=' + containerId + '&appId=' + credentials.app_id)).match(/Address:/g) || []).length, { timeout: 30_000, intervals: [1000] }).toBe(2)
    await info.attach('actual-partial-worker-recovery', { body: Buffer.from(JSON.stringify({ containerId, directoryModeRestored: '0700', sameContainerRedeployed: true, actualWorkers: 2 })), contentType: 'application/json' })
    if (accurateWording) await info.attach('variant-UI-028-worker-partial-failure', { body: Buffer.from(JSON.stringify({ caseId: 'UI-028', variantId: 'worker-partial-failure', steps: ['actual owned Git clone/Maven build; exact new owned container ID directory on online Worker2 cannot write; actual Worker2 Permission denied and heartbeat changes; Server dispatch completion is labelled requests sent; real Worker list and independent readback show one deployed and second undeployed; directory restored0700, same container redeployed and both Worker deployments read back; owned directory/metadata finally cleaned'], readback: { ...observation, recoveryActualWorkers: 2, scope: 'Original asynchronous Server tell contract; no acknowledgement or multi-machine guarantee claimed' } })), contentType: 'application/json' })
  } finally {
    if (directory) { await fs.chmod(directory, 0o700); await fs.rm(directory, { recursive: true, force: true }) }
    if (containerId) await backend.call('/container/delete?containerId=' + containerId + '&appId=' + credentials.app_id)
  }
})
