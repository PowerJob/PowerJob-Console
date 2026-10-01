import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import { test, expect, Backend, id, runId, ownedName, selectors, fill, choose, clickAndResponse, cancelDialog, confirmDialog, secretFill, login, enterApplication, observation, redact, type ID, type RecordDTO, type PageDTO } from './helpers'
import type { Page, TestInfo } from '@playwright/test'

const noRoles = () => ({ observer: [], qa: [], developer: [], admin: [] } as Record<string, ID[]>)
const sameIDs = (left: ID[], right: ID[]) => left.map(String).sort().join(',') === right.map(String).sort().join(',')

/** Cleanup is constrained to IDs recorded after UI creation and exact original names. */
class AdminResources {
  private apps: { id: string; name: string; namespaceId: string }[] = []
  private spaces: { id: string; code: string }[] = []
  private users: { id: string; origin: string }[] = []
  private committedAccounts: { origin: string; password: string }[] = []
  constructor(private backend: Backend) {}
  trackApp(value: RecordDTO) { const item = { id: id(value.id), name: String(value.appName), namespaceId: id(value.namespaceId) }; if (!item.name.startsWith(runId + '_')) throw new Error('App cleanup ownership mismatch'); this.apps.push(item); return item.id }
  trackSpace(value: RecordDTO) { const item = { id: id(value.id), code: String(value.code) }; if (!item.code.startsWith(runId + '_')) throw new Error('Namespace cleanup ownership mismatch'); this.spaces.push(item); return item.id }
  trackUser(value: RecordDTO, origin: string) { if (!origin.startsWith(runId + '_') || value.username !== 'PWJB_' + origin) throw new Error('User cleanup ownership mismatch'); const item = { id: id(value.id), origin }; this.users.push(item); return item.id }
  trackCommittedAccount(origin: string, password: string) { if (!origin.startsWith(runId + '_')) throw new Error('Account cleanup ownership mismatch'); this.committedAccounts.push({ origin, password }) }
  async cleanup(info: TestInfo) {
    const actions: RecordDTO[] = []; const failures: RecordDTO[] = []
    // Registration commits before the main user row exists. Recover that exact account only if a profile initialization failure interrupted tracking.
    for (const account of this.committedAccounts) {
      if (this.users.some(user => user.origin === account.origin)) continue
      try {
        let values = await this.backend.call<RecordDTO[]>('/user/list', { query: { name: 'PWJB_' + account.origin } })
        let actual = values.find(value => value.username === 'PWJB_' + account.origin)
        if (!actual) {
          const material = await this.backend.call<RecordDTO>('/auth/thirdPartyLoginDirect', { method: 'POST', data: { loginType: 'PWJB', originParams: JSON.stringify({ username: account.origin, password: account.password, encryption: 'none' }) } })
          if (material.username !== 'PWJB_' + account.origin) throw new Error('Committed account identity changed')
          values = await this.backend.call<RecordDTO[]>('/user/list', { query: { name: 'PWJB_' + account.origin } }); actual = values.find(value => value.username === 'PWJB_' + account.origin)
        }
        if (!actual) throw new Error('Exact committed account could not be tracked')
        this.trackUser(actual, account.origin)
      } catch (error) { failures.push({ kind: 'committed-account', origin: account.origin, reason: redact((error as Error).message) }) }
    }
    for (const user of this.users) {
      try {
        const result = await this.backend.call<RecordDTO[]>('/user/query', { method: 'POST', data: { userIdEq: user.id } })
        if (result.length !== 1 || id(result[0].id) !== user.id || result[0].username !== 'PWJB_' + user.origin) throw new Error('Exact owned user identity changed')
        const admins = await this.backend.call<ID[]>('/auth/listGlobalAdmin')
        if (admins.some(value => id(value) === user.id)) {
          const keep = admins.filter(value => id(value) !== user.id)
          if (!keep.length) throw new Error('Refusing to remove the final global administrator')
          await this.backend.call('/auth/saveGlobalAdmin', { method: 'POST', data: { admin: keep } })
        }
        await this.backend.call('/user/disable', { method: 'POST', query: { uid: user.id } })
        const readback = await this.backend.call<RecordDTO[]>('/user/query', { method: 'POST', data: { userIdEq: user.id } })
        if (readback[0]?.enable !== false) throw new Error('Owned user remained enabled')
        actions.push({ kind: 'user', id: user.id, action: 'disable-exact-owned-user', terminalAccountRetained: true })
      } catch (error) { failures.push({ kind: 'user', id: user.id, reason: redact((error as Error).message) }) }
    }
    for (const app of this.apps.reverse()) {
      try {
        const result = await this.backend.call<PageDTO<RecordDTO>>('/appInfo/list', { method: 'POST', data: { appId: app.id, showMyRelated: false, index: 0, pageSize: 10 } })
        if (!result.data.length) { actions.push({ kind: 'app', id: app.id, action: 'already-absent' }); continue }
        if (result.data.length !== 1 || id(result.data[0].id) !== app.id || result.data[0].appName !== app.name || id(result.data[0].namespaceId) !== app.namespaceId) throw new Error('Exact owned application identity changed')
        await this.backend.call('/appInfo/delete', { method: 'POST', data: {}, query: { appId: app.id }, appId: app.id })
        const readback = await this.backend.call<PageDTO<RecordDTO>>('/appInfo/list', { method: 'POST', data: { appId: app.id, showMyRelated: false, index: 0, pageSize: 10 } })
        if (readback.data.length) throw new Error('Owned application remained active')
        actions.push({ kind: 'app', id: app.id, action: 'delete-exact-owned-application' })
      } catch (error) { failures.push({ kind: 'app', id: app.id, reason: redact((error as Error).message) }) }
    }
    for (const space of this.spaces.reverse()) {
      try {
        const result = await this.backend.call<PageDTO<RecordDTO>>('/namespace/list', { method: 'POST', data: { codeLike: space.code, index: 0, pageSize: 100 } })
        const exact = result.data.filter(value => id(value.id) === space.id)
        if (!exact.length) { actions.push({ kind: 'namespace', id: space.id, action: 'already-absent' }); continue }
        if (exact.length !== 1 || exact[0].code !== space.code) throw new Error('Exact owned namespace identity changed')
        const apps = await this.backend.call<PageDTO<RecordDTO>>('/appInfo/list', { method: 'POST', data: { namespaceId: space.id, showMyRelated: false, index: 0, pageSize: 1 } })
        if (Number(apps.totalItems)) throw new Error('Refusing to delete namespace with remaining applications')
        await this.backend.call('/namespace/delete', { method: 'DELETE', query: { id: space.id }, namespaceId: space.id })
        const readback = await this.backend.call<PageDTO<RecordDTO>>('/namespace/list', { method: 'POST', data: { codeLike: space.code, index: 0, pageSize: 100 } })
        if (readback.data.some(value => id(value.id) === space.id)) throw new Error('Owned namespace remained active')
        actions.push({ kind: 'namespace', id: space.id, action: 'delete-exact-owned-namespace' })
      } catch (error) { failures.push({ kind: 'namespace', id: space.id, reason: redact((error as Error).message) }) }
    }
    const file = info.outputPath('admin-owned-cleanup.json')
    await fs.writeFile(file, JSON.stringify({ runId, status: failures.length ? 'CLEANUP_INCOMPLETE' : 'EXACT_OWNED_CLEANED', actions, failures, boundaries: { existingAccountsUnchanged: true, sharedGlobalAdminIDsPreserved: true, historyRetained: true, userDeleteEndpointUnavailable: true } }, null, 2) + '\n')
    await info.attach('exact-admin-owned-cleanup', { path: file, contentType: 'application/json' })
    expect(failures, 'Only exact owned resources may be cleaned; guard failures must be reviewed').toEqual([])
  }
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Sign out', exact: true }).isVisible().then(async visible => { if (!visible) await page.getByLabel('Account', { exact: true }).filter({ visible: true }).click() })
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/#\/loginHomepage$/)
}
async function queryApp(page: Page, name: string) {
  await fill(page, 'Application name', name)
  const result = await clickAndResponse(page, '/appInfo/list', () => page.getByRole('button', { name: 'Query', exact: true }).click(), response => response.request().postDataJSON()?.appNameLike === name)
  expect(result.success).toBe(true)
  await expect(selectors.row(page, name)).toHaveCount(1)
}
async function createNamespace(page: Page, ledger: AdminResources, code: string, name: string) {
  await page.goto('/#/admin/namespace'); await page.getByRole('button', { name: 'New namespace', exact: true }).click()
  const dialog = selectors.dialog(page, 'New namespace'); await fill(dialog, 'Code', code); await fill(dialog, 'Name', name); await fill(dialog, 'Tags', 'fev3_native'); await fill(dialog, 'Extra configuration', '{"future":{"enabled":false,"count":0}}')
  const result = await clickAndResponse<RecordDTO>(page, '/namespace/save', () => dialog.getByRole('button', { name: 'Save', exact: true }).click()); expect(result.success).toBe(true); ledger.trackSpace(result.data); await expect(dialog).not.toBeVisible(); return result.data
}
async function createApplication(page: Page, ledger: AdminResources, name: string, namespaceName: string, password: string) {
  await page.goto('/#/admin/app'); await page.getByRole('button', { name: 'New application', exact: true }).click()
  const dialog = selectors.dialog(page, 'New application'); await choose(dialog, 'Namespace', namespaceName); await fill(dialog, 'Application name', name); await secretFill(dialog.getByLabel('Application password', { exact: true }).filter({ visible: true }), password); await fill(dialog, 'Description', '中文 😀 &+%#='); await fill(dialog, 'Tags', 'fev3_native'); await fill(dialog, 'Extra configuration', '{"future":{"enabled":false,"count":0}}')
  const result = await clickAndResponse<RecordDTO>(page, '/appInfo/save', () => dialog.getByRole('button', { name: 'Save', exact: true }).click()); expect(result.success).toBe(true); ledger.trackApp(result.data); await expect(dialog).not.toBeVisible(); return result.data
}

test('UI-001/002/003/007/008 · native registration, profile readback, password lifecycle and owned account enablement', async ({ page, credentials, backend }, info) => {
  test.setTimeout(180_000)
  const ledger = new AdminResources(backend)
  const username = ownedName('account')
  const initialPassword = 'Fixture-' + crypto.randomUUID()
  const changedPassword = 'Changed-' + crypto.randomUUID()
  const contact = { nick: ownedName('nick'), phone: '100100100', email: `${username}@example.invalid`, webHook: 'https://example.invalid/notify?text=%E4%B8%AD%E6%96%87&x=1' }
  try {
    await signOut(page)
    const methods = await clickAndResponse<RecordDTO[]>(page, '/auth/supportLoginTypes', () => page.reload())
    expect(methods.success).toBe(true); expect(methods.data.some(value => value.type === 'PWJB')).toBe(true)
    await page.getByRole('button', { name: 'PowerJob account', exact: true }).click(); await expect(page).toHaveURL(/#\/powerjobLogin$/)
    const mutations: string[] = []; page.on('request', request => { if (['/pwjbUser/create', '/auth/thirdPartyLoginDirect'].some(path => new URL(request.url()).pathname.endsWith(path))) mutations.push(new URL(request.url()).pathname) })
    await page.getByRole('button', { name: 'Sign in', exact: true }).click(); expect(mutations).toHaveLength(0)
    await page.getByRole('button', { name: 'Create an account', exact: true }).click(); let dialog = selectors.dialog(page, 'Create an account')
    await dialog.getByRole('button', { name: 'Show password', exact: true }).first().click(); await expect(dialog.getByLabel('Password', { exact: true }).filter({ visible: true })).toHaveAttribute('type', 'text'); await cancelDialog(page, 'Create an account'); await page.getByRole('button', { name: 'Create an account', exact: true }).click(); dialog = selectors.dialog(page, 'Create an account'); await expect(dialog.getByLabel('Password', { exact: true }).filter({ visible: true })).toHaveAttribute('type', 'password')
    await fill(dialog, 'Username', ownedName('cancelled')); await fill(dialog, 'Nickname', 'Unsaved synthetic'); await secretFill(dialog.getByLabel('Password', { exact: true }).filter({ visible: true }), initialPassword); await secretFill(dialog.getByLabel('Confirm password', { exact: true }).filter({ visible: true }), changedPassword); await dialog.getByRole('button', { name: 'Create account', exact: true }).click(); await expect(dialog.getByRole('alert')).toContainText('do not match'); expect(mutations).toHaveLength(0); await cancelDialog(page, 'Create an account')
    await page.getByRole('button', { name: 'Create an account', exact: true }).click(); dialog = selectors.dialog(page, 'Create an account'); await expect(dialog.getByLabel('Nickname', { exact: true }).filter({ visible: true })).toHaveValue(''); await expect(dialog.getByLabel('Password', { exact: true }).filter({ visible: true })).toHaveAttribute('type', 'password')
    await fill(dialog, 'Username', username); await fill(dialog, 'Nickname', contact.nick); await fill(dialog, 'Phone', contact.phone); await fill(dialog, 'Email', contact.email); await fill(dialog, 'Webhook', contact.webHook); await secretFill(dialog.getByLabel('Password', { exact: true }).filter({ visible: true }), initialPassword); await secretFill(dialog.getByLabel('Confirm password', { exact: true }).filter({ visible: true }), initialPassword)
    const created = await clickAndResponse(page, '/pwjbUser/create', () => dialog.getByRole('button', { name: 'Create account', exact: true }).click()); expect(created.success).toBe(true); ledger.trackCommittedAccount(username, initialPassword)
    await expect.poll(async () => (await backend.call<RecordDTO[]>('/user/query', { method: 'POST', data: { nickLike: contact.nick } })).filter(value => value.username === 'PWJB_' + username).length).toBe(1)
    const ownUser = (await backend.call<RecordDTO[]>('/user/query', { method: 'POST', data: { nickLike: contact.nick } })).find(value => value.username === 'PWJB_' + username)!
    const userId = ledger.trackUser(ownUser, username)
    expect(ownUser).toMatchObject({ nick: contact.nick, phone: contact.phone, email: contact.email })
    await expect(page.locator('.registration-notice')).toContainText('Account created')
    await login(page, { ...credentials, admin_username: username, admin_password: initialPassword })
    await page.goto('/#/admin/personal'); await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible(); await expect(page.getByLabel('Nickname', { exact: true }).filter({ visible: true })).toHaveValue(contact.nick); await expect(page.getByLabel('Webhook', { exact: true }).filter({ visible: true })).toHaveValue(contact.webHook); await expect(page.getByLabel('Username', { exact: true }).filter({ visible: true })).toHaveAttribute('readonly', '')
    const updatedNick = ownedName('edited'); await fill(page, 'Nickname', updatedNick); await clickAndResponse(page, '/user/modify', () => page.getByRole('button', { name: 'Save profile', exact: true }).click()); await expect(page.getByRole('status').filter({ hasText: 'Profile saved' })).toBeVisible(); expect((await backend.call<RecordDTO[]>('/user/query', { method: 'POST', data: { userIdEq: userId } }))[0].nick).toBe(updatedNick)
    await page.getByRole('button', { name: 'Change password', exact: true }).click(); dialog = selectors.dialog(page, 'Change password'); await secretFill(dialog.getByLabel('Old password', { exact: true }).filter({ visible: true }), 'Synthetic-wrong-old'); await secretFill(dialog.getByLabel('New password', { exact: true }).filter({ visible: true }), changedPassword); await secretFill(dialog.getByLabel('Confirm new password', { exact: true }).filter({ visible: true }), changedPassword)
    const denied = await clickAndResponse(page, '/pwjbUser/changePassword', () => dialog.getByRole('button', { name: 'Change password', exact: true }).click()); expect(denied.success).toBe(false); await expect(dialog).toBeVisible()
    // A separate fresh profile must still authenticate with the unchanged original password after the refusal.
    const passwordVerificationContext = await page.context().browser()!.newContext({ baseURL: new URL(page.url()).origin, locale: 'en-US', timezoneId: 'Asia/Shanghai', viewport: { width: 1440, height: 900 } })
    try { const passwordVerificationPage = await passwordVerificationContext.newPage(); await login(passwordVerificationPage, { ...credentials, admin_username: username, admin_password: initialPassword }); await expect(passwordVerificationPage.getByRole('heading', { name: 'Applications', exact: true })).toBeVisible() } finally { await passwordVerificationContext.close() }
    await secretFill(dialog.getByLabel('Old password', { exact: true }).filter({ visible: true }), initialPassword); const changed = await clickAndResponse(page, '/pwjbUser/changePassword', () => dialog.getByRole('button', { name: 'Change password', exact: true }).click()); expect(changed.success).toBe(true); await expect(page).toHaveURL(/#\/loginHomepage$/)
    await login(page, { ...credentials, admin_username: username, admin_password: changedPassword }); await page.reload(); await expect(page.getByRole('heading', { name: 'Applications', exact: true })).toBeVisible()
    await signOut(page); await login(page, credentials); await page.goto('/#/admin/user'); await fill(page, 'User ID', userId); await clickAndResponse(page, '/user/query', () => page.getByRole('button', { name: 'Query', exact: true }).click()); const row = selectors.row(page, 'PWJB_' + username); const switcher = row.getByRole('switch'); await expect(switcher).toHaveAttribute('aria-checked', 'true')
    const disabled = await clickAndResponse(page, '/user/disable', () => switcher.click()); expect(disabled.success).toBe(true); await expect(switcher).toHaveAttribute('aria-checked', 'false'); await signOut(page); await page.goto('/#/powerjobLogin'); await secretFill(page.getByLabel('Username', { exact: true }).filter({ visible: true }), username); await secretFill(page.getByLabel('Password', { exact: true }).filter({ visible: true }), changedPassword); const disabledLogin = await clickAndResponse(page, '/auth/thirdPartyLoginDirect', () => page.getByRole('button', { name: 'Sign in', exact: true }).click()); expect(disabledLogin.success).toBe(false); await expect(page.getByRole('alert')).toBeVisible()
    await login(page, credentials); await page.goto('/#/admin/user'); await fill(page, 'User ID', userId); await clickAndResponse(page, '/user/query', () => page.getByRole('button', { name: 'Query', exact: true }).click()); const enabled = await clickAndResponse(page, '/user/enable', () => selectors.row(page, 'PWJB_' + username).getByRole('switch').click()); expect(enabled.success).toBe(true); await expect(selectors.row(page, 'PWJB_' + username).getByRole('switch')).toHaveAttribute('aria-checked', 'true'); await signOut(page); await login(page, { ...credentials, admin_username: username, admin_password: changedPassword })
    await observation(info, 'UI-002', 'complete-register', { userId, sevenFieldsEntered: true, temporaryProfileReadback: true, cancelledDraftZeroCreate: true })
    await observation(info, 'UI-008', 'profile-all-fields', { userId, profileReadback: true, immutableUsername: true, wrongOldPasswordRejected: true, passwordSuccessRequiredRelogin: true })
    await observation(info, 'UI-007', 'disable-login', { userId, realStatusReadback: true, disabledLoginRejected: true, reenabledLoginSucceeded: true })
  } finally { await ledger.cleanup(info) }
})

test('UI-004/005/006/036 · native namespace and application full-field CRUD, target context and cancel isolation', async ({ page, backend }, info) => {
  const ledger = new AdminResources(backend)
  const spaceCode = ownedName('namespace'); const spaceName = ownedName('namespace_label'); const appName = ownedName('application'); const password = 'App-' + crypto.randomUUID()
  try {
    const space = await createNamespace(page, ledger, spaceCode, spaceName)
    const app = await createApplication(page, ledger, appName, `${spaceName}(${spaceCode})`, password)
    const ownApp = (await backend.call<PageDTO<RecordDTO>>('/appInfo/list', { method: 'POST', data: { appId: app.id, showMyRelated: false, index: 0, pageSize: 10 } })).data[0]
    expect(ownApp).toMatchObject({ appName, namespaceId: space.id, title: '中文 😀 &+%#=', tags: 'fev3_native', extra: '{"future":{"enabled":false,"count":0}}' })
    expect(ownApp.password === password, 'Independent new application password preserves the exact entered value').toBe(true)
    await queryApp(page, appName); await selectors.row(page, appName).getByRole('button', { name: 'Edit', exact: true }).click(); let dialog = selectors.dialog(page, 'Edit application'); await expect(dialog.getByLabel('Application name', { exact: true }).filter({ visible: true })).toHaveAttribute('readonly', '')
    await expect(dialog.getByLabel('Application password', { exact: true }).filter({ visible: true })).toHaveAttribute('type', 'password'); await dialog.getByRole('button', { name: 'Show password', exact: true }).click(); await expect(dialog.getByLabel('Application password', { exact: true }).filter({ visible: true })).toHaveAttribute('type', 'text'); await dialog.getByRole('button', { name: 'Hide password', exact: true }).click(); await expect(dialog.getByLabel('Application password', { exact: true }).filter({ visible: true })).toHaveAttribute('type', 'password'); await dialog.getByRole('button', { name: 'Show password', exact: true }).click()
    await fill(dialog, 'Description', 'Cancelled'); await cancelDialog(page, 'Edit application'); expect((await backend.call<PageDTO<RecordDTO>>('/appInfo/list', { method: 'POST', data: { appId: app.id, showMyRelated: false, index: 0, pageSize: 10 } })).data[0].title).toBe('中文 😀 &+%#=')
    await selectors.row(page, appName).getByRole('button', { name: 'Edit', exact: true }).click(); dialog = selectors.dialog(page, 'Edit application'); await expect(dialog.getByLabel('Application password', { exact: true }).filter({ visible: true })).toHaveAttribute('type', 'password'); await cancelDialog(page, 'Edit application')
    await page.getByRole('button', { name: 'New application', exact: true }).click(); dialog = selectors.dialog(page, 'New application'); await expect(dialog.getByLabel('Application name', { exact: true }).filter({ visible: true })).toHaveValue(''); await expect(dialog.getByLabel('Application password', { exact: true }).filter({ visible: true })).toHaveValue(''); await cancelDialog(page, 'New application')
    await enterApplication(page, appName); await page.goto('/#/admin/app'); await queryApp(page, appName); await selectors.row(page, appName).getByRole('button', { name: 'Edit', exact: true }).click(); dialog = selectors.dialog(page, 'Edit application'); await fill(dialog, 'Description', 'Saved & + 😀'); const saved = await clickAndResponse(page, '/appInfo/save', () => dialog.getByRole('button', { name: 'Save', exact: true }).click(), response => response.request().headers()['appid'] === id(app.id)); expect(saved.success).toBe(true); await expect(dialog).not.toBeVisible()
    const readback = (await backend.call<PageDTO<RecordDTO>>('/appInfo/list', { method: 'POST', data: { appId: app.id, showMyRelated: false, index: 0, pageSize: 10 } })).data[0]; expect(readback.title).toBe('Saved & + 😀'); expect(readback.extra).toBe(ownApp.extra)
    await page.goto('/#/admin/namespace'); await fill(page, 'Code', spaceCode); await clickAndResponse(page, '/namespace/list', () => page.getByRole('button', { name: 'Query', exact: true }).click()); await selectors.row(page, spaceCode).getByRole('button', { name: 'Delete', exact: true }).click(); const blocked = await clickAndResponse(page, '/namespace/delete', () => confirmDialog(page)); expect(blocked.success).toBe(false); await expect(selectors.row(page, spaceCode)).toBeVisible()
    await selectors.row(page, spaceCode).getByRole('button', { name: 'Edit', exact: true }).click(); dialog = selectors.dialog(page, 'Edit namespace'); await expect(dialog.getByLabel('Code', { exact: true }).filter({ visible: true })).toHaveAttribute('readonly', ''); await expect(dialog.getByLabel('Access token', { exact: true }).filter({ visible: true })).toHaveAttribute('type', 'password'); await fill(dialog, 'Name', spaceName + '_edited'); const spaceSaved = await clickAndResponse(page, '/namespace/save', () => dialog.getByRole('button', { name: 'Save', exact: true }).click(), response => response.request().headers()['namespaceid'] === id(space.id)); expect(spaceSaved.success).toBe(true)
    await page.goto('/#/admin/app'); await queryApp(page, appName); await selectors.row(page, appName).getByRole('button', { name: 'Edit', exact: true }).click(); dialog = selectors.dialog(page, 'Edit application'); await dialog.getByRole('button', { name: 'Delete', exact: true }).click(); await confirmDialog(page, false); await expect(dialog).toBeVisible(); const deleted = await clickAndResponse(page, '/appInfo/delete', async () => { await dialog.getByRole('button', { name: 'Delete', exact: true }).click(); await confirmDialog(page) }); expect(deleted.success).toBe(true); await expect(dialog).not.toBeVisible(); expect(await page.evaluate(() => localStorage.getItem('Power_appId'))).toBeNull()
    await page.goto('/#/admin/namespace'); await fill(page, 'Code', spaceCode); await clickAndResponse(page, '/namespace/list', () => page.getByRole('button', { name: 'Query', exact: true }).click()); await selectors.row(page, spaceCode).getByRole('button', { name: 'Delete', exact: true }).click(); await confirmDialog(page, false); await expect(selectors.row(page, spaceCode)).toBeVisible(); const removed = await clickAndResponse(page, '/namespace/delete', async () => { await selectors.row(page, spaceCode).getByRole('button', { name: 'Delete', exact: true }).click(); await confirmDialog(page) }); expect(removed.success).toBe(true); await expect(selectors.row(page, spaceCode)).toHaveCount(0)
    await observation(info, 'UI-004', 'create-all-fields', { appId: id(app.id), namespaceId: id(space.id), uiCreateReadback: true, cancelledDraftIsolated: true, editThenCreateReset: true, exactTargetHeader: true, passwordShowHideAndReopenMasked: true })
    await observation(info, 'UI-006', 'delete-occupied', { namespaceId: id(space.id), occupiedDeleteRejected: true, emptyDeleteConfirmed: true, immutableCodeAndMaskedReadOnlyToken: true })
    await observation(info, 'UI-005', 'delete-confirm', { appId: id(app.id), cancelRetainedObject: true, successfulDeleteClearedSelectedContext: true })
  } finally { await ledger.cleanup(info) }
})

test('UI-005/008/009 · four roles, inherited namespace recovery and exact owned global admin grants', async ({ page, backend, credentials }, info) => {
  const ledger = new AdminResources(backend)
  const username = ownedName('roles_user'); const password = 'Role-' + crypto.randomUUID()
  const spaceCode = ownedName('roles_space'); const spaceName = ownedName('roles_space_label'); const appName = ownedName('roles_app')
  try {
    // The account is created through the new UI. The existing administrator and all existing roles remain untouched.
    await page.goto('/#/powerjobLogin'); await page.getByRole('button', { name: 'Create an account', exact: true }).click(); let dialog = selectors.dialog(page, 'Create an account'); await fill(dialog, 'Username', username); await fill(dialog, 'Nickname', username); await secretFill(dialog.getByLabel('Password', { exact: true }).filter({ visible: true }), password); await secretFill(dialog.getByLabel('Confirm password', { exact: true }).filter({ visible: true }), password)
    const created = await clickAndResponse(page, '/pwjbUser/create', () => dialog.getByRole('button', { name: 'Create account', exact: true }).click()); expect(created.success).toBe(true); ledger.trackCommittedAccount(username, password); await expect(page.locator('.registration-notice')).toContainText('Account created')
    const users = await backend.call<RecordDTO[]>('/user/query', { method: 'POST', data: { nickLike: username } }); const ownUser = users.find(value => value.username === 'PWJB_' + username)!; expect(ownUser).toBeDefined(); const userId = ledger.trackUser(ownUser, username)
    const space = await createNamespace(page, ledger, spaceCode, spaceName); const app = await createApplication(page, ledger, appName, `${spaceName}(${spaceCode})`, 'App-' + crypto.randomUUID())
    await page.goto('/#/admin/namespace'); await fill(page, 'Code', spaceCode); await clickAndResponse(page, '/namespace/list', () => page.getByRole('button', { name: 'Query', exact: true }).click()); await selectors.row(page, spaceCode).getByRole('button', { name: 'Edit', exact: true }).click(); dialog = selectors.dialog(page, 'Edit namespace')
    await dialog.getByLabel('Search users', { exact: true }).filter({ visible: true }).fill(username); await dialog.locator('.role-column').filter({ has: page.getByRole('heading', { name: 'Administrator', exact: true }) }).getByRole('checkbox', { name: new RegExp(username) }).check(); const grantNamespace = await clickAndResponse(page, '/namespace/save', () => dialog.getByRole('button', { name: 'Save', exact: true }).click()); expect(grantNamespace.success).toBe(true)
    await page.goto('/#/admin/app'); await queryApp(page, appName); await selectors.row(page, appName).getByRole('button', { name: 'Edit', exact: true }).click(); dialog = selectors.dialog(page, 'Edit application'); await dialog.getByLabel('Search users', { exact: true }).filter({ visible: true }).fill(username)
    for (const role of ['Observer', 'QA', 'Developer', 'Administrator']) await dialog.locator('.role-column').filter({ has: page.getByRole('heading', { name: role, exact: true }) }).getByRole('checkbox', { name: new RegExp(username) }).check()
    const saved = await clickAndResponse(page, '/appInfo/save', () => dialog.getByRole('button', { name: 'Save', exact: true }).click()); expect(saved.success).toBe(true)
    let readback = (await backend.call<PageDTO<RecordDTO>>('/appInfo/list', { method: 'POST', data: { appId: app.id, showMyRelated: false, index: 0, pageSize: 10 } })).data[0]; const roles = readback.componentUserRoleInfo as Record<string, ID[]>; expect(Object.keys(noRoles()).every(key => roles[key].some(value => id(value) === userId))).toBe(true)
    await signOut(page); await login(page, { ...credentials, admin_username: username, admin_password: password }); await queryApp(page, appName); await selectors.row(page, appName).getByRole('button', { name: 'Edit', exact: true }).click(); dialog = selectors.dialog(page, 'Edit application')
    while (await dialog.locator('.role-chip').count()) await dialog.locator('.role-chip').first().click()
    const removed = await clickAndResponse(page, '/appInfo/save', () => dialog.getByRole('button', { name: 'Save', exact: true }).click()); expect(removed.success).toBe(true)
    readback = (await backend.call<PageDTO<RecordDTO>>('/appInfo/list', { method: 'POST', data: { appId: app.id, showMyRelated: false, index: 0, pageSize: 10 } })).data[0]; expect(Object.values(readback.componentUserRoleInfo as Record<string, ID[]>).every(values => values.length === 0)).toBe(true)
    // My-related is direct-role based in Server 5.1.6; use its existing All mode to reach an app with only namespace administration.
    await page.getByLabel('Related to me', { exact: true }).filter({ visible: true }).uncheck(); await queryApp(page, appName); await selectors.row(page, appName).getByRole('button', { name: 'Edit', exact: true }).click(); dialog = selectors.dialog(page, 'Edit application'); await fill(dialog, 'Description', 'Namespace administrator recovery'); await dialog.getByLabel('Search users', { exact: true }).filter({ visible: true }).fill(username); await dialog.locator('.role-column').filter({ has: page.getByRole('heading', { name: 'Administrator', exact: true }) }).getByRole('checkbox', { name: new RegExp(username) }).check(); const recovered = await clickAndResponse(page, '/appInfo/save', () => dialog.getByRole('button', { name: 'Save', exact: true }).click()); expect(recovered.success).toBe(true)
    readback = (await backend.call<PageDTO<RecordDTO>>('/appInfo/list', { method: 'POST', data: { appId: app.id, showMyRelated: false, index: 0, pageSize: 10 } })).data[0]; expect(readback.title).toBe('Namespace administrator recovery'); expect((readback.componentUserRoleInfo as Record<string, ID[]>).admin.map(String)).toEqual([userId])
    await page.goto('/#/admin/settings'); await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled(); const denied = await clickAndResponse(page, '/auth/saveGlobalAdmin', () => page.getByRole('button', { name: 'Save', exact: true }).click()); expect(denied.success).toBe(false); await expect(page.getByRole('alert').last()).toBeVisible()
    await signOut(page); await login(page, credentials); const initial = await backend.call<ID[]>('/auth/listGlobalAdmin'); expect(initial.length).toBeGreaterThan(0); expect(initial.map(String)).not.toContain(userId)
    await page.goto('/#/admin/settings'); await fill(page, 'Search users', username); await page.getByRole('checkbox', { name: new RegExp(username) }).check(); const globalAdded = await clickAndResponse(page, '/auth/saveGlobalAdmin', () => page.getByRole('button', { name: 'Save', exact: true }).click()); expect(globalAdded.success).toBe(true); expect(sameIDs(await backend.call<ID[]>('/auth/listGlobalAdmin'), [...initial, userId])).toBe(true)
    await page.getByRole('checkbox', { name: new RegExp(username) }).uncheck(); const globalRemoved = await clickAndResponse(page, '/auth/saveGlobalAdmin', () => page.getByRole('button', { name: 'Save', exact: true }).click()); expect(globalRemoved.success).toBe(true); expect(sameIDs(await backend.call<ID[]>('/auth/listGlobalAdmin'), initial)).toBe(true)
    await observation(info, 'UI-005', 'assign-four-roles', { appId: id(app.id), namespaceId: id(space.id), userId, allFourDirectRolesReadBack: true })
    await observation(info, 'UI-005', 'last-admin', { appId: id(app.id), namespaceId: id(space.id), allDirectAppRolesRemoved: true, inheritedNamespaceAdministratorCouldEditAndRestore: true, noNewFrontendRestriction: true })
    await observation(info, 'UI-009', 'add-admin', { userId, ownedGlobalAdminAdded: true, removedAfterReadback: true, originalAdministratorSetRestored: true, nonadminSaveRejected: true })
  } finally { await ledger.cleanup(info) }
})

test('UI-031/032/035 · native admin and auth responsive zh/en, keyboard focus and zero unsaved mutations', async ({ page, credentials, backend: _backend }, info) => {
  const writes: string[] = []
  page.on('request', request => { if (/\/(appInfo\/save|namespace\/save|user\/modify|pwjbUser\/create|auth\/saveGlobalAdmin)$/.test(new URL(request.url()).pathname)) writes.push(new URL(request.url()).pathname) })
  const matrix: RecordDTO[] = []
  for (const language of ['en', 'zh'] as const) {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const path of ['/admin/app', '/admin/namespace', '/admin/user', '/admin/personal', '/admin/settings']) {
        await page.goto('/#' + path)
        const locale = page.getByLabel(language === 'en' ? 'Language' : '语言', { exact: true }).filter({ visible: true })
        if (!await locale.count()) await page.locator('header.workspace-header select').selectOption(language)
        else await locale.selectOption(language)
        await expect(page.locator('h1')).toBeVisible()
        if (['/admin/app', '/admin/namespace', '/admin/user'].includes(path)) {
          await expect(page.getByRole('button', { name: language === 'en' ? 'Query' : '查询', exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: language === 'en' ? 'Reset' : '重置', exact: true })).toBeVisible()
          const filter = page.locator('.filter-bar input').first(); await filter.focus(); await expect(filter).toBeFocused()
          const table = page.locator('.table-scroll'); await table.focus(); await expect(table).toBeFocused()
        }
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
        matrix.push({ language, width, path, headingVisible: true, documentOverflow: false })
      }
      await page.locator('header.workspace-header select').selectOption('en'); await signOut(page)
      await page.locator('.auth-language select').selectOption(language); await expect(page.locator('h1')).toBeVisible(); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      matrix.push({ language, width, path: '/loginHomepage', headingVisible: true, documentOverflow: false })
      await page.getByRole('button', { name: language === 'en' ? 'PowerJob account' : 'PowerJob 账号', exact: true }).click(); await expect(page.locator('h1')).toBeVisible(); const password = page.getByLabel(language === 'en' ? 'Password' : '密码', { exact: true }).filter({ visible: true }); await expect(password).toHaveAttribute('type', 'password'); await password.focus(); await expect(password).toBeFocused(); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      matrix.push({ language, width, path: '/powerjobLogin', headingVisible: true, passwordMasked: true, documentOverflow: false })
      await page.getByRole('button', { name: language === 'en' ? 'Create an account' : '注册账号', exact: true }).click(); const dialog = selectors.dialog(page); const username = dialog.getByLabel(language === 'en' ? 'Username' : '用户名', { exact: true }).filter({ visible: true }); await fill(dialog, language === 'en' ? 'Username' : '用户名', ownedName('unsaved')); await username.focus(); await expect(username).toBeFocused(); await dialog.getByRole('button', { name: language === 'en' ? 'Cancel' : '取消', exact: true }).click(); await expect(dialog).not.toBeVisible()
      matrix.push({ language, width, path: 'registration', cancelledUnsaved: true })
      await page.locator('.auth-language select').selectOption('en'); await login(page, credentials)
    }
  }
  expect(matrix).toHaveLength(48); expect(writes).toEqual([])
  await observation(info, 'UI-031', 'admin-auth-breakpoints', { matrix, actualNativePageGroups: 48, cancelledRegistrationCount: 6, businessMutationRequests: 0 })
})
