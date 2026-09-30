import { describe, expect, it } from 'vitest'
import common from '../src/common.js'
import { jobForSave, newJob } from '../src/services/jobs.js'

// Run this file with TZ=UTC and TZ=Asia/Shanghai to verify actual Date behavior.
const start = Date.UTC(2026, 9, 1, 0, 30, 0)
const expected = { UTC: '2026-10-01 00:30:00', 'Asia/Shanghai': '2026-10-01 08:30:00' }
describe('Local dates and Server epoch compatibility', () => {
  it.each(['en', 'cn'])('keeps epoch bounds and locale %s separate from browser timezone', locale => {
    common.switchLanguage(locale)
    const saved = jobForSave({ ...newJob('9007199254740993'), lifeCycle: [String(start), String(start + 3600000)] })
    expect(saved.lifeCycle).toEqual({ start, end: start + 3600000 })
    expect(localStorage.getItem('oms_lang')).toBe(locale)
    expect(document.documentElement.lang).toBe(locale === 'en' ? 'en' : 'zh-CN')
    const zone = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone
    if (expected[zone]) expect(common.timestamp2Str(start)).toBe(expected[zone])
    expect(common.timestamp2Str(start)).not.toContain('NaN')
    expect(common.timestamp2Str(0)).toBe('N/A')
  })
})
