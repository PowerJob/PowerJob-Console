import { test, expect, selectors, runId, input, enterSamples, demoProcessor, saveDialog, clickAndResponse, fileHash } from './support.js'
import fs from 'node:fs/promises'

test('UI-019/030 · same-origin runtime API node switch retains session and archived log bytes', async ({ page, backend, credentials }, info) => {
  test.setTimeout(150_000)
  const statePath = process.env.POWERJOB_E2E_RUNTIME_STATE
  test.skip(!statePath, 'BLOCKED: a dedicated production runtime API switch deployment is required')
  const state = JSON.parse(await fs.readFile(statePath, 'utf8'))
  if (state.apiBaseUrl !== '/backend-one') throw new Error('The dedicated API switch fixture must start on backend-one')
  await enterSamples(page, credentials)
  let jobId
  const name = `${runId}_node_switch`
  try {
    await page.goto('/#/oms/job')
    await page.getByRole('button', { name: 'New job', exact: true }).click()
    await input(selectors.dialog(page), 'Job name', name)
    await input(selectors.dialog(page), 'Job params', 'node-switch 中文 😀')
    await input(selectors.dialog(page), 'Execution config', demoProcessor)
    await saveDialog(page, '/job/save')
    jobId = (await backend.listJobs(name)).data[0].id
    await input(page.locator('main'), 'Job ID', jobId)
    await page.getByRole('button', { name: 'Query', exact: true }).click()
    const run = await clickAndResponse(page, '/job/run', () => selectors.row(page, String(jobId)).getByRole('button', { name: 'Run', exact: true }).click())
    expect(run.success).toBe(true)
    await backend.waitInstance(run.data, [5])
    async function download(label) {
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
      }, { timeout: 60_000, intervals: [1500, 3000] }).toBe(true)
      const waiting = page.waitForEvent('download')
      await selectors.dialog(page).getByRole('button', { name: 'Download', exact: true }).click()
      const filename = info.outputPath(`${label}.log`)
      await (await waiting).saveAs(filename)
      expect(await fs.readFile(filename, 'utf8')).toContain('node-switch 中文 😀')
      const hash = await fileHash(filename)
      await selectors.dialog(page).getByRole('button', { name: 'Close this dialog' }).click()
      await expect(selectors.dialog(page)).not.toBeVisible()
      return hash
    }
    const firstHash = await download('server-one')
    const session = await page.evaluate(() => ({ token: localStorage.getItem('PowerJwt'), app: localStorage.getItem('Power_appId'), lang: localStorage.getItem('oms_lang') }))
    await fs.writeFile(statePath, JSON.stringify({ ...state, apiBaseUrl: '/backend-two' }, null, 2))
    await page.reload()
    const retained = await page.evaluate(before => localStorage.getItem('PowerJwt') === before.token && localStorage.getItem('Power_appId') === before.app && localStorage.getItem('oms_lang') === before.lang, session)
    expect(retained).toBe(true)
    await expect(page).toHaveURL(/oms\/instance/)
    const secondHash = await download('server-two')
    expect(secondHash).toBe(firstHash)
    for (const [caseId, variantId] of [['UI-019', 'cross-server-download'], ['UI-030', 'server-node-switch']]) {
      const result = { caseId, variantId, status: 'PASS', testTitle: info.title, actual: { sameOrigin: true, apiNodes: ['released-5.1.6-server-one', 'released-5.1.6-server-two'], unchangedJWTAndApp: true, pageDownloads: true, sha256: firstHash, sameBytes: true } }
      await fs.writeFile(info.outputPath(`variant-${caseId}-${variantId}.json`), JSON.stringify(result, null, 2))
      await info.attach(`${caseId}/${variantId}`, { body: JSON.stringify(result), contentType: 'application/json' })
    }
  } finally {
    await fs.writeFile(statePath, JSON.stringify(state, null, 2))
    if (jobId) await backend.deleteOwnedJob(jobId)
  }
})
