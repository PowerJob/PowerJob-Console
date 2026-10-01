import type { Locator } from '@playwright/test'
import { expect, id, type RecordDTO } from './helpers'

// Independent display oracle: Server-formatted strings remain literal; numeric epochs are rendered in the explicitly configured browser timezone.
function time(value: unknown) {
  if (value == null || value === '') return '—'
  if (typeof value === 'string' && !/^\d+$/.test(value)) return value
  const epoch = Number(value)
  expect(Number.isFinite(epoch)).toBe(true)
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(epoch)).map(part => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
}
export async function assertNativeInstanceFacts(detail: Locator, instanceId: string, original: RecordDTO) {
  const statuses: Record<string, string> = { 1: 'Waiting', 2: 'Dispatched', 3: 'Running', 4: 'Failed', 5: 'Succeeded', 9: 'Cancelled', 10: 'Stopped' }
  const expected: Record<string, unknown> = {
    'Instance ID': id(instanceId), Status: statuses[String(original.status)], 'Run count': original.runningTimes,
    'TaskTracker address': original.taskTrackerAddress, 'Expected start': time(original.expectedTriggerTime),
    Started: time(original.actualTriggerTime || original.startTime), Finished: time(original.finishedTime),
    'Job parameters': original.jobParams ?? original.nodeParams, 'Instance parameters': original.instanceParams, Result: original.result,
  }
  if (original.taskDetail) expected['Task summary'] = original.taskDetail
  for (const [label, value] of Object.entries(expected)) {
    const term = detail.locator('dl.facts dt').filter({ hasText: new RegExp('^' + label + '$') })
    await expect(term).toHaveCount(1)
    const displayed = term.locator('xpath=following-sibling::dd[1]')
    if (value != null && typeof value === 'object') expect(JSON.parse(await displayed.innerText())).toEqual(value)
    else await expect(displayed).toHaveText(String(value ?? '—'))
  }
  return expected
}
