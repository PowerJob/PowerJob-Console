import { test, expect, Backend, selectors, runId, input, login, secretFill, clickAndResponse } from './support.js'

async function variant(info, page, caseId, variantId, steps, readback) {
  const path = info.outputPath(`${caseId}-${variantId}-redacted.png`)
  await page.screenshot({ path, fullPage: true, mask: [page.locator('input[type=password]'), page.locator('input[autocomplete=username]'), page.locator('input[disabled]')] })
  await info.attach(`page-${caseId}-${variantId}`, { path, contentType: 'image/png' })
  await info.attach(`variant-${caseId}-${variantId}`, { body: Buffer.from(JSON.stringify({ caseId, variantId, steps, readback })), contentType: 'application/json' })
}
async function logout(page) {
  await page.locator('.account-button').hover()
  await page.getByRole('menuitem', { name: 'Logout', exact: true }).click()
  await expect(page).toHaveURL(/loginHomepage/)
}
async function queryUser(page, id) {
  await page.goto('/#/admin/user')
  await input(page.locator('main'), 'ID', id)
  await clickAndResponse(page, '/user/query', () => page.getByRole('button', { name: 'Query', exact: true }).click())
  const row = selectors.row(page, String(id)); await expect(row).toBeVisible(); return row
}

test('authfinal · actual wrong password, one keyboard submission and button login refresh', async ({ page, backend, credentials }, info) => {
  await logout(page)
  await page.getByRole('button', { name: /PWJB|PowerJob/i }).first().click()
  await secretFill(page.getByLabel('Username', { exact: true }), credentials.admin_username)
  await secretFill(page.getByLabel('Password', { exact: true }), 'synthetic-wrong-password')
  const wrong = await clickAndResponse(page, '/auth/thirdPartyLoginDirect', () => page.getByRole('button', { name: 'Login', exact: true }).click())
  expect(wrong.success).toBe(false)
  await expect(page).toHaveURL(/powerjobLogin/)
  await expect(page.locator('.el-message').last()).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('PowerJwt'))).toBeNull()
  expect(await page.evaluate(() => localStorage.getItem('Power_appId'))).toBeNull()
  await variant(info, page, 'UI-001', 'wrong-password', ['logout; actual page wrong password submit; actual business failure; visible error and no token/app'], { loginSuccess: false, tokenPresent: false, oldAppPresent: false })
  let attempts = 0
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/auth/thirdPartyLoginDirect')) attempts++ })
  await secretFill(page.getByLabel('Password', { exact: true }), credentials.admin_password)
  await page.getByLabel('Password', { exact: true }).press('Enter')
  await expect(page).toHaveURL(/admin\/app/)
  await expect(page.locator('.el-table')).toBeVisible()
  expect(attempts).toBe(1)
  await variant(info, page, 'UI-001', 'keyboard-submit', ['actual correct credential inputs; press Enter once; application list visible; exactly one direct-login request'], { requests: attempts, applicationListVisible: true })
  await logout(page)
  await login(page, credentials)
  const token = await page.evaluate(() => localStorage.getItem('PowerJwt'))
  const expected = await backend.call('/user/detail')
  await page.reload(); await expect(page.locator('.el-table')).toBeVisible()
  expect(await page.evaluate(expected => localStorage.getItem('PowerJwt') === expected, token)).toBe(true)
  const current = new Backend(backend.request, backend.server, token, credentials.app_id)
  expect(String((await current.call('/user/detail')).id)).toBe(String(expected.id))
  await variant(info, page, 'UI-001', 'correct-login', ['button correct login; hard refresh application list; same current user independent detail'], { userId: expected.id, sameUserAfterReload: true, applicationListVisible: true })
})

test('authfinal · registration mismatch, complete profile normal login and duplicate identity', async ({ page, backend, credentials }, info) => {
  const username = `${runId}_registration`, password = `Synthetic.${runId}.Registration`
  const profile = { nick: `${runId} 新用户中文`, phone: '10000000000', email: 'fixture@example.invalid', webHook: 'https://example.invalid/registration?text=%E4%B8%AD&x=+%25' }
  await logout(page); await page.goto('/#/powerjobLogin')
  await page.getByRole('button', { name: 'User Registration', exact: true }).click()
  const dialog = selectors.dialog(page)
  for (const [label, value] of [['Username', username], ['Nick', profile.nick], ['Phone', profile.phone], ['Email', profile.email], ['Webhook', profile.webHook], ['New Password', password], ['Check New Password', password + '.mismatch']]) await input(dialog, label, value)
  let createRequests = 0
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/pwjbUser/create')) createRequests++ })
  await dialog.getByRole('button', { name: 'Register', exact: true }).click()
  await expect(page.locator('.el-message').last()).toContainText(/match|consistent/i)
  await expect(dialog).toBeVisible(); expect(createRequests).toBe(0)
  await variant(info, page, 'UI-002', 'password-mismatch', ['actual registration all profile fields; mismatched confirmation; visible mismatch; dialog retained; zero create requests'], { createRequests })
  await input(dialog, 'Check New Password', password)
  const created = await clickAndResponse(page, '/pwjbUser/create', () => dialog.getByRole('button', { name: 'Register', exact: true }).click())
  expect(created.success).toBe(true); await expect(dialog).not.toBeVisible()
  await login(page, { ...credentials, admin_username: username, admin_password: password })
  await page.goto('/#/admin/personal')
  for (const [label, value] of [['Nick', profile.nick], ['Phone', profile.phone], ['Email', profile.email], ['Webhook', profile.webHook]]) await expect(page.getByLabel(label, { exact: true })).toHaveValue(value)
  const own = new Backend(backend.request, backend.server, await page.evaluate(() => localStorage.getItem('PowerJwt')), credentials.app_id)
  const readback = await own.call('/user/detail'); expect(readback).toMatchObject(profile)
  await variant(info, page, 'UI-002', 'complete-register', ['actual all-fields registration; profile initialization completes; normal new-user login; all four profile fields visible and independent detail exact'], { userId: readback.id, profile })
  await logout(page); await page.goto('/#/powerjobLogin')
  await page.getByRole('button', { name: 'User Registration', exact: true }).click()
  for (const [label, value] of [['Username', username], ['New Password', password], ['Check New Password', password]]) await input(selectors.dialog(page), label, value)
  const duplicate = await clickAndResponse(page, '/pwjbUser/create', () => selectors.dialog(page).getByRole('button', { name: 'Register', exact: true }).click())
  expect(duplicate.success).toBe(false); await expect(selectors.dialog(page)).toBeVisible()
  await expect(page.locator('.el-message').last()).toBeVisible()
  expect((await backend.call('/user/query', { method: 'POST', data: { userIdEq: readback.id } })).filter(user => String(user.id) === String(readback.id))).toHaveLength(1)
  expect(String((await own.call('/user/detail')).id)).toBe(String(readback.id))
  await variant(info, page, 'UI-002', 'duplicate-register', ['actual same username registers again; business failure visible; retained draft; independent original identity remains singular and unchanged'], { duplicateSuccess: false, originalUserId: readback.id, originalUserCount: 1 })
  await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
})

test('authfinal · page disable and enable isolated user control actual login in new profile', async ({ page, backend, credentials }, info) => {
  const username = `${runId}_enable`, password = `Synthetic.${runId}.Enable`
  await backend.call('/pwjbUser/create', { method: 'POST', data: { username, password } })
  const auth = await backend.call('/auth/thirdPartyLoginDirect', { method: 'POST', data: { loginType: 'PWJB', originParams: JSON.stringify({ username, password, encryption: 'none' }) } })
  const own = new Backend(backend.request, backend.server, auth.jwtToken, credentials.app_id)
  const user = await own.call('/user/detail')
  const context = await page.context().browser().newContext({ baseURL: new URL(page.url()).origin })
  await context.addInitScript(() => { if (/^https?:$/.test(location.protocol)) localStorage.setItem('oms_lang', 'en') })
  const userPage = await context.newPage(), errors = []
  userPage.on('pageerror', error => errors.push(error.message))
  try {
    let row = await queryUser(page, user.id)
    const disabled = await clickAndResponse(page, '/user/disable', () => row.locator('.el-switch').click())
    expect(disabled.success).toBe(true); await expect(row.locator('.el-switch')).not.toHaveClass(/is-checked/)
    await page.reload(); row = await queryUser(page, user.id); await expect(row.locator('.el-switch')).not.toHaveClass(/is-checked/)
    expect((await backend.call('/user/query', { method: 'POST', data: { userIdEq: user.id } }))[0].enable).toBe(false)
    await userPage.goto('/#/powerjobLogin')
    await secretFill(userPage.getByLabel('Username', { exact: true }), username); await secretFill(userPage.getByLabel('Password', { exact: true }), password)
    const denied = await clickAndResponse(userPage, '/auth/thirdPartyLoginDirect', () => userPage.getByRole('button', { name: 'Login', exact: true }).click())
    expect(denied.success).toBe(false); await expect(userPage).toHaveURL(/powerjobLogin/)
    expect(await userPage.evaluate(() => localStorage.getItem('PowerJwt'))).toBeNull()
    await variant(info, userPage, 'UI-007', 'disable-login', ['owner page disables synthetic user; hard refresh row off and independent enable false; brand-new browser profile real normal credential login refused'], { userId: user.id, enable: false, loginSuccess: false })
    const enabled = await clickAndResponse(page, '/user/enable', () => row.locator('.el-switch').click())
    expect(enabled.success).toBe(true); await expect(row.locator('.el-switch')).toHaveClass(/is-checked/)
    await page.reload(); row = await queryUser(page, user.id); await expect(row.locator('.el-switch')).toHaveClass(/is-checked/)
    expect((await backend.call('/user/query', { method: 'POST', data: { userIdEq: user.id } }))[0].enable).toBe(true)
    await userPage.getByRole('button', { name: 'Login', exact: true }).click(); await expect(userPage).toHaveURL(/admin\/app/)
    const enabledOwn = new Backend(backend.request, backend.server, await userPage.evaluate(() => localStorage.getItem('PowerJwt')), credentials.app_id)
    expect(String((await enabledOwn.call('/user/detail')).id)).toBe(String(user.id))
    await variant(info, userPage, 'UI-007', 'enable-login', ['owner page re-enables same user; hard refresh row on and independent true; same fresh profile normal credential login now succeeds with correct user'], { userId: user.id, enable: true, loginSuccess: true })
    expect(errors).toEqual([])
  } finally { await backend.call('/user/enable?uid=' + user.id, { method: 'POST' }); await context.close() }
})
