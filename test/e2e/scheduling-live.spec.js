import { test, expect, selectors, runId, demoProcessor, input, choose, enterSamples, saveDialog, clickAndResponse } from './support.js'
import fs from 'node:fs/promises'

test('UI-014 · actual CRON enable/disable suppresses and restores real Worker triggers', async ({ page, backend, credentials }, info) => {
  test.setTimeout(120_000)
  await enterSamples(page, credentials)
  const name = `${runId}_cron_actual`
  let id
  const list = () => backend.call('/instance/list', { method: 'POST', data: { appId: credentials.app_id, jobId: id, type: 'NORMAL', index: 0, pageSize: 100 } })
  async function row() {
    await page.goto('/#/oms/job')
    await input(page.locator('main'), 'Job ID', id)
    await page.getByRole('button', { name: 'Query', exact: true }).click()
    return selectors.row(page, String(id))
  }
  async function proof(variantId, actual) {
    const result = { caseId: 'UI-014', variantId, status: 'PASS', testTitle: info.title, actual }
    await fs.writeFile(info.outputPath(`variant-${variantId}.json`), JSON.stringify(result, null, 2))
    await info.attach(variantId, { body: JSON.stringify(result), contentType: 'application/json' })
  }
  try {
    await page.goto('/#/oms/job')
    await page.getByRole('button', { name: 'New job', exact: true }).click()
    await input(selectors.dialog(page), 'Job name', name)
    await input(selectors.dialog(page), 'Job params', 'scheduled actual 中文 😀')
    await input(selectors.dialog(page), 'Execution config', demoProcessor)
    await choose(page, selectors.dialog(page), 'Schedule info', 'CRON')
    await selectors.dialog(page).getByPlaceholder('Cron expression or number of millions for fixed_rate/fixed_delay job', { exact: true }).fill('0/5 * * * * ?')
    await saveDialog(page, '/job/save')
    id = (await backend.listJobs(name)).data[0].id
    expect((await backend.job(id)).timeExpression).toBe('0/5 * * * * ?')
    await expect.poll(async () => (await list()).data.some(instance => instance.status === 5), { timeout: 40_000, intervals: [500, 1000] }).toBe(true)
    const initial = await list()
    expect(initial.data.filter(instance => instance.status === 5).length).toBeGreaterThanOrEqual(1)
    const disable = await clickAndResponse(page, '/job/disable', () => row().then(target => target.locator('.el-switch').click()))
    expect(disable.success).toBe(true)
    expect((await backend.job(id)).enable).toBe(false)
    await page.reload()
    await input(page.locator('main'), 'Job ID', id)
    await page.getByRole('button', { name: 'Query', exact: true }).click()
    await expect(selectors.row(page, String(id)).locator('.el-switch')).not.toHaveClass(/is-checked/)
    const disabledIds = (await list()).data.map(instance => String(instance.instanceId)).sort()
    const deadline = Date.now() + 12_000
    await expect.poll(async () => {
      const instances = (await list()).data
      // Existing queued instances may finish; no newly created scheduled instance may appear.
      expect(instances.map(instance => String(instance.instanceId)).sort()).toEqual(disabledIds)
      return Date.now() >= deadline
    }, { timeout: 18_000, intervals: [1000, 1500] }).toBe(true)
    await proof('disable-job', { actualCronWorkerSuccessBeforeDisable: true, disabledHardReload: true, threeTriggerIntervalsObserved: true, noNewTriggerAfterDisableBoundary: true, originalAlreadyQueuedTriggerAllowed: true })
    const enable = await clickAndResponse(page, '/job/save', () => selectors.row(page, String(id)).locator('.el-switch').click())
    expect(enable.success).toBe(true)
    expect((await backend.job(id)).enable).toBe(true)
    await expect.poll(async () => (await list()).data.some(instance => !disabledIds.includes(String(instance.instanceId)) && instance.status === 5), { timeout: 40_000, intervals: [500, 1000] }).toBe(true)
    const succeeded = (await list()).data.filter(instance => !disabledIds.includes(String(instance.instanceId)) && instance.status === 5)
    expect(succeeded.length).toBeGreaterThanOrEqual(1)
    await page.reload()
    await input(page.locator('main'), 'Job ID', id)
    await page.getByRole('button', { name: 'Query', exact: true }).click()
    await expect(selectors.row(page, String(id)).locator('.el-switch')).toHaveClass(/is-checked/)
    await proof('enable-job', { disabledToEnabledPageSave: true, hardReloadEnabled: true, actualNewCronWorkerSuccess: succeeded.map(instance => String(instance.instanceId)) })
  } finally {
    if (id) {
      await backend.call('/job/disable?jobId=' + id, { allowFailure: true })
      for (const instance of (await list()).data.filter(instance => [1, 2, 3].includes(instance.status))) await backend.call('/instance/stop?instanceId=' + instance.instanceId, { allowFailure: true })
      await backend.deleteOwnedJob(id)
    }
  }
})
