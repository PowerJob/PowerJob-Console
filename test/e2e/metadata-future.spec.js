import { test, expect, selectors, runId, input, saveDialog, clickAndResponse } from './support.js'

const emptyRoles = () => ({ admin: [], developer: [], qa: [], observer: [] })
async function variant(info, page, caseId, variantId, steps, readback) {
  const path = info.outputPath(`${caseId}-${variantId}-redacted.png`)
  await page.screenshot({ path, fullPage: true, mask: [page.locator('input[type=password]'), page.locator('input[disabled]')] })
  await info.attach(`page-${caseId}-${variantId}`, { path, contentType: 'image/png' })
  await info.attach(`variant-${caseId}-${variantId}`, { body: Buffer.from(JSON.stringify({ caseId, variantId, steps, readback })), contentType: 'application/json' })
}
async function query(page, endpoint, label, value) {
  await input(page.locator('main'), label, value)
  await clickAndResponse(page, endpoint, () => page.getByRole('button', { name: 'Query', exact: true }).click())
}

test('metadatafuture · original app and namespace full DTO preserve stored future extra and explicit null tags', async ({ page, backend }, info) => {
  const code = `${runId}_future`
  const extra = JSON.stringify({ futureConfig: { enabled: false, limit: 0, nested: { unknown: '中文 &+%#' } }, futureOptional: null })
  let ns, app
  try {
    ns = await backend.call('/namespace/save', { method: 'POST', data: { code, name: `${code}_namespace`, tags: null, extra, componentUserRoleInfo: emptyRoles() } })
    app = await backend.call('/appInfo/save', { method: 'POST', data: { namespaceId: ns.id, appName: `${code}_app`, title: `${code}_original`, password: `Synthetic.${code}`, tags: null, extra, componentUserRoleInfo: emptyRoles() } })
    const originalNS = (await backend.call('/namespace/list', { method: 'POST', data: { codeLike: code, index: 0, pageSize: 10 } })).data[0]
    const originalApp = (await backend.call('/appInfo/list', { method: 'POST', data: { appId: app.id, index: 0, pageSize: 10 } })).data[0]
    expect(originalNS.tags).toBeNull(); expect(originalApp.tags).toBeNull()
    expect(originalNS.extra).toBe(extra); expect(originalApp.extra).toBe(extra)
    await page.goto('/#/admin/app'); await query(page, '/appInfo/list', 'ID', app.id)
    await selectors.row(page, String(app.id)).getByRole('button', { name: 'Edit', exact: true }).click()
    await input(selectors.dialog(page), 'Name', `${code}_edited`)
    let appWrite
    page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/appInfo/save')) appWrite = request.postDataJSON() })
    await saveDialog(page, '/appInfo/save')
    expect(appWrite.tags).toBeNull(); expect(appWrite.extra).toBe(extra)
    await page.reload(); await query(page, '/appInfo/list', 'ID', app.id)
    await selectors.row(page, String(app.id)).getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(selectors.dialog(page).getByLabel('Name', { exact: true })).toHaveValue(`${code}_edited`)
    await expect(selectors.dialog(page).getByLabel('Extra', { exact: true })).toHaveValue(extra)
    const readApp = (await backend.call('/appInfo/list', { method: 'POST', data: { appId: app.id, index: 0, pageSize: 10 } })).data[0]
    for (const key of ['appName', 'password', 'namespaceId', 'tags', 'extra', 'componentUserRoleInfo']) expect(readApp[key]).toEqual(originalApp[key])
    await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await variant(info, page, 'UI-036', 'app-preserve-unknown', ['API creates real original full app DTO including stored future JSON extra keys and explicit null tags; page only changes title; outgoing body preserves unedited values; hard refresh/reopen and independent full metadata readback'], { appId: app.id, originalKeys: Object.keys(originalApp), unknownStorage: 'extra opaque JSON contract', futureExtraUnchanged: true, nullTagsUnchanged: true, identityPasswordNamespaceRolesUnchanged: true })
    await page.goto('/#/admin/namespace'); await query(page, '/namespace/list', 'Code', code)
    await selectors.row(page, code).getByRole('button', { name: 'Edit', exact: true }).click()
    await input(selectors.dialog(page), 'Name', `${code}_namespace_edited`)
    let nsWrite
    page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/namespace/save')) nsWrite = request.postDataJSON() })
    await saveDialog(page, '/namespace/save')
    expect(nsWrite.tags).toBeNull(); expect(nsWrite.extra).toBe(extra); expect(nsWrite.token === originalNS.token).toBe(true)
    await page.reload(); await query(page, '/namespace/list', 'Code', code)
    await selectors.row(page, code).getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(selectors.dialog(page).getByLabel('Name', { exact: true })).toHaveValue(`${code}_namespace_edited`)
    await expect(selectors.dialog(page).getByLabel('Extra', { exact: true })).toHaveValue(extra)
    const readNS = (await backend.call('/namespace/list', { method: 'POST', data: { codeLike: code, index: 0, pageSize: 10 } })).data[0]
    expect(readNS.token === originalNS.token).toBe(true)
    for (const key of ['code', 'tags', 'extra', 'componentUserRoleInfo']) expect(readNS[key]).toEqual(originalNS[key])
    await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await variant(info, page, 'UI-036', 'namespace-preserve-unknown', ['API creates real original full namespace DTO including stored future extra keys and explicit null tags; page only changes Name; outgoing DTO token preserved; hard reload/reopen and independent metadata readback'], { namespaceId: ns.id, originalKeys: Object.keys(originalNS), unknownStorage: 'extra opaque JSON contract', futureExtraUnchanged: true, nullTagsUnchanged: true, codeTokenRolesUnchanged: true })
  } finally {
    if (app?.id) await backend.call('/appInfo/delete?appId=' + app.id, { method: 'POST', appId: app.id })
    if (ns?.id) await backend.call('/namespace/delete?id=' + ns.id, { method: 'DELETE', namespaceId: ns.id })
  }
})

test('metadatafuture · real Git container preserves future source keys, nested null and disabled status when only renamed', async ({ page, backend, credentials }, info) => {
  const name = `${runId}_future_container`
  const source = { repo: 'https://example.invalid/controlled.git', branch: null, username: null, password: null, futureConfig: { enabled: false, threshold: 0, futureKey: '中文 &+%#', futureOptional: null }, unknownOptional: null }
  let id
  try {
    await backend.call('/container/save', { method: 'POST', data: { appId: credentials.app_id, containerName: name, sourceType: 'Git', status: 'DISABLE', sourceInfo: JSON.stringify(source) } })
    const original = (await backend.call('/container/list?appId=' + credentials.app_id)).find(item => item.containerName === name); id = original.id
    expect(JSON.parse(original.sourceInfo)).toEqual(source)
    await page.goto('/#/admin/app'); await query(page, '/appInfo/list', 'ID', credentials.app_id)
    await selectors.row(page, String(credentials.app_id)).getByRole('button', { name: 'Enter', exact: true }).click()
    await page.goto('/#/oms/containermanage')
    let card = page.locator('.container-card').filter({ hasText: name }); await expect(card).toBeVisible()
    await card.getByRole('button', { name: 'Edit', exact: true }).click(); await input(selectors.dialog(page), 'Name', name + '_edited')
    let body
    page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/container/save')) body = request.postDataJSON() })
    await saveDialog(page, '/container/save'); expect(JSON.parse(body.sourceInfo)).toEqual(source); expect(body.status).toBe('DISABLE')
    await page.reload(); card = page.locator('.container-card').filter({ hasText: name + '_edited' }); await expect(card).toBeVisible()
    await card.getByRole('button', { name: 'Edit', exact: true }).click(); await expect(selectors.dialog(page).getByLabel('Name', { exact: true })).toHaveValue(name + '_edited')
    const read = (await backend.call('/container/list?appId=' + credentials.app_id)).find(item => String(item.id) === String(id))
    expect(read.status).toBe('DISABLE'); expect(JSON.parse(read.sourceInfo)).toEqual(source); expect(read.version).toBe(original.version)
    await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await variant(info, page, 'UI-036', 'container-preserve-unknown', ['API creates disabled Git source including original optional null fields, nested future object and unknown null keys; page only renames; actual save source exact; hard refresh/reopen and independent source/status/version readback'], { containerId: id, unknownStorage: 'sourceInfo JSON', sourceInfoUnchanged: true, futureAndNullKeysPreserved: true, status: read.status, versionUnchanged: true })
  } finally { if (id) await backend.call('/container/delete?containerId=' + id + '&appId=' + credentials.app_id) }
})
