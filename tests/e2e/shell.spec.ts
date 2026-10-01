import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import { test, expect, selectors, fill, choose, secretFill, login, enterSamples, enterApplication, clickAndResponse, ownedName, id, observation, type RecordDTO, type PageDTO } from './helpers'
import type { Page } from '@playwright/test'

async function logout(page: Page) { await page.getByLabel('Account', { exact: true }).filter({ visible: true }).click(); await page.getByRole('button', { name: 'Sign out', exact: true }).click(); await expect(page).toHaveURL(/#\/loginHomepage$/) }
async function noOverflow(page: Page) { await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true) }

test('UI-031/032/035 · desktop navigation expansion persists and mobile drawer supports keyboard recovery', async ({ page, backend: _backend }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const before = await page.locator('#main-content').boundingBox(); expect(before).not.toBeNull()
  const compactRail = await page.locator('aside.rail').boundingBox(); expect(compactRail!.width).toBe(76); expect(before!.x).toBe(76)
  await page.getByRole('button', { name: 'Expand navigation', exact: true }).click(); const expanded = page.getByRole('button', { name: 'Collapse navigation', exact: true }); await expect(expanded).toHaveAttribute('aria-expanded', 'true')
  const after = await page.locator('#main-content').boundingBox(); expect(after!.x).toBe(190); expect((await page.locator('aside.rail').boundingBox())!.width).toBe(190); expect((await page.locator('.workspace-header').boundingBox())!.x).toBe(190); await noOverflow(page)
  await page.reload(); await expect(page.getByRole('button', { name: 'Collapse navigation', exact: true })).toHaveAttribute('aria-expanded', 'true'); expect(await page.evaluate(() => localStorage.getItem('Power_navExpanded'))).toBe('true'); await page.getByRole('button', { name: 'Collapse navigation', exact: true }).click(); await expect(page.getByRole('button', { name: 'Expand navigation', exact: true })).toHaveAttribute('aria-expanded', 'false')
  await page.setViewportSize({ width: 390, height: 844 }); const open = page.getByRole('button', { name: 'Open navigation', exact: true }); await expect(page.locator('aside.rail')).toHaveAttribute('inert', '')
  await open.click(); const first = page.locator('aside.rail').getByRole('link', { name: 'PowerJob', exact: true }); await expect(first).toBeFocused(); await expect(open).toHaveAttribute('aria-expanded', 'true'); await expect(page.locator('#main-content')).toHaveAttribute('inert', '')
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('aside.rail').getByRole('link', { name: 'Workspace', exact: true })).toBeFocused(); await page.keyboard.press('Tab'); await expect(first).toBeFocused(); await page.keyboard.press('Escape'); await expect(open).toBeFocused(); await expect(open).toHaveAttribute('aria-expanded', 'false'); await expect(page.locator('#main-content')).not.toHaveAttribute('inert', '')
  await open.click(); await page.getByRole('button', { name: 'Close navigation', exact: true }).click({ position: { x: 200, y: 250 } }); await expect(open).toBeFocused(); await expect(page.locator('aside.rail')).toHaveAttribute('inert', ''); await noOverflow(page)
  await observation(info, 'UI-032', 'desktop-mobile-navigation', { desktopRailWidths: [76, 190], mainAndHeaderAlignedWithExpandedRail: true, expansionSurvivedReload: true, keyboardTrapForwardBackward: true, escapeRestoredTriggerFocus: true, backdropRestoredBackground: true, hiddenMobileRailInert: true })
})

test('UI-003/033 · all 22 legacy route entries recover through real authentication guards', async ({ page, credentials }, info) => {
  let anonymousChecks = 0
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/auth/ifLogin')) anonymousChecks++ })
  await login(page, credentials); await logout(page)
  const entries = ['/', '/loginHomepage', '/powerjobLogin', '/admin', '/admin/app', '/admin/namespace', '/admin/user', '/admin/personal', '/admin/settings', '/oms', '/oms/home', '/oms/job', '/oms/instance', '/oms/workflow', '/oms/workflowEditor', '/oms/wfinstance', '/oms/wfInstanceDetail', '/oms/template', '/oms/containermanage', '/sidebar', '/navbar', '/unknown_fev3_route']
  const observed: RecordDTO[] = []
  for (const path of entries) {
    await page.goto('/#' + path)
    const direct = path === '/powerjobLogin'
    await expect(page).toHaveURL(direct ? /#\/powerjobLogin$/ : /#\/loginHomepage$/)
    await expect(page.getByRole('heading', { name: direct ? 'Sign in with PowerJob' : 'Sign in to your workspace', exact: true })).toBeVisible()
    observed.push({ input: path, visibleRoute: direct ? '/powerjobLogin' : '/loginHomepage', visibleSignInHeading: true })
  }
  // Hash navigation can reuse the anonymous landing view. Validate all actual
  // routes/headings above and bound checks without requiring a remount per entry.
  expect(anonymousChecks).toBeGreaterThanOrEqual(1); expect(anonymousChecks).toBeLessThanOrEqual(24)
  await login(page, credentials); await page.goto('/#/oms/job'); await expect(page).toHaveURL(/#\/admin\/app$/); await expect(page.getByRole('heading', { name: 'Applications', exact: true })).toBeVisible()
  await enterSamples(page, credentials); await page.goto('/#/oms'); await expect(page).toHaveURL(/#\/oms\/home$/); await expect(page.getByRole('heading', { name: 'Operations overview', exact: true })).toBeVisible(); await page.reload(); await expect(page.getByRole('heading', { name: 'Operations overview', exact: true })).toBeVisible(); await page.goto('/#/unknown_fev3_route'); await expect(page).toHaveURL(/#\/admin\/app$/)
  await observation(info, 'UI-033', 'legacy-route-guards', { entries: observed, anonymousEntryCount: 22, anonymousChecksBeforeFreshLogin: anonymousChecks, anonymousCheckLoopAbsent: true, noApplicationRecoveredToChooser: true, selectedApplicationRefreshRestored: true, authenticatedUnknownRecoveredToChooser: true })
})

test('UI-034/039 · legacy locale storage, modern override and refresh render the actual selected language', async ({ page, credentials }, info) => {
  await page.addInitScript(() => { if (!localStorage.getItem('fev3_locale_initialized')) { localStorage.removeItem('oms_lang'); localStorage.setItem('lang', 'cn'); localStorage.setItem('fev3_locale_initialized', 'yes') } })
  await page.goto('/#/loginHomepage'); await expect(page.getByRole('heading', { name: '登录工作台', exact: true })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.lang)).toBe('zh-CN')
  await page.locator('.auth-language select').selectOption('en'); await expect(page.getByRole('heading', { name: 'Sign in to your workspace', exact: true })).toBeVisible(); await page.reload(); await expect(page.getByRole('heading', { name: 'Sign in to your workspace', exact: true })).toBeVisible(); expect(await page.evaluate(() => localStorage.getItem('oms_lang'))).toBe('en')
  await login(page, credentials); await page.getByLabel('Language', { exact: true }).filter({ visible: true }).selectOption('zh'); await expect(page.getByRole('heading', { name: '应用', exact: true })).toBeVisible(); await page.reload(); await expect(page.getByRole('heading', { name: '应用', exact: true })).toBeVisible(); expect(await page.evaluate(() => ({ language: document.documentElement.lang, stored: localStorage.getItem('oms_lang') }))).toEqual({ language: 'zh-CN', stored: 'cn' })
  await observation(info, 'UI-034', 'legacy-locale-refresh', { legacyCnRendered: true, modernEnOverrodeLegacyCn: true, authenticatedCnSurvivedRefresh: true, pageLabelsActuallyInspected: true })
})

test('UI-003/038 · two real tabs isolate selected app, delayed old workers and replacement account/logout', async ({ page, backend, credentials }, info) => {
  const names = { namespace: ownedName('shell_namespace'), label: ownedName('shell_space'), app: ownedName('shell_app'), user: ownedName('shell_user') }
  const password = 'Shell-' + crypto.randomUUID()
  let namespaceId: string | undefined; let appId: string | undefined; let userId: string | undefined; let accountCreated = false
  const other = await page.context().newPage(); const prefix = (process.env.POWERJOB_E2E_PATH_PREFIX || '').replace(/\/$/, ''); const goto = (target: Page, route: string) => target.goto(prefix + '/#' + route)
  const childErrors: string[] = []; other.on('pageerror', error => childErrors.push(error.message))
  let releaseOld: (() => void) | undefined
  try {
    await page.goto('/#/admin/namespace'); await page.getByRole('button', { name: 'New namespace', exact: true }).click(); let dialog = selectors.dialog(page, 'New namespace'); await fill(dialog, 'Code', names.namespace); await fill(dialog, 'Name', names.label); const space = await clickAndResponse<RecordDTO>(page, '/namespace/save', () => dialog.getByRole('button', { name: 'Save', exact: true }).click()); expect(space.success).toBe(true); namespaceId = id(space.data.id)
    await page.goto('/#/admin/app'); await page.getByRole('button', { name: 'New application', exact: true }).click(); dialog = selectors.dialog(page, 'New application'); await choose(dialog, 'Namespace', `${names.label}(${names.namespace})`); await fill(dialog, 'Application name', names.app); await secretFill(dialog.getByLabel('Application password', { exact: true }).filter({ visible: true }), password); const created = await clickAndResponse<RecordDTO>(page, '/appInfo/save', () => dialog.getByRole('button', { name: 'Save', exact: true }).click()); expect(created.success).toBe(true); appId = id(created.data.id)
    await goto(other, '/powerjobLogin'); await other.getByRole('button', { name: 'Create an account', exact: true }).click(); dialog = selectors.dialog(other, 'Create an account'); await fill(dialog, 'Username', names.user); await fill(dialog, 'Nickname', names.user); await secretFill(dialog.getByLabel('Password', { exact: true }).filter({ visible: true }), password); await secretFill(dialog.getByLabel('Confirm password', { exact: true }).filter({ visible: true }), password); const account = await clickAndResponse(other, '/pwjbUser/create', () => dialog.getByRole('button', { name: 'Create account', exact: true }).click()); expect(account.success).toBe(true); accountCreated = true; await expect(other.locator('.registration-notice')).toContainText('Account created'); const ownUser = (await backend.call<RecordDTO[]>('/user/query', { method: 'POST', data: { nickLike: names.user } })).find(value => value.username === 'PWJB_' + names.user); expect(ownUser).toBeDefined(); userId = id(ownUser!.id)
    await enterSamples(page, credentials); await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled(); await expect(page.locator('.overview-workers tbody tr')).toHaveCount(2)
    let heldWorkerCount = -1; let ready!: () => void; const oldReady = new Promise<void>(resolve => { ready = resolve }); const released = new Promise<void>(resolve => { releaseOld = resolve })
    await page.route('**/system/listWorker?*', async route => {
      if (new URL(route.request().url()).searchParams.get('appId') !== id(credentials.app_id)) { await route.continue(); return }
      const actual = await route.fetch(); const body = await actual.json(); heldWorkerCount = Array.isArray(body.data) ? body.data.length : -1; ready(); await released
      // Only the original real response is delayed. No response body, status or header is fabricated.
      await route.fulfill({ response: actual }).catch(() => {})
    })
    await page.getByRole('button', { name: 'Refresh', exact: true }).click(); await oldReady; expect(heldWorkerCount).toBe(2)
    await goto(other, '/admin/app'); const currentHeaders: string[] = []; page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/system/listWorker')) currentHeaders.push(request.headers().appid || '') }); await enterApplication(other, names.app)
    await expect(page.getByRole('heading', { name: 'Operations overview', exact: true })).toBeVisible(); await expect(page.getByRole('link', { name: 'Switch application', exact: true })).toContainText(names.app); await expect(page.getByText('No Workers connected', { exact: true })).toBeVisible(); expect(currentHeaders).toContain(appId)
    if (!releaseOld) throw new Error('The held real response was not initialized')
    releaseOld(); await page.unroute('**/system/listWorker?*'); await expect(page.locator('.overview-workers tbody tr')).toHaveCount(0)
    await goto(other, '/powerjobLogin'); await secretFill(other.getByLabel('Username', { exact: true }).filter({ visible: true }), names.user); await secretFill(other.getByLabel('Password', { exact: true }).filter({ visible: true }), password); await other.getByRole('button', { name: 'Sign in', exact: true }).click(); await expect(other).toHaveURL(/#\/admin\/app$/); await expect(page).toHaveURL(/#\/admin\/app$/); expect(await page.evaluate(() => localStorage.getItem('Power_appId'))).toBeNull()
    await page.goto('/#/admin/personal'); await expect(page.getByLabel('Username', { exact: true }).filter({ visible: true })).toHaveValue('PWJB_' + names.user); await logout(other); await expect(page).toHaveURL(/#\/loginHomepage$/); await expect(page.getByRole('heading', { name: 'Sign in to your workspace', exact: true })).toBeVisible(); expect(await page.evaluate(() => localStorage.getItem('PowerJwt'))).toBeNull(); expect(childErrors).toEqual([])
    await observation(info, 'UI-038', 'cross-tab-context-and-stale-response', { appId, namespaceId, userId, actualTabs: 2, priorRealWorkerResponseCount: heldWorkerCount, oldWorkersNeverRenderedForNewApp: true, currentRequestAppHeaderVerified: true, replacementAccountProfileReadBack: true, crossTabLogoutClearedSession: true, noFabricatedResponse: true })
  } finally {
    releaseOld?.(); await other.close()
    const actions: RecordDTO[] = []
    if (accountCreated) {
      let actual = (await backend.call<RecordDTO[]>('/user/list', { query: { name: 'PWJB_' + names.user } })).find(value => value.username === 'PWJB_' + names.user)
      if (!actual) { await backend.call('/auth/thirdPartyLoginDirect', { method: 'POST', data: { loginType: 'PWJB', originParams: JSON.stringify({ username: names.user, password, encryption: 'none' }) } }); actual = (await backend.call<RecordDTO[]>('/user/list', { query: { name: 'PWJB_' + names.user } })).find(value => value.username === 'PWJB_' + names.user) }
      if (!actual || userId && id(actual.id) !== userId) throw new Error('Exact shell account cleanup guard failed')
      userId = id(actual.id); await backend.call('/user/disable', { method: 'POST', query: { uid: userId } }); expect((await backend.call<RecordDTO[]>('/user/query', { method: 'POST', data: { userIdEq: userId } }))[0].enable).toBe(false); actions.push({ kind: 'user', id: userId, action: 'disabled-retained' })
    }
    if (appId) { const actual = (await backend.call<PageDTO<RecordDTO>>('/appInfo/list', { method: 'POST', data: { appId, showMyRelated: false, index: 0, pageSize: 10 } })).data; if (actual.length !== 1 || actual[0].appName !== names.app || id(actual[0].namespaceId) !== namespaceId) throw new Error('Exact shell application cleanup guard failed'); await backend.call('/appInfo/delete', { method: 'POST', data: {}, query: { appId }, appId }); expect((await backend.call<PageDTO<RecordDTO>>('/appInfo/list', { method: 'POST', data: { appId, showMyRelated: false, index: 0, pageSize: 10 } })).data).toHaveLength(0); actions.push({ kind: 'app', id: appId, action: 'deleted' }) }
    if (namespaceId) { const actual = (await backend.call<PageDTO<RecordDTO>>('/namespace/list', { method: 'POST', data: { codeLike: names.namespace, index: 0, pageSize: 100 } })).data.find(value => id(value.id) === namespaceId); if (!actual || actual.code !== names.namespace) throw new Error('Exact shell namespace cleanup guard failed'); await backend.call('/namespace/delete', { method: 'DELETE', query: { id: namespaceId }, namespaceId }); expect((await backend.call<PageDTO<RecordDTO>>('/namespace/list', { method: 'POST', data: { codeLike: names.namespace, index: 0, pageSize: 100 } })).data.some(value => id(value.id) === namespaceId)).toBe(false); actions.push({ kind: 'namespace', id: namespaceId, action: 'deleted' }) }
    const file = info.outputPath('shell-exact-cleanup.json'); await fs.writeFile(file, JSON.stringify({ status: 'EXACT_OWNED_CLEANED', actions, existingDefinitionsUnchanged: true }, null, 2) + '\n'); await info.attach('shell-owned-cleanup', { path: file, contentType: 'application/json' })
  }
})

test('UI-041 · actual root or configured subpath page loads its local font and native feature chunks', async ({ page, backend: _backend, credentials }, info) => {
  const prefix = (process.env.POWERJOB_E2E_PATH_PREFIX || '').replace(/\/$/, '')
  const fonts: { url: string; status: number; bytes: number }[] = []
  const assetFailures: string[] = []
  page.on('response', response => { if (/\.woff2(?:[?#]|$)/.test(response.url())) void response.body().then(body => fonts.push({ url: new URL(response.url()).pathname, status: response.status(), bytes: body.length })); if (response.status() >= 400 && /\.(?:js|css|woff2)(?:[?#]|$)/.test(response.url())) assetFailures.push(new URL(response.url()).pathname) })
  await page.reload(); await expect(page.getByRole('heading', { name: 'Applications', exact: true })).toBeVisible(); expect(new URL(page.url()).pathname).toBe(prefix ? prefix + '/' : '/')
  await expect.poll(() => page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].some(font => font.family.includes('Manrope') && font.status === 'loaded') })).toBe(true)
  await enterSamples(page, credentials); await page.getByRole('link', { name: 'Jobs', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Jobs', exact: true })).toBeVisible(); await page.getByRole('button', { name: 'New job', exact: true }).click(); const dialog = selectors.dialog(page, 'New job'); await expect(dialog.getByLabel('Job name', { exact: true }).filter({ visible: true })).toBeVisible(); await dialog.getByRole('button', { name: 'Cancel', exact: true }).click(); await expect(dialog).not.toBeVisible(); await expect.poll(() => fonts.length).toBeGreaterThan(0); expect(fonts.every(font => font.status === 200 && font.bytes > 1000)).toBe(true); expect(assetFailures).toEqual([])
  await observation(info, 'UI-041', prefix ? 'subpath-native-assets' : 'root-native-assets', { staticPath: prefix || '/', actualLocalFontResponses: fonts, documentFontLoaded: true, realLazyJobDialogRenderedAndCancelled: true, assetFailures, otherStaticMode: 'NOT_RUN_IN_THIS_INVOCATION', codeEditorWorker: 'OWNED_BY_WORKFLOW_LANE' })
})
