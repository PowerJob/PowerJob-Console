import { test, expect, Backend, selectors, runId, input, enterSamples, login, saveDialog, clickAndResponse } from './support.js'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'

async function variant(info, page, caseId, variantId, steps, readback) {
  const image = info.outputPath(`${caseId}-${variantId}-redacted.png`)
  await page.screenshot({ path: image, fullPage: true, mask: [page.locator('input[type=password]'), page.locator('input[autocomplete=username]'), page.locator('input[disabled]')] })
  await info.attach(`page-${caseId}-${variantId}`, { path: image, contentType: 'image/png' })
  await info.attach(`variant-${caseId}-${variantId}`, { body: Buffer.from(JSON.stringify({ caseId, variantId, steps, readback })), contentType: 'application/json' })
}
async function closeDialog(page) {
  const dialog = selectors.dialog(page)
  await dialog.getByRole('button', { name: 'Close this dialog' }).click()
  await expect(dialog).not.toBeVisible()
}
async function upload(page, jar, name) {
  await page.getByRole('button', { name: 'New container', exact: true }).click()
  const dialog = selectors.dialog(page)
  await input(dialog, 'Name', name)
  await dialog.locator('.el-radio').filter({ hasText: 'FatJar' }).click()
  const result = await clickAndResponse(page, '/container/jarUpload', () => dialog.locator('input[type=file]').setInputFiles(jar))
  expect(result.success).toBe(true)
  expect(result.data).toBe(crypto.createHash('md5').update(await fs.readFile(jar)).digest('hex'))
  await expect(dialog.locator('.artifact-ready')).toBeVisible()
  await saveDialog(page, '/container/save')
  return result.data
}

test('container session · actual other-account login and app selection refresh upload authentication', async ({ page, backend, credentials }, info) => {
  const jar = process.env.POWERJOB_E2E_CONTAINER_JAR
  test.skip(!jar, 'A trusted real JAR fixture is required')
  const username = `${runId}_upload_user`, password = `Synthetic.${runId}.Upload`
  await backend.call('/pwjbUser/create', { method: 'POST', data: { username, password } })
  const auth = await backend.call('/auth/thirdPartyLoginDirect', { method: 'POST', data: { loginType: 'PWJB', originParams: JSON.stringify({ username, password, encryption: 'none' }) } })
  const own = new Backend(backend.request, backend.server, auth.jwtToken, null)
  const user = await own.call('/user/detail')
  const samples = (await backend.call('/appInfo/list', { method: 'POST', data: { appId: credentials.app_id, index: 0, pageSize: 10 } })).data[0]
  const app = await backend.call('/appInfo/save', { method: 'POST', data: { namespaceId: samples.namespaceId, appName: `${runId}_upload_app`, title: `${runId}_new_session`, password: `Synthetic.${runId}.App`, componentUserRoleInfo: { admin: [user.id], developer: [], qa: [], observer: [] } } })
  let containerId
  const other = await page.context().newPage(), errors = []
  other.on('pageerror', error => errors.push(error.message))
  try {
    await enterSamples(page, credentials); await page.goto('/#/oms/containermanage')
    await page.getByRole('button', { name: 'New container', exact: true }).click()
    const oldToken = await page.evaluate(() => localStorage.getItem('PowerJwt'))
    await other.goto('/#/admin/app'); await other.locator('.account-button').hover()
    await other.getByRole('menuitem', { name: 'Logout', exact: true }).click()
    await expect(page).toHaveURL(/loginHomepage/)
    await login(other, { ...credentials, admin_username: username, admin_password: password })
    await expect(page).toHaveURL(/admin\/app/)
    const currentToken = await page.evaluate(() => localStorage.getItem('PowerJwt'))
    expect(currentToken !== oldToken).toBe(true)
    await input(page.locator('main'), 'ID', app.id)
    await clickAndResponse(page, '/appInfo/list', () => page.getByRole('button', { name: 'Query', exact: true }).click())
    await selectors.row(page, String(app.id)).getByRole('button', { name: 'Enter', exact: true }).click()
    await page.goto('/#/oms/containermanage')
    let requestContext
    page.on('request', request => {
      if (new URL(request.url()).pathname.endsWith('/container/jarUpload')) {
        const headers = request.headers()
        requestContext = { appId: headers.appid, currentTokenMatches: headers.powerjwt === currentToken, previousTokenUsed: headers.powerjwt === oldToken }
      }
    })
    const md5 = await upload(page, jar, `${runId}_current_headers`)
    expect(requestContext).toEqual({ appId: String(app.id), currentTokenMatches: true, previousTokenUsed: false })
    const current = new Backend(backend.request, backend.server, currentToken, app.id)
    const saved = (await current.call('/container/list?appId=' + app.id)).find(item => item.containerName === `${runId}_current_headers`)
    containerId = saved.id; expect(saved.sourceInfo).toBe(md5)
    expect((await backend.call('/container/list?appId=' + credentials.app_id)).some(item => String(item.id) === String(containerId))).toBe(false)
    await page.reload(); await expect(page.locator('.container-card').filter({ hasText: `${runId}_current_headers` })).toBeVisible()
    await variant(info, page, 'UI-027', 'session-change-upload', ['existing admin container dialog constructed; second tab logs out then normally logs into other real account; first tab session resets/restores; selects other owned app; real upload request uses current token/app only; MD5 and hard reload plus independent container readback'], { appId: app.id, userId: user.id, containerId, uploadContext: requestContext, md5 })
    expect(errors).toEqual([])
  } finally {
    if (containerId) await own.call('/container/delete?containerId=' + containerId + '&appId=' + app.id, { appId: app.id })
    await backend.call('/appInfo/delete?appId=' + app.id, { method: 'POST', appId: app.id })
    await other.close()
  }
})

test('container sockets · actual TCP upgrade refusal, unopened close, and live connection close/reopen twice', async ({ page, backend, credentials }, info) => {
  test.setTimeout(240_000)
  const jar = process.env.POWERJOB_E2E_CONTAINER_JAR, statePath = process.env.POWERJOB_E2E_NETWORK_STATE
  test.skip(!jar || !statePath, 'A trusted JAR and owned real network failure proxy are required')
  const original = JSON.parse(await fs.readFile(statePath, 'utf8'))
  const state = async disabled => fs.writeFile(statePath, JSON.stringify({ ...original, wsDisabled: disabled }))
  let containerId
  const sockets = []
  page.on('websocket', socket => {
    const item = { url: socket.url(), closed: false, connectedFrames: 0 }
    sockets.push(item)
    socket.on('close', () => { item.closed = true })
    socket.on('framereceived', frame => { if (String(frame.payload).includes('connected successfully')) item.connectedFrames++ })
  })
  try {
    await enterSamples(page, credentials); await page.goto('/#/oms/containermanage')
    await upload(page, jar, `${runId}_socket`)
    const saved = (await backend.call('/container/list?appId=' + credentials.app_id)).find(item => item.containerName === `${runId}_socket`)
    containerId = saved.id
    const card = page.locator('.container-card').filter({ hasText: `${runId}_socket` })
    await card.getByRole('button', { name: 'More', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Worker list', exact: true }).click()
    await expect(selectors.dialog(page)).toBeVisible(); expect(sockets).toHaveLength(0)
    await closeDialog(page)
    expect((await backend.call('/container/list?appId=' + credentials.app_id)).find(item => String(item.id) === String(containerId)).version).toBe(saved.version)
    await variant(info, page, 'UI-028', 'ws-close-before-connect', ['open shared deployment-log modal through real Worker list before any WebSocket exists; close modal; zero WebSocket/deploy request; version unchanged and no browser exception'], { containerId, websocketCount: 0, versionUnchanged: true })
    await state(true)
    await card.getByRole('button', { name: 'Deploy', exact: true }).click()
    await expect(page.locator('.el-alert[data-status=error]')).toBeVisible()
    await expect(page.locator('.el-message--error')).toBeVisible()
    await expect.poll(() => sockets[0]?.closed).toBe(true)
    expect((await backend.call('/container/list?appId=' + credentials.app_id)).find(item => String(item.id) === String(containerId)).version).toBe(saved.version)
    await info.attach('actual-websocket-network-error', { body: Buffer.from(JSON.stringify({ failureMode: 'Owned proxy attempts an actual unavailable localhost TCP upstream for WebSocket only', alert: 'error', versionUnchanged: true, frontendJavascriptInterception: false })), contentType: 'application/json' })
    await closeDialog(page); await state(false)
    // Closing immediately after the actual server greeting exercises an open socket,
    // while a new attempt must receive one greeting and keep its own listeners only.
    for (let attempt = 0; attempt < 2; attempt++) {
      await card.getByRole('button', { name: 'Deploy', exact: true }).click()
      await expect(page.locator('.deployment-log')).toContainText('connected successfully')
      const socket = sockets.at(-1)
      expect(socket.connectedFrames).toBe(1)
      expect(socket.closed, 'The real connection must still be open when the page closes it').toBe(false)
      await closeDialog(page)
      await expect.poll(() => socket.closed).toBe(true)
      await page.waitForTimeout(1100)
    }
    await card.getByRole('button', { name: 'Deploy', exact: true }).click()
    await expect(page.locator('.deployment-log')).toContainText('deploy finished, congratulations!', { timeout: 60_000 })
    await expect(page.locator('.el-alert[data-status=success]')).toBeVisible()
    expect((await page.locator('.deployment-log').textContent()).match(/connected successfully/g)).toHaveLength(1)
    await closeDialog(page)
    await expect.poll(async () => ((await backend.call('/container/listDeployedWorker?containerId=' + containerId + '&appId=' + credentials.app_id)).match(/Address:/g) || []).length, { timeout: 60_000, intervals: [1500, 2000] }).toBeGreaterThanOrEqual(2)
    await variant(info, page, 'UI-028', 'ws-close-reopen', ['actual socket network error shown and recovered; close two live connection attempts after server greeting; each old native socket closes; third new attempt completes with one greeting/listener; independent two Worker deployments verified'], { containerId, actualNetworkErrorRecovered: true, socketCount: sockets.length, oldConnectionsClosed: sockets.slice(0, -1).every(socket => socket.closed), greetingsPerConnectedSocket: sockets.slice(1).map(socket => socket.connectedFrames), deployedWorkers: 2 })
  } finally {
    await fs.writeFile(statePath, JSON.stringify(original))
    if (containerId) await backend.call('/container/delete?containerId=' + containerId + '&appId=' + credentials.app_id)
  }
})
