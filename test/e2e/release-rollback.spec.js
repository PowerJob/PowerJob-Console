import { test, expect, selectors, runId, demoProcessor, input, choose, enterSamples, saveDialog, clickAndResponse, secretFill, fileHash } from './support.js'
import fs from 'node:fs/promises'
import path from 'node:path'

test('UI-037 · replace static distribution with the previous Console, login and read new jobs, workflow and logs, then restore', async ({ page, backend, credentials }, info) => {
  test.skip(!process.env.POWERJOB_E2E_ROLLBACK_STATE || !process.env.POWERJOB_E2E_OLD_DIST, 'A private static-server state file and preserved previous distribution are required')
  test.setTimeout(180_000)
  const statePath = process.env.POWERJOB_E2E_ROLLBACK_STATE
  const oldDist = process.env.POWERJOB_E2E_OLD_DIST
  const original = await fs.readFile(statePath, 'utf8')
  const settings = JSON.parse(original)
  const name = runId + '_rollback'
  let id, workflowId
  const proof = { oldIndexSha256: await fileHash(path.join(oldDist, 'index.html')), newIndexSha256: await fileHash(path.join(settings.root, 'index.html')) }
  try {
    await enterSamples(page, credentials)
    await page.goto('/#/oms/job')
    await page.getByRole('button', { name: 'New job', exact: true }).click()
    const dialog = selectors.dialog(page)
    await input(dialog, 'Job name', name)
    await input(dialog, 'Job params', 'success')
    await choose(page, dialog, 'Schedule info', 'API')
    await input(dialog, 'Execution config', demoProcessor)
    await saveDialog(page, '/job/save')
    id = (await backend.listJobs(name)).data[0].id
    await input(page.locator('main'), 'Job ID', id)
    await page.getByRole('button', { name: 'Query', exact: true }).click()
    const run = await clickAndResponse(page, '/job/run', () => selectors.row(page, String(id)).getByRole('button', { name: 'Run', exact: true }).click())
    const execution = await backend.waitInstance(run.data, [5])
    const node = await backend.call('/workflow/saveNode', { method: 'POST', data: [{ appId: credentials.app_id, type: 1, jobId: id, nodeName: name, nodeParams: 'success', enable: true, skipWhenFailed: false }] })
    workflowId = await backend.call('/workflow/save', { method: 'POST', data: { appId: credentials.app_id, wfName: name + '_wf', wfDescription: 'Console rollback definition', timeExpressionType: 'API', enable: true, maxWfInstanceNum: 1, notifyUserIds: [], lifeCycle: { start: null, end: null }, dag: { nodes: [{ nodeId: node[0].id }], edges: [] } } })
    proof.jobId = String(id); proof.instanceId = String(run.data); proof.workflowId = String(workflowId); proof.status = execution.status
    await fs.writeFile(statePath, JSON.stringify({ ...settings, root: oldDist, legacy: true }))
    await page.evaluate(() => { localStorage.removeItem('PowerJwt'); localStorage.setItem('lang', 'en'); localStorage.setItem('oms_lang', 'en') })
    await page.goto('/#/powerjobLogin')
    await page.reload()
    await expect(page.locator('.console-version')).toHaveCount(0)
    await secretFill(page.getByPlaceholder('Username', { exact: true }), credentials.admin_username)
    await secretFill(page.getByPlaceholder('Password', { exact: true }), credentials.admin_password)
    await page.getByRole('button', { name: 'Login', exact: true }).click()
    await expect(page).toHaveURL(/admin\/app|oms\/home/)
    await clickAndResponse(page, '/job/list', () => page.goto('/#/oms/job'))
    await page.getByPlaceholder('Job ID', { exact: true }).fill(String(id))
    await page.getByRole('button', { name: 'Query', exact: true }).click()
    await expect(selectors.row(page, String(id))).toContainText(name)
    await selectors.row(page, String(id)).getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(selectors.dialog(page)).toContainText('Job name')
    await expect(selectors.dialog(page).locator('.el-input__inner').first()).toHaveValue(name)
    await selectors.dialog(page).getByRole('button', { name: 'Close', exact: true }).first().click()
    await clickAndResponse(page, '/workflow/list', () => page.goto('/#/oms/workflow'))
    await page.getByPlaceholder('Workflow ID', { exact: true }).fill(String(workflowId))
    await page.getByRole('button', { name: 'Query', exact: true }).click()
    await expect(selectors.row(page, String(workflowId))).toContainText(name + '_wf')
    await selectors.row(page, String(workflowId)).getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(page.locator('.el-form').first().locator('.el-input__inner').first()).toHaveValue(name + '_wf')
    await clickAndResponse(page, '/instance/list', () => page.goto('/#/oms/instance'))
    await page.getByPlaceholder('Instance ID', { exact: true }).fill(String(run.data))
    await page.getByRole('button', { name: 'Query', exact: true }).click()
    const row = selectors.row(page, String(run.data))
    await expect(row).toContainText('Success')
    await expect(async () => {
      await row.getByRole('button', { name: 'Log', exact: true }).click()
      const text = await selectors.dialog(page).textContent()
      await selectors.dialog(page).getByRole('button', { name: 'Close', exact: true }).first().click()
      expect(text).toContain('StandaloneProcessorDemo finished process,success: true')
    }).toPass({ timeout: 30_000, intervals: [1500, 3000] })
    await row.getByRole('button', { name: 'Log', exact: true }).click()
    const [downloaded] = await Promise.all([
      page.waitForEvent('download', { timeout: 90_000 }),
      selectors.dialog(page).getByRole('button', { name: /Download$/ }).click(),
    ])
    const filename = info.outputPath('old-console.log')
    await downloaded.saveAs(filename)
    expect(await fs.readFile(filename, 'utf8')).toContain('StandaloneProcessorDemo finished process,success: true')
    proof.oldDownloadedLogSha256 = await fileHash(filename)
    await fs.writeFile(statePath, original)
    await page.goto('/#/oms/instance?jobId=' + encodeURIComponent(id))
    await page.reload()
    await expect(selectors.row(page, String(run.data))).toContainText('Success')
    await expect(page.locator('.console-version')).toContainText('5.1.6_fev2-rc.1')
    await info.attach('actual-console-rollback', { body: JSON.stringify(proof), contentType: 'application/json' })
  } finally {
    await fs.writeFile(statePath, original)
    if (workflowId) await backend.call('/workflow/delete?appId=' + encodeURIComponent(credentials.app_id) + '&workflowId=' + encodeURIComponent(workflowId))
    if (id) await backend.deleteOwnedJob(id)
  }
})
