import { test, expect, selectors, runId, input, choose, enterSamples, saveDialog, clickAndResponse } from './support.js'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'

// Hold a genuine response only after the released Server has completed it.
// Releasing preserves its status/headers/body; no business response is mocked.
async function holdFirst(page, endpoint) {
  let seen = false, release, capturedResolve, deliveredResolve, response, requestBody
  const captured = new Promise(resolve => { capturedResolve = resolve })
  const gate = new Promise(resolve => { release = resolve })
  const delivered = new Promise(resolve => { deliveredResolve = resolve })
  const handler = async route => {
    if (!new URL(route.request().url()).pathname.endsWith(endpoint) || seen) { await route.continue(); return }
    seen = true
    requestBody = route.request().postData()
    response = await route.fetch()
    const bytes = await response.body()
    capturedResolve({ endpoint, status: response.status(), bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), genuineServerResponseUnmodified: true })
    await gate
    try { await route.fulfill({ response }) } catch (error) {
      // Navigation can intentionally cancel the obsolete request. Its response
      // was still real and retained; record cancellation instead of inventing a delivery.
      deliveredResolve({ obsoleteRequestCancelledByActualNavigation: true, errorClass: error.name }); return
    }
    deliveredResolve({ originalResponseDelivered: true })
  }
  await page.route('**/*', handler)
  return { captured, async release() { release(); return delivered }, async dispose() { release(); await page.unroute('**/*', handler) }, requestBody: () => requestBody }
}
async function settledRender(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}
async function attach(info, domain, actual) {
  await fs.writeFile(info.outputPath(`real-response-race-${domain}.json`), JSON.stringify({ domain, testTitle: info.title, status: 'PASS', actual }, null, 2))
}

for (const domain of [
  { name: 'Job', path: '/#/oms/job', endpoint: '/job/list', field: 'Keyword', value: `${runId}_impossible_job` },
  { name: 'Workflow', path: '/#/oms/workflow', endpoint: '/workflow/list', field: 'Keyword', value: `${runId}_impossible_wf` },
  { name: 'Instance', path: '/#/oms/instance', endpoint: '/instance/list', field: 'Instance ID', value: '9223372036854775806' },
  { name: 'WorkflowInstance', path: '/#/oms/wfinstance', endpoint: '/wfInstance/list', field: 'WorkflowInstanceId', value: '9223372036854775806' },
]) {
  test(`UI-030/038 · genuine initial ${domain.name} response held while new actual UI query returns zero`, async ({ page, backend, credentials }, info) => {
    await enterSamples(page, credentials)
    const held = await holdFirst(page, domain.endpoint)
    try {
      await page.goto(domain.path)
      const old = await held.captured
      expect(old.status).toBe(200)
      await page.getByPlaceholder(domain.field, { exact: true }).fill(domain.value)
      const newest = await clickAndResponse(page, domain.endpoint, () => page.locator('main').getByRole('button', { name: 'Query', exact: true }).first().click(), response => response.request().postData()?.includes(domain.value))
      expect(newest.success).toBe(true)
      expect(newest.data.totalItems).toBe(0)
      await expect(page.locator('.el-table__empty-text')).toBeVisible()
      const delivered = await held.release()
      await settledRender(page)
      await expect(page.locator('.el-table__empty-text')).toBeVisible()
      await expect(page.locator('.el-table__body-wrapper tr')).toHaveCount(0)
      const direct = await backend.call(domain.endpoint, { method: 'POST', data: { appId: credentials.app_id, index: 0, pageSize: 10, ...(domain.field === 'Keyword' ? { keyword: domain.value } : domain.name === 'Instance' ? { instanceId: domain.value, type: 'NORMAL' } : { wfInstanceId: domain.value }) } })
      expect(direct.totalItems).toBe(0)
      await attach(info, domain.name, { heldOriginal: old, delivery: delivered, actualNewUIQueryZero: true, independentServerZeroReadback: true, zeroDOMRowsAfterOldResponseReleased: true })
    } finally { await held.dispose() }
  })
}

async function emptyApp(page, backend, name) {
  await page.goto('/#/admin/namespace')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await input(selectors.dialog(page), 'Code', name)
  await input(selectors.dialog(page), 'Name', name)
  await saveDialog(page, '/namespace/save')
  const ns = (await backend.call('/namespace/list', { method: 'POST', data: { codeLike: name, index: 0, pageSize: 10 } })).data[0]
  await page.goto('/#/admin/app')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await choose(page, selectors.dialog(page), 'Namespace', new RegExp(name))
  await input(selectors.dialog(page), 'appName', name)
  await input(selectors.dialog(page), 'Name', name)
  await input(selectors.dialog(page), 'Password', `Synthetic.${runId}`)
  await saveDialog(page, '/appInfo/save')
  const app = (await backend.call('/appInfo/list', { method: 'POST', data: { appNameLike: name, showMyRelated: false, index: 0, pageSize: 10 } })).data[0]
  return { ns, app }
}
async function enterApp(page, name) {
  await page.goto('/#/admin/app')
  await input(page.locator('main'), 'appName', name)
  await page.getByRole('button', { name: 'Query', exact: true }).click()
  await selectors.row(page, name).getByRole('button', { name: 'Enter', exact: true }).click()
  await expect(page).toHaveURL(/oms\/home/)
}
async function removeApp(backend, fixture) {
  await backend.call('/appInfo/delete?appId=' + fixture.app.id, { method: 'POST', appId: fixture.app.id })
  await backend.call('/namespace/delete?id=' + fixture.ns.id, { method: 'DELETE', namespaceId: fixture.ns.id })
}

test('UI-030/038 · held real Home worker response cannot contaminate a newly entered empty application', async ({ page, backend, credentials }, info) => {
  const name = `${runId}_empty_race`
  const fixture = await emptyApp(page, backend, name)
  let held
  try {
    await page.goto('/#/admin/app')
    held = await holdFirst(page, '/system/listWorker')
    await enterSamples(page, credentials)
    const old = await held.captured
    expect(old.status).toBe(200)
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeDisabled()
    await enterApp(page, name)
    await expect(page.locator('.metric-card strong').nth(3)).toHaveText('0')
    await expect(page.locator('.el-table__empty-text')).toBeVisible()
    const delivered = await held.release()
    await settledRender(page)
    await expect(page.locator('.metric-card strong').nth(3)).toHaveText('0')
    await expect(page.locator('.metric-caption').first()).toHaveText(name)
    expect(await backend.call('/system/listWorker?appId=' + fixture.app.id, { appId: fixture.app.id })).toEqual([])
    await attach(info, 'Home', { heldOriginal: old, delivery: delivered, actualUISamplesToIndependentEmptyApp: true, currentApplicationWorkersZeroAndCaptionNotOverwritten: true, independentRealZeroWorkers: true, refreshDisabledDuringOutstandingRequest: true, obsoleteComponentNavigatedAway: true })
  } finally { if (held) await held.dispose(); await removeApp(backend, fixture) }
})

test('UI-030/038 · held original Container list cannot overwrite a newer real UI creation and refresh', async ({ page, backend, credentials }, info) => {
  await enterSamples(page, credentials)
  const held = await holdFirst(page, '/container/list')
  const name = `${runId}_container_race`
  let id
  try {
    await page.goto('/#/oms/containermanage')
    const old = await held.captured
    expect(old.status).toBe(200)
    await page.getByRole('button', { name: 'New container', exact: true }).click()
    await input(selectors.dialog(page), 'Name', name)
    await input(selectors.dialog(page), 'Git URL', 'https://example.invalid/undeployed-race-fixture.git')
    await input(selectors.dialog(page), 'Branch', 'main')
    await saveDialog(page, '/container/save')
    const container = (await backend.call('/container/list?appId=' + credentials.app_id)).find(value => value.containerName === name)
    id = container.id
    await expect(page.locator('.container-card').filter({ hasText: name })).toBeVisible()
    const delivered = await held.release()
    await settledRender(page)
    await expect(page.locator('.container-card').filter({ hasText: name })).toBeVisible()
    expect((await backend.call('/container/list?appId=' + credentials.app_id)).some(value => String(value.id) === String(id))).toBe(true)
    await attach(info, 'Container', { heldOriginal: old, delivery: delivered, actualUINewContainerAndSaveWhileInitialListHeld: true, latestRealListAndOwnedCardNotOverwritten: true, independentStoredContainerExists: true, fixtureNeverDeployed: true })
  } finally {
    await held.dispose()
    if (id) await backend.call('/container/delete?containerId=' + id + '&appId=' + credentials.app_id)
  }
})
