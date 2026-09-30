import { test, expect, selectors, runId, demoProcessor, input, choose, enterSamples, saveDialog, clickAndResponse, fileHash } from './support.js'
import fs from 'node:fs/promises'
import path from 'node:path'

// These checks run against an extracted static distribution with a same-origin
// reverse proxy. Development-server runs intentionally report them as skipped.
for (const prefix of ['/', '/console/']) {
  test(`UI-037 · compiled static deployment ${prefix} runtime API, job execution, log download and refresh`, async ({ page, backend, credentials }, testInfo) => {
    test.skip(!process.env.POWERJOB_E2E_RELEASE_ROOT, 'Set the extracted release dist path and an independent static BASE_URL')
    test.setTimeout(150_000)
    await enterSamples(page, credentials)
    await page.goto(`${prefix}#/oms/job`)
    await expect(page.getByRole('heading', { name: 'Job management', exact: true })).toBeVisible()
    const packageRoot = process.env.POWERJOB_E2E_RELEASE_ROOT
    const apiRequests = []
    page.on('request', request => {
      const url = new URL(request.url())
      if (url.pathname.includes('/api/')) apiRequests.push(url.pathname)
    })
    const name = `${runId}_${prefix === '/' ? 'root' : 'subpath'}_release`
    let id
    try {
      await page.getByRole('button', { name: 'New job', exact: true }).click()
      const dialog = selectors.dialog(page)
      await input(dialog, 'Job name', name)
      await input(dialog, 'Job params', 'success')
      await choose(page, dialog, 'Schedule info', 'API')
      await input(dialog, 'Execution config', demoProcessor)
      await saveDialog(page, '/job/save')
      const created = (await backend.listJobs(name)).data
      expect(created).toHaveLength(1)
      id = created[0].id
      await input(page.locator('main'), 'Job ID', id)
      await page.getByRole('button', { name: 'Query', exact: true }).click()
      const row = selectors.row(page, String(id))
      const run = await clickAndResponse(page, '/job/run', () => row.getByRole('button', { name: 'Run', exact: true }).click())
      expect(run.success).toBe(true)
      const instance = await backend.waitInstance(run.data, [5])
      expect(instance.result).toContain('true')
      await page.goto(`${prefix}#/oms/instance?jobId=${id}`)
      const instanceRow = selectors.row(page, String(run.data))
      await expect(instanceRow).toContainText('Success')
      await instanceRow.getByRole('button', { name: 'Detail', exact: true }).click()
      await expect(selectors.dialog(page)).toContainText(String(run.data))
      await selectors.dialog(page).getByRole('button', { name: 'Close this dialog' }).click()
      await expect(selectors.dialog(page)).not.toBeVisible()
      // Worker log flushing is asynchronous. Reopening the page log reads the
      // real storage again instead of treating a successful HTTP response as proof.
      await expect(async () => {
        await instanceRow.getByRole('button', { name: 'Log', exact: true }).click()
        const log = selectors.dialog(page)
        const content = await log.locator('.log-output').textContent()
        await log.getByRole('button', { name: 'Close this dialog' }).click()
        await expect(log).not.toBeVisible()
        expect(content).toContain('StandaloneProcessorDemo finished process,success: true')
      }).toPass({ timeout: 30_000, intervals: [1500, 3000] })
      await instanceRow.getByRole('button', { name: 'Log', exact: true }).click()
      const downloadEvent = page.waitForEvent('download')
      await selectors.dialog(page).getByRole('button', { name: 'Download', exact: true }).click()
      const download = await downloadEvent
      const filename = testInfo.outputPath('release-instance.log')
      await download.saveAs(filename)
      expect(await fs.readFile(filename, 'utf8')).toContain('StandaloneProcessorDemo finished process,success: true')
      await page.reload()
      await expect(selectors.row(page, String(run.data))).toContainText('Success')
      expect(apiRequests.length).toBeGreaterThan(3)
      expect(apiRequests.every(url => url.startsWith(prefix + 'api/'))).toBe(true)
      await testInfo.attach('static-release-proof', { body: JSON.stringify({ prefix, indexSha256: await fileHash(path.join(packageRoot, 'index.html')), configSha256: await fileHash(path.join(packageRoot, 'config.js')), logSha256: await fileHash(filename), instanceId: String(run.data), status: instance.status }), contentType: 'application/json' })
    } finally { if (id) await backend.deleteOwnedJob(id) }
  })
}
