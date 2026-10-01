import { test, expect, enterSamples, selectors, fill, secretFill, id, observation, ownedName, type RecordDTO } from './helpers'
import { OwnedResources } from './owned'
import { createJob } from './job-ui'

test('UI-032 · native dialogs in every domain cancel, Escape, reopen and isolate unsaved drafts', async ({ page, backend, credentials }, info) => {
  const owned = new OwnedResources(backend)
  const covered: string[] = []
  let uiWrites = 0
  try {
    await enterSamples(page, credentials)
    const job = await createJob(page, backend, owned, ownedName('dialogs_job'))
    const instanceId = id(await backend.call('/job/run', { query: { jobId: id(job.id) } }))
    owned.trackInstance(instanceId, id(job.id), 'NORMAL')
    await backend.waitInstance(instanceId)
    page.on('request', request => {
      if (/\/(?:save|saveNode|delete|create|changePassword|run)$/.test(new URL(request.url()).pathname)) uiWrites++
    })
    for (const fixture of [
      { route: '/admin/app', button: 'New application', title: 'New application', label: 'Application name' },
      { route: '/admin/namespace', button: 'New namespace', title: 'New namespace', label: 'Name' },
      { route: '/oms/job', button: 'New job', title: 'New job', label: 'Job name' },
      { route: '/oms/containermanage', button: 'New container', title: 'New container', label: 'Container name' },
    ]) {
      await page.goto('/#' + fixture.route)
      await page.getByRole('button', { name: fixture.button, exact: true }).click()
      let dialog = selectors.dialog(page, fixture.title)
      await fill(dialog, fixture.label, 'unsaved-first-draft')
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(dialog).not.toBeVisible()
      await page.getByRole('button', { name: fixture.button, exact: true }).click()
      dialog = selectors.dialog(page, fixture.title)
      await expect(dialog.getByLabel(fixture.label, { exact: true })).toHaveValue('')
      await fill(dialog, fixture.label, 'unsaved-second-draft')
      await page.keyboard.press('Escape')
      await expect(dialog).not.toBeVisible()
      await page.getByRole('button', { name: fixture.button, exact: true }).click()
      await expect(selectors.dialog(page, fixture.title).getByLabel(fixture.label, { exact: true })).toHaveValue('')
      await selectors.dialog(page, fixture.title).getByRole('button', { name: 'Cancel', exact: true }).click()
      covered.push(fixture.route)
    }
    await page.goto('/#/oms/instance')
    await fill(page, 'Instance ID', instanceId)
    const listed = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/instance/list') && response.request().postDataJSON()?.instanceId === instanceId)
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    expect((await listed).ok()).toBe(true)
    const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: instanceId, exact: true }) })
    await expect(row).toHaveCount(1)
    await row.getByRole('button', { name: 'Details', exact: true }).click()
    await expect(selectors.dialog(page, 'Instance details #' + instanceId)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(selectors.dialog(page, 'Instance details #' + instanceId)).not.toBeVisible()
    await row.getByRole('button', { name: 'Details', exact: true }).click()
    await selectors.dialog(page, 'Instance details #' + instanceId).locator('.modal-heading').getByRole('button', { name: 'Close', exact: true }).click()
    covered.push('/oms/instance')
    await page.goto('/#/oms/workflowEditor')
    await page.locator('.flow-tools').getByRole('button', { name: '+ Jobs', exact: true }).click()
    await expect(selectors.dialog(page, 'Import jobs')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(selectors.dialog(page, 'Import jobs')).not.toBeVisible()
    await page.locator('.flow-tools').getByRole('button', { name: '+ Jobs', exact: true }).click()
    await selectors.dialog(page, 'Import jobs').getByRole('button', { name: 'Cancel', exact: true }).click()
    covered.push('/oms/workflowEditor')
    await page.goto('/#/admin/personal')
    await page.getByRole('button', { name: 'Change password', exact: true }).click()
    let dialog = selectors.dialog(page, 'Change password')
    await secretFill(dialog.getByLabel('Old password', { exact: true }), 'synthetic-unsaved-only')
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await page.getByRole('button', { name: 'Change password', exact: true }).click()
    dialog = selectors.dialog(page, 'Change password')
    await expect(dialog.getByLabel('Old password', { exact: true })).toHaveValue('')
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    covered.push('/admin/personal')
    await page.goto('/#/powerjobLogin')
    await page.getByRole('button', { name: 'Create an account', exact: true }).click()
    dialog = selectors.dialog(page, 'Create an account')
    await fill(dialog, 'Username', 'synthetic-unsaved-only')
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await page.getByRole('button', { name: 'Create an account', exact: true }).click()
    dialog = selectors.dialog(page, 'Create an account')
    await expect(dialog.getByLabel('Username', { exact: true })).toHaveValue('')
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    covered.push('/powerjobLogin')
    expect(uiWrites).toBe(0)
    const actual = await backend.job(id(job.id)) as RecordDTO
    expect(actual.jobName).toBe(ownedName('dialogs_job'))
    expect((await backend.instance(instanceId))?.status).toBe(5)
    await observation(info, 'UI-032', 'dialog-all-domains', { domains: covered, genuineSuccessfulInstance: instanceId, unsavedDraftsIsolated: true, uiBusinessWriteCount: uiWrites, credentialsChanged: false, originalFixtureNameAndInstanceUnchanged: true })
  } finally { await owned.cleanup(info) }
})
