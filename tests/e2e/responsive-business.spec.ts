import { test, expect, enterSamples, selectors, fill, clickAndResponse, id, ownedName, fileHash, observation } from './helpers'
import { createJob, editJob, jobSection, saveJob } from './job-ui'
import { WorkflowActions, trackChildren } from './workflow-actions'

for (const width of [1440, 1024, 768, 390]) {
  test(`UI-035 · ${width}px actual management, full Job form, DAG inspector, original logs and container drafts remain usable`, async ({ page, backend, credentials }, info) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width, height: 900 })
    const workflow = new WorkflowActions(page, backend, info)
    const name = ownedName('responsive_' + width) + '_中文长名称_明确可识别的任务与参数'
    const params = '中文参数 / & ? = + # % 😀 ' + 'long parameter '.repeat(15)
    const geometry: unknown[] = []
    const inspect = async (domain: string) => {
      const actual = await page.evaluate(() => {
        const dialog = document.querySelector('dialog[open]')
        const targets = dialog ? [dialog] : [document.querySelector('main')].filter(Boolean)
        return { width: innerWidth, documentWidth: document.documentElement.scrollWidth, isDialog: !!dialog, boxes: targets.map(element => { const r = element!.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom } }) }
      })
      expect(actual.documentWidth).toBeLessThanOrEqual(width + 1)
      for (const box of actual.boxes) {
        expect(box.left).toBeGreaterThanOrEqual(-1); expect(box.right).toBeLessThanOrEqual(width + 1)
        if (actual.isDialog) { expect(box.top).toBeGreaterThanOrEqual(-1); expect(box.bottom).toBeLessThanOrEqual(901) }
      }
      const horizontalTables: unknown[] = []
      for (const table of await page.locator(actual.isDialog ? 'dialog[open] .table-scroll' : 'main .table-scroll').all()) {
        const before = await table.evaluate(element => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, scrollLeft: element.scrollLeft }))
        const dataRows = await table.locator('tbody tr').count()
        if (actual.isDialog && dataRows === 0) { horizontalTables.push({ ...before, dataRows, emptyTaskHeaderHasNoBusinessRecordsToScroll: true }); continue }
        if (before.scrollWidth > before.clientWidth + 1) {
          await table.hover()
          await page.mouse.wheel(450, 0)
          await expect.poll(() => table.evaluate(element => element.scrollLeft)).toBeGreaterThan(before.scrollLeft)
          const moved = await table.evaluate(element => element.scrollLeft)
          await page.mouse.wheel(-10000, 0)
          await expect.poll(() => table.evaluate(element => element.scrollLeft)).toBe(0)
          horizontalTables.push({ ...before, movedByActualHorizontalWheel: moved, restoredScrollLeft: 0 })
        } else horizontalTables.push({ ...before, overflowNotNeededAtThisWidth: true })
      }
      geometry.push({ domain, actual, horizontalTables })
    }
    try {
      for (const [route, heading] of [['/admin/app', 'Applications'], ['/admin/namespace', 'Namespaces'], ['/admin/user', 'Users']] as const) {
        await page.goto('/#' + route)
        await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
        await inspect(route)
      }
      await enterSamples(page, credentials)
      const job = await createJob(page, backend, workflow.owned, name, 'tech.powerjob.samples.processors.StandaloneProcessorDemo', params)
      const editor = await editJob(page, name)
      for (const section of ['Job information', 'Schedule', 'Runtime', 'Alerts & logs']) { await jobSection(editor, section); await inspect('job-' + section) }
      await saveJob(page)
      const ran = await clickAndResponse(page, '/job/run', () => selectors.row(page, name).getByRole('button', { name: 'Run', exact: true }).click())
      expect(ran.success).toBe(true)
      const instanceId = workflow.owned.trackInstance(id(ran.data), id(job.id))
      await backend.waitInstance(instanceId, [5])
      await page.goto('/#/oms/instance?jobId=' + id(job.id))
      await fill(page, 'Instance ID', instanceId)
      await clickAndResponse(page, '/instance/list', () => page.getByRole('button', { name: 'Search', exact: true }).click())
      await selectors.row(page, instanceId).getByRole('button', { name: 'Details', exact: true }).click()
      const detail = selectors.dialog(page, `Instance details #${instanceId}`)
      await expect(detail).toContainText(params)
      await inspect('instance-detail')
      await detail.getByRole('button', { name: 'Logs', exact: true }).click()
      const logs = detail.getByRole('region', { name: 'Online logs', exact: true })
      await expect.poll(async () => {
        await logs.getByRole('button', { name: 'Refresh logs', exact: true }).click()
        return await logs.locator('pre').innerText()
      }, { timeout: 120_000, intervals: [1500, 3000] }).toContain('StandaloneProcessorDemo finished process,success: true')
      const original = await backend.file('/instance/downloadLog4Console', { instanceId })
      const download = page.waitForEvent('download')
      await logs.getByRole('button', { name: 'Download logs', exact: true }).click()
      const file = info.outputPath(`original-${width}.log`)
      await (await download).saveAs(file)
      expect(await fileHash(file)).toBe(original.sha256)
      await detail.getByRole('button', { name: 'Close', exact: true }).click()
      const wfName = ownedName('responsive_workflow_' + width)
      await workflow.create(wfName)
      const nodeId = await workflow.importJob(id(job.id))
      const inspector = await workflow.select(nodeId)
      await expect(inspector).toBeVisible()
      await fill(inspector, 'Node parameters', params)
      await workflow.nodeSave(inspector)
      await inspect('workflow-inspector')
      const workflowId = await workflow.save(wfName)
      const wfInstanceId = await workflow.run(workflowId, params)
      const completed = await backend.waitWorkflowInstance(wfInstanceId, [4])
      trackChildren(workflow.owned, completed)
      await page.goto('/#/oms/wfInstanceDetail?wfInstanceId=' + wfInstanceId)
      await expect(page.locator('.flow-node')).toHaveCount(1)
      await inspect('workflow-instance')
      await page.goto('/#/oms/containermanage')
      for (const type of ['Git', 'FatJar']) {
        await page.getByRole('button', { name: 'New container', exact: true }).click()
        const container = selectors.dialog(page, 'New container')
        await container.getByLabel('Container type', { exact: true }).selectOption(type)
        await fill(container, 'Container name', ownedName('responsive_container_' + width))
        await inspect('container-' + type)
        await container.getByRole('button', { name: 'Cancel', exact: true }).click()
        await expect(container).not.toBeVisible()
      }
      await observation(info, 'UI-035', 'viewport-' + width, { geometry, actualJobId: id(job.id), actualInstanceId: instanceId, originalLogSHA256: original.sha256, actualWorkflowId: workflowId, actualWorkflowInstanceId: wfInstanceId, actualWorkerStatus: completed.status, containerDraftsCancelled: ['Git', 'FatJar'], longUnicodeNameAndLiteralParametersReadBack: true })
    } finally { await workflow.cleanup() }
  })
}
