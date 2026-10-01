import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { test, expect, secretFill, enterSamples, selectors, fill, clickAndResponse, Backend, id, ownedName, fileHash, observation, redact } from './helpers'
import { OwnedResources } from './owned'

test('UI-035 · an isolated actual Chrome 200 percent browser zoom logs in, saves a Job and downloads original Worker logs', async ({ credentials, request }, info) => {
  test.setTimeout(240_000)
  const profile = info.outputPath('isolated-chrome-profile')
  const level = Math.log(2) / Math.log(1.2)
  await fs.mkdir(path.join(profile, 'Default'), { recursive: true })
  // ChromeZoomLevelPrefs uses partition "x" for the default profile partition.
  // This sets Chrome's own persisted browser zoom; no CSS zoom, pinch scale or DPR emulation is used.
  await fs.writeFile(path.join(profile, 'Default', 'Preferences'), JSON.stringify({ partition: { default_zoom_level: { x: level } } }))
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.POWERJOB_E2E_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true, viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'Asia/Shanghai',
  })
  const page = context.pages()[0] || await context.newPage()
  const ownErrors: string[] = []
  page.on('pageerror', error => ownErrors.push(String(redact(error.message))))
  page.on('console', message => { if (/\[Vue warn\]|Failed to resolve component/.test(message.text())) ownErrors.push(String(redact(message.text()))) })
  const baseURL = process.env.POWERJOB_E2E_BASE_URL || 'http://127.0.0.1:5201'
  const prefix = (process.env.POWERJOB_E2E_PATH_PREFIX || '').replace(/\/$/, '')
  const originalGoto = page.goto.bind(page)
  page.goto = (url, options) => originalGoto(url.startsWith('/#/') ? baseURL + prefix + url : url, options)
  await page.addInitScript(() => localStorage.setItem('oms_lang', 'en'))
  let ledger: OwnedResources | undefined
  try {
    await page.goto('/#/powerjobLogin')
    const loginForm = page.locator('form').filter({ has: page.getByRole('button', { name: 'Sign in', exact: true }) })
    await secretFill(loginForm.getByLabel('Username', { exact: true }), credentials.admin_username)
    await secretFill(loginForm.getByLabel('Password', { exact: true }), credentials.admin_password)
    await loginForm.getByRole('button', { name: 'Sign in', exact: true }).press('Enter')
    await expect(page.getByRole('heading', { name: 'Applications', exact: true })).toBeVisible()
    const metrics = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio, cssZoom: getComputedStyle(document.documentElement).zoom, visualScale: visualViewport?.scale }))
    expect(metrics.width).toBe(720)
    expect(metrics.height).toBe(450)
    expect(metrics.dpr).toBe(2)
    expect(metrics.visualScale).toBe(1)
    expect(metrics.cssZoom).toBe('1')
    const token = await page.evaluate(() => localStorage.getItem('PowerJwt'))
    if (!token) throw new Error('Actual zoomed login did not establish a session')
    const backend = new Backend(request, process.env.POWERJOB_E2E_SERVER || credentials.server_urls![0]!, token, credentials.app_id)
    ledger = new OwnedResources(backend)
    await enterSamples(page, credentials)
    const name = ownedName('browser_zoom')
    await page.goto('/#/oms/job')
    await page.getByRole('button', { name: 'New job', exact: true }).press('Enter')
    const editor = selectors.dialog(page, 'New job')
    await fill(editor, 'Job name', name)
    await editor.getByLabel('Job name', { exact: true }).press('Tab')
    await fill(editor, 'Processor', 'tech.powerjob.samples.processors.SimpleProcessor')
    await fill(editor, 'Job parameters', name)
    const saved = await clickAndResponse(page, '/job/save', () => editor.getByRole('button', { name: 'Save job', exact: true }).press('Enter'))
    expect(saved.success).toBe(true)
    await expect(editor).not.toBeVisible()
    const created = (await backend.listJobs(name)).data.filter(row => row.jobName === name)
    expect(created).toHaveLength(1)
    const job = created[0]
    ledger.track('job', id(job.id), name)
    await fill(page, 'Keyword', name)
    await clickAndResponse(page, '/job/list', () => page.getByRole('button', { name: 'Search', exact: true }).press('Enter'), response => response.request().postDataJSON()?.keyword === name)
    const run = await clickAndResponse(page, '/job/run', () => selectors.row(page, name).getByRole('button', { name: 'Run', exact: true }).press('Enter'))
    expect(run.success).toBe(true)
    const instanceId = ledger.trackInstance(id(run.data), id(job.id))
    await backend.waitInstance(instanceId, [5])
    await page.goto('/#/oms/instance?jobId=' + id(job.id))
    await fill(page, 'Instance ID', instanceId)
    await clickAndResponse(page, '/instance/list', () => page.getByRole('button', { name: 'Search', exact: true }).press('Enter'))
    await selectors.row(page, instanceId).getByRole('button', { name: 'Details', exact: true }).press('Enter')
    const dialog = selectors.dialog(page, `Instance details #${instanceId}`)
    await dialog.getByRole('button', { name: 'Logs', exact: true }).press('Enter')
    const logs = dialog.getByRole('region', { name: 'Online logs', exact: true })
    await expect.poll(async () => {
      const response = await clickAndResponse<{ data: string }>(page, '/instance/log', () => logs.getByRole('button', { name: 'Refresh logs', exact: true }).press('Enter'))
      return response.data.data.includes(name)
    }, { timeout: 120_000, intervals: [1500, 3000] }).toBe(true)
    const original = await backend.file('/instance/downloadLog4Console', { instanceId })
    const download = page.waitForEvent('download')
    await logs.getByRole('button', { name: 'Download logs', exact: true }).press('Enter')
    const filename = info.outputPath('actual-browser-200-percent.log')
    await (await download).saveAs(filename)
    expect(await fileHash(filename)).toBe(original.sha256)
    await page.screenshot({ path: info.outputPath('actual-browser-200-percent.png'), fullPage: true, mask: [page.locator('input[type="password"],[data-private]')] })
    await observation(info, 'UI-035', 'zoom-200', { persistedChromeZoomLevel: level, actualPageMetrics: metrics, actualJobId: id(job.id), nativeButtonsActivatedByKeyboard: true, zeroCustomPageUncaughtErrors: ownErrors.length === 0, instanceId, originalLogSHA256: original.sha256, originalSource: 'https://github.com/chromium/chromium/blob/main/chrome/browser/ui/zoom/chrome_zoom_level_prefs.cc', normalUserProfileModified: false })
  } finally { try { if (ledger) await ledger.cleanup(info); expect(ownErrors).toEqual([]) } finally { await context.close() } }
})
