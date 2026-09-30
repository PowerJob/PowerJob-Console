import { test, expect, selectors, runId, input, choose, formItem, enterSamples, saveDialog, clickAndResponse, confirmDialog, fileHash } from './support.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'

async function proof(info, caseId, variantId, actual) {
  const result = { caseId, variantId, status: 'PASS', testTitle: info.title, actual }
  await fs.writeFile(info.outputPath(`variant-${caseId}-${variantId}.json`), JSON.stringify(result, null, 2))
  await info.attach(`${caseId}/${variantId}`, { body: JSON.stringify(result), contentType: 'application/json' })
}

test('UI-026 · real template ZIP downloads retain all fields and Java choices', async ({ page, backend, credentials }, testInfo) => {
  await enterSamples(page, credentials)
  await page.goto('/#/oms/template')
  await page.getByRole('button', { name: 'Generate template', exact: true }).click()
  await expect(page.locator('.el-message').last()).toContainText(/required/i)
  await input(page.locator('main'), 'Group', 'com.example.fixture')
  await input(page.locator('main'), 'Artifact', 'vue3-template')
  await input(page.locator('main'), 'Name', 'Vue3 Synthetic Template')
  await input(page.locator('main'), 'Package name', 'com.example.fixture.processors')
  for (const version of ['8', '11']) {
    await page.locator('.el-radio').filter({ hasText: `Java ${version}` }).click()
    const waiting = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Generate template', exact: true }).click()
    const download = await waiting
    const filename = testInfo.outputPath(`template-java-${version}.zip`)
    await download.saveAs(filename)
    const bytes = await fs.readFile(filename)
    expect(bytes.subarray(0, 2).toString()).toBe('PK')
    const listing = execFileSync('unzip', ['-Z1', filename], { encoding: 'utf8' })
    const pomPath = listing.split('\n').find(name => name.endsWith('pom.xml'))
    expect(pomPath).toBeTruthy()
    const pom = execFileSync('unzip', ['-p', filename, pomPath], { encoding: 'utf8' })
    expect(pom).toContain('<groupId>com.example.fixture</groupId>')
    expect(pom).toContain('<artifactId>vue3-template</artifactId>')
    expect(pom).toContain('Vue3 Synthetic Template')
    expect(pom).toMatch(new RegExp(`<maven.compiler.source>(1\\.)?${version}<`))
    expect(pom).toMatch(new RegExp(`<maven.compiler.target>(1\\.)?${version}<`))
    expect(listing).toContain('com/example/fixture/processors')
    await testInfo.attach(`java-${version}-template`, { body: JSON.stringify({ sha256: await fileHash(filename), bytes: bytes.length, sourceVerified: true, compileStatus: 'NOT_RUN_IN_THIS_TEST' }), contentType: 'application/json' })
  }
  expect((await backend.call('/system/listWorker?appId=' + credentials.app_id)).length).toBeGreaterThanOrEqual(2)
})

test('UI-026 · downloaded template independently compiles with configured Java/Maven', async ({ page, backend, credentials }, testInfo) => {
  test.setTimeout(900_000)
  test.skip(!process.env.POWERJOB_E2E_MAVEN || !process.env.POWERJOB_E2E_JAVA_HOME, 'BLOCKED: independent template compilation needs configured Maven and Java runtime')
  await enterSamples(page, credentials)
  await page.goto('/#/oms/template')
  const unicodePackage = 'com.example.处理器_$'
  for (const [label, value] of [['Group', 'com.example.fixture'], ['Artifact', 'vue3-compile'], ['Name', 'Vue3 Compile Fixture'], ['Package name', unicodePackage]]) await input(page.locator('main'), label, value)
  const settings = testInfo.outputPath('anonymous-settings.xml')
  await fs.writeFile(settings, '<settings xmlns="http://maven.apache.org/SETTINGS/1.2.0"><mirrors><mirror><id>central-e2e</id><mirrorOf>*</mirrorOf><url>https://repo.maven.apache.org/maven2/</url></mirror></mirrors></settings>\n')
  for (const version of ['8', '11']) {
    await page.locator('.el-radio').filter({ hasText: `Java ${version}` }).click()
    const waiting = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Generate template', exact: true }).click()
    const zip = testInfo.outputPath(`compile-java-${version}.zip`)
    await (await waiting).saveAs(zip)
    const directory = testInfo.outputPath(`compile-java-${version}`)
    await fs.mkdir(directory, { recursive: true })
    execFileSync('unzip', ['-q', zip, '-d', directory])
    const listing = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).split('\n')
    const project = path.join(directory, path.dirname(listing.find(name => name.endsWith('pom.xml'))))
    const pom = await fs.readFile(path.join(project, 'pom.xml'), 'utf8')
    expect(pom).toContain('<groupId>com.example.fixture</groupId>')
    expect(pom).toContain('<artifactId>vue3-compile</artifactId>')
    expect(pom).toContain('Vue3 Compile Fixture')
    expect(pom).toMatch(new RegExp(`<maven.compiler.source>(1\\.)?${version}<`))
    expect(pom).toMatch(new RegExp(`<maven.compiler.target>(1\\.)?${version}<`))
    const sourceDirectory = path.join(project, 'src/main/java', unicodePackage.replaceAll('.', '/'))
    await fs.access(sourceDirectory)
    await fs.writeFile(path.join(sourceDirectory, 'UnicodeFixture.java'), `package ${unicodePackage};\nimport tech.powerjob.worker.core.processor.ProcessResult;\nimport tech.powerjob.worker.core.processor.TaskContext;\nimport tech.powerjob.worker.core.processor.sdk.BasicProcessor;\npublic final class UnicodeFixture implements BasicProcessor { public ProcessResult process(TaskContext context) { return new ProcessResult(true, "unicode-package"); } }\n`)
    const javaHome = version === '11' ? process.env.POWERJOB_E2E_JAVA_11_HOME || process.env.POWERJOB_E2E_JAVA_HOME : process.env.POWERJOB_E2E_JAVA_HOME
    let output
    try {
      output = execFileSync(process.env.POWERJOB_E2E_MAVEN, ['-gs', settings, '-s', settings, '-B', '-ntp', '-DskipTests', 'package'], { cwd: project, timeout: 600_000, encoding: 'utf8', env: { ...process.env, JAVA_HOME: javaHome, PATH: `${javaHome}/bin:${process.env.PATH}` } })
    } catch (error) { await fs.writeFile(testInfo.outputPath(`maven-java-${version}.log`), String(error.stdout || '') + String(error.stderr || '')); throw new Error(`The page-generated Java ${version} template did not independently compile; retain the extracted fixture and resolve the compiler/build failure`) }
    await fs.writeFile(testInfo.outputPath(`maven-java-${version}.log`), output)
    expect(output).toContain('BUILD SUCCESS')
  }
  await proof(testInfo, 'UI-026', 'template-all-fields', { actualUIFieldsGroupArtifactNameUnicodePackage: true, realZIPs: true, independentlyCompiledJava8And11: true, addedActualUnicodePackageProcessorSource: true })
  await proof(testInfo, 'UI-026', 'template-java-versions', { UIJava8And11Selected: true, bothPOMSourceTargetVerified: true, bothActualJavaRuntimeBuildSuccess: true, originalServerWorkerDependency: '4.0.0' })
  expect(backend.appId).toBe(credentials.app_id)
})

test('UI-026 · invalid Java package names reject without request or false ZIP and corrected input downloads', async ({ page, backend, credentials }, info) => {
  await enterSamples(page, credentials)
  await page.goto('/#/oms/template')
  for (const [label, value] of [['Group', 'com.example.fixture'], ['Artifact', 'vue3-validation'], ['Name', 'Validation Fixture']]) await input(page.locator('main'), label, value)
  let requests = 0, downloads = 0
  page.on('request', request => { if (request.url().split('?')[0].endsWith('/container/downloadContainerTemplate')) requests++ })
  page.on('download', () => downloads++)
  await page.locator('.el-radio').filter({ hasText: 'Java 11' }).click()
  const invalid = ['wrong package', '9start.name', 'a..b', 'class.example', 'a._.b']
  for (const packageName of invalid) {
    await input(page.locator('main'), 'Package name', packageName)
    await page.getByRole('button', { name: 'Generate template', exact: true }).click()
    await expect(page.locator('.el-message--warning').last()).toContainText(/package|Java/i)
    await expect(formItem(page.locator('main'), 'Package name').locator('input')).toHaveValue(packageName)
    expect(requests).toBe(0)
    expect(downloads).toBe(0)
  }
  await input(page.locator('main'), 'Package name', 'com.example.处理器_$')
  const waiting = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Generate template', exact: true }).click()
  const file = info.outputPath('corrected-package.zip')
  await (await waiting).saveAs(file)
  expect((await fs.readFile(file)).subarray(0, 2).toString()).toBe('PK')
  expect(requests).toBe(1)
  expect(downloads).toBe(1)
  await proof(info, 'UI-026', 'template-invalid-identifiers', { actualRejectedPackageNames: invalid, selectedJavaVersion: '11', localZeroRequestsAndDownloads: true, draftRetained: true, correctedUnicodePackageRealZIP: true, zipSHA256: await fileHash(file) })
  expect(backend.appId).toBe(credentials.app_id)
})

test('UI-027 · real JAR upload, two-Worker WS deploy, external Processor and deletion', async ({ page, backend, credentials, request }, testInfo) => {
  test.setTimeout(240_000)
  const jar = process.env.POWERJOB_E2E_CONTAINER_JAR
  test.skip(!jar, 'BLOCKED: real JAR/container tests require a trusted synthetic Processor fixture')
  await fs.access(jar)
  await enterSamples(page, credentials)
  let containerId, jobId
  const name = `${runId}_jar`
  try {
    await page.goto('/#/oms/containermanage')
    await page.getByRole('button', { name: 'New container', exact: true }).click()
    await input(selectors.dialog(page), 'Name', name)
    await selectors.dialog(page).locator('.el-radio').filter({ hasText: 'FatJar' }).click()
    const upload = await clickAndResponse(page, '/container/jarUpload', () => selectors.dialog(page).locator('input[type="file"]').setInputFiles(jar))
    expect(upload.success).toBe(true)
    expect(upload.data).toMatch(/^[a-f0-9]{32}$/)
    expect(upload.data).toBe(crypto.createHash('md5').update(await fs.readFile(jar)).digest('hex'))
    await saveDialog(page, '/container/save')
    const containers = await backend.call('/container/list?appId=' + credentials.app_id)
    const container = containers.find(item => item.containerName === name)
    expect(container.sourceInfo).toBe(upload.data)
    containerId = container.id
    const uploadedFile = await request.get(credentials.server_urls[0] + '/container/downloadJar?version=' + upload.data)
    expect(uploadedFile.ok()).toBe(true)
    expect(crypto.createHash('sha256').update(await uploadedFile.body()).digest('hex')).toBe(await fileHash(jar))
    await proof(testInfo, 'UI-027', 'jar-upload-create', { UIUploadAndSave: true, actualMD5Version: true, independentStoredDownloadSHA256: await fileHash(jar), currentAppOwnership: true })
    const card = page.locator('.container-card').filter({ hasText: name })
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(formItem(selectors.dialog(page), 'Name').locator('input')).toHaveValue(name)
    await input(selectors.dialog(page), 'Name', `${name}_edited`)
    await saveDialog(page, '/container/save')
    await page.reload()
    await card.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(formItem(selectors.dialog(page), 'Name').locator('input')).toHaveValue(`${name}_edited`)
    expect((await backend.call('/container/list?appId=' + credentials.app_id)).find(item => String(item.id) === String(containerId)).sourceInfo).toBe(upload.data)
    await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(selectors.dialog(page)).not.toBeVisible()
    await proof(testInfo, 'UI-027', 'jar-edit-reopen', { renamedByPage: true, hardReloadAndReopen: true, originalStoredSourceInfoPreserved: true })
    await card.getByRole('button', { name: 'Deploy', exact: true }).click()
    await expect(page.locator('.deployment-log')).toContainText('deploy finished, congratulations!', { timeout: 90_000 })
    await selectors.dialog(page).getByRole('button', { name: 'Close this dialog' }).click()
    await expect(selectors.dialog(page)).not.toBeVisible()
    await expect.poll(async () => {
      await card.getByRole('button', { name: 'More', exact: true }).click()
      await page.getByRole('menuitem', { name: 'Worker list', exact: true }).click()
      await expect(page.locator('.deployment-log')).toContainText('DeployedInfo')
      const text = await page.locator('.deployment-log').textContent()
      if ((text.match(/Address:/g) || []).length >= 2) return true
      await selectors.dialog(page).getByRole('button', { name: 'Close this dialog' }).click()
      await expect(selectors.dialog(page)).not.toBeVisible()
      return false
    }, { timeout: 90_000, intervals: [2000, 3000] }).toBe(true)
    const deployed = await backend.call('/container/listDeployedWorker?containerId=' + containerId + '&appId=' + credentials.app_id)
    expect((deployed.match(/Address:/g) || []).length).toBeGreaterThanOrEqual(2)
    expect(deployed).toContain(upload.data)
    await testInfo.attach('jar-digest', { body: JSON.stringify({ sha256: await fileHash(jar), deployedWorkers: (deployed.match(/Address:/g) || []).length }), contentType: 'application/json' })
    await selectors.dialog(page).getByRole('button', { name: 'Close this dialog' }).click()
    await expect(selectors.dialog(page)).not.toBeVisible()
    await proof(testInfo, 'UI-027', 'jar-deploy-two-workers', { actualWebSocketCompletion: true, twoRealWorkerVersionsMatchStoredHash: true, deployedVersion: upload.data })

    await page.goto('/#/oms/job')
    await page.getByRole('button', { name: 'New job', exact: true }).click()
    const dialog = selectors.dialog(page)
    await input(dialog, 'Job name', `${runId}_external`)
    await input(dialog, 'Job params', JSON.stringify({ sql: 'SELECT 1 AS id WHERE 1=0', showResult: true }))
    await choose(page, dialog, 'Schedule info', 'API')
    await choose(page, dialog, 'Execution config', 'Standalone', 0)
    await choose(page, dialog, 'Execution config', /EXTERNAL|External|外置/, 1)
    await input(dialog, 'Execution config', `${containerId}#tech.powerjob.acceptance.fixture.SqlLogProcessor`)
    await saveDialog(page, '/job/save')
    const created = (await backend.listJobs(`${runId}_external`)).data[0]
    jobId = created.id
    expect(created.processorType).toBe('EXTERNAL')
    await input(page.locator('main'), 'Job ID', jobId)
    await page.getByRole('button', { name: 'Query', exact: true }).click()
    const run = await clickAndResponse(page, '/job/run', () => selectors.row(page, String(jobId)).getByRole('button', { name: 'Run', exact: true }).click())
    expect(run.success).toBe(true)
    await backend.waitInstance(run.data, [5])
    await proof(testInfo, 'UI-027', 'jar-processor-run', { actualDeployedSqlLogProcessor: true, independentSuccessInstance: String(run.data), isolatedValidatedEmptyResultSQL: true })
    await proof(testInfo, 'UI-027', 'root-context-path', { releasedServerRootContext: true, actualUploadDeployRun: true, actualDualWorkerVersion: true })
    await page.goto('/#/oms/containermanage')
    let deletes = 0
    page.on('request', request => { if (request.url().split('?')[0].endsWith('/container/delete')) deletes++ })
    await page.locator('.container-card').filter({ hasText: name }).getByRole('button', { name: 'More', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click()
    await confirmDialog(page, false)
    expect(deletes).toBe(0)
    await expect(page.locator('.container-card').filter({ hasText: name })).toBeVisible()
    await proof(testInfo, 'UI-027', 'jar-delete-cancel', { ownContainerStillVisibleAndStored: true, zeroDeleteRequests: true })
    await page.locator('.container-card').filter({ hasText: name }).getByRole('button', { name: 'More', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click()
    await confirmDialog(page)
    expect(deletes).toBe(1)
    await expect(page.locator('.container-card').filter({ hasText: name })).not.toBeVisible()
    await page.reload()
    await expect(page.locator('.container-card').filter({ hasText: name })).not.toBeVisible()
    expect((await backend.call('/container/list?appId=' + credentials.app_id)).some(item => String(item.id) === String(containerId))).toBe(false)
    await proof(testInfo, 'UI-027', 'jar-delete-confirm', { actualDeleteAndHardReload: true, independentListAbsence: true })
    containerId = null
  } finally {
    if (jobId) await backend.deleteOwnedJob(jobId)
    if (containerId) await backend.call('/container/delete?containerId=' + containerId + '&appId=' + credentials.app_id)
  }
})

test('UI-027 · real rejected empty JAR upload cannot save a false source', async ({ page, backend, credentials }, info) => {
  await enterSamples(page, credentials)
  await page.goto('/#/oms/containermanage')
  await page.getByRole('button', { name: 'New container', exact: true }).click()
  await input(selectors.dialog(page), 'Name', `${runId}_empty_jar`)
  await selectors.dialog(page).locator('.el-radio').filter({ hasText: 'FatJar' }).click()
  const file = info.outputPath('empty.jar'); await fs.writeFile(file, '')
  const uploaded = await clickAndResponse(page, '/container/jarUpload', () => selectors.dialog(page).locator('input[type="file"]').setInputFiles(file))
  expect(uploaded.success).toBe(false)
  await expect(page.locator('.el-message').last()).toBeVisible()
  await expect(selectors.dialog(page).getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
  expect((await backend.call('/container/list?appId=' + credentials.app_id)).some(item => item.containerName === `${runId}_empty_jar`)).toBe(false)
  await proof(info, 'UI-027', 'upload-invalid-jar', { realEmptyJarBusinessRejection: true, visibleFeedback: true, falseSourceCannotSave: true, independentNoContainer: true })
})

test('UI-028 · controlled Git failure and WS close/reopen use the actual page', async ({ page, backend, credentials }) => {
  test.setTimeout(180_000)
  await enterSamples(page, credentials)
  const name = `${runId}_git_invalid`
  let id
  try {
    await page.goto('/#/oms/containermanage')
    await page.getByRole('button', { name: 'New container', exact: true }).click()
    await input(selectors.dialog(page), 'Name', name)
    await input(selectors.dialog(page), 'Git URL', 'https://example.invalid/synthetic-missing.git')
    await input(selectors.dialog(page), 'Branch', 'synthetic-missing-ref')
    await saveDialog(page, '/container/save')
    id = (await backend.call('/container/list?appId=' + credentials.app_id)).find(item => item.containerName === name).id
    let card = page.locator('.container-card').filter({ hasText: name })
    await card.getByRole('button', { name: 'Deploy', exact: true }).click()
    await expect(page.locator('.deployment-log')).toContainText(/prepare jar file failed|deploy failed|error/i, { timeout: 90_000 })
    await selectors.dialog(page).getByRole('button', { name: 'Close this dialog' }).click()
    await card.getByRole('button', { name: 'Deploy', exact: true }).click()
    await selectors.dialog(page).getByRole('button', { name: 'Close this dialog' }).click()
    await page.goto('/#/oms/home')
    await page.goto('/#/oms/containermanage')
    card = page.locator('.container-card').filter({ hasText: name })
    await expect(card).toBeVisible()
  } finally { if (id) await backend.call('/container/delete?containerId=' + id + '&appId=' + credentials.app_id) }
})
