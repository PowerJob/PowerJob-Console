import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import { test, expect, selectors, fill, clickAndResponse, cancelDialog, enterSamples, enterApplication, login, id, ownedName, observation, fileHash, type RecordDTO, type PageDTO } from './helpers'
import { OwnedResources } from './owned'
import { AdminFixtures, emptyRoles } from './admin-fixtures'

test.use({ actionTimeout: 15_000 })

test('UI-027/036 · upload follows the changed real account and application, invalid extension makes zero requests and metadata name edit preserves future source JSON', async ({ page, backend, credentials }, info) => {
  const jar = process.env.POWERJOB_E2E_CONTAINER_JAR, manifestPath = process.env.POWERJOB_E2E_GIT_MANIFEST
  if (!jar || !manifestPath) throw new Error('Configure the trusted JAR and public-controlled Git fixture receipt')
  const fixture = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as RecordDTO
  const admin = new AdminFixtures(backend); let owned: OwnedResources | undefined
  try {
    const originalToken = await page.evaluate(() => localStorage.getItem('PowerJwt'))
    const user = await admin.user('upload_developer'), space = await admin.space('upload_space'); const roles = emptyRoles(); roles.developer = [user.id]
    const app = await admin.app('upload_app', id(space.id), { componentUserRoleInfo: roles }); const scoped = backend.forApp(id(app.id)); owned = new OwnedResources(scoped)
    await login(page, { ...credentials, admin_username: user.origin, admin_password: user.password }); await enterApplication(page, String(app.appName))
    const currentToken = await page.evaluate(() => localStorage.getItem('PowerJwt')); expect(currentToken).not.toBe(originalToken)
    await page.goto('/#/oms/containermanage'); await page.getByRole('button', { name: 'New container', exact: true }).click(); const dialog = selectors.dialog(page, 'New container')
    const name = ownedName('current_session_jar'); await fill(dialog, 'Container name', name); await dialog.getByLabel('Container type', { exact: true }).selectOption('FatJar')
    let uploads = 0; page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/container/jarUpload')) uploads++ })
    const invalid = info.outputPath('invalid-extension.txt'); await fs.writeFile(invalid, 'not-a-jar')
    await dialog.getByLabel('Upload JAR', { exact: true }).setInputFiles(invalid); await expect(dialog.getByRole('alert')).toHaveText('Choose a .jar file.'); expect(uploads).toBe(0); await expect(dialog.getByRole('button', { name: 'Save container', exact: true })).toBeDisabled()
    let currentHeaders = false
    const uploaded = await clickAndResponse<string>(page, '/container/jarUpload', () => dialog.getByLabel('Upload JAR', { exact: true }).setInputFiles(jar), response => { const headers = response.request().headers(); currentHeaders = headers.powerjwt === currentToken && headers.appid === id(app.id); return true })
    expect(uploaded.success).toBe(true); expect(currentHeaders).toBe(true); expect(uploaded.data).toBe(crypto.createHash('md5').update(await fs.readFile(jar)).digest('hex')); expect(uploads).toBe(1)
    let savedAppId = ''
    expect((await clickAndResponse(page, '/container/save', () => dialog.getByRole('button', { name: 'Save container', exact: true }).click(), response => { savedAppId = id(response.request().postDataJSON().appId); return true })).success).toBe(true)
    const container = (await scoped.containers()).find(row => row.containerName === name)!; const containerId = owned.track('container', id(container.id), name)
    expect(savedAppId).toBe(id(app.id)); expect((await backend.containers()).some(row => id(row.id) === containerId)).toBe(false); expect((await scoped.file('/container/downloadJar', { version: uploaded.data })).sha256).toBe(await fileHash(jar))
    await login(page, credentials); await enterApplication(page, String(app.appName))
    const gitName = ownedName('future_git_source')
    const source = { repo: fixture.repository, branch: fixture.branch, username: 'synthetic-roundtrip-user', password: 'synthetic-roundtrip-password', future: { zero: 0, disabled: false, absent: null, unicode: '未来 中文 😀' } }
    await scoped.call('/container/save', { method: 'POST', data: { appId: app.id, containerName: gitName, sourceType: 'Git', sourceInfo: JSON.stringify(source), status: 'DISABLE' } })
    const before = (await scoped.containers()).find(row => row.containerName === gitName)!; const gitId = owned.track('container', id(before.id), gitName)
    await page.goto('/#/oms/containermanage'); await selectors.row(page, gitName).getByRole('button', { name: 'Edit', exact: true }).click(); const edit = selectors.dialog(page, 'Edit container'); const renamed = gitName + '_renamed'; await fill(edit, 'Container name', renamed)
    expect((await clickAndResponse(page, '/container/save', () => edit.getByRole('button', { name: 'Save container', exact: true }).click())).success).toBe(true); await page.reload()
    const after = (await scoped.containers()).find(row => id(row.id) === gitId)!
    for (const [key, value] of Object.entries(before)) if (!['containerName', 'gmtModified', 'gmtCreate'].includes(key)) expect(after[key], 'Preserved formal container field ' + key).toEqual(value)
    // Formal SaveContainerInfoRequest has no gmtCreate; the old Server creates a new DO for updates and clears it. Frontend cannot persist that unsupported field.
    expect(before.gmtCreate).not.toBeNull(); expect(after.gmtCreate).toBeNull()
    expect(JSON.parse(String(after.sourceInfo))).toEqual(source)
    await selectors.row(page, renamed).getByRole('button', { name: 'Edit', exact: true }).click(); const reopened = selectors.dialog(page, 'Edit container'); await expect(reopened.getByLabel('Git repository URL', { exact: true })).toHaveValue(String(fixture.repository)); await expect(reopened.getByLabel('Branch', { exact: true })).toHaveValue(String(fixture.branch)); await cancelDialog(page, 'Edit container')
    await observation(info, 'UI-027', 'session-change-upload', { changedOwnUserId: user.id, ownAppId: id(app.id), actualSaveRequestAppId: savedAppId, scopedContainerListContainedSavedIDAndSamplesListDidNot: true, exactOriginalRequestHeadersMatchCurrentSessionAndApp: currentHeaders, rootSessionTokenWasDifferent: true, tokenValuesNotRecorded: true, originalMD5: uploaded.data, storedJARSHA256: await fileHash(jar), containerId })
    await observation(info, 'UI-027', 'upload-invalid-jar', { invalidExtensionRejectedLocallyWithVisibleError: true, invalidExtensionUploads: 0, missingArtifactSaveDisabled: true, correctedActualJARUploadAndSaveRecovered: true, malformedJarContentNotClaimedToBeRejectedByOldServer: true })
    await observation(info, 'UI-036', 'container-preserve-unknown', { containerId: gitId, nativeNameOnlyEditAndHardReload: true, futureJSONZeroFalseNullUnicodePreserved: true, statusBefore: before.status, statusAfter: after.status, typedTopLevelFutureKeysNotClaimed: true, originalServerSaveContractFields: ['id', 'appId', 'containerName', 'sourceType', 'sourceInfo', 'status'], originalServerUnsupportedGmtCreateClearedOnUpdate: { before: before.gmtCreate, after: after.gmtCreate }, notClaimingServerPreservesCreationTimestamp: true })
  } finally { if (owned) await owned.cleanup(info); await admin.cleanup(info) }
})

test('UI-039 · native long hash query and original Server requests retain every ID digit', async ({ page, backend, credentials }, info) => {
  expect(id(backend.appId)).toBe(id(credentials.app_id))
  await enterSamples(page, credentials)
  const longID = '9007199254740993'
  await page.goto('/#/oms/instance?jobId=' + longID)
  await expect(page.getByLabel('Job ID', { exact: true })).toHaveValue(longID)
  await expect(page).toHaveURL(new RegExp('jobId=' + longID))
  await fill(page, 'Instance ID', longID)
  const original = await clickAndResponse<PageDTO<RecordDTO>>(page, '/instance/list', () => page.getByRole('button', { name: 'Search', exact: true }).click(), response => {
    const body = response.request().postDataJSON()
    return body.jobId === longID && body.instanceId === longID
  })
  expect(original.success).toBe(true)
  expect(original.data.data).toEqual([])
  await page.reload()
  await expect(page.getByLabel('Job ID', { exact: true })).toHaveValue(longID)
  await observation(info, 'UI-039', 'long-id-url', { originalIDString: longID, nativeHashJobQueryAndPOSTJobInstanceIDsExact: true, originalServerResponseForNonexistentLargeIDs: 'successful-empty', actualPersistedLargeEntityNotClaimed: true, businessWrites: 0 })
})
