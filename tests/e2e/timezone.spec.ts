import type { Locator, Page } from '@playwright/test'
import { test, expect, selectors, fill, check, clickAndResponse, enterSamples, id, ownedName, processors, observation, type RecordDTO } from './helpers'
import { OwnedResources } from './owned'

test.use({ timezoneId: 'America/Los_Angeles', actionTimeout: 15_000 })

const labels = {
  en: { language: 'Language', heading: 'Jobs', keyword: 'Keyword', search: 'Search', edit: 'Edit', dialog: 'Edit job', save: 'Save job', cancel: 'Cancel', sections: 'Job configuration sections', schedule: 'Schedule', start: 'Lifecycle start', end: 'Lifecycle end', server: 'Server information', browser: 'Browser information' },
  zh: { language: '语言', heading: '任务', keyword: '关键字', search: '查询', edit: '编辑', dialog: '编辑任务', save: '保存任务', cancel: '取消', sections: '任务配置分区', schedule: '调度计划', start: '生效开始时间', end: '生效结束时间', server: 'Server 信息', browser: '浏览器信息' },
} as const

// Independent UTC oracles: these unambiguous Los Angeles dates are winter UTC-08 and summer UTC-07.
// The released Server contract stores epoch milliseconds. Seconds are recorded independently to detect unit drift.
const winter = { local: '2032-01-15T01:02:03', seconds: Date.UTC(2032, 0, 15, 9, 2, 3) / 1000 }
const summer = { local: '2032-07-15T04:05:06', seconds: Date.UTC(2032, 6, 15, 11, 5, 6) / 1000 }
const phases = [
  { name: 'start-only', start: winter.local, end: '', epoch: { start: winter.seconds * 1000, end: null } },
  { name: 'end-only', start: '', end: summer.local, epoch: { start: null, end: summer.seconds * 1000 } },
  { name: 'both-bounds', start: winter.local, end: summer.local, epoch: { start: winter.seconds * 1000, end: summer.seconds * 1000 } },
  { name: 'unset-both', start: '', end: '', epoch: { start: null, end: null } },
] as const

async function schedule(dialog: Locator, language: keyof typeof labels) {
  const text = labels[language]
  await dialog.getByRole('navigation', { name: text.sections, exact: true }).getByRole('button', { name: new RegExp('^' + text.schedule + '(?: |$)') }).click()
}

async function reopen(page: Page, name: string, language: keyof typeof labels) {
  const text = labels[language]
  await page.goto('/#/oms/job')
  await expect(page.getByRole('heading', { name: text.heading, exact: true })).toBeVisible()
  await fill(page, text.keyword, name)
  const list = await clickAndResponse(page, '/job/list', () => page.getByRole('button', { name: text.search, exact: true }).click(), response => response.request().postDataJSON()?.keyword === name)
  expect(list.success).toBe(true)
  const row = selectors.row(page, name)
  await expect(row).toHaveCount(1)
  await row.getByRole('button', { name: text.edit, exact: true }).click()
  const dialog = selectors.dialog(page, text.dialog)
  await schedule(dialog, language)
  return dialog
}

test('timezone lifecycle · Los Angeles browser and Shanghai Server preserve single/double/unset bounds and seconds through real zh/en save, refresh and reopen', async ({ page, backend, credentials }, info) => {
  const owned = new OwnedResources(backend)
  const name = ownedName('timezone_lifecycle')
  const journeys: RecordDTO[] = []
  const writes: RecordDTO[] = []
  let createAttempted = false
  let jobId = ''
  const recorder = (request: import('@playwright/test').Request) => {
    if (new URL(request.url()).pathname.endsWith('/job/save')) {
      const body = request.postDataJSON() as RecordDTO
      if (body.jobName === name) writes.push({ appId: body.appId, id: body.id, lifeCycle: body.lifeCycle })
    }
  }
  page.on('request', recorder)
  try {
    const zone = await page.evaluate(() => ({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, winterOffsetMinutes: new Date('2032-01-15T01:02:03').getTimezoneOffset(), summerOffsetMinutes: new Date('2032-07-15T04:05:06').getTimezoneOffset() }))
    expect(zone).toEqual({ timezone: 'America/Los_Angeles', winterOffsetMinutes: 480, summerOffsetMinutes: 420 })
    await enterSamples(page, credentials)
    await page.goto('/#/oms/job')
    await page.getByRole('button', { name: 'New job', exact: true }).click()
    const fresh = selectors.dialog(page, 'New job')
    await fill(fresh, 'Job name', name)
    await fill(fresh, 'Processor', processors.simple)
    await check(fresh, 'Enable job', false)
    createAttempted = true
    const created = await clickAndResponse(page, '/job/save', () => fresh.getByRole('button', { name: 'Save job', exact: true }).click())
    expect(created.success).toBe(true)
    const matches = (await backend.listJobs(name)).data.filter(job => job.jobName === name)
    expect(matches).toHaveLength(1)
    jobId = owned.track('job', id(matches[0].id), name)
    expect(matches[0].enable).toBe(false)

    for (const language of ['en', 'zh'] as const) {
      await page.getByRole('combobox', { name: language === 'en' ? 'Language' : 'Language', exact: true }).selectOption(language)
      const text = labels[language]
      const overview = await clickAndResponse<RecordDTO>(page, '/system/overview', () => page.goto('/#/oms/home'))
      expect(overview.success).toBe(true)
      expect(overview.data.timezone).toMatch(/China Standard Time|中国标准时间/)
      const server = page.locator('section').filter({ has: page.getByRole('heading', { name: text.server, exact: true }) })
      const browser = page.locator('section').filter({ has: page.getByRole('heading', { name: text.browser, exact: true }) })
      await expect(server.getByText(String(overview.data.timezone), { exact: true })).toBeVisible()
      await expect(browser.getByText('America/Los_Angeles', { exact: true })).toBeVisible()
      const serverNow = Date.parse(String(overview.data.serverTime).replace(' ', 'T') + '+08:00')
      expect(Number.isFinite(serverNow)).toBe(true)
      expect(Math.abs(serverNow - Date.now())).toBeLessThan(90_000)

      for (const phase of phases) {
        let dialog = await reopen(page, name, language)
        await fill(dialog, text.start, phase.start)
        await fill(dialog, text.end, phase.end)
        const before = writes.length
        const saved = await clickAndResponse(page, '/job/save', () => dialog.getByRole('button', { name: text.save, exact: true }).click())
        expect(saved.success).toBe(true)
        await expect(dialog).not.toBeVisible()
        expect(writes).toHaveLength(before + 1)
        expect(writes.at(-1)?.lifeCycle).toEqual(phase.epoch)
        expect(id(writes.at(-1)?.appId)).toBe(id(credentials.app_id))
        const independent = await backend.job(jobId)
        expect(independent?.lifeCycle).toEqual(phase.epoch)
        expect(independent?.enable).toBe(false)
        const epoch = independent?.lifeCycle as { start: number | null; end: number | null }
        expect(epoch.start == null ? null : epoch.start / 1000).toBe(phase.start ? winter.seconds : null)
        expect(epoch.end == null ? null : epoch.end / 1000).toBe(phase.end ? summer.seconds : null)
        await page.reload()
        dialog = await reopen(page, name, language)
        await expect(dialog.getByLabel(text.start, { exact: true }).filter({ visible: true })).toHaveValue(phase.start)
        await expect(dialog.getByLabel(text.end, { exact: true }).filter({ visible: true })).toHaveValue(phase.end)
        await dialog.getByRole('button', { name: text.cancel, exact: true }).click()
        journeys.push({ language, phase: phase.name, actualOriginalRequestEpochMilliseconds: writes.at(-1)?.lifeCycle, independentServerReadback: independent?.lifeCycle, epochSeconds: { start: epoch.start == null ? null : epoch.start / 1000, end: epoch.end == null ? null : epoch.end / 1000 }, reopenedLocalInputs: { start: phase.start, end: phase.end }, hardRefreshed: true, serverTimezoneDisplay: overview.data.timezone, browserTimezone: zone.timezone })
      }
    }
    expect(journeys).toHaveLength(8)
    await observation(info, 'UI-030', 'timezone-roundtrip', { jobId, browserTimezone: 'America/Los_Angeles', serverTimezone: 'Asia/Shanghai', winterUTCOffsetHours: -8, summerUTCOffsetHours: -7, nativeLocaleJourneys: journeys, originalDTOUnit: 'epoch-milliseconds', independentOracleUnit: 'epoch-seconds', disabledJobNoRunOrScheduleSideEffects: true })
    await observation(info, 'UI-039', 'dates-locale-format', { jobId, nativeLocaleJourneys: journeys, unboundedStartAndEndRemainNullRatherThanZero: true, browserTimezoneUnlikeServer: true, inputSecondPrecisionPreservedAfterHardRefresh: true })
  } finally {
    page.off('request', recorder)
    if (createAttempted && !jobId) {
      const rows = (await backend.listJobs(name)).data.filter(row => row.jobName === name)
      if (rows.length > 1) throw new Error('Ambiguous exact timezone fixture ownership; preserve records for review')
      if (rows[0]) owned.track('job', id(rows[0].id), name)
    }
    await owned.cleanup(info)
  }
})
