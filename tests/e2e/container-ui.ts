import type { Page } from '@playwright/test'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import { expect, selectors, fill, clickAndResponse, id, fileHash, type Backend, type RecordDTO } from './helpers'
import type { OwnedResources } from './owned'

// Formal 5.1.6 prints one version header for a group of Workers, not one header per Worker.
export function deployedVersions(text: string) {
  const versions = new Map<string, Set<string>>()
  let version = ''
  for (const line of text.split(/\r?\n/)) {
    const header = /^\[version\]\s+(.+)$/.exec(line.trim())
    if (header) { version = header[1].trim(); versions.set(version, new Set()); continue }
    const address = /^Address:\s*([^,]+),\s*DeployedTime:/.exec(line.trim())
    if (address && version) versions.get(version)!.add(address[1].trim())
  }
  return versions
}
export const bothWorkersAtVersion = (text: string, version: string, workers: RecordDTO[]) => {
  const addresses = deployedVersions(text).get(version)
  return workers.length >= 2 && workers.every(worker => addresses?.has(String(worker.address)) === true)
}

export async function deployFixture(page: Page, backend: Backend, ledger: OwnedResources, name: string, jar: string) {
  await fs.access(jar)
  const workers = (await backend.call<RecordDTO[]>('/system/listWorker', { query: { appId: backend.appId } })).filter(worker => Number(worker.status) !== 9999)
  expect(workers.length).toBeGreaterThanOrEqual(2)
  await page.goto('/#/oms/containermanage')
  await page.getByRole('button', { name: 'New container', exact: true }).click()
  const dialog = selectors.dialog(page, 'New container')
  await fill(dialog, 'Container name', name)
  await dialog.getByLabel('Container type', { exact: true }).selectOption('FatJar')
  const uploaded = await clickAndResponse<string>(page, '/container/jarUpload', () => dialog.getByLabel('Upload JAR', { exact: true }).setInputFiles(jar))
  expect(uploaded.success).toBe(true)
  expect(uploaded.data).toBe(crypto.createHash('md5').update(await fs.readFile(jar)).digest('hex'))
  expect((await clickAndResponse(page, '/container/save', () => dialog.getByRole('button', { name: 'Save container', exact: true }).click())).success).toBe(true)
  await expect(dialog).not.toBeVisible()
  const container = (await backend.containers()).find(row => row.containerName === name)!
  const containerId = ledger.track('container', id(container.id), name)
  expect(container.sourceInfo).toBe(uploaded.data)
  expect((await backend.file('/container/downloadJar', { version: uploaded.data })).sha256).toBe(await fileHash(jar))
  await selectors.row(page, name).getByRole('button', { name: 'Deploy', exact: true }).click()
  const deployment = selectors.dialog(page, `Deploy container · ${name}`)
  await expect(deployment.locator('[data-status="success"]')).toBeVisible({ timeout: 120_000 })
  await deployment.getByRole('button', { name: 'Close', exact: true }).click()
  let workerReadback = ''
  await expect.poll(async () => {
    await selectors.row(page, name).getByRole('button', { name: 'More', exact: true }).click()
    await selectors.dialog(page, name).getByRole('button', { name: 'Deployed Workers', exact: true }).click()
    const workerDialog = selectors.dialog(page, `Deployed Workers · ${name}`)
    await expect(workerDialog.locator('pre')).not.toHaveText('Waiting for logs…')
    workerReadback = await workerDialog.locator('pre').innerText()
    await workerDialog.getByRole('button', { name: 'Close', exact: true }).click()
    return bothWorkersAtVersion(workerReadback, uploaded.data, workers)
  }, { timeout: 120_000, intervals: [1000, 2000], message: 'The page must read both actual Worker versions after dispatch' }).toBe(true)
  return { containerId, version: uploaded.data, workerReadback, sourceSHA256: await fileHash(jar), workers }
}
