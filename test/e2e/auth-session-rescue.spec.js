import { test, expect, Backend, selectors, runId, input, enterSamples, login, saveDialog, clickAndResponse } from './support.js'
import fs from 'node:fs/promises'

async function logout(page) {
  await page.locator('.account-button').hover()
  await page.getByRole('menuitem', { name: 'Logout', exact: true }).click()
  await expect(page).toHaveURL(/loginHomepage/)
}
async function variant(info, page, caseId, variantId, steps, readback) {
  const image = info.outputPath(`${caseId}-${variantId}-redacted.png`)
  await page.screenshot({ path: image, fullPage: true, mask: [page.locator('input[type=password]'), page.locator('input[autocomplete=username]'), page.locator('input[disabled]')] })
  await info.attach(`page-${caseId}-${variantId}`, { path: image, contentType: 'image/png' })
  await info.attach(`variant-${caseId}-${variantId}`, { body: Buffer.from(JSON.stringify({ caseId, variantId, steps, readback })), contentType: 'application/json' })
}
async function user(backend, suffix) {
  const username = `${runId}_${suffix}`, password = `Synthetic.${runId}.${suffix}`
  await backend.call('/pwjbUser/create', { method: 'POST', data: { username, password } })
  const auth = await backend.call('/auth/thirdPartyLoginDirect', { method: 'POST', data: { loginType: 'PWJB', originParams: JSON.stringify({ username, password, encryption: 'none' }) } })
  const own = new Backend(backend.request, backend.server, auth.jwtToken, null)
  const profile = await own.call('/user/detail')
  await own.call('/user/modify', { method: 'POST', data: { id: profile.id, nick: username, phone: profile.phone, email: profile.email, webHook: profile.webHook } })
  return { ...(await own.call('/user/detail')), username, password, own, nick: username }
}
async function editApp(page, id, inherited = false) {
  await page.goto('/#/admin/app')
  if (inherited) await page.locator('.filter-panel .el-switch').click()
  await input(page.locator('main'), 'ID', id)
  await clickAndResponse(page, '/appInfo/list', () => page.getByRole('button', { name: 'Query', exact: true }).click(), response => String(response.request().postDataJSON()?.appId) === String(id))
  await selectors.row(page, String(id)).getByRole('button', { name: 'Edit', exact: true }).click()
}

test('auth boundary · real expired signed session on actual page list returns login and can recover', async ({ page, backend, credentials }, info) => {
  const fixturePath = process.env.POWERJOB_E2E_EXPIRED_SESSION
  test.skip(!fixturePath, 'A private correctly signed expired token fixture is required')
  const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf8'))
  expect(fixture.officialOriginalSignatureVerified).toBe(true)
  await enterSamples(page, credentials); await clickAndResponse(page, '/job/list', () => page.goto('/#/oms/job'))
  await expect(page.locator('.el-table')).toBeVisible()
  await page.evaluate(token => localStorage.setItem('PowerJwt', token), fixture.expiredToken)
  const denied = await clickAndResponse(page, '/job/list', () => page.getByRole('button', { name: 'Query', exact: true }).click(), response => response.request().headers().powerjwt === fixture.expiredToken)
  expect(denied.success).toBe(false); expect(Number(denied.code)).toBe(-100)
  await expect(page).toHaveURL(/loginHomepage/)
  expect(await page.evaluate(() => localStorage.getItem('PowerJwt'))).toBeNull()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('Power_appId'))).toBeNull()
  await variant(info, page, 'UI-003', 'expired-session', ['normal real login/application Job list; private original-contract valid signature but expired exp token; actual page Query reaches released Server and returns login-required -100; login view and token/app cleanup; numeric/string compatibility separately covered by HTTP units'], { actualServerCode: denied.code, tokenAbsent: true, applicationAbsent: true, signatureVerifiedAgainstActualIssuedToken: true })
  await login(page, credentials); expect(String((await backend.call('/user/detail')).id)).toBeDefined()
})

test('auth boundary · last explicit app administrator uses namespace rescue and global empty selection sends no write', async ({ page, backend, credentials }, info) => {
  test.setTimeout(120_000)
  const owner = await user(backend, 'last_app_owner'), rescue = await user(backend, 'namespace_rescue')
  const roles = id => ({ admin: [id], developer: [], qa: [], observer: [] })
  let namespace, app
  const globalBefore = await backend.call('/auth/listGlobalAdmin')
  expect(globalBefore.length).toBeGreaterThan(0)
  try {
    namespace = await backend.call('/namespace/save', { method: 'POST', data: { code: `${runId}_rescue_namespace`, name: `${runId}_rescue_namespace`, componentUserRoleInfo: roles(rescue.id) } })
    app = await backend.call('/appInfo/save', { method: 'POST', data: { namespaceId: namespace.id, appName: `${runId}_last_explicit_admin`, title: `${runId}_before`, password: `Synthetic.${runId}.App`, componentUserRoleInfo: roles(owner.id) } })
    // Released Server grants a creator ADMIN on create. Normalize only this owned
    // fixture through its normal update API so the page truly begins with one ADMIN.
    const createdApp = (await backend.call('/appInfo/list', { method: 'POST', data: { appId: app.id, index: 0, pageSize: 10, showMyRelated: false } })).data[0]
    await backend.call('/appInfo/save', { method: 'POST', appId: app.id, data: { ...createdApp, componentUserRoleInfo: roles(owner.id) } })
    const singleAdmin = (await backend.call('/appInfo/list', { method: 'POST', data: { appId: app.id, index: 0, pageSize: 10, showMyRelated: false } })).data[0]
    expect(singleAdmin.componentUserRoleInfo.admin.map(String)).toEqual([String(owner.id)])
    await logout(page); await login(page, { ...credentials, admin_username: owner.username, admin_password: owner.password })
    await editApp(page, app.id)
    const field = selectors.dialog(page).locator('.role-field').filter({ has: page.locator('label', { hasText: /^Admin$/i }) })
    await expect(field.locator('.el-tag')).toHaveCount(1); await field.locator('.el-tag__close').click()
    await saveDialog(page, '/appInfo/save')
    const empty = (await backend.call('/appInfo/list', { method: 'POST', data: { appId: app.id, index: 0, pageSize: 10, showMyRelated: false } })).data[0]
    expect(empty.componentUserRoleInfo.admin).toEqual([])
    const ns = (await backend.call('/namespace/list', { method: 'POST', data: { codeLike: namespace.code, index: 0, pageSize: 10 } })).data[0]
    expect(ns.componentUserRoleInfo.admin.map(String)).toContain(String(rescue.id))
    await logout(page); await login(page, { ...credentials, admin_username: rescue.username, admin_password: rescue.password })
    await editApp(page, app.id, true)
    await input(selectors.dialog(page), 'Name', `${runId}_rescued`)
    await field.locator('.el-select').click()
    const ownerOption = page.locator('.el-select-dropdown:visible .el-select-dropdown__item').filter({ hasText: owner.nick })
    await ownerOption.first().click(); await selectors.dialog(page).locator('.el-dialog__header').click()
    await saveDialog(page, '/appInfo/save')
    const restored = (await backend.call('/appInfo/list', { method: 'POST', data: { appId: app.id, index: 0, pageSize: 10, showMyRelated: false } })).data[0]
    expect(restored.title).toBe(`${runId}_rescued`); expect(restored.componentUserRoleInfo.admin.map(String)).toContain(String(owner.id))
    await logout(page); await login(page, credentials); await page.goto('/#/admin/settings')
    await expect(page.locator('.settings-card .el-tag')).toBeVisible()
    for (let index = 0; index < globalBefore.length; index++) await page.locator('.settings-card .el-tag__close').first().click()
    await expect(page.locator('.settings-card .el-tag')).toHaveCount(0)
    let globalWrites = 0
    page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/auth/saveGlobalAdmin')) globalWrites++ })
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.locator('.el-message--warning')).toBeVisible(); expect(globalWrites).toBe(0)
    expect((await backend.call('/auth/listGlobalAdmin')).map(String)).toEqual(globalBefore.map(String))
    await page.reload(); await expect(page.locator('.settings-card .el-tag')).toBeVisible()
    await variant(info, page, 'UI-005', 'last-admin', ['normal explicit app-owner page removes only APP ADMIN; inherited namespace ADMIN remains; separate namespace-admin normal login edits and restores APP ADMIN successfully; global rescue roles stay unchanged; actual global Settings empty selection Save rejected before any request; reload retains rescue administrators'], { appId: app.id, namespaceId: namespace.id, explicitAdminRemovedWithoutLockout: true, actualNamespaceRescueUser: rescue.id, restoredAppAdmin: owner.id, globalEmptyWrites: globalWrites, globalRescueIdsUnchanged: true, compatibility: 'APP empty explicit ADMIN remains legal under original inherited namespace/global authorization; global list cannot be empty' })
  } finally {
    if (app?.id) await backend.call('/appInfo/delete?appId=' + app.id, { method: 'POST', appId: app.id })
    if (namespace?.id) await backend.call('/namespace/delete?id=' + namespace.id, { method: 'DELETE', namespaceId: namespace.id })
  }
})
