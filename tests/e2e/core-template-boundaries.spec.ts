import fs from 'node:fs/promises'
import { test, expect, fill, enterSamples, ownedName, observation, fileHash } from './helpers'
import { zipEntries } from './zip-oracle'

test.use({ actionTimeout: 15_000 })

test('UI-026 · every required template field and invalid Java package reject without requests, network failure keeps draft and actual ZIP recovers', async ({ page, credentials, backend: _backend }, info) => {
  await enterSamples(page, credentials); await page.goto('/#/oms/template')
  const fields = { Group: 'org.acceptance', Artifact: ownedName('template_boundary'), Name: '边界 Unicode 😀', 'Package name': 'org.acceptance.模板' }
  const generate = () => page.getByRole('button', { name: 'Generate & download', exact: true })
  let requests = 0; let downloads = 0
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/container/downloadContainerTemplate')) requests++ })
  page.on('download', () => downloads++)
  for (const [label, value] of Object.entries(fields)) await fill(page, label, value)
  for (const [label, value] of Object.entries(fields)) {
    await fill(page, label, ''); await generate().click(); await expect(page.getByRole('alert')).toHaveText('Complete all required fields.'); expect(requests).toBe(0); expect(downloads).toBe(0); await fill(page, label, value)
  }
  for (const invalid of ['class.example', 'org..acceptance', '9invalid.example', 'org.bad space']) {
    await fill(page, 'Package name', invalid); await generate().click(); await expect(page.getByRole('alert')).toHaveText('Enter a valid package name for the selected Java version.'); expect(requests).toBe(0); expect(downloads).toBe(0)
  }
  await fill(page, 'Package name', 'org._')
  await page.getByLabel('Java Version', { exact: true }).selectOption('11'); await generate().click(); await expect(page.getByRole('alert')).toHaveText('Enter a valid package name for the selected Java version.'); expect(requests).toBe(0)
  await fill(page, 'Package name', fields['Package name']); await page.getByLabel('Java Version', { exact: true }).selectOption('8')
  await page.route('**/container/downloadContainerTemplate', route => route.abort('failed'))
  await generate().click(); await expect(page.getByRole('alert')).toBeVisible(); expect(downloads).toBe(0)
  for (const [label, value] of Object.entries(fields)) await expect(page.getByLabel(label, { exact: true })).toHaveValue(value)
  await page.unroute('**/container/downloadContainerTemplate')
  let serverSHA = ''; let originalBytes: Buffer | undefined
  await page.route('**/container/downloadContainerTemplate', async route => { const actual = await route.fetch(); expect(actual.ok()).toBe(true); originalBytes = await actual.body(); serverSHA = await import('node:crypto').then(({ createHash }) => createHash('sha256').update(originalBytes!).digest('hex')); await route.fulfill({ response: actual }) })
  const waiting = page.waitForEvent('download'); await generate().click(); const downloaded = await waiting; const output = info.outputPath('actual-boundary-template.zip'); await downloaded.saveAs(output)
  expect(await fileHash(output)).toBe(serverSHA); expect(downloads).toBe(1)
  const entries = zipEntries(output)
  expect(entries.some(entry => entry.endsWith('pom.xml'))).toBe(true)
  expect(entries.some(entry => /src\/main\/java\/org\/acceptance\/模板\/$/.test(entry))).toBe(true)
  await observation(info, 'UI-026', 'template-missing-fields', { everyRequiredFieldIndividuallyCleared: Object.keys(fields), zeroRequestsAndDownloadsForAllMissingFields: true, nativeDraftPreservedAcrossActualNetworkFailure: true, actualZIPRecoveredWithOriginalResponseSHA: serverSHA, originalByteCount: originalBytes?.length })
  await observation(info, 'UI-026', 'template-download-failure', { actualRequestNetworkAbortNoReplacementResponse: true, noErrorDownload: true, sameFourFieldDraftRetainedThenNativeDownloadRecovered: true, originalResponseSHA: serverSHA })
  await observation(info, 'UI-026', 'template-invalid-identifiers', { invalidPackagesTested: ['class.example', 'org..acceptance', '9invalid.example', 'org.bad space', 'org._ on Java 11'], zeroTemplateRequestsForInvalidPackages: true, subsequentUnicodePackageActualZIP: true, entries })
  await fs.access(output)
  await page.unroute('**/container/downloadContainerTemplate')
})
