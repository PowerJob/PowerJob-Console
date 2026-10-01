import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { test, expect, selectors, fill, secretFill, clickAndResponse, enterSamples, id, ownedName, observation, type Backend, type RecordDTO } from './helpers'
import { OwnedResources } from './owned'
import { bothWorkersAtVersion } from './container-ui'
import { createJob, editJob, saveJob } from './job-ui'
import type { Page } from '@playwright/test'

interface GitFixture {
  repository: string; branch: string; commit: string; processor: string; credentials: string
  username: string; password: string; brokenBranch: string; alternateRepository: string; alternateBranch: string
}
async function readFixture() {
  const filename = process.env.POWERJOB_E2E_GIT_MANIFEST
  if (!filename) throw new Error('BLOCKED: configure the controlled synthetic Git fixture manifest')
  const data = JSON.parse(await fs.readFile(filename, 'utf8')) as GitFixture
  for (const key of ['repository', 'branch', 'commit', 'processor', 'brokenBranch', 'alternateRepository', 'alternateBranch'] as const) if (typeof data[key] !== 'string' || !data[key]) throw new Error('The controlled Git fixture manifest is incomplete')
  if (data.credentials !== 'none' || !/^[0-9a-f]{40}$/.test(data.commit)) throw new Error('Git tests require the credential-free controlled fixture and a frozen commit')
  return data
}
async function createContainer(page: Page, backend: Backend, ledger: OwnedResources, name: string, fixture: GitFixture, branch = fixture.branch) {
  await page.goto('/#/oms/containermanage')
  await page.getByRole('button', { name: 'New container', exact: true }).click()
  const dialog = selectors.dialog(page, 'New container')
  await fill(dialog, 'Container name', name)
  await dialog.getByLabel('Container type', { exact: true }).selectOption('Git')
  await fill(dialog, 'Git repository URL', fixture.repository)
  await fill(dialog, 'Branch', branch)
  await secretFill(dialog.getByLabel('Username', { exact: true }), fixture.username || '')
  await secretFill(dialog.getByLabel('Password', { exact: true }), fixture.password || '')
  expect((await clickAndResponse(page, '/container/save', () => dialog.getByRole('button', { name: 'Save container', exact: true }).click())).success).toBe(true)
  await expect(dialog).not.toBeVisible()
  const matches = (await backend.containers()).filter(item => item.containerName === name)
  expect(matches).toHaveLength(1)
  return ledger.track('container', id(matches[0].id), name)
}
async function editBranch(page: Page, backend: Backend, name: string, containerId: string, fixture: GitFixture, repository: string, branch: string) {
  await selectors.row(page, name).getByRole('button', { name: 'Edit', exact: true }).click()
  const dialog = selectors.dialog(page, 'Edit container')
  await fill(dialog, 'Git repository URL', repository)
  await fill(dialog, 'Branch', branch)
  expect((await clickAndResponse(page, '/container/save', () => dialog.getByRole('button', { name: 'Save container', exact: true }).click())).success).toBe(true)
  await expect(dialog).not.toBeVisible()
  const actual = (await backend.containers()).find(item => id(item.id) === containerId)!
  const source = JSON.parse(String(actual.sourceInfo)) as RecordDTO
  expect(source.repo === repository && source.branch === branch && source.username === fixture.username && source.password === fixture.password).toBe(true)
  await page.reload()
  await selectors.row(page, name).getByRole('button', { name: 'Edit', exact: true }).click()
  const reopened = selectors.dialog(page, 'Edit container')
  await expect(reopened.getByLabel('Git repository URL', { exact: true })).toHaveValue(repository)
  await expect(reopened.getByLabel('Branch', { exact: true })).toHaveValue(branch)
  expect(await reopened.getByLabel('Username', { exact: true }).inputValue() === fixture.username).toBe(true)
  expect(await reopened.getByLabel('Password', { exact: true }).inputValue() === fixture.password).toBe(true)
  await reopened.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(reopened).not.toBeVisible()
}
async function deploy(page: Page, backend: Backend, name: string, expected: 'success' | 'error', version?: string) {
  const sentFrames: string[] = []
  page.on('websocket', socket => { if (socket.url().includes('/container/deploy/')) socket.on('framesent', event => sentFrames.push(String(event.payload))) })
  await selectors.row(page, name).getByRole('button', { name: 'Deploy', exact: true }).click()
  const dialog = selectors.dialog(page, `Deploy container · ${name}`)
  await expect(dialog.locator(`[data-status="${expected}"]`)).toBeVisible({ timeout: 180_000 })
  const log = await dialog.locator('pre').innerText()
  const currentToken = await page.evaluate(() => localStorage.getItem('PowerJwt'))
  expect(sentFrames.length).toBeGreaterThan(0)
  const firstFrame = JSON.parse(sentFrames[0]) as RecordDTO
  expect(Object.keys(firstFrame)).toEqual(['jwtToken'])
  expect(firstFrame.jwtToken === currentToken).toBe(true)
  if (expected === 'error') {
    await expect(dialog.locator('[data-status="success"]')).toHaveCount(0)
    await expect(dialog.locator('[data-status="error"]')).toContainText('Deployment or query failed')
    expect(/\[ERROR\]|BUILD FAILURE|deploy (?:lock )?failed/i.test(log)).toBe(true)
  } else {
    expect(log).toContain('git clone successfully')
    expect(log).toContain('BUILD SUCCESS')
    expect(log).toContain('deploy finished, congratulations!')
    await expect(dialog.locator('[data-status="success"]')).toContainText('Deployment was submitted')
  }
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  if (!version) return { originalLog: log, originalLegacyJWTFrame: true, workers: [] as RecordDTO[], deployed: '' }
  const workers = (await backend.call<RecordDTO[]>('/system/listWorker', { query: { appId: backend.appId } })).filter(worker => Number(worker.status) !== 9999)
  expect(workers.length).toBeGreaterThanOrEqual(2)
  let deployed = ''
  await expect.poll(async () => {
    await selectors.row(page, name).getByRole('button', { name: 'More', exact: true }).click()
    await selectors.dialog(page, name).getByRole('button', { name: 'Deployed Workers', exact: true }).click()
    const workerDialog = selectors.dialog(page, `Deployed Workers · ${name}`)
    await expect(workerDialog.locator('pre')).not.toHaveText('Waiting for logs…')
    deployed = await workerDialog.locator('pre').innerText()
    await workerDialog.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(workerDialog).not.toBeVisible()
    return bothWorkersAtVersion(deployed, version, workers)
  }, { timeout: 120_000, intervals: [1000, 2000], message: 'Git dispatch requires both real Worker addresses in the exact commit group' }).toBe(true)
  return { originalLog: log, originalLegacyJWTFrame: true, workers, deployed }
}

test.use({ actionTimeout: 15_000 })

test('UI-028 · native Git fields hard roundtrip, real clone/Maven/two Worker deployment and EXTERNAL logs', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  const fixture = await readFixture()
  const ledger = new OwnedResources(backend)
  const name = ownedName('git_primary')
  try {
    await enterSamples(page, credentials)
    const containerId = await createContainer(page, backend, ledger, name, fixture)
    await editBranch(page, backend, name, containerId, fixture, fixture.alternateRepository, fixture.alternateBranch)
    await editBranch(page, backend, name, containerId, fixture, fixture.repository, fixture.branch)
    await observation(info, 'UI-028', 'git-fields-roundtrip', { containerId, realRepositoryAndBranchChangedThenHardReopened: true, syntheticUsernameAndPasswordExactlyPreserved: true, restoredPrimary: true })
    const result = await deploy(page, backend, name, 'success', fixture.commit)
    expect((await backend.containers()).find(item => id(item.id) === containerId)?.version).toBe(fixture.commit)
    const jar = await backend.file('/container/downloadJar', { version: fixture.commit })
    expect(jar.bytes.subarray(0, 2).toString()).toBe('PK')
    const downloadedJar = info.outputPath('controlled-git.jar')
    await fs.writeFile(downloadedJar, jar.bytes)
    const jarEntries = execFileSync('unzip', ['-Z1', downloadedJar], { encoding: 'utf8' }).split('\n')
    expect(jarEntries).toContain(fixture.processor.replaceAll('.', '/') + '.class')
    const rootsFile = process.env.POWERJOB_E2E_WORKER_CONTAINER_ROOTS_JSON
    if (!rootsFile) throw new Error('BLOCKED: configure the private actual Worker container roots for byte comparison')
    const roots = JSON.parse(await fs.readFile(rootsFile, 'utf8')) as { address: string; containerRoot: string }[]
    expect(roots.length).toBeGreaterThanOrEqual(2)
    const workerHashes: RecordDTO[] = []
    for (const worker of result.workers) {
      const root = roots.find(value => value.address === String(worker.address))
      expect(root).toBeTruthy()
      const actualBytes = await fs.readFile(path.join(root!.containerRoot, containerId, fixture.commit + '.jar'))
      const hash = crypto.createHash('sha256').update(actualBytes).digest('hex')
      workerHashes.push({ address: worker.address, sha256: hash, bytes: actualBytes.length })
    }
    expect(new Set(workerHashes.map(value => value.sha256)).size).toBe(1)
    // Two Servers may hold different ZIP container timestamps for the same Git commit.
    // Require the Processor class bytes and both actual Worker JAR bytes, rather than assume cross-node whole-ZIP identity.
    const className = fixture.processor.replaceAll('.', '/') + '.class'
    const serverClass = execFileSync('unzip', ['-p', downloadedJar, className])
    for (const worker of result.workers) {
      const root = roots.find(value => value.address === String(worker.address))!
      const workerClass = execFileSync('unzip', ['-p', path.join(root.containerRoot, containerId, fixture.commit + '.jar'), className])
      expect(workerClass.equals(serverClass)).toBe(true)
    }
    const marker = ownedName('git_effect') + '_中文😀'
    const job = await createJob(page, backend, ledger, ownedName('git_job'))
    const editor = await editJob(page, String(job.jobName))
    await editor.getByLabel('Processor type', { exact: true }).selectOption('EXTERNAL')
    await fill(editor, 'Processor', `${containerId}#${fixture.processor}`)
    await fill(editor, 'Job parameters', marker)
    await saveJob(page)
    const run = await clickAndResponse(page, '/job/run', () => selectors.row(page, String(job.jobName)).getByRole('button', { name: 'Run', exact: true }).click())
    expect(run.success).toBe(true)
    const instanceId = ledger.trackInstance(id(run.data), id(job.id))
    const actual = await backend.waitInstance(instanceId, [5], 120_000)
    expect(actual.result).toBe('controlled-git-fixture-result ' + marker)
    await page.goto('/#/oms/instance?jobId=' + id(job.id))
    await fill(page, 'Instance ID', instanceId)
    expect((await clickAndResponse(page, '/instance/list', () => page.getByRole('button', { name: 'Search', exact: true }).click(), response => response.request().postDataJSON()?.instanceId === instanceId)).success).toBe(true)
    await selectors.row(page, instanceId).getByRole('button', { name: 'Logs', exact: true }).click()
    const logs = selectors.dialog(page, `Instance logs #${instanceId}`)
    await expect.poll(async () => {
      expect((await clickAndResponse(page, '/instance/log', () => logs.getByRole('button', { name: 'Refresh logs', exact: true }).click(), response => new URL(response.url()).searchParams.get('instanceId') === instanceId)).success).toBe(true)
      return logs.locator('pre').innerText()
    }, { timeout: 30_000, intervals: [500, 1000, 2000], message: 'Refresh the actual initially delayed logs until the original Worker marker is visible' }).toContain('controlled-git-fixture-log ' + marker)
    const pendingDownload = page.waitForEvent('download')
    await logs.getByRole('button', { name: 'Download logs', exact: true }).click()
    const logfile = info.outputPath('controlled-git-instance.log')
    await (await pendingDownload).saveAs(logfile)
    const downloaded = await fs.readFile(logfile)
    expect(downloaded.toString()).toContain(marker)
    const original = await backend.file('/instance/downloadLog4Console', { instanceId })
    expect(downloaded.equals(original.bytes)).toBe(true)
    await logs.getByRole('button', { name: 'Close', exact: true }).click()
    await observation(info, 'UI-028', 'git-success', { containerId, commit: fixture.commit, processorClassPresentInServerJAR: true, originalServerJARSHA256: jar.sha256, bothActualWorkerJARHashes: workerHashes, processorClassBytesMatchServerAndBothWorkers: true, bothActualWorkersAtCommit: result.deployed, realMavenBuildSuccess: true, actualInstanceId: instanceId, realWorkerStatus: actual.status, actualResult: actual.result, onlineAndOriginalByteEqualDownloadedLogs: true, originalLogsSHA256: original.sha256, sameHostNotMultiHostHA: true })
    await observation(info, 'UI-028', 'ws-legacy-onopen', { realNativeWS: true, jwtTokenOnlyFirstFrameExactlyCurrentSession: result.originalLegacyJWTFrame, realLogsAndWorkerResult: true })
  } finally { await ledger.cleanup(info) }
})

for (const failure of ['invalid-ref', 'build-failure'] as const) test(`UI-028 · controlled Git ${failure}, sticky error then real main-branch dual Worker recovery`, async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  const fixture = await readFixture()
  const ledger = new OwnedResources(backend)
  const name = ownedName('git_' + failure.replaceAll('-', '_'))
  try {
    await enterSamples(page, credentials)
    const failingBranch = failure === 'invalid-ref' ? ownedName('nonexistent_branch') : fixture.brokenBranch
    const containerId = await createContainer(page, backend, ledger, name, fixture, failingBranch)
    const failed = await deploy(page, backend, name, 'error')
    if (failure === 'invalid-ref') expect(failed.originalLog).toContain(failingBranch)
    else expect(failed.originalLog).toContain('BUILD FAILURE')
    await editBranch(page, backend, name, containerId, fixture, fixture.repository, fixture.branch)
    const recovered = await deploy(page, backend, name, 'success', fixture.commit)
    expect((await backend.containers()).find(item => id(item.id) === containerId)?.version).toBe(fixture.commit)
    await observation(info, 'UI-028', 'git-' + failure, { containerId, controlledActualFailure: failure, nativeStickyErrorWithoutFalseSuccess: true, exactPrimaryBranchCorrectedOnPage: true, subsequentRealCloneMavenSuccess: true, bothActualWorkersRecoveredToFrozenCommit: recovered.deployed, errorLogContainsExpectedFailure: true })
  } finally { await ledger.cleanup(info) }
})
