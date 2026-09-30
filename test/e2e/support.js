import { test as base, expect } from '@playwright/test'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import JSONbig from 'json-bigint'

const lossless = JSONbig({ storeAsString: true })
export const runId = process.env.POWERJOB_E2E_RUN_ID || `vue3_${Date.now().toString(36)}`
export const demoProcessor = 'tech.powerjob.samples.processors.StandaloneProcessorDemo'
export const simpleProcessor = 'tech.powerjob.samples.processors.SimpleProcessor'
export const timeoutProcessor = 'tech.powerjob.samples.processors.TimeoutProcessor'
export const selectors = {
  // Date/time popovers also expose role=dialog; choose the actual Element form modal.
  dialog: page => page.locator('.el-dialog:visible').last(),
  confirm: page => page.locator('.el-message-box'),
  row: (page, text) => page.locator('.el-table__body-wrapper tr').filter({ hasText: text }).first(),
}

export function formItem(scope, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return scope.locator('.el-form-item').filter({ has: scope.page().locator('.el-form-item__label', { hasText: new RegExp(`^${escaped}$`, 'i') }) }).first()
}
export async function input(scope, label, value, index = 0) {
  await formItem(scope, label).locator('.el-input__inner,.el-textarea__inner').nth(index).fill(String(value))
}
export async function choose(page, scope, label, text, index = 0) {
  await formItem(scope, label).locator('.el-select').nth(index).click()
  await page.locator('.el-select-dropdown:visible').getByText(text, { exact: true }).click()
}
export async function clickAndResponse(page, pathPart, action, matches = () => true) {
  const response = page.waitForResponse(response => response.url().split('?')[0].endsWith(pathPart) && response.request().method() !== 'OPTIONS' && matches(response)).then(async received => lossless.parse(await received.text()))
  const [body] = await Promise.all([response, action()])
  return body
}
export async function saveDialog(page, endpoint) {
  // Commit focused native/time input edits before the actual page submission.
  await selectors.dialog(page).locator('.el-dialog__header').click()
  await expect(selectors.dialog(page).getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
  await expect(selectors.dialog(page).getByRole('button', { name: 'Save', exact: true })).not.toHaveClass(/is-loading/)
  const result = await clickAndResponse(page, endpoint, () => selectors.dialog(page).getByRole('button', { name: 'Save', exact: true }).click())
  expect(result.success, 'The page save request must succeed').toBe(true)
  await expect(selectors.dialog(page)).not.toBeVisible()
  return result.data
}
export async function confirmDialog(page, confirm = true) {
  await expect(selectors.confirm(page)).toBeVisible()
  await selectors.confirm(page).getByRole('button', { name: confirm ? /^(Confirm|OK)$/ : 'Cancel', exact: true }).click()
  await expect(selectors.confirm(page)).not.toBeVisible()
}
export async function secretFill(locator, secret) {
  await expect(locator).toBeVisible()
  try { await locator.fill(secret) } catch { throw new Error('Credential input could not be completed') }
}
export async function readCredentials() {
  const filename = process.env.POWERJOB_E2E_CREDENTIALS
  if (!filename) throw new Error('Set POWERJOB_E2E_CREDENTIALS to a private isolated environment file')
  let credentials
  try { credentials = JSON.parse(await fs.readFile(filename, 'utf8')) } catch { throw new Error('The private E2E environment file is unavailable or invalid') }
  if (!credentials.isolated_test_environment) throw new Error('Live mutations require an explicitly isolated test environment')
  for (const name of ['admin_username', 'admin_password', 'app_id', 'app_name']) {
    if (!credentials[name]) throw new Error(`The isolated E2E environment is missing ${name}`)
  }
  return credentials
}
export async function login(page, credentials) {
  await page.goto('/#/loginHomepage')
  await page.getByRole('button', { name: /PWJB|PowerJob/i }).first().click()
  await expect(page).toHaveURL(/powerjobLogin/)
  await secretFill(page.getByLabel('Username', { exact: true }), credentials.admin_username)
  await secretFill(page.getByLabel('Password', { exact: true }), credentials.admin_password)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL(/admin\/app/)
  await expect(page.locator('.el-table')).toBeVisible()
}
export async function enterSamples(page, credentials) {
  await page.goto('/#/admin/app')
  await input(page.locator('main'), 'appName', credentials.app_name)
  await page.getByRole('button', { name: 'Query', exact: true }).click()
  const row = selectors.row(page, credentials.app_name)
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Enter', exact: true }).click()
  await expect(page).toHaveURL(/oms\/home/)
}

export class Backend {
  constructor(request, server, token, appId) { Object.assign(this, { request, server: server.replace(/\/$/, ''), token, appId }) }
  async call(endpoint, { method = 'GET', data, appId = this.appId, namespaceId, allowFailure = false } = {}) {
    const headers = { PowerJwt: this.token }
    if (appId != null) headers.AppId = String(appId)
    if (namespaceId != null) headers.NamespaceId = String(namespaceId)
    const response = await this.request.fetch(this.server + endpoint, { method, headers, data })
    const result = lossless.parse(await response.text())
    if (!allowFailure && !result.success) throw new Error(`Backend verification failed for ${endpoint.split('?')[0]}`)
    return allowFailure ? result : result.data
  }
  listJobs(keyword = runId) { return this.call('/job/list', { method: 'POST', data: { appId: this.appId, keyword, index: 0, pageSize: 100 } }) }
  async job(id) { const result = await this.call('/job/list', { method: 'POST', data: { appId: this.appId, jobId: id, index: 0, pageSize: 10 } }); return result.data.find(job => String(job.id) === String(id)) }
  async waitInstance(id, statuses = [4, 5, 10], timeout = 60_000) {
    let value
    await expect.poll(async () => {
      const result = await this.call('/instance/list', { method: 'POST', data: { appId: this.appId, instanceId: id, type: 'NORMAL', index: 0, pageSize: 10 } })
      value = result.data.find(instance => String(instance.instanceId) === String(id))
      return value?.status
    }, { timeout, intervals: [500, 1000, 2000], message: 'A real Worker instance must reach its expected state' }).toBeOneOf(statuses)
    return value
  }
  async deleteOwnedJob(id) {
    const job = await this.job(id)
    if (job && !job.jobName.startsWith(runId)) throw new Error('Refusing to clean a job owned by another test lane')
    if (job) await this.call('/job/delete?jobId=' + encodeURIComponent(id))
  }
}

expect.extend({
  toBeOneOf(received, choices) { return { pass: choices.includes(received), message: () => `Expected state to be one of [${choices.join(', ')}], received ${received}` } },
})

export const test = base.extend({
  page: async ({ page }, use) => {
    const prefix = (process.env.POWERJOB_E2E_PATH_PREFIX || '').replace(/\/$/, '')
    if (prefix) {
      if (!prefix.startsWith('/') || prefix.includes('..') || prefix.includes('#') || prefix.includes('?')) throw new Error('E2E static path prefix must be an absolute path without query or traversal')
      const originalGoto = page.goto.bind(page)
      page.goto = (url, options) => originalGoto(typeof url === 'string' && url.startsWith('/#/') ? prefix + url : url, options)
    }
    await use(page)
  },
  credentials: async ({}, use) => { await use(await readCredentials()) },
  consoleErrors: [async ({ page }, use, testInfo) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (/\[Vue warn\]|\[intlify\]|Failed to resolve component/.test(message.text())) errors.push(message.text()) })
    page.on('response', response => { if (response.status() === 404 && /\.(?:js|css)(?:[?#]|$)/.test(response.url())) errors.push('A JavaScript or CSS resource returned 404') })
    await page.addInitScript(() => { if (!localStorage.getItem('oms_lang') && !localStorage.getItem('lang')) localStorage.setItem('oms_lang', 'en') })
    await use(errors)
    if (page.isClosed()) return
    const screenshot = testInfo.outputPath('page-redacted.png')
    await page.screenshot({ path: screenshot, fullPage: true, mask: [page.locator('input[type="password"]'), page.locator('input[autocomplete="username"]'), page.locator('input[autocomplete="new-password"]'), page.locator('input[disabled]')] }).catch(() => {})
    await testInfo.attach('redacted-page', { path: screenshot, contentType: 'image/png' }).catch(() => {})
    expect(errors, 'No uncaught browser exceptions are permitted').toEqual([])
  }, { auto: true }],
  backend: async ({ page, request, credentials }, use) => {
    await login(page, credentials)
    const token = await page.evaluate(() => localStorage.getItem('PowerJwt'))
    const server = process.env.POWERJOB_E2E_SERVER || credentials.server_urls?.[0]
    if (!server) throw new Error('Configure the isolated Server URL')
    await use(new Backend(request, server, token, credentials.app_id))
  },
})

export async function fileHash(filename) { return crypto.createHash('sha256').update(await fs.readFile(filename)).digest('hex') }
export { expect }
