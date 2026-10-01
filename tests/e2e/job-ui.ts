import type { Page } from '@playwright/test'
import { expect, selectors, fill, clickAndResponse, id, processors, type Backend, type RecordDTO } from './helpers'
import type { OwnedResources } from './owned'

export async function jobSection(dialog: import('@playwright/test').Locator, section: string) {
  if (!['Job information', 'Schedule', 'Runtime', 'Alerts & logs'].includes(section)) throw new Error('Unknown native Job configuration section')
  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const button = dialog.getByRole('navigation', { name: 'Job configuration sections', exact: true }).getByRole('button', { name: new RegExp('^' + escaped + '(?: |$)') })
  await expect(button).toHaveCount(1)
  await button.click({ timeout: 15_000 })
}

export async function searchJob(page: Page, name: string) {
  await fill(page, 'Keyword', name)
  const result = await clickAndResponse(page, '/job/list', () => page.getByRole('button', { name: 'Search', exact: true }).click(), response => response.request().postDataJSON()?.keyword === name)
  expect(result.success).toBe(true)
}
export async function createJob(page: Page, backend: Backend, ledger: OwnedResources, name: string, processor: string = processors.simple, parameters = 'CN synthetic'): Promise<RecordDTO> {
  await page.goto('/#/oms/job')
  await page.getByRole('button', { name: 'New job', exact: true }).click()
  const dialog = selectors.dialog(page, 'New job')
  await fill(dialog, 'Job name', name)
  await fill(dialog, 'Processor', processor)
  await fill(dialog, 'Job parameters', parameters)
  const result = await clickAndResponse(page, '/job/save', () => dialog.getByRole('button', { name: 'Save job', exact: true }).click())
  expect(result.success).toBe(true)
  await expect(dialog).not.toBeVisible()
  const rows = (await backend.listJobs(name)).data.filter(row => row.jobName === name)
  expect(rows).toHaveLength(1)
  ledger.track('job', id(rows[0].id), name)
  await searchJob(page, name)
  return rows[0]
}
export async function editJob(page: Page, name: string) {
  await selectors.row(page, name).getByRole('button', { name: 'Edit', exact: true }).click()
  const dialog = selectors.dialog(page, 'Edit job')
  await expect(dialog).toBeVisible()
  return dialog
}
export async function saveJob(page: Page) {
  const dialog = selectors.dialog(page, 'Edit job')
  const result = await clickAndResponse(page, '/job/save', () => dialog.getByRole('button', { name: 'Save job', exact: true }).click())
  expect(result.success).toBe(true)
  await expect(dialog).not.toBeVisible()
}
export async function moreJob(page: Page, name: string, action: string) {
  await selectors.row(page, name).getByRole('button', { name: 'More', exact: true }).click()
  await selectors.dialog(page, name).getByRole('button', { name: action, exact: true }).click()
}
