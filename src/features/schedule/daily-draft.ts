import type { Entity } from '../../core/session'

/** Opening the builder stages a draft; only Apply changes the schedule expression. */
export function dailyDraft(expression: string): Entity {
  const defaults = {
    interval: 60,
    intervalUnit: 'SECONDS',
    startTimeOfDay: '09:00:00',
    endTimeOfDay: '18:00:00',
    daysOfWeek: [1, 2, 3, 4, 5],
  }
  const source = expression.trim()
  // A previous CRON/fixed schedule may still be present after changing the type.
  // Keep that raw value in the parent until the user explicitly applies this draft.
  if (!source || !(source.startsWith('{') || source.startsWith('['))) return defaults
  const parsed: unknown = JSON.parse(source)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid daily rule')
  const rule = parsed as Entity
  if (rule.daysOfWeek != null && !Array.isArray(rule.daysOfWeek)) throw new Error('Invalid weekdays')
  // The published Server treats absent, null and empty weekdays as ALL_DAY.
  return { ...defaults, ...rule, daysOfWeek: rule.daysOfWeek == null ? [] : rule.daysOfWeek.map(Number) }
}
