import type { Locator, Page } from '@playwright/test'
import { expect, selectors, fill, clickAndResponse, type Backend } from './helpers'

export interface CronCase {
  key: string; frequency: string; expression: string; fields: Record<string, number>; weekday?: string
  matches: (time: CalendarTime) => boolean
}
interface CalendarTime { year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: number; timestamp: number }
export const cronCases: CronCase[] = [
  { key: 'minutes', frequency: 'minutes', expression: '0 0/7 * * * ?', fields: { Interval: 7 }, matches: time => time.minute % 7 === 0 },
  { key: 'hours', frequency: 'hours', expression: '0 17 0/3 * * ?', fields: { Interval: 3, Minute: 17 }, matches: time => time.hour % 3 === 0 && time.minute === 17 },
  { key: 'daily', frequency: 'daily', expression: '0 23 9 * * ?', fields: { Hour: 9, Minute: 23 }, matches: time => time.hour === 9 && time.minute === 23 },
  { key: 'weekdays', frequency: 'weekdays', expression: '0 31 10 ? * 2-6', fields: { Hour: 10, Minute: 31 }, matches: time => time.hour === 10 && time.minute === 31 && time.weekday >= 1 && time.weekday <= 5 },
  { key: 'weekly', frequency: 'weekly', expression: '0 41 11 ? * 1', fields: { Hour: 11, Minute: 41 }, weekday: 'Sunday', matches: time => time.hour === 11 && time.minute === 41 && time.weekday === 0 },
  { key: 'monthly', frequency: 'monthly', expression: '0 47 12 31 * ?', fields: { Hour: 12, Minute: 47, 'Day of month': 31 }, matches: time => time.hour === 12 && time.minute === 47 && time.day === 31 },
]
export function calendarTime(value: string): CalendarTime {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(value)
  expect(match, 'The actual Server must return complete future calendar timestamps').not.toBeNull()
  const [year, month, day, hour, minute, second] = match!.slice(1).map(Number)
  const timestamp = Date.parse(value.replace(' ', 'T') + '+08:00')
  expect(Number.isFinite(timestamp)).toBe(true)
  return { year, month, day, hour, minute, second, timestamp, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() }
}
export async function configureCron(page: Page, scope: Page | Locator, rule: CronCase, apply = true) {
  await scope.getByRole('button', { name: 'Quick setup', exact: true }).click()
  const dialog = selectors.dialog(page, 'CRON quick setup')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Frequency', { exact: true }).selectOption(rule.frequency)
  for (const [label, value] of Object.entries(rule.fields)) {
    await fill(dialog, label, value)
    await dialog.getByLabel(label, { exact: true }).press('Tab')
  }
  if (rule.weekday) await dialog.getByLabel('Weekday', { exact: true }).selectOption({ label: rule.weekday })
  await expect(dialog.locator('code')).toHaveText(rule.expression)
  if (apply) {
    await dialog.getByRole('button', { name: 'Apply expression', exact: true }).click()
    await expect(dialog).not.toBeVisible()
  }
  return dialog
}
export async function validateCron(page: Page, scope: Page | Locator, backend: Backend, rule: CronCase) {
  const overview = await backend.call<{ serverTime: string; timezone: string }>('/system/overview', { query: { appId: backend.appId } })
  expect(overview.timezone, 'This lane is explicitly configured for formal Server Asia/Shanghai').toMatch(/China Standard Time|中国标准时间/)
  const serverBefore = calendarTime(overview.serverTime).timestamp
  const response = await clickAndResponse<string[]>(page, '/validate/timeExpression', () => scope.getByRole('button', { name: 'Validate expression', exact: true }).click(), value => new URL(value.url()).searchParams.get('timeExpression') === rule.expression)
  expect(response.success).toBe(true)
  expect(Array.isArray(response.data)).toBe(true)
  expect(response.data.length).toBeGreaterThanOrEqual(3)
  const times = response.data.map(calendarTime)
  for (let index = 0; index < times.length; index++) {
    expect(times[index].timestamp).toBeGreaterThan(serverBefore)
    if (index > 0) expect(times[index].timestamp).toBeGreaterThan(times[index - 1].timestamp)
    expect(times[index].second).toBe(0)
    expect(rule.matches(times[index]), 'Every real Server date must satisfy the selected calendar rule').toBe(true)
  }
  const dialog = selectors.dialog(page, 'Schedule validation')
  await expect(dialog.getByRole('listitem')).toHaveCount(response.data.length)
  expect(await dialog.getByRole('listitem').allTextContents()).toEqual(response.data)
  await dialog.locator('footer').getByRole('button', { name: 'Close', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  return { serverTimezoneDisplay: overview.timezone, serverTimeBeforeValidation: overview.serverTime, actualFutureDates: response.data }
}
