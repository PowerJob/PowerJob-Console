import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import type { Page, Response, Route } from '@playwright/test'
import { test, expect, enterSamples, enterApplication, selectors, fill, clickAndResponse, parseResult, id, ownedName, observation, fileHash, type Backend, type PageDTO, type RecordDTO } from './helpers'
import { AdminFixtures } from './admin-fixtures'
import { WorkflowActions } from './workflow-actions'

interface Fixture {
  app: RecordDTO
  space: RecordDTO
  jobId: string
  jobName: string
  workflowId: string
  workflowName: string
  instanceId: string
  workflowInstanceId: string
  containerId: string
  containerName: string
}

// Only exact owned definitions are prepared. Delayed runs establish real WAITING rows without executing a Worker.
async function prepare(backend: Backend, actions: WorkflowActions, admin: AdminFixtures, axis: 'lists' | 'routes'): Promise<Fixture> {
  const space = await admin.space('cross_' + axis + '_namespace')
  const app = await admin.app('cross_' + axis + '_empty_application', id(space.id))
  const job = await actions.job('cross_' + axis + '_job')
  const workflowName = ownedName('cross_' + axis + '_workflow')
  await actions.create(workflowName)
  await actions.importJob(job.id)
  const workflowId = await actions.save(workflowName)
  const instanceId = actions.owned.trackInstance(id(await backend.call('/job/run', { query: { jobId: job.id, delay: 600000 } })), job.id)
  const workflowInstanceId = actions.owned.trackInstance(id(await backend.call('/workflow/run', { query: { workflowId, delay: 600000 } })), workflowId, 'WF_INSTANCE')
  const containerName = ownedName('cross_' + axis + '_container')
  await backend.call('/container/save', { method: 'POST', data: { appId: backend.appId, containerName, sourceType: 'Git', sourceInfo: JSON.stringify({ repo: 'https://example.invalid/owned-state-fixture.git', branch: 'main' }), status: 'ENABLE' } })
  const containers = (await backend.containers()).filter(row => row.containerName === containerName)
  expect(containers).toHaveLength(1)
  const containerId = actions.owned.track('container', id(containers[0]!.id), containerName)
  expect(id((await backend.instance(instanceId))?.jobId)).toBe(job.id)
  expect(id((await backend.workflowInstance(workflowInstanceId)).workflowId)).toBe(workflowId)
  return { app, space, jobId: job.id, jobName: job.name, workflowId, workflowName, instanceId, workflowInstanceId, containerId, containerName }
}

async function dismissNotices(page: Page) {
  // Explicitly dismiss the prior native transport notification, never a domain error banner.
  for (const notice of await page.locator('.notice-stack [role="alert"]').all()) {
    const close = notice.getByRole('button', { name: 'Close', exact: true })
    if (await close.isVisible()) await close.click()
  }
}
function rowsFrom(data: PageDTO<RecordDTO> | RecordDTO[]) { return Array.isArray(data) ? data : data.data }
interface ListSurface { name: string; route: string; heading: string; endpoint: string; action: 'Query' | 'Search' | 'Refresh'; filter?: [string, string, string, string]; home?: boolean }
async function trigger(page: Page, action: ListSurface['action']) {
  const button = page.getByRole('button', { name: action, exact: true }).filter({ visible: true })
  await expect(button).toBeEnabled()
  await button.click()
}

async function transportStates(page: Page, surface: ListSurface) {
  await dismissNotices(page)
  await page.goto('/#' + surface.route)
  await expect(page.getByRole('heading', { name: surface.heading, exact: true })).toBeVisible()
  if (!surface.home) await expect(page.locator('main .table-state')).toHaveAttribute('aria-busy', 'false')
  if (surface.filter) await fill(page, surface.filter[0], surface.filter[1])
  const matchesFilter = (value: string) => (response: Response) => !surface.filter || response.request().postDataJSON()?.[surface.filter[3]] === value
  const normal = await clickAndResponse<PageDTO<RecordDTO> | RecordDTO[]>(page, surface.endpoint, () => trigger(page, surface.action), matchesFilter(surface.filter?.[1] || ''))
  expect(normal.success).toBe(true)
  const originalRows = rowsFrom(normal.data)
  expect(originalRows.length).toBeGreaterThan(0)
  const table = page.locator('main .data-table tbody tr')
  await expect(table).toHaveCount(Math.min(surface.name === 'Container' || surface.home ? Number.MAX_SAFE_INTEGER : 10, originalRows.length))
  const priorCount = await table.count()
  await expect(page.locator('main .empty-state')).not.toBeVisible()

  let held = false, originalSHA256 = '', intercepted = 0
  let decide!: (value: 'abort' | 'deliver') => void
  const decision = new Promise<'abort' | 'deliver'>(resolve => { decide = resolve })
  const pattern = '**' + surface.endpoint + '*'
  const handler = async (route: Route) => {
    if (!new URL(route.request().url()).pathname.endsWith(surface.endpoint) || intercepted || surface.filter && route.request().postDataJSON()?.[surface.filter[3]] !== surface.filter[1]) return route.continue()
    intercepted++
    const original = await route.fetch()
    expect(original.ok()).toBe(true)
    const bytes = await original.body()
    const originalResult = parseResult<PageDTO<RecordDTO> | RecordDTO[]>(bytes.toString('utf8'))
    expect(originalResult.success).toBe(true)
    expect(rowsFrom(originalResult.data).length).toBeGreaterThan(0)
    originalSHA256 = crypto.createHash('sha256').update(bytes).digest('hex')
    held = true
    if (await decision === 'abort') await route.abort('failed')
    else await route.fulfill({ response: original })
  }
  const errorRegion = page.locator(surface.name === 'Job' || surface.home ? '.notice-stack' : 'main').getByRole('alert').filter({ hasText: 'Failed to fetch' })
  await page.route(pattern, handler)
  try {
    await trigger(page, surface.action)
    await expect.poll(() => held).toBe(true)
    if (surface.home) {
      // Home's existing visible in-progress state is a disabled Refresh, not an invented text loader.
      await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeDisabled()
    } else {
      await expect(page.locator('main .table-state')).toHaveAttribute('aria-busy', 'true')
      await expect(page.getByRole('status').filter({ hasText: 'Loading…' })).toBeVisible()
    }
    await expect(table).toHaveCount(priorCount)
    await expect(page.locator('main .empty-state')).not.toBeVisible()
    decide('abort')
    await expect(errorRegion).toBeVisible()
    if (!surface.home) await expect(page.locator('main .table-state')).toHaveAttribute('aria-busy', 'false')
    await expect(page.getByRole('button', { name: surface.action, exact: true }).filter({ visible: true })).toBeEnabled()
    await expect(table).toHaveCount(priorCount)
    await expect(page.locator('main .empty-state')).not.toBeVisible()
    if (surface.filter) await expect(page.getByLabel(surface.filter[0], { exact: true }).filter({ visible: true })).toHaveValue(surface.filter[1])
  } finally {
    decide('deliver')
    await page.unroute(pattern, handler)
  }
  expect(intercepted).toBe(1)
  expect(originalSHA256).toMatch(/^[0-9a-f]{64}$/)
  await dismissNotices(page)
  const recovered = await clickAndResponse<PageDTO<RecordDTO> | RecordDTO[]>(page, surface.endpoint, () => trigger(page, surface.action), matchesFilter(surface.filter?.[1] || ''))
  expect(recovered.success).toBe(true)
  await expect(table).toHaveCount(Math.min(surface.name === 'Container' || surface.home ? Number.MAX_SAFE_INTEGER : 10, rowsFrom(recovered.data).length))
  await expect(errorRegion).not.toBeVisible()
  await expect(page.locator('main .empty-state')).not.toBeVisible()
  if (surface.filter) {
    await fill(page, surface.filter[0], surface.filter[2])
    const empty = await clickAndResponse<PageDTO<RecordDTO> | RecordDTO[]>(page, surface.endpoint, () => trigger(page, surface.action), matchesFilter(surface.filter[2]))
    expect(empty.success).toBe(true)
    expect(rowsFrom(empty.data)).toEqual([])
    await expect(table).toHaveCount(0)
    await expect(page.getByText('No matching results', { exact: true })).toBeVisible()
    await expect(page.locator('main [role="alert"]')).toHaveCount(0)
  }
  return { domain: surface.name, originalHeldResponseSHA256: originalSHA256, originalRowCount: originalRows.length, actualNetworkAbort: true, retainedRowsOnFailure: priorCount, originalRecoveryRowCount: rowsFrom(recovered.data).length, actualEmptyFilteredResponse: !!surface.filter, loadingIndicator: surface.home ? 'native Refresh disabled while real Worker response held' : 'visible Loading… and aria-busy', fabricatedBusinessBody: false }
}

test('UI-035 · nine real domain lists expose pending requests, retain rows on network failure, recover and distinguish genuine zero results', async ({ page, backend, credentials }, info) => {
  test.setTimeout(240_000)
  const actions = new WorkflowActions(page, backend, info), admin = new AdminFixtures(backend)
  const actual: RecordDTO[] = []
  try {
    await enterSamples(page, credentials)
    const fixture = await prepare(backend, actions, admin, 'lists')
    const profile = await backend.call<RecordDTO>('/user/detail')
    const absentId = '9223372036854775806'
    const surfaces: ListSurface[] = [
      { name: 'App', route: '/admin/app', heading: 'Applications', endpoint: '/appInfo/list', action: 'Query', filter: ['Application name', String(fixture.app.appName), ownedName('absent_app'), 'appNameLike'] },
      { name: 'Namespace', route: '/admin/namespace', heading: 'Namespaces', endpoint: '/namespace/list', action: 'Query', filter: ['Code', String(fixture.space.code), ownedName('absent_namespace'), 'codeLike'] },
      { name: 'User', route: '/admin/user', heading: 'Users', endpoint: '/user/query', action: 'Query', filter: ['User ID', id(profile.id), absentId, 'userIdEq'] },
      { name: 'Job', route: '/oms/job', heading: 'Jobs', endpoint: '/job/list', action: 'Search', filter: ['Keyword', fixture.jobName, ownedName('absent_job'), 'keyword'] },
      { name: 'Instance', route: '/oms/instance?jobId=' + fixture.jobId, heading: 'Job instances', endpoint: '/instance/list', action: 'Search', filter: ['Instance ID', fixture.instanceId, absentId, 'instanceId'] },
      { name: 'Workflow', route: '/oms/workflow', heading: 'Workflows', endpoint: '/workflow/list', action: 'Search', filter: ['Workflow ID', fixture.workflowId, absentId, 'workflowId'] },
      { name: 'WorkflowInstance', route: '/oms/wfinstance?workflowId=' + fixture.workflowId, heading: 'Workflow instances', endpoint: '/wfInstance/list', action: 'Search', filter: ['Instance ID', fixture.workflowInstanceId, absentId, 'wfInstanceId'] },
      { name: 'Container', route: '/oms/containermanage', heading: 'Containers', endpoint: '/container/list', action: 'Refresh' },
      { name: 'Home', route: '/oms/home', heading: 'Operations overview', endpoint: '/system/listWorker', action: 'Refresh', home: true },
    ]
    for (const surface of surfaces) actual.push(await transportStates(page, surface))
    // These two existing pages have no filter control. A real owned empty App is the zero-data precondition.
    await enterApplication(page, String(fixture.app.appName))
    const emptyWorkers = await clickAndResponse<RecordDTO[]>(page, '/system/listWorker', () => trigger(page, 'Refresh'))
    expect(emptyWorkers.success).toBe(true); expect(emptyWorkers.data).toEqual([])
    await expect(page.locator('.overview-workers tbody tr')).toHaveCount(0)
    await expect(page.getByText('No Workers connected', { exact: true })).toBeVisible()
    const emptyContainers = await clickAndResponse<RecordDTO[]>(page, '/container/list', () => page.getByRole('complementary', { name: 'Navigation', exact: true }).getByRole('link', { name: 'Containers', exact: true }).click())
    expect(emptyContainers.success).toBe(true); expect(emptyContainers.data).toEqual([])
    await expect(page.locator('main tbody tr')).toHaveCount(0)
    await expect(page.getByText('No matching results', { exact: true })).toBeVisible()
    await expect(page.locator('main [role="alert"]')).toHaveCount(0)
    await enterSamples(page, credentials)
    const restored = await clickAndResponse<RecordDTO[]>(page, '/system/listWorker', () => trigger(page, 'Refresh'))
    expect(restored.success).toBe(true); expect(restored.data).toHaveLength(2)
    for (const worker of restored.data) await expect(selectors.row(page, String(worker.address))).toHaveCount(1)
    expect(actual).toHaveLength(9)
    await observation(info, 'UI-035', 'empty-loading-error', { domains: actual, ownedEmptyAppId: id(fixture.app.id), containerAndHomeZeroDataFromRealSelectedApp: true, currentSamplesTwoWorkerInventoryRestored: true, originalBusinessBodiesOnly: true, noWorkerStopOrSharedMetadataChanges: true })
  } finally { try { await actions.cleanup() } finally { await admin.cleanup(info) } }
})

async function menu(page: Page, name: string, heading: string, route: string) {
  const link = page.getByRole('complementary', { name: 'Navigation', exact: true }).getByRole('link', { name, exact: true })
  await link.click()
  await expect(page).toHaveURL(new RegExp('#' + route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'))
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  const state = page.locator('main .table-state')
  if (await state.count()) await expect(state).toHaveAttribute('aria-busy', 'false')
  if (heading === 'Operations overview') await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
}

test('UI-040 · native Job, instance and container menu return plus workflow-instance and template hard refresh restore real route actions and current context', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  const actions = new WorkflowActions(page, backend, info), admin = new AdminFixtures(backend)
  try {
    await enterSamples(page, credentials)
    const fixture = await prepare(backend, actions, admin, 'routes')
    let writes = 0
    page.on('request', request => { if (/\/(?:job\/save|workflow\/save|workflow\/saveNode|container\/save|job\/run|workflow\/run)$/.test(new URL(request.url()).pathname)) writes++ })
    const contextHeaders: { endpoint: string; appId: string; currentSession: boolean }[] = []
    const currentToken = await page.evaluate(() => localStorage.getItem('PowerJwt'))
    page.on('request', request => { const endpoint = new URL(request.url()).pathname; if (/\/(?:job\/list|instance\/list|container\/list|wfInstance\/list)$/.test(endpoint)) contextHeaders.push({ endpoint, appId: request.headers().appid || '', currentSession: request.headers().powerjwt === currentToken }) })
    await menu(page, 'Jobs', 'Jobs', '/oms/job')
    await fill(page, 'Keyword', fixture.jobName)
    expect((await clickAndResponse(page, '/job/list', () => trigger(page, 'Search'))).success).toBe(true)
    await selectors.row(page, fixture.jobName).getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(selectors.dialog(page, 'Edit job').getByLabel('Job name', { exact: true })).toHaveValue(fixture.jobName)
    await selectors.dialog(page, 'Edit job').getByRole('button', { name: 'Cancel', exact: true }).click()
    await menu(page, 'Overview', 'Operations overview', '/oms/home')
    await menu(page, 'Jobs', 'Jobs', '/oms/job')
    await fill(page, 'Keyword', fixture.jobName)
    expect((await clickAndResponse(page, '/job/list', () => trigger(page, 'Search'))).success).toBe(true)
    await expect(selectors.row(page, fixture.jobName)).toHaveCount(1)
    await menu(page, 'Runs', 'Job instances', '/oms/instance')
    await fill(page, 'Job ID', fixture.jobId); await fill(page, 'Instance ID', fixture.instanceId)
    const listed = await clickAndResponse<PageDTO<RecordDTO>>(page, '/instance/list', () => trigger(page, 'Search'))
    expect(listed.success).toBe(true); expect(listed.data.data.map(row => id(row.instanceId))).toEqual([fixture.instanceId])
    await menu(page, 'Containers', 'Containers', '/oms/containermanage')
    await menu(page, 'Runs', 'Job instances', '/oms/instance')
    await expect(page.getByLabel('Job ID', { exact: true })).toHaveValue('')
    await expect(page.getByLabel('Instance ID', { exact: true })).toHaveValue('')
    await fill(page, 'Instance ID', fixture.instanceId)
    expect((await clickAndResponse(page, '/instance/list', () => trigger(page, 'Search'))).success).toBe(true)
    await expect(selectors.row(page, fixture.instanceId)).toHaveCount(1)
    await menu(page, 'Containers', 'Containers', '/oms/containermanage')
    expect((await clickAndResponse(page, '/container/list', () => trigger(page, 'Refresh'))).success).toBe(true)
    await selectors.row(page, fixture.containerName).getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(selectors.dialog(page, 'Edit container').getByLabel('Container name', { exact: true })).toHaveValue(fixture.containerName)
    await selectors.dialog(page, 'Edit container').getByRole('button', { name: 'Cancel', exact: true }).click()
    await menu(page, 'Jobs', 'Jobs', '/oms/job')
    await menu(page, 'Containers', 'Containers', '/oms/containermanage')
    expect((await clickAndResponse(page, '/container/list', () => trigger(page, 'Refresh'))).success).toBe(true)
    await expect(selectors.row(page, fixture.containerName)).toHaveCount(1)
    await menu(page, 'Flows', 'Workflows', '/oms/workflow')
    await fill(page, 'Workflow ID', fixture.workflowId)
    expect((await clickAndResponse(page, '/workflow/list', () => trigger(page, 'Search'))).success).toBe(true)
    const history = await clickAndResponse<PageDTO<RecordDTO>>(page, '/wfInstance/list', () => selectors.row(page, fixture.workflowName).getByRole('button', { name: 'Instances', exact: true }).click(), response => response.request().postDataJSON()?.workflowId === fixture.workflowId)
    expect(history.success).toBe(true); expect(history.data.data.map(row => id(row.wfInstanceId))).toEqual([fixture.workflowInstanceId])
    await expect(page).toHaveURL(new RegExp('wfinstance\\?workflowId=' + fixture.workflowId + '$'))
    const refreshed = await clickAndResponse<PageDTO<RecordDTO>>(page, '/wfInstance/list', () => page.reload(), response => response.request().postDataJSON()?.workflowId === fixture.workflowId)
    expect(refreshed.success).toBe(true); expect(refreshed.data.data.map(row => id(row.wfInstanceId))).toEqual([fixture.workflowInstanceId])
    await expect(page.getByLabel('Workflow ID', { exact: true })).toHaveValue(fixture.workflowId)
    await expect(selectors.row(page, fixture.workflowInstanceId)).toHaveCount(1)
    await menu(page, 'Templates', 'Processor templates', '/oms/template')
    const artifact = ownedName('route_template')
    for (const [label, value] of [['Group', 'com.example.route'], ['Artifact', artifact], ['Name', artifact], ['Package name', 'com.example.route']]) await fill(page, label, value)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Generate & download', exact: true }).click()
    const filename = info.outputPath('route-hard-refresh-template.zip')
    await (await download).saveAs(filename)
    expect((await fs.readFile(filename)).subarray(0, 2).toString()).toBe('PK')
    const templateSHA256 = await fileHash(filename)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Processor templates', exact: true })).toBeVisible()
    for (const label of ['Group', 'Artifact', 'Name', 'Package name']) await expect(page.getByLabel(label, { exact: true })).toHaveValue('')
    await expect(page.getByLabel('Java Version', { exact: true })).toHaveValue('8')
    await menu(page, 'Jobs', 'Jobs', '/oms/job')
    await menu(page, 'Templates', 'Processor templates', '/oms/template')
    await expect(page.getByRole('button', { name: 'Generate & download', exact: true })).toBeEnabled()
    await expect(page.getByLabel('Artifact', { exact: true })).toHaveValue('')
    expect(writes).toBe(0)
    expect(contextHeaders.length).toBeGreaterThan(8)
    expect(contextHeaders.every(headers => headers.appId === id(credentials.app_id) && headers.currentSession)).toBe(true)
    expect((await backend.job(fixture.jobId))?.jobName).toBe(fixture.jobName)
    expect((await backend.workflow(fixture.workflowId)).wfName).toBe(fixture.workflowName)
    expect((await backend.containers()).find(row => id(row.id) === fixture.containerId)?.containerName).toBe(fixture.containerName)
    for (const variant of ['route-oms-job', 'route-oms-instance', 'route-oms-containermanage', 'route-oms-wfinstance', 'route-oms-template']) await observation(info, 'UI-040', variant, { nativeMenuExitAndReturn: true, currentAppAndSessionHeaders: contextHeaders, exactOwnedFixtureIDs: { jobId: fixture.jobId, instanceId: fixture.instanceId, workflowId: fixture.workflowId, workflowInstanceId: fixture.workflowInstanceId, containerId: fixture.containerId }, hardRefreshActualWorkflowQueryAndTemplateNativeForm: true, realJava8TemplateZIP_SHA256: templateSHA256, noWorkerExecutionOrSharedMetadataMutation: true, UIJobWorkflowContainerWriteCountAfterPreparation: writes, fullWorkerBusinessFunctionsRequireSeparatelyExecutedSameCandidateDomainProofs: true })
  } finally { try { await actions.cleanup() } finally { await admin.cleanup(info) } }
})
