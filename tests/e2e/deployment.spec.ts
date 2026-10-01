import crypto from 'node:crypto'
import { test, expect, enterSamples, clickAndResponse, observation, id, type RecordDTO } from './helpers'

test('UI-030/031/037 · compiled standalone page loads all feature chunks and renders actual Worker inventory', async ({ page, backend, credentials }, info) => {
  const assets: { path: string; status: number }[] = []
  page.on('response', response => {
    if (/\.(?:js|css|woff2)(?:[?#]|$)/.test(response.url())) assets.push({ path: new URL(response.url()).pathname, status: response.status() })
  })
  await page.reload()
  await enterSamples(page, credentials)
  const actual = await backend.call<RecordDTO[]>('/system/listWorker', { query: { appId: credentials.app_id } })
  expect(actual).toHaveLength(2)
  await expect(page.locator('.overview-workers tbody tr')).toHaveCount(actual.length)
  for (const worker of actual) await expect(page.locator('.overview-workers')).toContainText(String(worker.address))
  const paths = [
    ['/oms/job', 'Jobs', 'Jobs'], ['/oms/instance', 'Job instances', 'Runs'], ['/oms/workflow', 'Workflows', 'Flows'],
    ['/oms/wfinstance', 'Workflow instances', 'Flow runs'], ['/oms/template', 'Processor templates', 'Templates'],
    ['/oms/containermanage', 'Containers', 'Containers'], ['/oms/home', 'Operations overview', 'Overview'],
  ] as const
  for (const [route, heading, menuLabel] of paths) {
    const link = page.locator('aside.rail nav').getByRole('link', { name: menuLabel, exact: true })
    await link.click()
    await expect(page).toHaveURL(new RegExp('#' + route + '$'))
    await expect(link).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    if (route === '/oms/workflow') await expect(page.getByRole('button', { name: /Export|Import workflow/i })).toHaveCount(0)
  }
  await page.goto('/#/oms/home')
  await expect.poll(() => page.evaluate(async () => {
    await document.fonts.ready
    return [...document.fonts].some(font => font.family.includes('Manrope') && font.status === 'loaded')
  })).toBe(true)
  await expect(page.locator('aside.rail')).not.toContainText(/vue\s*3|fev3|5\.1\.6|version/i)
  expect(assets.length).toBeGreaterThan(5)
  expect(assets.every(asset => asset.status === 200)).toBe(true)
  await observation(info, 'UI-029', 'oms-menus', { sevenActualMenuClicksAndExactAriaCurrent: paths })
  await observation(info, 'UI-013', 'unsupported-workflow-export', { unsupportedWorkflowImportAndExportButtonsAbsent: true, noPretendJobSaveAction: true })
  await observation(info, 'UI-037', process.env.POWERJOB_E2E_PATH_PREFIX ? 'standalone-subpath' : 'standalone-root-deploy', {
    actualWorkerAddresses: actual.map(worker => worker.address).sort(), routesAndHeadings: paths,
    actualAssets: assets, localFontLoaded: true, implementationVersionAbsentFromNavigation: true,
    otherDeploymentMode: 'NOT_EXECUTED_IN_THIS_INVOCATION',
  })
})

test('UI-030/033/037 · public runtime API configuration preserves one session across both actual Server nodes', async ({ page, backend: _backend, credentials }, info) => {
  await enterSamples(page, credentials)
  const origin = new URL(page.url()).origin
  const cases = [
    { mode: 'root-relative-node-one', apiBaseUrl: '/backend-one/', path: '/backend-one/system/listWorker', node: 1 },
    { mode: 'absolute-node-two', apiBaseUrl: origin + '/backend-two/', path: '/backend-two/system/listWorker', node: 2 },
    { mode: 'directory-relative', apiBaseUrl: './api', path: (process.env.POWERJOB_E2E_PATH_PREFIX || '') + '/api/system/listWorker', node: 1 },
  ]
  const sessionHashes = new Set<string>()
  const observed: RecordDTO[] = []
  let inventory: string[] | undefined
  for (const fixture of cases) {
    // Only the documented public config.js deployment setting is supplied here.
    // Every auth/system response is the unmodified response from a real Server.
    const handler = async (route: import('@playwright/test').Route) => {
      await route.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.POWERJOB_CONFIG=' + JSON.stringify({ apiBaseUrl: fixture.apiBaseUrl }) + ';' })
    }
    await page.route('**/config.js', handler)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Operations overview', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
    let requestHeadersVerified = false
    const response = await clickAndResponse<RecordDTO[]>(page, '/system/listWorker', () => page.getByRole('button', { name: 'Refresh', exact: true }).click(), actual => {
      const url = new URL(actual.url())
      if (url.pathname !== fixture.path) return false
      const headers = actual.request().headers()
      expect(headers.appid).toBe(id(credentials.app_id))
      expect(url.searchParams.get('appId')).toBe(id(credentials.app_id))
      expect(headers.powerjwt).toBeTruthy()
      sessionHashes.add(crypto.createHash('sha256').update(headers.powerjwt).digest('hex'))
      requestHeadersVerified = true
      return true
    })
    expect(response.success).toBe(true)
    expect(response.data).toHaveLength(2)
    const addresses = response.data.map(worker => String(worker.address)).sort()
    if (inventory) expect(addresses).toEqual(inventory)
    inventory = addresses
    await expect(page.locator('.overview-workers tbody tr')).toHaveCount(2)
    for (const address of addresses) await expect(page.locator('.overview-workers')).toContainText(address)
    await page.unroute('**/config.js', handler)
    observed.push({ ...fixture, requestHeadersVerified, originalResultDTORead: true, workerAddresses: addresses })
  }
  expect(sessionHashes.size).toBe(1)
  await observation(info, 'UI-037', 'runtime-api-config', { cases: observed, sameSessionAcrossBothServers: true, jwtValueEmitted: false, noFabricatedBusinessResponse: true })
})

test('UI-030 · a real interrupted Worker request recovers through the visible Refresh action', async ({ page, backend: _backend, credentials }, info) => {
  await enterSamples(page, credentials)
  await expect(page.locator('.overview-workers tbody tr')).toHaveCount(2)
  let interrupted = 0
  await page.route('**/system/listWorker?*', async route => { interrupted++; await route.abort('failed') }, { times: 1 })
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect.poll(() => interrupted).toBe(1)
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
  await expect(page.getByText('Failed to fetch', { exact: true })).toBeVisible()
  const recovered = await clickAndResponse<RecordDTO[]>(page, '/system/listWorker', () => page.getByRole('button', { name: 'Refresh', exact: true }).click())
  expect(recovered.success).toBe(true)
  expect(recovered.data).toHaveLength(2)
  for (const worker of recovered.data) await expect(page.locator('.overview-workers')).toContainText(String(worker.address))
  await observation(info, 'UI-030', 'network-recovery', { genuineTransportFailureCount: interrupted, realRefreshRecovered: true, originalWorkerCount: recovered.data.length, noFabricatedResponse: true })
})
