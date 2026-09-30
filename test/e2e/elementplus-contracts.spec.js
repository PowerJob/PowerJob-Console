import { test, expect, selectors, runId, demoProcessor, input, formItem, choose, login, enterSamples, saveDialog, clickAndResponse } from './support.js'
import fs from 'node:fs/promises'

async function proof(info, caseId, variantId, actual) {
  const result = { caseId, variantId, status: 'PASS', testTitle: info.title, actual }
  await fs.writeFile(info.outputPath(`variant-${caseId}-${variantId}.json`), JSON.stringify(result, null, 2))
  await info.attach(`${caseId}/${variantId}`, { body: JSON.stringify(result), contentType: 'application/json' })
}
async function row(page, id) {
  await page.goto('/#/oms/job')
  await input(page.locator('main'), 'Job ID', id)
  await page.getByRole('button', { name: 'Query', exact: true }).click()
  return selectors.row(page, String(id))
}

test('UI-032/035 · actual keyboard focus, double-save guard, independent editor drafts and 200-percent CSS zoom', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  await enterSamples(page, credentials)
  const ids = []
  try {
    await page.goto('/#/oms/job')
    const newButton = page.getByRole('button', { name: 'New job', exact: true })
    await newButton.focus()
    await newButton.press('Enter')
    await expect(selectors.dialog(page)).toBeVisible()
    const nameField = formItem(selectors.dialog(page), 'Job name').locator('input')
    const focusOrder = []
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      const focused = await page.evaluate(() => ({ withinModal: Boolean(document.activeElement?.closest('.el-dialog')), tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label') || null }))
      expect(focused.withinModal).toBe(true)
      focusOrder.push(focused)
      if (await nameField.evaluate(input => input === document.activeElement)) break
    }
    await expect(nameField).toBeFocused()
    await expect(nameField.locator('..')).toHaveClass(/is-focus/)
    await page.keyboard.insertText(`${runId}_keyboard_save`)
    await input(selectors.dialog(page), 'Execution config', demoProcessor)
    const save = selectors.dialog(page).getByRole('button', { name: 'Save', exact: true })
    let requests = 0
    page.on('request', request => { if (request.url().split('?')[0].endsWith('/job/save')) requests++ })
    const saved = await clickAndResponse(page, '/job/save', () => save.dblclick())
    expect(saved.success).toBe(true)
    await expect(selectors.dialog(page)).not.toBeVisible()
    const created = (await backend.listJobs(`${runId}_keyboard_save`)).data
    expect(created).toHaveLength(1); ids.push(created[0].id)
    expect(requests).toBe(1)
    await proof(info, 'UI-032', 'dialog-save-double-submit', { actualDoubleClick: true, exactlyOneSaveRequest: true, exactlyOneNewObject: true })
    await newButton.click()
    await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(selectors.dialog(page)).not.toBeVisible()
    await expect(newButton).toBeFocused()
    await proof(info, 'UI-035', 'keyboard-focus', { keyboardOpenedModal: true, tabReachedFirstField: true, focusOrder, visibleFocusClass: true, closeRestoredTriggerFocus: true })

    const first = await backend.job(created[0].id)
    await (await row(page, first.id)).getByRole('button', { name: 'Edit', exact: true }).click()
    await input(selectors.dialog(page), 'Job name', `${runId}_cancelled_edit`)
    await selectors.dialog(page).getByPlaceholder('Thread concurrency', { exact: true }).fill('77')
    await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await newButton.click()
    await expect(formItem(selectors.dialog(page), 'Job name').locator('input')).toHaveValue('')
    await expect(selectors.dialog(page).getByPlaceholder('Thread concurrency', { exact: true })).toHaveValue('5')
    await input(selectors.dialog(page), 'Job name', `${runId}_independent_second`)
    await input(selectors.dialog(page), 'Execution config', demoProcessor)
    await saveDialog(page, '/job/save')
    const second = (await backend.listJobs(`${runId}_independent_second`)).data[0]
    ids.push(second.id)
    expect(second.id).not.toBe(first.id)
    expect(second.concurrency).toBe(5)
    expect((await backend.job(first.id)).jobName).toBe(first.jobName)
    expect((await backend.job(first.id)).concurrency).toBe(first.concurrency)
    await proof(info, 'UI-032', 'form-draft-isolation', { cancelledFirstDraftNotSharedWithSecond: true, distinctSavedIds: true, originalNameAndNestedRuntimeUnchanged: true })

    // CSS zoom changes actual rendered geometry. This is explicitly not a claim about native browser chrome zoom.
    await page.evaluate(() => { document.body.style.zoom = '2' })
    expect(await page.evaluate(() => getComputedStyle(document.body).zoom)).toBe('2')
    await page.setViewportSize({ width: 1440, height: 1000 })
    await newButton.scrollIntoViewIfNeeded(); await expect(newButton).toBeInViewport(); await newButton.click()
    const cancel = selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true })
    await cancel.scrollIntoViewIfNeeded(); await expect(cancel).toBeInViewport(); await cancel.focus(); await cancel.press('Enter')
    await expect(selectors.dialog(page)).not.toBeVisible()
    await info.attach('css-zoom-200-percent', { body: JSON.stringify({ scale: 2, taskButtonAndModalCancellationReachable: true, nativeBrowserZoom: 'NOT_RUN: CSS render zoom is a supplementary check only' }), contentType: 'application/json' })
  } finally { await page.evaluate(() => { document.body.style.zoom = '' }); for (const id of ids) await backend.deleteOwnedJob(id) }
})

test('UI-032 · form dialogs in every domain cancel, Escape, reopen and preserve server state', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  await enterSamples(page, credentials)
  let jobId
  const completed = []
  async function cancelTwice(open, fillDraft, scope = () => selectors.dialog(page)) {
    await open(); await expect(scope()).toBeVisible(); await fillDraft(scope())
    const cancel = scope().getByRole('button', { name: 'Cancel', exact: true })
    if (await cancel.count()) await cancel.click(); else await scope().getByRole('button', { name: 'Close this dialog' }).click()
    await expect(scope()).not.toBeVisible()
    await open(); await expect(scope()).toBeVisible(); await page.keyboard.press('Escape'); await expect(scope()).not.toBeVisible()
    await open(); await expect(scope()).toBeVisible(); await scope().getByRole('button', { name: 'Close this dialog' }).click(); await expect(scope()).not.toBeVisible()
  }
  try {
    for (const [path, button, label, domain] of [['/admin/app', 'Add', 'appName', 'app'], ['/admin/namespace', 'Add', 'Code', 'namespace'], ['/oms/job', 'New job', 'Job name', 'job'], ['/oms/containermanage', 'New container', 'Name', 'container']]) {
      await page.goto('/#' + path)
      await cancelTwice(() => page.getByRole('button', { name: button, exact: true }).click(), dialog => input(dialog, label, `${runId}_modal_draft`))
      completed.push(domain)
    }
    await page.goto('/#/oms/job')
    await page.getByRole('button', { name: 'New job', exact: true }).click()
    await input(selectors.dialog(page), 'Job name', `${runId}_modal_instance`)
    await input(selectors.dialog(page), 'Execution config', demoProcessor)
    await saveDialog(page, '/job/save')
    jobId = (await backend.listJobs(`${runId}_modal_instance`)).data[0].id
    const run = await clickAndResponse(page, '/job/run', () => row(page, jobId).then(target => target.getByRole('button', { name: 'Run', exact: true }).click()))
    await backend.waitInstance(run.data, [5])
    await page.goto('/#/oms/instance')
    await input(page.locator('main'), 'Instance ID', run.data)
    await page.locator('#instance_manager').getByRole('button', { name: 'Query', exact: true }).first().click()
    await cancelTwice(() => selectors.row(page, String(run.data)).getByRole('button', { name: 'Detail', exact: true }).click(), async dialog => expect(dialog).toContainText(String(run.data)))
    completed.push('instance')
    await page.goto('/#/oms/workflowEditor')
    await cancelTwice(() => page.locator('.canvas-toolbar').getByRole('button', { name: /Import job/ }).click(), async drawer => expect(drawer.locator('.el-table')).toBeVisible(), () => page.locator('.el-drawer:visible').last())
    completed.push('workflow-import')
    await page.goto('/#/admin/personal')
    await cancelTwice(() => page.getByRole('button', { name: 'Change Password', exact: true }).click(), dialog => input(dialog, 'Old Password', 'SyntheticUnused'))
    completed.push('password')
    await page.locator('.account-button').hover(); await page.getByRole('menuitem', { name: 'Logout', exact: true }).click()
    await page.getByRole('button', { name: /PWJB|PowerJob/i }).first().click()
    await cancelTwice(() => page.getByRole('button', { name: 'User Registration', exact: true }).click(), dialog => input(dialog, 'Username', `${runId}_registration_draft`))
    completed.push('registration')
    await login(page, credentials)
    expect((await backend.listJobs(`${runId}_modal_draft`)).data).toHaveLength(0)
    await proof(info, 'UI-032', 'dialog-all-domains', { actualDomains: completed, cancelEscapeCloseAndReopenInEach: true, noDraftJobSaved: true, originalRealInstanceStillSuccess: (await backend.waitInstance(run.data, [5])).status === 5 })
  } finally { if (jobId) await backend.deleteOwnedJob(jobId) }
})

test('UI-030 · original lang localStorage keys survive real reload in both locales', async ({ page, backend, credentials }, info) => {
  await enterSamples(page, credentials)
  await page.evaluate(() => { localStorage.removeItem('oms_lang'); localStorage.setItem('lang', 'cn') })
  await page.reload()
  await expect(page.getByRole('button', { name: '简体中文', exact: true })).toBeVisible()
  await page.evaluate(() => { localStorage.removeItem('oms_lang'); localStorage.setItem('lang', 'en') })
  await page.reload()
  await expect(page.getByRole('button', { name: 'English', exact: true })).toBeVisible()
  await proof(info, 'UI-030', 'legacy-language-key', { oldLangCnAndEnReadWithoutOmsLang: true, twoActualHardReloads: true, translatedLanguageUI: true })
})
