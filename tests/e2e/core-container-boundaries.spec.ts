import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { test, expect, selectors, fill, secretFill, clickAndResponse, enterSamples, id, ownedName, observation, fileHash, type RecordDTO } from './helpers'
import { OwnedResources } from './owned'
import { deployedVersions, bothWorkersAtVersion } from './container-ui'

test.use({ actionTimeout: 15_000 })

test('UI-027/028/038 · exact owned Worker cache write refusal exposes real partial deployment, restored dual Worker bytes and native socket close/reopen remain accurate', async ({ page, backend, credentials }, info) => {
  test.setTimeout(240_000)
  const jar = process.env.POWERJOB_E2E_CONTAINER_JAR, rootsFile = process.env.POWERJOB_E2E_WORKER_CONTAINER_ROOTS_JSON
  if (!jar || !rootsFile) throw new Error('Configure the trusted external JAR and private verified Worker cache roots')
  const roots = JSON.parse(await fs.readFile(rootsFile, 'utf8')) as { address: string; containerRoot: string }[]
  const owned = new OwnedResources(backend)
  const sockets: { opened: boolean; closed: boolean; frames: number; compatibleFirstFrame: boolean; messages: string[] }[] = []
  page.on('websocket', socket => { if (!socket.url().includes('/container/deploy/')) return; const record = { opened: false, closed: false, frames: 0, compatibleFirstFrame: false, messages: [] as string[] }; sockets.push(record); socket.on('framesent', frame => { record.opened = true; record.frames++; const value = JSON.parse(String(frame.payload)) as RecordDTO; record.compatibleFirstFrame = Object.keys(value).join(',') === 'jwtToken' && typeof value.jwtToken === 'string' && !!value.jwtToken }); socket.on('framereceived', frame => { record.messages.push(String(frame.payload)) }); socket.on('close', () => { record.closed = true }) })
  let faultDirectory = ''; let originalMode: number | undefined; let restored = false
  const restore = async () => { if (faultDirectory && originalMode !== undefined && !restored) { await fs.chmod(faultDirectory, originalMode); restored = true } }
  try {
    await enterSamples(page, credentials); await page.goto('/#/oms/containermanage')
    const name = ownedName('partial_jar'); await page.getByRole('button', { name: 'New container', exact: true }).click(); const form = selectors.dialog(page, 'New container')
    await fill(form, 'Container name', name); await form.getByLabel('Container type', { exact: true }).selectOption('FatJar')
    const upload = await clickAndResponse<string>(page, '/container/jarUpload', () => form.getByLabel('Upload JAR', { exact: true }).setInputFiles(jar)); expect(upload.success).toBe(true); expect(upload.data).toBe(crypto.createHash('md5').update(await fs.readFile(jar)).digest('hex'))
    expect((await clickAndResponse(page, '/container/save', () => form.getByRole('button', { name: 'Save container', exact: true }).click())).success).toBe(true); await expect(form).not.toBeVisible()
    const row = (await backend.containers()).find(item => item.containerName === name)!; const containerId = owned.track('container', id(row.id), name)
    const workers = (await backend.call<RecordDTO[]>('/system/listWorker', { query: { appId: backend.appId } })).filter(worker => Number(worker.status) !== 9999)
    expect(workers).toHaveLength(2); expect(roots).toHaveLength(2)
    for (const root of roots) { expect(workers.some(worker => worker.address === root.address)).toBe(true); expect(path.isAbsolute(root.containerRoot)).toBe(true); expect((await fs.stat(root.containerRoot)).isDirectory()).toBe(true) }
    const sourceSHA = await fileHash(jar); expect((await backend.file('/container/downloadJar', { version: upload.data })).sha256).toBe(sourceSHA)
    // The exact fresh owned ID has never been deployed. No parent directory or existing container is altered.
    const worker2 = roots.find(root => root.address.endsWith(':27772'))!; expect(worker2).toBeTruthy()
    faultDirectory = path.join(worker2.containerRoot, containerId)
    await expect(fs.stat(faultDirectory)).rejects.toMatchObject({ code: 'ENOENT' })
    await fs.mkdir(faultDirectory); originalMode = (await fs.stat(faultDirectory)).mode & 0o777; await fs.chmod(faultDirectory, 0o500)
    await selectors.row(page, name).getByRole('button', { name: 'More', exact: true }).click(); await selectors.dialog(page, name).getByRole('button', { name: 'Deployed Workers', exact: true }).click()
    const noSocket = selectors.dialog(page, 'Deployed Workers · ' + name); await expect(noSocket.locator('pre')).toContainText('no worker deployed this container now~'); await noSocket.getByRole('button', { name: 'Close', exact: true }).click(); expect(sockets).toHaveLength(0)
    await selectors.row(page, name).getByRole('button', { name: 'Deploy', exact: true }).click(); let deployment = selectors.dialog(page, 'Deploy container · ' + name)
    await expect(deployment.locator('[data-status="success"]')).toHaveText('Deployment was submitted. Verify each node in Deployed Workers.', { timeout: 120_000 }); await deployment.getByRole('button', { name: 'Close', exact: true }).click()
    let partial = ''
    await expect.poll(async () => { await selectors.row(page, name).getByRole('button', { name: 'More', exact: true }).click(); await selectors.dialog(page, name).getByRole('button', { name: 'Deployed Workers', exact: true }).click(); const modal = selectors.dialog(page, 'Deployed Workers · ' + name); await expect(modal.locator('pre')).not.toHaveText('Waiting for logs…'); partial = await modal.locator('pre').innerText(); await modal.getByRole('button', { name: 'Close', exact: true }).click(); const set = deployedVersions(partial).get(upload.data); return set?.size === 1 && partial.includes('unDeployed worker list ==>') && partial.includes(worker2.address) }, { timeout: 75_000, intervals: [1000, 2000] }).toBe(true)
    expect(deployedVersions(partial).get(upload.data)?.has(worker2.address)).toBe(false)
    await expect(fs.stat(path.join(faultDirectory, upload.data + '.jar'))).rejects.toMatchObject({ code: 'ENOENT' })
    const worker1 = roots.find(root => root.address !== worker2.address)!; expect(await fileHash(path.join(worker1.containerRoot, containerId, upload.data + '.jar'))).toBe(sourceSHA)
    await restore(); expect((await fs.stat(faultDirectory)).mode & 0o777).toBe(originalMode)
    // Reopen only this owned container. The Server legacy onOpen contract still receives one compatibility frame.
    for (let attempt = 0; attempt < 2; attempt++) {
      await selectors.row(page, name).getByRole('button', { name: 'Deploy', exact: true }).click(); deployment = selectors.dialog(page, 'Deploy container · ' + name)
      await expect(deployment.locator('[data-status="success"]')).toBeVisible({ timeout: 120_000 }); await deployment.getByRole('button', { name: 'Close', exact: true }).click(); await expect.poll(() => sockets.every(socket => socket.closed)).toBe(true)
    }
    let recovered = ''
    await expect.poll(async () => { await selectors.row(page, name).getByRole('button', { name: 'More', exact: true }).click(); await selectors.dialog(page, name).getByRole('button', { name: 'Deployed Workers', exact: true }).click(); const modal = selectors.dialog(page, 'Deployed Workers · ' + name); await expect(modal.locator('pre')).not.toHaveText('Waiting for logs…'); recovered = await modal.locator('pre').innerText(); await modal.getByRole('button', { name: 'Close', exact: true }).click(); return bothWorkersAtVersion(recovered, upload.data, workers) }, { timeout: 75_000, intervals: [1000, 2000] }).toBe(true)
    for (const root of roots) expect(await fileHash(path.join(root.containerRoot, containerId, upload.data + '.jar'))).toBe(sourceSHA)
    expect(sockets).toHaveLength(3); expect(sockets.every(socket => socket.frames === 1 && socket.compatibleFirstFrame && socket.closed)).toBe(true)
    // The published Server closes FatJar sessions immediately after dispatch. A controlled Git build gives this boundary a genuinely live connection.
    const gitManifest = process.env.POWERJOB_E2E_GIT_MANIFEST
    if (!gitManifest) throw new Error('Configure the credential-free controlled Git fixture for a real live route-unmount boundary')
    const gitFixture = JSON.parse(await fs.readFile(gitManifest, 'utf8')) as RecordDTO
    expect(gitFixture.credentials).toBe('none'); expect(String(gitFixture.commit)).toMatch(/^[0-9a-f]{40}$/)
    expect(typeof gitFixture.repository).toBe('string'); expect(typeof gitFixture.branch).toBe('string')
    await selectors.row(page, name).getByRole('button', { name: 'Edit', exact: true }).click()
    const gitForm = selectors.dialog(page, 'Edit container')
    await gitForm.getByLabel('Container type', { exact: true }).selectOption('Git')
    await fill(gitForm, 'Git repository URL', String(gitFixture.repository)); await fill(gitForm, 'Branch', String(gitFixture.branch))
    await secretFill(gitForm.getByLabel('Username', { exact: true }), String(gitFixture.username || ''))
    await secretFill(gitForm.getByLabel('Password', { exact: true }), String(gitFixture.password || ''))
    expect((await clickAndResponse(page, '/container/save', () => gitForm.getByRole('button', { name: 'Save container', exact: true }).click())).success).toBe(true)
    await expect(gitForm).not.toBeVisible()
    const gitReadback = (await backend.containers()).find(item => id(item.id) === containerId)!
    expect(gitReadback.sourceType).toBe('Git')
    const gitSource = JSON.parse(String(gitReadback.sourceInfo)) as RecordDTO
    expect(gitSource.repo).toBe(gitFixture.repository); expect(gitSource.branch).toBe(gitFixture.branch)
    expect(gitSource.username === (gitFixture.username || '') && gitSource.password === (gitFixture.password || '')).toBe(true)
    // Establish a different real route in browser history using normally operable native menu links.
    await page.locator('aside.rail nav').getByRole('link', { name: 'Overview', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Operations overview', exact: true })).toBeVisible()
    await page.locator('aside.rail nav').getByRole('link', { name: 'Containers', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Containers', exact: true })).toBeVisible()
    // Native showModal correctly blocks the underlying menu. Browser Back can still unmount the page with its real connection open.
    await selectors.row(page, name).getByRole('button', { name: 'Deploy', exact: true }).click(); deployment = selectors.dialog(page, 'Deploy container · ' + name)
    await expect.poll(() => sockets.length).toBe(4)
    const unmountedAttempt = sockets[3]
    await expect.poll(() => unmountedAttempt.opened && unmountedAttempt.messages.length > 0).toBe(true)
    expect(unmountedAttempt.closed).toBe(false)
    await page.goBack()
    await expect(page.getByRole('heading', { level: 1, name: 'Operations overview', exact: true })).toBeVisible()
    await expect(deployment).not.toBeVisible(); await expect.poll(() => unmountedAttempt.closed).toBe(true)
    const messagesAtUnmountClosure = unmountedAttempt.messages.length
    expect(messagesAtUnmountClosure).toBeGreaterThan(0)
    // Closing the browser connection is not a promise that 5.1.6 cancels its synchronous Server build. Let that owned attempt unwind before redeploying.
    await page.waitForTimeout(15_000)
    await page.locator('aside.rail nav').getByRole('link', { name: 'Containers', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Containers', exact: true })).toBeVisible()
    await expect(deployment).not.toBeVisible()
    await selectors.row(page, name).getByRole('button', { name: 'Deploy', exact: true }).click(); deployment = selectors.dialog(page, 'Deploy container · ' + name)
    await expect.poll(() => sockets.length).toBe(5)
    const freshAttempt = sockets[4]
    await expect(deployment.locator('[data-status="success"]')).toBeVisible({ timeout: 120_000 })
    await expect.poll(async () => (await deployment.locator('pre').innerText()) === freshAttempt.messages.join('\n')).toBe(true)
    expect(freshAttempt.messages.length).toBeGreaterThan(0)
    expect(unmountedAttempt.messages).toHaveLength(messagesAtUnmountClosure)
    await deployment.getByRole('button', { name: 'Close', exact: true }).click()
    await expect.poll(() => sockets.every(socket => socket.closed)).toBe(true)
    expect(sockets.every(socket => socket.frames === 1 && socket.compatibleFirstFrame)).toBe(true)
    const socketEvidence = sockets.map(({ messages, ...record }) => ({ ...record, receivedMessageCount: messages.length, receivedMessagesSHA256: crypto.createHash('sha256').update(messages.join('\n')).digest('hex') }))
    await observation(info, 'UI-028', 'worker-partial-failure', { containerId, originalServerDownloadedJARSHA: sourceSHA, actualNativeDispatchLabelDoesNotClaimAcknowledgement: true, exactFreshOwnedWorker2DirectoryModeBefore: originalMode, temporaryMode: '0500', actualPartialWorkerQuery: partial, onlyWorker1ActualBytesDuringFault: true, Worker2JarAbsentDuringFault: true, restoredOriginalMode: restored, subsequentActualTwoWorkerQuery: recovered, bothWorkerJARBytesSameSHA: sourceSHA, noWorkerStoppedOrOtherCacheModified: true })
    await observation(info, 'UI-028', 'ws-close-reopen', { containerId, nativeThreeDeploymentDialogsClosedBeforeRouteBoundary: true, nativeFreshDeploymentDialogClosedAfterRouteReturn: true, actualSockets: socketEvidence, originalFirstFrameKeysOnly: ['jwtToken'], noTokensRecorded: true })
    await observation(info, 'UI-028', 'ws-close-before-connect', { nativeWorkerListDialogClosedBeforeAnyWebSocketWasCreated: true, actualWebSocketCountAtThatBoundary: 0, noNullCloseException: true, subsequentRealDeploymentProvesRecovery: true, notClaimingHeldTCPHandshake: true })
    await observation(info, 'UI-038', 'ws-close-lifecycle', { originalServerConnections: sockets.length, actualSockets: socketEvidence, everyNativeCloseReleasedConnection: sockets.every(socket => socket.closed), oneCompatibilityFramePerConnection: true, controlledCredentialFreeGitCommit: gitFixture.commit, liveFourthConnectionReceivedActualServerMessagesBeforeBrowserBack: true, browserHistoryRouteUnmountClosedThatExactConnection: unmountedAttempt.closed, nativeMenuReturnToContainers: true, nativeModalNotBypassed: true, messagesAtUnmountClosure, oldConnectionMessageCountUnchangedThroughNewDeployment: unmountedAttempt.messages.length === messagesAtUnmountClosure, freshFifthDialogContentEqualsOnlyItsActualServerFrames: true, noOldContentAfterReopen: true, noSyntheticWebSocketEvents: true, notClaimingClientDisconnectCancelsServerBuild: true })
  } finally { await restore(); await owned.cleanup(info) }
})
