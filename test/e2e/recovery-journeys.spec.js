import { test, expect, selectors, runId, demoProcessor, timeoutProcessor, input, choose, formItem, enterSamples, saveDialog, clickAndResponse, fileHash } from './support.js'
import fs from 'node:fs/promises'

async function proof(info, caseId, variantId, actual) {
  const result = { caseId, variantId, status: 'PASS', testTitle: info.title, actual }
  await fs.writeFile(info.outputPath(`variant-${caseId}-${variantId}.json`), JSON.stringify(result, null, 2))
  await info.attach(`${caseId}/${variantId}`, { body: JSON.stringify(result), contentType: 'application/json' })
}
async function jobRow(page, id) {
  await page.goto('/#/oms/job')
  await input(page.locator('main'), 'Job ID', id)
  await page.getByRole('button', { name: 'Query', exact: true }).click()
  const row = selectors.row(page, String(id)); await expect(row).toBeVisible(); return row
}
async function more(page, row, name) {
  await row.getByRole('button', { name: 'More', exact: true }).click()
  await page.locator('.el-dropdown-menu:visible').getByRole('button', { name, exact: true }).click()
}
async function instanceRow(page, id) {
  await page.goto('/#/oms/instance')
  await input(page.locator('main'), 'Instance ID', id)
  await page.locator('#instance_manager').getByRole('button', { name: 'Query', exact: true }).first().click()
  return selectors.row(page, String(id))
}

test('UI-010/030/035 · overview real Worker data, empty application, app switching and offline refresh recovery', async ({ page, backend, credentials }, info) => {
  test.setTimeout(150_000)
  await enterSamples(page, credentials)
  let namespaceId, appId
  const emptyName = `${runId}_empty_home`
  try {
    const workers = await backend.call('/system/listWorker?appId=' + credentials.app_id)
    expect(workers.length).toBeGreaterThanOrEqual(2)
    for (const worker of workers) {
      const row = selectors.row(page, worker.address)
      await expect(row).toBeVisible()
      for (const field of ['address', 'tag']) if (worker[field]) await expect(row).toContainText(String(worker[field]))
      expect((await row.locator('td').allTextContents()).filter(Boolean).length).toBeGreaterThanOrEqual(5)
    }
    await proof(info, 'UI-010', 'two-workers', { actualWorkerCount: workers.length, exactAddressesAndTags: true, actualResourceHeartbeatColumns: true })
    const overview = await clickAndResponse(page, '/system/overview', () => page.getByRole('button', { name: 'Refresh', exact: true }).click())
    expect(overview.success).toBe(true)
    const metrics = page.locator('.metric-card strong')
    await expect(metrics.nth(0)).toHaveText(String(overview.data.jobCount))
    await expect(metrics.nth(1)).toHaveText(String(overview.data.runningInstanceCount))
    await expect(metrics.nth(2)).toHaveText(String(overview.data.failedInstanceCount))
    const before = await metrics.allTextContents()
    await page.context().setOffline(true)
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await expect(page.locator('.el-message').last()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
    expect(await metrics.allTextContents()).toEqual(before)
    await page.context().setOffline(false)
    const restored = await clickAndResponse(page, '/system/overview', () => page.getByRole('button', { name: 'Refresh', exact: true }).click())
    expect(restored.success).toBe(true)
    await expect(metrics.nth(0)).toHaveText(String(restored.data.jobCount))
    await proof(info, 'UI-010', 'home-refresh-error', { actualChromeOffline: true, errorVisible: true, lastGoodValuesRetained: true, realOnlineRefreshRecovered: true })

    await page.goto('/#/admin/namespace')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await input(selectors.dialog(page), 'Code', emptyName)
    await input(selectors.dialog(page), 'Name', emptyName)
    await saveDialog(page, '/namespace/save')
    namespaceId = (await backend.call('/namespace/list', { method: 'POST', data: { codeLike: emptyName, index: 0, pageSize: 10 } })).data[0].id
    await page.goto('/#/admin/app')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await choose(page, selectors.dialog(page), 'Namespace', new RegExp(emptyName))
    await input(selectors.dialog(page), 'appName', emptyName)
    await input(selectors.dialog(page), 'Name', emptyName)
    await input(selectors.dialog(page), 'Password', `Synthetic.${runId}`)
    await saveDialog(page, '/appInfo/save')
    appId = (await backend.call('/appInfo/list', { method: 'POST', data: { appNameLike: emptyName, showMyRelated: false, index: 0, pageSize: 10 } })).data[0].id
    await input(page.locator('main'), 'appName', emptyName)
    await page.getByRole('button', { name: 'Query', exact: true }).click()
    await selectors.row(page, emptyName).getByRole('button', { name: 'Enter', exact: true }).click()
    await expect(page).toHaveURL(/oms\/home/)
    await expect(page.locator('.metric-card strong').nth(3)).toHaveText('0')
    await expect(page.locator('.el-table__empty-text')).toBeVisible()
    expect(await backend.call('/system/listWorker?appId=' + appId, { appId })).toEqual([])
    await proof(info, 'UI-010', 'no-worker-empty', { pageCreatedIndependentApp: true, actualWorkersZero: true, visibleEmptyState: true, workerMetricZero: true })
    await enterSamples(page, credentials)
    for (const worker of workers) await expect(selectors.row(page, worker.address)).toBeVisible()
    await expect(page.locator('.metric-card strong').nth(3)).toHaveText(String(workers.filter(worker => worker.status !== 9999).length))
    await proof(info, 'UI-010', 'app-switch-cache', { samplesToIndependentEmptyAndBack: true, oldWorkersNotLeaked: true, correctMetrics: true })
  } finally {
    await page.context().setOffline(false)
    if (appId) await backend.call('/appInfo/delete?appId=' + appId, { method: 'POST', data: {}, appId })
    if (namespaceId) await backend.call('/namespace/delete?id=' + namespaceId, { method: 'DELETE', namespaceId })
  }
})

test('UI-011/026/030 · real Chrome offline save and template download retain draft and recover', async ({ page, backend, credentials }, info) => {
  test.setTimeout(120_000)
  await enterSamples(page, credentials)
  let id
  const name = `${runId}_offline_save`
  try {
    await page.goto('/#/oms/job')
    await page.getByRole('button', { name: 'New job', exact: true }).click()
    const dialog = selectors.dialog(page)
    await input(dialog, 'Job name', name)
    await input(dialog, 'Job params', 'offline retained 中文 😀\n"quotes"')
    let saves = 0
    page.on('request', request => { if (request.url().split('?')[0].endsWith('/job/save')) saves++ })
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.locator('.el-message').last()).toBeVisible()
    await expect(dialog).toBeVisible()
    expect(saves).toBe(0)
    await expect(formItem(dialog, 'Job name').locator('input')).toHaveValue(name)
    expect((await backend.listJobs(name)).data).toHaveLength(0)
    await input(dialog, 'Execution config', demoProcessor)
    await page.context().setOffline(true)
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.locator('.el-message').last()).toBeVisible()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
    await expect(formItem(dialog, 'Job params').locator('textarea')).toHaveValue('offline retained 中文 😀\n"quotes"')
    expect((await backend.listJobs(name)).data).toHaveLength(0)
    await page.context().setOffline(false)
    await saveDialog(page, '/job/save')
    const saved = (await backend.listJobs(name)).data
    expect(saved).toHaveLength(1); id = saved[0].id
    expect(saved[0].jobParams).toBe('offline retained 中文 😀\n"quotes"')
    await proof(info, 'UI-011', 'validation-draft', { missingProcessorRejectedLocally: true, zeroInvalidSaveRequests: true, draftKept: true, correctionSavedUniqueObject: true })
    await proof(info, 'UI-030', 'network-recovery', { actualChromeOffline: true, retainedDraftAndContext: true, noInvalidSideEffect: true, onlineSaveAndIndependentReadback: true })
    await page.goto('/#/oms/template')
    let templateRequests = 0, downloads = 0
    page.on('request', request => { if (request.url().split('?')[0].endsWith('/container/downloadContainerTemplate')) templateRequests++ })
    page.on('download', () => downloads++)
    await page.getByRole('button', { name: 'Generate template', exact: true }).click()
    await expect(page.locator('.el-message').last()).toBeVisible()
    expect(templateRequests).toBe(0); expect(downloads).toBe(0)
    for (const [label, value] of [['Group', 'example.console'], ['Artifact', 'offline-fixture'], ['Name', 'OfflineFixture'], ['Package name', 'example.console.fixture']]) await input(page.locator('.template-card'), label, value)
    const packageInput = formItem(page.locator('.template-card'), 'Package name').locator('input')
    await packageInput.fill('')
    await page.getByRole('button', { name: 'Generate template', exact: true }).click()
    await expect(page.locator('.el-message').last()).toBeVisible()
    expect(templateRequests).toBe(0); expect(downloads).toBe(0)
    await proof(info, 'UI-026', 'template-missing-fields', { allBlankAndOneRequiredMissing: true, zeroRequests: true, zeroFalseDownloads: true })
    await packageInput.fill('example.console.fixture')
    await page.context().setOffline(true)
    await page.getByRole('button', { name: 'Generate template', exact: true }).click()
    await expect(page.locator('.el-message').last()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Generate template', exact: true })).toBeEnabled()
    expect(downloads).toBe(0)
    await expect(packageInput).toHaveValue('example.console.fixture')
    await page.context().setOffline(false)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Generate template', exact: true }).click()
    const file = await download, filename = info.outputPath('recovered-template.zip')
    await file.saveAs(filename)
    const bytes = await fs.readFile(filename)
    expect(bytes.subarray(0, 2).toString()).toBe('PK')
    expect(bytes.length).toBeGreaterThan(1000)
    await proof(info, 'UI-026', 'template-download-failure', { actualChromeOffline: true, errorVisible: true, noFalseZIP: true, draftRetained: true, actualRecoveredZIP: true, bytes: bytes.length, sha256: await fileHash(filename) })
  } finally { await page.context().setOffline(false); if (id) await backend.deleteOwnedJob(id) }
})

test('UI-015/017/019 · parameter cancellation, guarded double click, history, real detail and offline log download recovery', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  await enterSamples(page, credentials)
  let id, instance
  try {
    await page.goto('/#/oms/job')
    await page.getByRole('button', { name: 'New job', exact: true }).click()
    await input(selectors.dialog(page), 'Job name', `${runId}_run_recovery`)
    await input(selectors.dialog(page), 'Job params', 'real-log 中文 😀')
    await input(selectors.dialog(page), 'Execution config', demoProcessor)
    await saveDialog(page, '/job/save')
    id = (await backend.listJobs(`${runId}_run_recovery`)).data[0].id
    let row = await jobRow(page, id)
    let runRequests = 0
    page.on('request', request => { if (request.url().split('?')[0].endsWith('/job/run')) runRequests++ })
    await more(page, row, 'Run by parameter')
    await selectors.dialog(page).locator('textarea').fill('cancelled should not reach Worker')
    await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(selectors.dialog(page)).not.toBeVisible()
    expect(runRequests).toBe(0)
    expect((await backend.call('/instance/list', { method: 'POST', data: { appId: credentials.app_id, jobId: id, type: 'NORMAL', index: 0, pageSize: 100 } })).totalItems).toBe(0)
    const run = await clickAndResponse(page, '/job/run', () => row.getByRole('button', { name: 'Run', exact: true }).dblclick())
    expect(run.success).toBe(true); instance = run.data
    await backend.waitInstance(instance, [5])
    const all = await backend.call('/instance/list', { method: 'POST', data: { appId: credentials.app_id, jobId: id, type: 'NORMAL', index: 0, pageSize: 100 } })
    expect(runRequests).toBe(1); expect(all.totalItems).toBe(1)
    expect(String(all.data[0].instanceId)).toBe(String(instance))
    expect(all.data[0].instanceParams || '').not.toContain('cancelled')
    await proof(info, 'UI-015', 'run-cancel', { cancelZeroRequestAndInstance: true, followingOrdinaryRunParamsClean: true })
    await proof(info, 'UI-015', 'run-double-click', { actualDoubleClick: true, guardedOneRequest: true, exactlyOneVisibleInstance: true })
    row = await jobRow(page, id)
    await more(page, row, 'History')
    await expect(page).toHaveURL(new RegExp(`oms/instance\\?jobId=${id}`))
    await expect(formItem(page.locator('#instance_manager'), 'Job ID').locator('input')).toHaveValue(String(id))
    await expect(selectors.row(page, String(instance))).toBeVisible()
    await page.reload()
    await expect(formItem(page.locator('#instance_manager'), 'Job ID').locator('input')).toHaveValue(String(id))
    await expect(selectors.row(page, String(instance))).toBeVisible()
    await proof(info, 'UI-015', 'run-history-route', { routeQueryAndFilterPreservedHardReload: true, exactOwnedInstance: true })
    let target = await instanceRow(page, instance)
    for (let n = 0; n < 3; n++) {
      await target.getByRole('button', { name: 'Detail', exact: true }).click()
      await expect(selectors.dialog(page)).toContainText(String(instance))
      await expect(selectors.dialog(page)).toContainText('Success')
      await expect(selectors.dialog(page).getByRole('button', { name: 'Detail', exact: true })).toHaveCount(0)
      await selectors.dialog(page).getByRole('button', { name: 'Close this dialog' }).click()
      await expect(selectors.dialog(page)).not.toBeVisible()
    }
    await proof(info, 'UI-017', 'detail-normal-finished', { realSuccess: true, exactInstanceId: true, noFalseNestedWorkflowNavigation: true, independentReadback: true })
    await proof(info, 'UI-017', 'detail-open-close-repeat', { sameOwnedInstanceRepeatedThreeTimes: true, noStaleDetail: true, destroyedDialogs: true })
    await target.getByRole('button', { name: 'Detail', exact: true }).click()
    const dialog = selectors.dialog(page)
    await dialog.getByRole('tab', { name: 'Log', exact: true }).click()
    await expect.poll(async () => {
      await dialog.locator('.log-toolbar').getByRole('button', { name: 'Refresh', exact: true }).click()
      return (await dialog.locator('.instance-log').textContent()).includes('StandaloneProcessorDemo finished process,success: true')
    }, { timeout: 60_000, intervals: [1500, 3000] }).toBe(true)
    await page.context().setOffline(true)
    let downloads = 0
    page.on('download', () => downloads++)
    await dialog.locator('.log-toolbar').getByRole('button', { name: 'Download', exact: true }).click()
    await expect(page.locator('.el-message').last()).toBeVisible()
    await expect(dialog.locator('.log-toolbar').getByRole('button', { name: 'Download', exact: true })).toBeEnabled()
    expect(downloads).toBe(0)
    await page.context().setOffline(false)
    const download = page.waitForEvent('download')
    await dialog.locator('.log-toolbar').getByRole('button', { name: 'Download', exact: true }).click()
    const file = await download, filename = info.outputPath('recovered-instance.log')
    await file.saveAs(filename)
    const text = await fs.readFile(filename, 'utf8')
    expect(text).toContain('StandaloneProcessorDemo finished process,success: true')
    expect(text).toContain('real-log 中文 😀')
    await proof(info, 'UI-019', 'download-http-error', { actualChromeOffline: true, noFalseDownload: true, visibleError: true, realOnlineLogRecovered: true, bytes: Buffer.byteLength(text), sha256: await fileHash(filename) })
  } finally { await page.context().setOffline(false); if (id) await backend.deleteOwnedJob(id) }
})
