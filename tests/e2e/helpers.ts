import { test as base, expect, type APIRequestContext, type Locator, type Page, type Response, type TestInfo } from '@playwright/test'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import JSONbig from 'json-bigint'

const lossless = JSONbig({ storeAsString: true })
const secrets = new Set<string>()
export type ID = string | number
export type RecordDTO = Record<string, unknown>
export interface ResultDTO<T> { success: boolean; data: T; code?: ID; message?: string; msg?: string }
export interface PageDTO<T> { data: T[]; totalItems: number; pageSize?: number }
export interface Credentials {
  isolated_test_environment: true
  admin_username: string
  admin_password: string
  app_id: ID
  app_name: string
  server_urls?: string[]
}

const suppliedRunId = process.env.POWERJOB_E2E_RUN_ID
export const runId = suppliedRunId || `fev3_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`
if (!/^fev3_[a-zA-Z0-9_]{4,100}$/.test(runId)) throw new Error('Use a unique fev3_ run ID containing only letters, digits and underscores')
export const ownedName = (suffix: string) => {
  if (!/^[a-zA-Z0-9_]{1,80}$/.test(suffix)) throw new Error('Invalid synthetic fixture suffix')
  return `${runId}_${suffix}`
}
export const processors = {
  standalone: 'tech.powerjob.samples.processors.StandaloneProcessorDemo',
  simple: 'tech.powerjob.samples.processors.SimpleProcessor',
  timeout: 'tech.powerjob.samples.processors.TimeoutProcessor',
} as const

export function id(value: unknown): string {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new Error('Unsafe numeric ID in a business receipt')
  if ((typeof value !== 'number' && typeof value !== 'string') || !/^\d+$/.test(String(value))) throw new Error('Missing or invalid business ID')
  return String(value)
}
export function parseResult<T = unknown>(body: string): ResultDTO<T> {
  let value: unknown
  try { value = lossless.parse(body) } catch { throw new Error('The Server returned an invalid JSON business response') }
  if (typeof value !== 'object' || value === null || !('success' in value) || typeof value.success !== 'boolean') throw new Error('The Server returned an invalid ResultDTO shape')
  return value as ResultDTO<T>
}

export async function readCredentials(): Promise<Credentials> {
  const filename = process.env.POWERJOB_E2E_CREDENTIALS
  if (!filename) throw new Error('Configure the private isolated E2E credential file')
  let value: Record<string, unknown>
  try { value = JSON.parse(await fs.readFile(filename, 'utf8')) } catch { throw new Error('The private isolated E2E credential file is unavailable or invalid') }
  if (value.isolated_test_environment !== true) throw new Error('Live tests require an explicitly isolated environment')
  for (const key of ['admin_username', 'admin_password', 'app_id', 'app_name']) if (!value[key]) throw new Error(`The isolated E2E environment is missing ${key}`)
  if (typeof value.admin_username !== 'string' || typeof value.admin_password !== 'string' || typeof value.app_name !== 'string') throw new Error('The isolated E2E credential fields have invalid types')
  id(value.app_id)
  secrets.add(value.admin_username)
  secrets.add(value.admin_password)
  return value as unknown as Credentials
}

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, /password|jwt|token|authorization|cookie|secret|credential/i.test(key) ? '[REDACTED]' : redact(entry)]))
  if (typeof value !== 'string') return value
  let text = value
  for (const secret of secrets) if (secret) text = text.replaceAll(secret, '[REDACTED]')
  return text
}
export async function secretFill(control: Locator, value: string) {
  const visible = control.filter({ visible: true })
  await expect(visible).toBeVisible()
  secrets.add(value)
  try { await visible.fill(value) } catch { throw new Error('A credential field could not be completed') }
}
export const selectors = {
  dialog: (page: Page, name?: string | RegExp) => name ? page.getByRole('dialog', { name }) : page.locator('dialog[open]').last(),
  row: (page: Page, exactName: string) => page.getByRole('row').filter({ has: page.getByText(exactName, { exact: true }) }),
}
export async function fill(scope: Page | Locator, label: string | RegExp, value: ID) { await scope.getByLabel(label, { exact: typeof label === 'string' }).filter({ visible: true }).fill(String(value)) }
export async function choose(scope: Page | Locator, label: string | RegExp, optionLabel: string) { await scope.getByLabel(label, { exact: typeof label === 'string' }).filter({ visible: true }).selectOption({ label: optionLabel }) }
export async function check(scope: Page | Locator, label: string | RegExp, checked: boolean) { await scope.getByLabel(label, { exact: typeof label === 'string' }).filter({ visible: true }).setChecked(checked) }

// Read the original response immediately: action completion or route navigation must not invalidate its body.
export async function clickAndResponse<T = unknown>(page: Page, endpoint: string, action: () => Promise<unknown>, matches: (response: Response) => boolean = () => true): Promise<ResultDTO<T>> {
  const response = page.waitForResponse(value => new URL(value.url()).pathname.endsWith(endpoint) && value.request().method() !== 'OPTIONS' && matches(value))
    .then(async value => parseResult<T>(await value.text()))
  const [body] = await Promise.all([response, action()])
  return body
}
export async function saveDialog<T = unknown>(page: Page, endpoint: string, name?: string | RegExp): Promise<T> {
  const dialog = selectors.dialog(page, name)
  await expect(dialog).toBeVisible()
  const result = await clickAndResponse<T>(page, endpoint, () => dialog.getByRole('button', { name: 'Save', exact: true }).click())
  expect(result.success, 'The real page save request must succeed').toBe(true)
  await expect(dialog).not.toBeVisible()
  return result.data
}
export async function cancelDialog(page: Page, name?: string | RegExp) {
  const dialog = selectors.dialog(page, name)
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(dialog).not.toBeVisible()
}
export async function confirmDialog(page: Page, yes = true) {
  const dialog = selectors.dialog(page, 'Confirm action')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: yes ? 'Confirm' : 'Cancel', exact: true }).click()
  await expect(dialog).not.toBeVisible()
}
export async function login(page: Page, credentials: Credentials) {
  await page.goto('/#/powerjobLogin')
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Sign in', exact: true }) })
  await expect(form).toHaveCount(1)
  await secretFill(form.getByLabel('Username', { exact: true }), credentials.admin_username)
  await secretFill(form.getByLabel('Password', { exact: true }), credentials.admin_password)
  await form.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/#\/admin\/app(?:\?|$)/)
  await expect(page.getByRole('heading', { name: 'Applications', exact: true })).toBeVisible()
}
export async function enterApplication(page: Page, applicationName: string) {
  await page.goto('/#/admin/app')
  await fill(page, 'Application name', applicationName)
  const response = await clickAndResponse<PageDTO<RecordDTO>>(page, '/appInfo/list', () => page.getByRole('button', { name: 'Query', exact: true }).click(), value => {
    const body = value.request().postDataJSON() as RecordDTO | null
    return body?.appNameLike === applicationName
  })
  expect(response.success).toBe(true)
  const row = selectors.row(page, applicationName)
  await expect(row).toHaveCount(1)
  await row.getByRole('button', { name: 'Enter', exact: true }).click()
  await expect(page).toHaveURL(/#\/oms\/home(?:\?|$)/)
}
export const enterSamples = (page: Page, credentials: Credentials) => enterApplication(page, credentials.app_name)

export interface CallOptions { method?: string; query?: Record<string, unknown>; data?: unknown; appId?: ID | null; namespaceId?: ID; allowFailure?: boolean; timeout?: number }
export class Backend {
  readonly server: string
  constructor(readonly request: APIRequestContext, server: string, private readonly token: string, readonly appId: ID) {
    this.server = server.replace(/\/$/, '')
    const parsed = new URL(this.server)
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Invalid isolated Server URL')
    secrets.add(token)
  }
  forApp(appId: ID) { return new Backend(this.request, this.server, this.token, appId) }
  async call<T = unknown>(endpoint: string, options: CallOptions & { allowFailure: true }): Promise<ResultDTO<T>>
  async call<T = unknown>(endpoint: string, options?: CallOptions): Promise<T>
  async call<T = unknown>(endpoint: string, { method = 'GET', query = {}, data, appId = this.appId, namespaceId, allowFailure = false, timeout = 30_000 }: CallOptions = {}): Promise<T | ResultDTO<T>> {
    if (!endpoint.startsWith('/') || endpoint.startsWith('//')) throw new Error('Use a relative management endpoint')
    const url = new URL(this.server + endpoint)
    for (const [key, value] of Object.entries(query)) {
      if (value == null) continue
      if (Array.isArray(value)) for (const item of value) url.searchParams.append(key, String(item))
      else url.searchParams.set(key, String(value))
    }
    const headers: Record<string, string> = { PowerJwt: this.token }
    if (appId != null) headers.AppId = id(appId)
    if (namespaceId != null) headers.NamespaceId = id(namespaceId)
    let response
    try { response = await this.request.fetch(url.href, { method, headers, data, timeout }) } catch { throw new Error(`Backend verification could not reach ${url.pathname}`) }
    const result = parseResult<T>(await response.text())
    if (!allowFailure && (!response.ok() || result.success !== true)) throw new Error(`Backend verification failed for ${url.pathname}`)
    return allowFailure ? result : result.data
  }
  listJobs(keyword = runId, index = 0, pageSize = 100) { return this.call<PageDTO<RecordDTO>>('/job/list', { method: 'POST', data: { appId: this.appId, keyword, index, pageSize } }) }
  async job(jobId: ID) { const rows = await this.call<PageDTO<RecordDTO>>('/job/list', { method: 'POST', data: { appId: this.appId, jobId: id(jobId), index: 0, pageSize: 10 } }); return rows.data.find(row => id(row.id) === id(jobId)) }
  listWorkflows(keyword = runId, index = 0, pageSize = 100) { return this.call<PageDTO<RecordDTO>>('/workflow/list', { method: 'POST', data: { appId: this.appId, keyword, index, pageSize } }) }
  workflow(workflowId: ID) { return this.call<RecordDTO>('/workflow/fetch', { query: { appId: this.appId, workflowId: id(workflowId) } }) }
  containers() { return this.call<RecordDTO[]>('/container/list') }
  async instance(instanceId: ID, type: 'NORMAL' | 'WORKFLOW' = 'NORMAL') {
    const rows = await this.call<PageDTO<RecordDTO>>('/instance/list', { method: 'POST', data: { appId: this.appId, instanceId: id(instanceId), type, index: 0, pageSize: 10 } })
    return rows.data.find(row => id(row.instanceId) === id(instanceId))
  }
  workflowInstance(wfInstanceId: ID) { return this.call<RecordDTO>('/wfInstance/info', { query: { wfInstanceId: id(wfInstanceId) } }) }
  async file(endpoint: string, query: Record<string, ID> = {}) {
    const url = new URL(this.server + endpoint)
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value))
    let response
    try { response = await this.request.get(url.href, { headers: { PowerJwt: this.token, AppId: id(this.appId) }, timeout: 75_000 }) } catch { throw new Error('The original authenticated file response could not be fetched') }
    const contentType = response.headers()['content-type'] || ''
    if (!response.ok() || /json|html/i.test(contentType)) throw new Error('The file endpoint returned an HTTP error or a JSON/HTML response')
    const bytes = await response.body()
    return { bytes, contentType, sha256: crypto.createHash('sha256').update(bytes).digest('hex') }
  }
  async waitInstance(instanceId: ID, statuses: number[] = [5], timeout = 90_000, type: 'NORMAL' | 'WORKFLOW' = 'NORMAL') {
    let actual: RecordDTO | undefined
    await expect.poll(async () => { actual = await this.instance(instanceId, type); return actual != null && statuses.includes(Number(actual.status)) }, { timeout, intervals: [500, 1000, 2000], message: 'The real Worker instance must reach the expected status for the exact ID and type' }).toBe(true)
    return actual!
  }
  async waitWorkflowInstance(wfInstanceId: ID, statuses: number[] = [4], timeout = 90_000) {
    let actual: RecordDTO | undefined
    await expect.poll(async () => { actual = await this.workflowInstance(wfInstanceId); return statuses.includes(Number(actual.status)) }, { timeout, intervals: [500, 1000, 2000], message: 'The real workflow instance must reach the expected status for the exact ID' }).toBe(true)
    return actual!
  }
}

export async function fileHash(filename: string) { return crypto.createHash('sha256').update(await fs.readFile(filename)).digest('hex') }
// This is an observation, not a PASS. The final wrapper must bind it to a single-attempt passed raw test result.
export async function observation(info: TestInfo, caseId: string, variantId: string, actual: RecordDTO, layer: 'browser' | 'api' = 'browser') {
  if (!/^UI-\d{3}$/.test(caseId) || !/^[a-zA-Z0-9_-]+$/.test(variantId)) throw new Error('Invalid stable case or variant ID')
  const receipt = redact({ schemaVersion: 1, status: 'OBSERVED_PENDING_FINAL_TEST_OUTCOME', caseId, variantId, layer, runId, testTitle: info.title, retry: info.retry, actual })
  const filename = info.outputPath(`observation-${caseId}-${variantId}.json`)
  await fs.writeFile(filename, JSON.stringify(receipt, null, 2) + '\n')
  await info.attach(`${caseId}/${variantId}`, { path: filename, contentType: 'application/json' })
}

interface Fixtures { credentials: Credentials; backend: Backend; consoleErrors: string[] }
export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    const prefix = (process.env.POWERJOB_E2E_PATH_PREFIX || '').replace(/\/$/, '')
    if (prefix) {
      if (!prefix.startsWith('/') || prefix.includes('..') || /[?#]/.test(prefix)) throw new Error('Invalid static E2E path prefix')
      const originalGoto = page.goto.bind(page)
      page.goto = (url, options) => originalGoto(url.startsWith('/#/') ? prefix + url : url, options)
    }
    await page.addInitScript(() => { if (!localStorage.getItem('oms_lang') && !localStorage.getItem('lang')) localStorage.setItem('oms_lang', 'en') })
    await use(page)
  },
  credentials: async ({}, use) => { await use(await readCredentials()) },
  consoleErrors: [async ({ page }, use, info) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(String(redact(error.message))))
    page.on('console', message => { if (/\[Vue warn\]|\[intlify\]|Failed to resolve component/.test(message.text())) errors.push(String(redact(message.text()))) })
    page.on('response', response => { if (response.status() >= 400 && /\.(?:js|css|woff2?)(?:[?#]|$)/.test(response.url())) errors.push('A JavaScript, CSS or font asset failed to load') })
    await use(errors)
    if (!page.isClosed()) {
      const filename = info.outputPath('page-redacted.png')
      const masks = [page.locator('input[type="password"],input[autocomplete="username"],input[autocomplete="new-password"],input[autocomplete="current-password"],[data-private]')]
      for (const secret of secrets) if (secret) masks.push(page.getByText(secret, { exact: true }))
      await page.screenshot({ path: filename, fullPage: true, mask: masks }).then(() => info.attach('redacted-page', { path: filename, contentType: 'image/png' })).catch(() => {})
    }
    expect(errors, 'No uncaught browser exception, framework warning or failed bundle/font asset is permitted').toEqual([])
  }, { auto: true }],
  backend: async ({ page, request, credentials }, use) => {
    await login(page, credentials)
    const token = await page.evaluate(() => localStorage.getItem('PowerJwt'))
    if (!token) throw new Error('A real page login did not establish a session')
    const server = process.env.POWERJOB_E2E_SERVER || credentials.server_urls?.[0]
    if (!server) throw new Error('Configure the isolated formal Server URL')
    await use(new Backend(request, server, token, credentials.app_id))
  },
})
export { expect }
