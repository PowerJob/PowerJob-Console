import { test, expect, type Page, type Response } from '@playwright/test';
import JSONBig from 'json-bigint';

// Run only against an isolated Server. Credentials are supplied by the caller.
// POWERJOB_E2E_BASE_URL defaults to the local Vite Console; API_PREFIX is empty
// when verifying a Server-embedded Console instead of Vite's /api proxy.
const baseUrl = process.env.POWERJOB_E2E_BASE_URL || 'http://127.0.0.1:24800';
const apiPrefix = process.env.POWERJOB_E2E_API_PREFIX ?? '/api';
const administrator = process.env.POWERJOB_E2E_USERNAME;
const administratorPassword = process.env.POWERJOB_E2E_PASSWORD;
const json = JSONBig({ storeAsString: true });
const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const testPassword = `E2e_${nonce}!`;
let resources: { apps: string[]; namespaces: string[]; users: string[] };
let restoreAdmins: string[] | undefined;

test.describe.configure({ mode: 'serial' });
test.use({ trace: 'off', video: 'off' });
test.setTimeout(120_000);
test.beforeEach(async ({ page }) => {
  test.skip(!administrator || !administratorPassword, 'Set isolated-environment POWERJOB_E2E_USERNAME and POWERJOB_E2E_PASSWORD.');
  resources = { apps: [], namespaces: [], users: [] };
  restoreAdmins = undefined;
  await page.addInitScript(() => { if (!localStorage.getItem('oms_lang')) localStorage.setItem('oms_lang', 'cn'); });
});

async function result(response: Response) { return json.parse(await response.text()); }
async function api(page: Page, path: string, body?: unknown, headers: Record<string, string> = {}, method = 'POST') {
  const token = await page.evaluate(() => localStorage.getItem('PowerJwt'));
  const response = await page.request.fetch(`${baseUrl}${apiPrefix}${path}`, { method, headers: { ...(token ? { PowerJwt: token } : {}), ...headers }, ...(body === undefined ? {} : { data: body }) });
  const value = json.parse(await response.text());
  expect(value.success, value.message).toBe(true);
  return value.data;
}
async function signIn(page: Page, username = administrator!, password = administratorPassword!) {
  await page.goto(`${baseUrl}/#/powerjobLogin`);
  // A valid existing session is allowed to return directly to the application list.
  await Promise.race([page.waitForURL(/#\/admin\/app$/), page.getByLabel('账号', { exact: true }).waitFor({ state: 'visible' })]);
  if ((await page.url()).includes('/admin/app')) return;
  await page.getByLabel('账号', { exact: true }).fill(username);
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: '登录工作空间', exact: true }).click();
  await expect(page).toHaveURL(/#\/admin\/app$/);
  await expect(page.getByRole('heading', { name: '应用管理', exact: true })).toBeVisible();
}
async function signOut(page: Page) {
  await page.locator('.user-menu').click();
  await page.getByText('退出登录', { exact: true }).click();
  await expect(page).toHaveURL(/#\/loginHomepage$/);
  await expect(page.getByText('正在检查登录状态')).not.toBeVisible();
}
async function saveRequest(page: Page, path: string, action: () => Promise<void>) {
  const response = page.waitForResponse(response => response.url().includes(`${apiPrefix}${path}`) && response.request().method() === 'POST');
  await action();
  const value = await result(await response);
  expect(value.success, value.message).toBe(true);
  return value.data;
}
async function createNamespace(page: Page, suffix: string) {
  const code = `e2e_ns_${nonce}_${suffix}`;
  const name = `验收空间 ${suffix} ${nonce}`;
  await page.goto(`${baseUrl}/#/admin/namespace`);
  await page.getByRole('button', { name: '新建命名空间', exact: true }).click();
  const drawer = page.locator('.ant-drawer-content').filter({ hasText: '新建命名空间' });
  await drawer.getByLabel('空间编码', { exact: true }).fill(code);
  await drawer.getByLabel('显示名称', { exact: true }).fill(name);
  const saved = await saveRequest(page, '/namespace/save', () => drawer.getByRole('button', { name: '保存命名空间', exact: true }).click());
  resources.namespaces.push(String(saved.id));
  await expect(drawer).not.toBeVisible();
  await page.getByLabel('命名空间编码', { exact: true }).fill(code);
  await page.getByRole('button', { name: '查询', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: code })).toBeVisible();
  return { id: String(saved.id), code, name };
}
async function createApplication(page: Page, namespace: { code: string }, suffix: string) {
  const appName = `e2e_app_${nonce}_${suffix}`;
  const title = `验收应用 ${suffix} ${nonce}`;
  await page.goto(`${baseUrl}/#/admin/app`);
  await page.getByRole('button', { name: '新建应用', exact: true }).click();
  const drawer = page.locator('.ant-drawer-content').filter({ hasText: '新建应用' });
  await drawer.getByRole('combobox', { name: '新建应用命名空间', exact: true }).click();
  await page.locator('.ant-select-item-option').filter({ hasText: namespace.code }).click();
  await drawer.getByLabel('应用编码', { exact: true }).fill(appName);
  await drawer.getByLabel('显示名称', { exact: true }).fill(title);
  await drawer.getByLabel('应用密码', { exact: true }).fill(testPassword);
  await drawer.getByLabel('标签', { exact: true }).fill('e2e,中文');
  const saved = await saveRequest(page, '/appInfo/save', () => drawer.getByRole('button', { name: '保存应用', exact: true }).click());
  resources.apps.push(String(saved.id));
  await expect(drawer).not.toBeVisible();
  await page.getByLabel('应用名称', { exact: true }).fill(appName);
  await page.getByRole('button', { name: '查询', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: appName })).toBeVisible();
  return { id: String(saved.id), appName, title };
}
async function createAccount(page: Page, suffix: string) {
  const username = `e2e_user_${nonce}_${suffix}`;
  await page.goto(`${baseUrl}/#/powerjobLogin`);
  await page.getByRole('button', { name: '创建账号', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '创建 PowerJob 账号' });
  await dialog.getByLabel('账号', { exact: true }).fill(username);
  await dialog.getByLabel('昵称', { exact: true }).fill(`验收用户 ${suffix}`);
  await dialog.getByLabel('密码', { exact: true }).fill(testPassword);
  await dialog.getByLabel('确认密码', { exact: true }).fill(testPassword);
  const created = page.waitForResponse(response => response.url().includes('/auth/thirdPartyLoginDirect') && response.request().method() === 'POST');
  await dialog.getByRole('button', { name: '创建账号', exact: true }).click();
  const value = await result(await created);
  expect(value.success, value.message).toBe(true);
  resources.users.push(String(value.data.id));
  await expect(dialog).not.toBeVisible();
  return { id: String(value.data.id), username };
}
test.afterEach(async ({ page }) => {
  // Cleanup is API-based and distinct from the UI evidence. The UI creates each
  // core resource and verifies a deletion path in the tests below.
  if (!administrator || !administratorPassword || !resources) return;
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.removeItem('PowerJwt')).catch(() => {});
  await signIn(page);
  if (restoreAdmins) await api(page, '/auth/saveGlobalAdmin', { admin: restoreAdmins });
  for (const id of resources.apps.reverse()) await api(page, `/appInfo/delete?appId=${id}`, {}, { AppId: id });
  for (const id of resources.namespaces.reverse()) await api(page, `/namespace/delete?id=${id}`, undefined, { NamespaceId: id }, 'DELETE');
  for (const id of resources.users.reverse()) await api(page, `/user/disable?uid=${id}`);
});

test('UI-001 / UI-003: wrong password, real login, refresh, sign out and protected deep link', async ({ page }) => {
  await page.goto(`${baseUrl}/#/loginHomepage`);
  const builtIn = (await api(page, '/auth/supportLoginTypes', undefined, {}, 'GET')).find((provider: { type: string }) => provider.type === 'PWJB');
  expect(builtIn, 'The isolated environment must enable PWJB sign-in.').toBeTruthy();
  await page.getByRole('button', { name: builtIn.name, exact: true }).click();
  await expect(page).toHaveURL(/#\/powerjobLogin$/);
  await page.getByLabel('账号', { exact: true }).fill(administrator!);
  await page.getByLabel('密码', { exact: true }).fill(`${administratorPassword}_incorrect`);
  await page.getByRole('button', { name: '登录工作空间', exact: true }).click();
  await expect(page.locator('.login-error')).toBeVisible();
  await expect(page).toHaveURL(/#\/powerjobLogin$/);
  await page.getByLabel('密码', { exact: true }).fill(administratorPassword!);
  await page.getByRole('button', { name: '登录工作空间', exact: true }).click();
  await expect(page).toHaveURL(/#\/admin\/app$/);
  const first = await api(page, '/user/detail', undefined, {}, 'GET');
  await page.reload();
  expect(String((await api(page, '/user/detail', undefined, {}, 'GET')).id)).toBe(String(first.id));
  await signOut(page);
  await page.reload();
  await expect(page).toHaveURL(/#\/loginHomepage$/);
  expect(await api(page, '/auth/ifLogin', undefined, {}, 'GET')).toBeNull();
  await page.goto(`${baseUrl}/#/oms/job`);
  await expect(page).toHaveURL(/#\/loginHomepage$/);
});

test('UI-002 / UI-008: registration, profile round trip and password lifecycle', async ({ page }) => {
  const account = await createAccount(page, 'profile');
  await signIn(page, account.username, testPassword);
  await page.goto(`${baseUrl}/#/admin/personal`);
  await page.getByLabel('昵称', { exact: true }).fill('中文名字 & + % 😀');
  await page.getByLabel('手机号', { exact: true }).fill('13800000001');
  await page.getByLabel('邮箱', { exact: true }).fill('e2e@example.invalid');
  await page.getByLabel('通知 Webhook', { exact: true }).fill('https://example.invalid/powerjob?x=1&y=2');
  await saveRequest(page, '/user/modify', () => page.getByRole('button', { name: '保存个人信息' }).click());
  await page.reload();
  await expect(page.getByLabel('昵称', { exact: true })).toHaveValue('中文名字 & + % 😀');
  await page.getByRole('button', { name: '修改密码', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '修改密码', exact: true });
  await dialog.getByLabel('当前密码', { exact: true }).fill('incorrect');
  await dialog.getByLabel('新密码', { exact: true }).fill(`${testPassword}_new`);
  await dialog.getByLabel('确认新密码', { exact: true }).fill('mismatch');
  await dialog.getByRole('button', { name: '确认修改' }).click();
  await expect(dialog.getByText('两次输入的密码不一致', { exact: true })).toBeVisible();
  await dialog.getByLabel('确认新密码', { exact: true }).fill(`${testPassword}_new`);
  const rejected = page.waitForResponse(response => response.url().includes('/pwjbUser/changePassword'));
  await dialog.getByRole('button', { name: '确认修改' }).click();
  expect((await result(await rejected)).success).toBe(false);
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('当前密码', { exact: true }).fill(testPassword);
  await saveRequest(page, '/pwjbUser/changePassword', () => dialog.getByRole('button', { name: '确认修改' }).click());
  await expect(page).toHaveURL(/#\/loginHomepage$/);
  await signIn(page, account.username, `${testPassword}_new`);
});

test('UI-004 / UI-005 / UI-006: page-created namespace and app, edit, workspace entry and confirmed deletion', async ({ page }) => {
  await signIn(page);
  const namespace = await createNamespace(page, 'crud');
  const app = await createApplication(page, namespace, 'crud');
  let row = page.getByRole('row').filter({ hasText: app.appName });
  await row.getByRole('button', { name: '编辑', exact: true }).click();
  const drawer = page.locator('.ant-drawer-content');
  await drawer.getByLabel('显示名称', { exact: true }).fill(`${app.title} 已更新`);
  await saveRequest(page, '/appInfo/save', () => drawer.getByRole('button', { name: '保存应用', exact: true }).click());
  await page.reload();
  await page.getByLabel('应用名称', { exact: true }).fill(app.appName);
  await page.getByRole('button', { name: '查询', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: app.appName })).toContainText(`${app.title} 已更新`);
  row = page.getByRole('row').filter({ hasText: app.appName });
  await row.getByRole('button', { name: '进入', exact: true }).click();
  await expect(page).toHaveURL(/#\/oms\/home$/);
  expect(await page.evaluate(() => localStorage.getItem('Power_appId'))).toBe(app.id);
  await page.goto(`${baseUrl}/#/admin/app`);
  await page.getByLabel('应用名称', { exact: true }).fill(app.appName);
  await page.getByRole('button', { name: '查询', exact: true }).click();
  row = page.getByRole('row').filter({ hasText: app.appName });
  await row.getByRole('button', { name: '编辑', exact: true }).click();
  await drawer.getByRole('button', { name: '删除应用', exact: true }).click();
  await page.locator('.ant-modal-confirm').getByRole('button', { name: '取消', exact: true }).click();
  await expect(drawer).toBeVisible();
  expect((await api(page, '/appInfo/list', { appId: app.id, index: 0, pageSize: 10 })).totalItems).toBe(1);
  await drawer.getByRole('button', { name: '删除应用', exact: true }).click();
  await saveRequest(page, '/appInfo/delete', () => page.locator('.ant-modal-confirm').getByRole('button', { name: '删除应用', exact: true }).click());
  resources.apps = resources.apps.filter(id => id !== app.id);
  await expect(page.getByRole('row').filter({ hasText: app.appName })).not.toBeVisible();
  await page.goto(`${baseUrl}/#/admin/namespace`);
  await page.getByLabel('命名空间编码', { exact: true }).fill(namespace.code);
  await page.getByRole('button', { name: '查询', exact: true }).click();
  const nsRow = page.getByRole('row').filter({ hasText: namespace.code });
  await nsRow.getByRole('button', { name: '删除', exact: true }).click();
  await page.locator('.ant-modal-confirm').getByRole('button', { name: '取消', exact: true }).click();
  await expect(nsRow).toBeVisible();
  await nsRow.getByRole('button', { name: '删除', exact: true }).click();
  await page.locator('.ant-modal-confirm').getByRole('button', { name: '删除', exact: true }).click();
  await expect(nsRow).not.toBeVisible();
  resources.namespaces = resources.namespaces.filter(id => id !== namespace.id);
});

test('UI-007: controlled user disable/enable reflects confirmed server state', async ({ page }) => {
  const account = await createAccount(page, 'status');
  await page.context().clearCookies();
  await signIn(page);
  await page.goto(`${baseUrl}/#/admin/user`);
  await page.getByLabel('用户 ID', { exact: true }).fill(account.id);
  await page.getByRole('button', { name: '查询', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: account.username });
  const toggle = row.getByRole('switch');
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  expect((await api(page, '/user/query', { userIdEq: account.id }))[0].enable).toBe(false);
  await toggle.click();
  await expect(toggle).toBeChecked();
  expect((await api(page, '/user/query', { userIdEq: account.id }))[0].enable).toBe(true);
});

test('UI-005 / UI-006 / UI-008: four application roles, namespace edit and password-based administrator access', async ({ page }) => {
  const account = await createAccount(page, 'permissions');
  await page.context().clearCookies();
  await signIn(page);
  const namespace = await createNamespace(page, 'permissions');
  const application = await createApplication(page, namespace, 'permissions');
  await page.getByRole('row').filter({ hasText: application.appName }).getByRole('button', { name: '编辑', exact: true }).click();
  const drawer = page.locator('.ant-drawer-content');
  await drawer.getByRole('tab', { name: '成员权限', exact: true }).click();
  for (const role of ['观察者', '质量保障', '开发者', '管理员']) {
    const select = drawer.getByRole('combobox', { name: role, exact: true });
    await select.fill(account.username);
    await page.locator('.ant-select-item-option').filter({ hasText: account.username }).click();
    await drawer.getByRole('tab', { name: '成员权限', exact: true }).click();
  }
  await saveRequest(page, '/appInfo/save', () => drawer.getByRole('button', { name: '保存应用', exact: true }).click());
  const listed = await api(page, '/appInfo/list', { appId: application.id, index: 0, pageSize: 10 });
  for (const role of ['observer', 'qa', 'developer', 'admin']) expect(listed.data[0].componentUserRoleInfo[role].map(String)).toContain(account.id);
  await page.goto(`${baseUrl}/#/admin/namespace`);
  await page.getByLabel('命名空间编码', { exact: true }).fill(namespace.code);
  await page.getByRole('button', { name: '查询', exact: true }).click();
  const nsRow = page.getByRole('row').filter({ hasText: namespace.code });
  await nsRow.getByRole('button', { name: '编辑', exact: true }).click();
  await expect(drawer.getByLabel('空间编码', { exact: true })).toBeDisabled();
  await drawer.getByLabel('显示名称', { exact: true }).fill(`${namespace.name} 已更新`);
  await drawer.getByLabel('标签', { exact: true }).fill('e2e,permissions');
  await saveRequest(page, '/namespace/save', () => drawer.getByRole('button', { name: '保存命名空间', exact: true }).click());
  await expect(nsRow).toContainText(`${namespace.name} 已更新`);
  await nsRow.getByRole('button', { name: '删除', exact: true }).click();
  const rejected = page.waitForResponse(response => response.url().includes('/namespace/delete') && response.request().method() === 'DELETE');
  await page.locator('.ant-modal-confirm').getByRole('button', { name: '删除', exact: true }).click();
  expect((await result(await rejected)).success).toBe(false);
  await page.locator('.ant-modal-confirm').getByRole('button', { name: '取消', exact: true }).click();
  await expect(nsRow).toBeVisible();
  const claimedApplication = await createApplication(page, namespace, 'claim');
  await signOut(page);
  await signIn(page, account.username, testPassword);
  await page.goto(`${baseUrl}/#/admin/personal`);
  const beforeGrant = await api(page, '/user/detail', undefined, {}, 'GET');
  expect((beforeGrant.role2AppList.ADMIN || []).map((item: { id: string | number }) => String(item.id))).not.toContain(claimedApplication.id);
  await page.getByLabel('应用名称', { exact: true }).fill(claimedApplication.appName);
  await page.getByLabel('应用密码', { exact: true }).fill('incorrect');
  const failedGrant = page.waitForResponse(response => response.url().includes('/appInfo/becomeAdmin'));
  await page.getByRole('button', { name: '验证并获取权限', exact: true }).click();
  expect((await result(await failedGrant)).success).toBe(false);
  await page.getByLabel('应用密码', { exact: true }).fill(testPassword);
  await saveRequest(page, '/appInfo/becomeAdmin', () => page.getByRole('button', { name: '验证并获取权限', exact: true }).click());
  const detail = await api(page, '/user/detail', undefined, {}, 'GET');
  expect(detail.role2AppList.ADMIN.map((item: { id: string | number }) => String(item.id))).toContain(claimedApplication.id);
});

test('UI-001: rejected third-party callback forwards encoded query without creating a false session', async ({ page }) => {
  const params = new URLSearchParams({ state: `UNKNOWN_E2E_${nonce}`, code: '中文 & + % # callback' });
  const request = page.waitForRequest(request => request.url().includes('/auth/thirdPartyLoginCallback'));
  await page.goto(`${baseUrl}/?${params}#/loginHomepage`);
  const callback = new URL((await request).url());
  expect(callback.searchParams.get('state')).toBe(params.get('state'));
  expect(callback.searchParams.get('code')).toBe(params.get('code'));
  await expect(page.locator('.login-error')).toBeVisible();
  await expect(page).toHaveURL(/#\/loginHomepage$/);
  expect(await page.evaluate(() => localStorage.getItem('PowerJwt'))).toBeNull();
});

test('UI-009: global administrator round trip keeps rescue admin and rejects empty selection', async ({ page }) => {
  const account = await createAccount(page, 'global');
  await page.context().clearCookies();
  await signIn(page);
  const original = (await api(page, '/auth/listGlobalAdmin', undefined, {}, 'GET')).map(String);
  restoreAdmins = original;
  await page.goto(`${baseUrl}/#/admin/settings`);
  const select = page.getByRole('combobox', { name: '全局管理员', exact: true });
  await select.fill(account.username);
  await page.locator('.ant-select-item-option').filter({ hasText: account.username }).click();
  await page.getByRole('heading', { name: '系统设置', exact: true }).click();
  await saveRequest(page, '/auth/saveGlobalAdmin', () => page.getByRole('button', { name: '保存管理员', exact: true }).click());
  expect((await api(page, '/auth/listGlobalAdmin', undefined, {}, 'GET')).map(String)).toEqual(expect.arrayContaining([...original, account.id]));
  await page.reload();
  await expect(page.locator('.current-admin').filter({ hasText: account.username })).toBeVisible();
  const remove = page.locator('.global-admin-form .ant-select-selection-item-remove');
  while (await remove.count()) await remove.first().click();
  await page.getByRole('button', { name: '保存管理员', exact: true }).click();
  await expect(page.getByText('至少保留一位全局管理员', { exact: true })).toBeVisible();
  expect((await api(page, '/auth/listGlobalAdmin', undefined, {}, 'GET')).map(String)).toEqual(expect.arrayContaining(original));
});

test('UI-030: English survives refresh and all management routes render', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: '切换语言', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Applications', exact: true })).toBeVisible();
  for (const [path, title] of [['namespace', 'Namespaces'], ['personal', 'Profile'], ['settings', 'System settings'], ['user', 'Users']]) {
    await page.goto(`${baseUrl}/#/admin/${path}`);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Change language', exact: true }).click();
  await expect(page.getByRole('heading', { name: '用户管理', exact: true })).toBeVisible();
});
