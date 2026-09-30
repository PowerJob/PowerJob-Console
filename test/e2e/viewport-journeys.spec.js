import { test, expect, selectors, runId, input, enterSamples, demoProcessor, saveDialog, clickAndResponse, fileHash } from './support.js'
import fs from 'node:fs/promises'

for (const width of [1440, 1024, 768, 390]) {
  test(`UI-035 · ${width}px full actual task/save/run/log/download and editable DAG journey`, async ({ page, backend, credentials }, info) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width, height: 1000 })
    await enterSamples(page, credentials)
    let jobId, workflowId
    const name = `${runId}_viewport_${width}`
    try {
      await page.goto('/#/oms/job')
      await page.getByRole('button', { name: 'New job', exact: true }).click()
      await input(selectors.dialog(page), 'Job name', name)
      await input(selectors.dialog(page), 'Job params', '长中文名称😀 viewport &+%#')
      await input(selectors.dialog(page), 'Execution config', demoProcessor)
      await saveDialog(page, '/job/save')
      jobId = (await backend.listJobs(name)).data[0].id
      await input(page.locator('main'), 'Job ID', jobId)
      await page.getByRole('button', { name: 'Query', exact: true }).click()
      const run = await clickAndResponse(page, '/job/run', () => selectors.row(page, String(jobId)).getByRole('button', { name: 'Run', exact: true }).click())
      await backend.waitInstance(run.data, [5])
      await page.goto('/#/oms/instance')
      await input(page.locator('main'), 'Instance ID', run.data)
      await page.locator('#instance_manager').getByRole('button', { name: 'Query', exact: true }).first().click()
      await selectors.row(page, String(run.data)).getByRole('button', { name: 'Detail', exact: true }).click()
      await expect(selectors.dialog(page)).toContainText('Success')
      await selectors.dialog(page).getByRole('tab', { name: 'Log', exact: true }).click()
      await expect.poll(async () => {
        if ((await selectors.dialog(page).textContent()).includes('StandaloneProcessorDemo finished process,success: true')) return true
        await selectors.dialog(page).getByRole('button', { name: 'Refresh', exact: true }).last().click()
        return false
      }, { timeout: 60_000, intervals: [1500,3000] }).toBe(true)
      const downloading = page.waitForEvent('download')
      await selectors.dialog(page).getByRole('button', { name: 'Download', exact: true }).click()
      const log = info.outputPath('viewport.log')
      await (await downloading).saveAs(log)
      expect(await fs.readFile(log, 'utf8')).toContain('长中文名称😀 viewport &+%#')
      await selectors.dialog(page).getByRole('button', { name: 'Close this dialog' }).click()
      await expect(selectors.dialog(page)).not.toBeVisible()

      await page.goto('/#/oms/workflow')
      await page.getByRole('button', { name: 'New workflow', exact: true }).click()
      await input(page.locator('main'), 'Workflow name', name)
      await page.locator('.canvas-toolbar').getByRole('button', { name: /Import job/ }).click()
      const drawer = selectors.dialog(page)
      await input(drawer, 'Job ID', jobId)
      await drawer.getByRole('button', { name: 'Query', exact: true }).click()
      const imported = await clickAndResponse(page, '/workflow/saveNode', () => selectors.row(page, String(jobId)).getByRole('button', { name: 'Import', exact: true }).click())
      expect(imported.success).toBe(true)
      const nodeId = String(imported.data[0].id)
      await expect(drawer).not.toBeVisible()
      await page.locator(`[data-node-id="${nodeId}"]`).click()
      const panel = page.locator('.node-panel')
      await expect(panel).toBeVisible()
      await input(panel, 'Node name', '非常长的中文节点名称 😀 viewport alias')
      await page.locator('.canvas-toolbar').getByRole('button', { name: 'Auto Fit', exact: true }).click()
      const saved = await clickAndResponse(page, '/workflow/save', () => page.locator('.editor-heading').getByRole('button', { name: 'Save', exact: true }).click())
      expect(saved.success).toBe(true)
      workflowId = saved.data
      await page.reload()
      await expect(page.locator(`[data-node-id="${nodeId}"]`)).toContainText('非常长的中文节点名称')
      await page.locator(`[data-node-id="${nodeId}"]`).click()
      await expect(page.locator('.node-panel')).toBeVisible()
      await expect(page.locator('.editor-heading').getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
      await page.goto('/#/oms/containermanage')
      await page.getByRole('button', { name: 'New container', exact: true }).click()
      await input(selectors.dialog(page), 'Name', name)
      await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(selectors.dialog(page)).not.toBeVisible()
      const result = { caseId: 'UI-035', variantId: `viewport-${width}`, status: 'PASS', testTitle: info.title, actual: { width, taskRealSaveRun: true, exactParamsLog: true, logSha256: await fileHash(log), dagImportEditSaveReload: true, longUnicodeNode: true, containerFormInputCancel: true } }
      await fs.writeFile(info.outputPath(`variant-viewport-${width}.json`), JSON.stringify(result, null, 2))
      await info.attach(`viewport-${width}`, { body: JSON.stringify(result), contentType: 'application/json' })
    } finally {
      if (workflowId) {
        const owned = await backend.call('/workflow/fetch?workflowId=' + workflowId)
        if (!owned.wfName.startsWith(runId)) throw new Error('Refusing cleanup outside viewport lane')
        await backend.call('/workflow/delete?workflowId=' + workflowId)
      }
      if (jobId) await backend.deleteOwnedJob(jobId)
    }
  })
}
