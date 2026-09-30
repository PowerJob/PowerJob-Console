import { test, expect, selectors, runId, input, choose, enterSamples, saveDialog, clickAndResponse, fileHash } from './support.js'
import fs from 'node:fs/promises'

async function variant(info, page, caseId, variantId, steps, readback) {
  const image = info.outputPath(`${caseId}-${variantId}-redacted.png`)
  await page.screenshot({ path: image, fullPage: true, mask: [page.locator('input[type=password]'), page.locator('input[autocomplete=username]'), page.locator('input[autocomplete=new-password]'), page.locator('input[disabled]')] })
  await info.attach(`page-${caseId}-${variantId}`, { path: image, contentType: 'image/png' })
  await info.attach(`variant-${caseId}-${variantId}`, { body: Buffer.from(JSON.stringify({ caseId, variantId, steps, readback })), contentType: 'application/json' })
}
async function closeDialog(page) {
  const opened = selectors.dialog(page)
  await opened.getByRole('button', { name: 'Close this dialog' }).click()
  await expect(opened).not.toBeVisible()
}
async function externalJob(page, backend, name, containerId, processor, params) {
  await page.goto('/#/oms/job')
  await page.getByRole('button', { name: 'New job', exact: true }).click()
  const dialog = selectors.dialog(page)
  await input(dialog, 'Job name', name); await input(dialog, 'Job params', params)
  await choose(page, dialog, 'Schedule info', 'API')
  await choose(page, dialog, 'Execution config', 'Standalone', 0)
  await choose(page, dialog, 'Execution config', /EXTERNAL|External/, 1)
  await input(dialog, 'Execution config', `${containerId}#${processor}`)
  await saveDialog(page, '/job/save')
  const job = (await backend.listJobs(name)).data.find(value => value.jobName === name)
  await input(page.locator('main'), 'Job ID', job.id)
  await page.getByRole('button', { name: 'Query', exact: true }).click()
  const run = await clickAndResponse(page, '/job/run', () => selectors.row(page, String(job.id)).getByRole('button', { name: 'Run', exact: true }).click())
  expect(run.success).toBe(true)
  const instance = await backend.waitInstance(run.data, [5], 90_000)
  return { job, instance }
}
async function readLogDownload(page, instanceId, expectedText, info) {
  await page.goto('/#/oms/instance')
  await input(page.locator('main'), 'Instance ID', instanceId)
  await page.getByRole('button', { name: 'Query', exact: true }).click()
  const row = selectors.row(page, String(instanceId)); await expect(row).toBeVisible()
  await expect.poll(async () => {
    const dialog = selectors.dialog(page)
    if (await dialog.isVisible()) await closeDialog(page)
    await row.getByRole('button', { name: 'Log', exact: true }).click()
    return await page.locator('.log-output').textContent()
  }, { timeout: 60_000, intervals: [1000, 2000] }).toContain(expectedText)
  const waiting = page.waitForEvent('download')
  await selectors.dialog(page).getByRole('button', { name: 'Download', exact: true }).click()
  const download = await waiting
  const filename = info.outputPath('actual-processor.log'); await download.saveAs(filename)
  const text = await fs.readFile(filename, 'utf8'); expect(text).toContain(expectedText)
  return { sha256: await fileHash(filename), bytes: Buffer.byteLength(text), suggestedFilename: download.suggestedFilename() }
}

test('UI-028 · controlled authenticated Git clone, Maven assembly, two real Workers and external Processor', async ({ page, backend, credentials }, info) => {
  test.setTimeout(600_000)
  const manifestPath = process.env.POWERJOB_E2E_GIT_MANIFEST
  test.skip(!manifestPath, 'BLOCKED: controlled credential-free Git fixture manifest is required')
  const fixture = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
  expect(fixture.credentials).toBe('none')
  await enterSamples(page, credentials)
  const name = `${runId}_git_success`
  let containerId, jobId
  const sockets = []
  page.on('websocket', socket => sockets.push(socket.url()))
  try {
    await page.goto('/#/oms/containermanage')
    await page.getByRole('button', { name: 'New container', exact: true }).click()
    const dialog = selectors.dialog(page)
    for (const [label, value] of [['Name', name], ['Git URL', fixture.repository], ['Branch', fixture.branch], ['Username', fixture.username], ['Password', fixture.password]]) await input(dialog, label, value)
    await saveDialog(page, '/container/save')
    const saved = (await backend.call('/container/list?appId=' + credentials.app_id)).find(item => item.containerName === name)
    containerId = saved.id
    const savedSource = JSON.parse(saved.sourceInfo)
    expect(savedSource).toMatchObject({ repo: fixture.repository, branch: fixture.branch, username: fixture.username, password: fixture.password })
    let card = page.locator('.container-card').filter({ hasText: name })
    await card.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(selectors.dialog(page).getByLabel('Git URL', { exact: true })).toHaveValue(fixture.repository)
    await input(selectors.dialog(page), 'Name', name + '_edited')
    await input(selectors.dialog(page), 'Git URL', fixture.alternateRepository)
    await input(selectors.dialog(page), 'Branch', fixture.alternateBranch)
    await saveDialog(page, '/container/save')
    await page.reload()
    card = page.locator('.container-card').filter({ hasText: name + '_edited' }); await expect(card).toBeVisible()
    await card.getByRole('button', { name: 'Edit', exact: true }).click()
    for (const [label, value] of [['Git URL', fixture.alternateRepository], ['Branch', fixture.alternateBranch], ['Username', fixture.username], ['Password', fixture.password]]) await expect(selectors.dialog(page).getByLabel(label, { exact: true })).toHaveValue(value)
    const edited = (await backend.call('/container/list?appId=' + credentials.app_id)).find(item => String(item.id) === String(containerId))
    expect(JSON.parse(edited.sourceInfo)).toMatchObject({ repo: fixture.alternateRepository, branch: fixture.alternateBranch, username: fixture.username, password: fixture.password })
    await input(selectors.dialog(page), 'Git URL', fixture.repository)
    await input(selectors.dialog(page), 'Branch', fixture.branch)
    await saveDialog(page, '/container/save')
    await variant(info, page, 'UI-028', 'git-fields-roundtrip', ['page Git repo/branch/synthetic credentials save; edit controlled second repository and branch; save/hard reload/reopen fields exact; independently verify sourceInfo; restore primary source through page'], { containerId, editedRepository: fixture.alternateRepository, editedBranch: fixture.alternateBranch, restoredRepository: fixture.repository, restoredBranch: fixture.branch, syntheticCredentialsPreserved: true })
    await card.getByRole('button', { name: 'Deploy', exact: true }).click()
    await expect(page.locator('.deployment-log')).toContainText('git clone successfully', { timeout: 90_000 })
    await expect(page.locator('.deployment-log')).toContainText('BUILD SUCCESS', { timeout: 420_000 })
    await expect(page.locator('.deployment-log')).toContainText('deploy finished, congratulations!', { timeout: 90_000 })
    const liveLog = await page.locator('.deployment-log').textContent()
    expect(liveLog).toContain(fixture.commit)
    await info.attach('controlled-git-build', { body: Buffer.from(liveLog.replaceAll(fixture.password, '[synthetic password redacted]')), contentType: 'text/plain' })
    await closeDialog(page)
    await expect.poll(async () => {
      const opened = selectors.dialog(page)
      if (await opened.isVisible()) await closeDialog(page)
      await card.getByRole('button', { name: 'More', exact: true }).click()
      await page.getByRole('menuitem', { name: 'Worker list', exact: true }).click()
      await expect(page.locator('.deployment-log')).not.toContainText('Waiting dispatch')
      return (await page.locator('.deployment-log').textContent()).match(/Address:/g)?.length || 0
    }, { timeout: 60_000, intervals: [2000, 3000] }).toBeGreaterThanOrEqual(2)
    const workerList = await backend.call('/container/listDeployedWorker?containerId=' + containerId + '&appId=' + credentials.app_id)
    expect((workerList.match(/Address:/g) || []).length).toBeGreaterThanOrEqual(2)
    await closeDialog(page)
    const { job, instance } = await externalJob(page, backend, `${runId}_git_processor`, containerId, fixture.processor, 'controlled-git-fixture')
    jobId = job.id; expect(String(instance.result)).toContain('controlled-git-fixture-result')
    const log = await readLogDownload(page, instance.instanceId, 'controlled-git-fixture-log', info)
    await variant(info, page, 'UI-028', 'git-success', ['real UI authenticated controlled Git clone/commit; Maven BUILD SUCCESS; assembly deployed two actual Workers; page EXTERNAL Job runs Success; actual log and Blob readback'], { containerId, jobId, instanceId: instance.instanceId, sourceCommit: fixture.commit, deployedWorkers: (workerList.match(/Address:/g) || []).length, result: instance.result, log, sockets })
    await variant(info, page, 'UI-028', 'ws-legacy-onopen', ['new Console authenticated WebSocket deploy against released Server 5.1.6; original onopen contract completes build/deploy'], { containerId, serverVersion: '5.1.6', deployedWorkers: 2 })
  } finally {
    if (jobId) await backend.deleteOwnedJob(jobId)
    if (containerId) await backend.call('/container/delete?containerId=' + containerId + '&appId=' + credentials.app_id)
  }
})


test('UI-027 · actual released Server /powerjob servlet context, JAR HTTP/WS and processor logs', async ({ page, backend, credentials }, info) => {
  test.setTimeout(240_000)
  const expectedContext = process.env.POWERJOB_E2E_CONTEXT_PATH
  const jar = process.env.POWERJOB_E2E_CONTAINER_JAR
  test.skip(!expectedContext || !jar, 'BLOCKED: dedicated context-path Server and trusted JAR are required')
  expect(expectedContext).toBe('/powerjob')
  expect(new URL(backend.server).pathname).toBe(expectedContext)
  expect((await page.request.get(backend.server + '/actuator/health')).status()).toBe(200)
  const directRoot = new URL(backend.server); directRoot.pathname = '/actuator/health'
  expect((await page.request.get(directRoot.href)).status()).toBe(404)
  const requests = [], sockets = []
  page.on('request', request => { const pathname = new URL(request.url()).pathname; if (pathname.startsWith(expectedContext + '/')) requests.push({ method: request.method(), path: pathname }) })
  page.on('websocket', socket => sockets.push(new URL(socket.url()).pathname))
  await enterSamples(page, credentials)
  let containerId, externalId, builtinId
  const name = `${runId}_context_jar`
  let deployed, failure
  try {
    await page.goto('/#/oms/containermanage')
    await page.getByRole('button', { name: 'New container', exact: true }).click()
    await input(selectors.dialog(page), 'Name', name)
    await selectors.dialog(page).locator('.el-radio').filter({ hasText: 'FatJar' }).click()
    const upload = await clickAndResponse(page, '/container/jarUpload', () => selectors.dialog(page).locator('input[type="file"]').setInputFiles(jar))
    expect(upload.success).toBe(true); expect(upload.data).toMatch(/^[a-f0-9]{32}$/)
    await saveDialog(page, '/container/save')
    const container = (await backend.call('/container/list?appId=' + credentials.app_id)).find(item => item.containerName === name)
    containerId = container.id; expect(container.sourceInfo).toBe(upload.data)
    const card = page.locator('.container-card').filter({ hasText: name })
    await card.getByRole('button', { name: 'Deploy', exact: true }).click()
    await expect(page.locator('.deployment-log')).toContainText('deploy finished, congratulations!', { timeout: 90_000 })
    const deployLog = await page.locator('.deployment-log').textContent()
    await info.attach('context-deployment-dispatch', { body: Buffer.from(deployLog), contentType: 'text/plain' })
    expect(sockets).toContain(expectedContext + '/container/deploy/' + containerId)
    expect(requests).toContainEqual({ method: 'POST', path: expectedContext + '/container/jarUpload' })
    await closeDialog(page)
    try {
      await expect.poll(async () => {
        const opened = selectors.dialog(page)
        if (await opened.isVisible()) await closeDialog(page)
        await card.getByRole('button', { name: 'More', exact: true }).click()
        await page.getByRole('menuitem', { name: 'Worker list', exact: true }).click()
        await expect(page.locator('.deployment-log')).not.toContainText('Waiting dispatch')
        deployed = await page.locator('.deployment-log').textContent()
        return (deployed.match(/Address:/g) || []).length
      }, { timeout: 60_000, intervals: [2000, 3000] }).toBeGreaterThanOrEqual(2)
      await closeDialog(page)
      const external = await externalJob(page, backend, `${runId}_context_external`, containerId, 'tech.powerjob.acceptance.fixture.SqlLogProcessor', JSON.stringify({ sql: 'SELECT 1 AS id WHERE 1=0', showResult: true }))
      externalId = external.job.id
    } catch (error) { failure = error; await info.attach('context-original-server-deployment-observation', { body: Buffer.from(JSON.stringify({ deployed, expectedWorkers: 2, fullExternalChain: 'FAIL', noRuntimeDownloadURLRewriting: true })), contentType: 'application/json' }) }
    const opened = selectors.dialog(page)
    if (await opened.isVisible()) await closeDialog(page)
    await page.goto('/#/oms/job')
    await page.getByRole('button', { name: 'New job', exact: true }).click()
    await input(selectors.dialog(page), 'Job name', `${runId}_context_builtin`)
    await input(selectors.dialog(page), 'Job params', 'context-log-synthetic')
    await choose(page, selectors.dialog(page), 'Schedule info', 'API')
    await choose(page, selectors.dialog(page), 'Execution config', 'Standalone', 0)
    await input(selectors.dialog(page), 'Execution config', 'tech.powerjob.samples.processors.StandaloneProcessorDemo')
    await saveDialog(page, '/job/save')
    const builtin = (await backend.listJobs(`${runId}_context_builtin`)).data[0]; builtinId = builtin.id
    await input(page.locator('main'), 'Job ID', builtin.id)
    await page.getByRole('button', { name: 'Query', exact: true }).click()
    const run = await clickAndResponse(page, '/job/run', () => selectors.row(page, String(builtin.id)).getByRole('button', { name: 'Run', exact: true }).click())
    expect(run.success).toBe(true)
    const instance = await backend.waitInstance(run.data, [5], 90_000)
    const log = await readLogDownload(page, instance.instanceId, 'StandaloneProcessorDemo finished process', info)
    expect(requests.some(request => request.path === expectedContext + '/instance/downloadLog4Console')).toBe(true)
    await info.attach('actual-context-frontend-readback', { body: Buffer.from(JSON.stringify({ backendContext: expectedContext, rootHealthStatus: 404, containerId, jarSha256: await fileHash(jar), sourceInfo: upload.data, requests, sockets, builtinId, instanceId: instance.instanceId, log, externalChainStatus: failure ? 'FAIL_SERVER_ORIGINAL' : 'PASS', actualScope: 'Browser HTTP/WS/upload and built-in Worker log chain; no backend or Worker patch' })), contentType: 'application/json' })
    if (failure) throw new Error('The released Server did not deploy the JAR to both Workers under its real servlet context; retain backend observation and frontend partial evidence')
    await variant(info, page, 'UI-027', 'nonempty-context-path', ['actual Server servlet context /powerjob; page JAR upload/WS deploy; two Worker deployment readback; EXTERNAL processor Success; real online/Blob logs'], { containerId, externalId, instanceId: instance.instanceId, log, requests, sockets })
  } finally {
    if (externalId) await backend.deleteOwnedJob(externalId)
    if (builtinId) await backend.deleteOwnedJob(builtinId)
    if (containerId) await backend.call('/container/delete?containerId=' + containerId + '&appId=' + credentials.app_id)
  }
})


for (const variantId of ['git-invalid-ref', 'git-build-failure']) {
  test(`UI-028 · controlled ${variantId} shows actual failure and corrected Git source recovers`, async ({ page, backend, credentials }, info) => {
    test.setTimeout(300_000)
    const manifestPath = process.env.POWERJOB_E2E_GIT_MANIFEST
    test.skip(!manifestPath, 'BLOCKED: controlled Git source fixture is required')
    const fixture = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
    test.skip(variantId === 'git-build-failure' && !fixture.brokenBranch, 'BLOCKED: controlled compiler-failure branch is required')
    await enterSamples(page, credentials)
    const name = `${runId}_${variantId}`
    let containerId
    try {
      await page.goto('/#/oms/containermanage')
      await page.getByRole('button', { name: 'New container', exact: true }).click()
      for (const [label, value] of [['Name', name], ['Git URL', fixture.repository], ['Branch', variantId === 'git-invalid-ref' ? 'controlled-missing-ref' : fixture.brokenBranch], ['Username', fixture.username], ['Password', fixture.password]]) await input(selectors.dialog(page), label, value)
      await saveDialog(page, '/container/save')
      containerId = (await backend.call('/container/list?appId=' + credentials.app_id)).find(item => item.containerName === name).id
      const card = page.locator('.container-card').filter({ hasText: name })
      await card.getByRole('button', { name: 'Deploy', exact: true }).click()
      await expect(page.locator('.deployment-log')).toContainText(/deploy failed|prepare jar file failed/, { timeout: 90_000 })
      const failureLog = await page.locator('.deployment-log').textContent()
      await expect(selectors.dialog(page).locator('.el-alert[data-status=error]')).toBeVisible()
      await expect(selectors.dialog(page).locator('.el-alert[data-status=success]')).toHaveCount(0)
      if (variantId === 'git-build-failure') { expect(failureLog).toContain('BUILD FAILURE'); expect(failureLog).toContain('THIS_IS_A_CONTROLLED_COMPILER_ERROR') }
      else expect(failureLog).toMatch(/controlled-missing-ref|cannot.*branch|branch.*not/i)
      await info.attach('actual-controlled-git-failure', { body: Buffer.from(failureLog.replaceAll(fixture.password, '[synthetic password redacted]')), contentType: 'text/plain' })
      await closeDialog(page)
      await card.getByRole('button', { name: 'Edit', exact: true }).click()
      await input(selectors.dialog(page), 'Branch', fixture.branch)
      await saveDialog(page, '/container/save')
      await card.getByRole('button', { name: 'Deploy', exact: true }).click()
      await expect(page.locator('.deployment-log')).toContainText('BUILD SUCCESS', { timeout: 150_000 })
      await expect(page.locator('.deployment-log')).toContainText('deploy finished, congratulations!', { timeout: 90_000 })
      await closeDialog(page)
      let workerLog
      await expect.poll(async () => {
        if (await selectors.dialog(page).isVisible()) await closeDialog(page)
        await card.getByRole('button', { name: 'More', exact: true }).click()
        await page.getByRole('menuitem', { name: 'Worker list', exact: true }).click()
        await expect(page.locator('.deployment-log')).not.toContainText('Waiting dispatch')
        workerLog = await page.locator('.deployment-log').textContent()
        return (workerLog.match(/Address:/g) || []).length
      }, { timeout: 60_000, intervals: [2000, 3000] }).toBeGreaterThanOrEqual(2)
      const saved = (await backend.call('/container/list?appId=' + credentials.app_id)).find(item => String(item.id) === String(containerId))
      expect(JSON.parse(saved.sourceInfo).branch).toBe(fixture.branch)
      expect(saved.version).toBe(fixture.commit)
      await variant(info, page, 'UI-028', variantId, ['actual controlled Git clone/ref or Java compiler fails visibly without deployment success; edit page branch to main; real Maven build recovers and two actual Workers deploy'], { containerId, fixedSourceCommit: fixture.commit, failureKind: variantId, fixedBranch: fixture.branch, deployedWorkers: (workerLog.match(/Address:/g) || []).length, version: saved.version })
    } finally { if (containerId) await backend.call('/container/delete?containerId=' + containerId + '&appId=' + credentials.app_id) }
  })
}
