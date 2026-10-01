import type { Locator, Page } from '@playwright/test'
import { test, expect, selectors, fill, check, clickAndResponse, enterSamples, ownedName, observation, type RecordDTO } from './helpers'
import { calendarTime } from './cron-oracle'

const complex = '0 11 13 ? * MON#2 *'
const generated = '0 0 0 ? * 1'
const labels = {
  en: { jobs: 'Jobs', newJob: 'New job', name: 'Job name', enabled: 'Enable job', sections: 'Job configuration sections', schedule: 'Schedule', type: 'Schedule type', expression: 'Schedule expression', quick: 'Quick setup', builder: 'CRON quick setup', frequency: 'Frequency', weekday: 'Weekday', sunday: 'Sunday', hour: 'Hour', minute: 'Minute', cancel: 'Cancel', apply: 'Apply expression', validate: 'Validate expression', validation: 'Schedule validation', close: 'Close' },
  zh: { jobs: '任务', newJob: '新建任务', name: '任务名称', enabled: '启用任务', sections: '任务配置分区', schedule: '调度计划', type: '调度方式', expression: '调度表达式', quick: '快速配置', builder: 'CRON 快速配置', frequency: '执行周期', weekday: '星期', sunday: '星期日', hour: '小时', minute: '分钟', cancel: '取消', apply: '应用表达式', validate: '验证表达式', validation: '调度验证', close: '关闭' },
} as const

async function reachable(page: Page, control: Locator) {
  await control.scrollIntoViewIfNeeded()
  await expect(control).toBeVisible()
  await expect(control).toBeInViewport()
  const box = await control.boundingBox()
  const viewport = page.viewportSize()
  expect(box).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1)
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1)
  return box!
}

for (const viewport of [{ width: 1440, height: 680, axis: 'desktop' }, { width: 390, height: 520, axis: 'mobile' }] as const) {
  test(`UI-041 · official short ${viewport.axis} bilingual Cancel/reopen preserves complex CRON, Sunday Apply validates real dates and parent cancellation creates nothing`, async ({ page, backend, credentials }, info) => {
    await enterSamples(page, credentials)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    let saveRequests = 0
    page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/job/save')) saveRequests++ })
    const journeys: RecordDTO[] = []
    for (const locale of ['en', 'zh'] as const) {
      const text = labels[locale]
      await page.getByRole('combobox', { name: /^(?:Language|语言)$/ }).selectOption(locale)
      await page.goto('/#/oms/job')
      await expect(page.getByRole('heading', { name: text.jobs, exact: true })).toBeVisible()
      const name = ownedName(`short_release_${viewport.axis}_${locale}`)
      expect((await backend.listJobs(name)).data.filter(row => row.jobName === name)).toHaveLength(0)
      await page.getByRole('button', { name: text.newJob, exact: true }).click()
      const editor = selectors.dialog(page, text.newJob)
      await fill(editor, text.name, name)
      await check(editor, text.enabled, false)
      await editor.getByRole('navigation', { name: text.sections, exact: true }).getByRole('button', { name: new RegExp('^' + text.schedule + '(?: |$)') }).click()
      await editor.getByLabel(text.type, { exact: true }).selectOption('CRON')
      await fill(editor, text.expression, complex)
      const quick = editor.getByRole('button', { name: text.quick, exact: true })
      await quick.click()
      let builder = selectors.dialog(page, text.builder)
      await builder.getByLabel(text.frequency, { exact: true }).selectOption('weekly')
      await builder.getByLabel(text.weekday, { exact: true }).selectOption({ label: text.sunday })
      await fill(builder, text.hour, 0)
      await builder.getByLabel(text.hour, { exact: true }).press('Tab')
      await expect(builder.getByLabel(text.minute, { exact: true })).toBeFocused()
      await fill(builder, text.minute, 0)
      await builder.getByLabel(text.minute, { exact: true }).press('Tab')
      await expect(builder.getByLabel(text.weekday, { exact: true })).toBeFocused()
      await expect(builder.locator('code')).toHaveText(generated)
      const cancelledDraftControls = {
        cancel: await reachable(page, builder.getByRole('button', { name: text.cancel, exact: true })),
        apply: await reachable(page, builder.getByRole('button', { name: text.apply, exact: true })),
      }
      await builder.getByRole('button', { name: text.cancel, exact: true }).click()
      await expect(builder).not.toBeVisible()
      await expect(editor.getByLabel(text.expression, { exact: true })).toHaveValue(complex)
      await expect(quick).toBeFocused()
      await quick.click()
      builder = selectors.dialog(page, text.builder)
      await expect(builder).toBeVisible()
      await expect(editor.getByLabel(text.expression, { exact: true })).toHaveValue(complex)
      await builder.getByLabel(text.frequency, { exact: true }).selectOption('weekly')
      await builder.getByLabel(text.weekday, { exact: true }).selectOption({ label: text.sunday })
      await fill(builder, text.hour, 0)
      await builder.getByLabel(text.hour, { exact: true }).press('Tab')
      await fill(builder, text.minute, 0)
      await builder.getByLabel(text.minute, { exact: true }).press('Tab')
      await expect(builder.locator('code')).toHaveText(generated)
      const appliedDraftControls = {
        cancel: await reachable(page, builder.getByRole('button', { name: text.cancel, exact: true })),
        apply: await reachable(page, builder.getByRole('button', { name: text.apply, exact: true })),
      }
      await builder.getByRole('button', { name: text.apply, exact: true }).click()
      await expect(builder).not.toBeVisible()
      await expect(editor.getByLabel(text.expression, { exact: true })).toHaveValue(generated)
      await expect(quick).toBeFocused()
      const beforeValidation = Date.now()
      const validation = await clickAndResponse<string[]>(page, '/validate/timeExpression', () => editor.getByRole('button', { name: text.validate, exact: true }).click(), response => {
        const query = new URL(response.url()).searchParams
        return query.get('timeExpressionType') === 'CRON' && query.get('timeExpression') === generated
      })
      expect(validation.success).toBe(true)
      expect(Array.isArray(validation.data)).toBe(true)
      expect(validation.data.length).toBeGreaterThanOrEqual(3)
      const times = validation.data.map(calendarTime)
      for (const [index, date] of times.entries()) {
        expect(date.weekday).toBe(0)
        expect([date.hour, date.minute, date.second]).toEqual([0, 0, 0])
        expect(date.timestamp).toBeGreaterThan(beforeValidation - 60_000)
        if (index) expect(date.timestamp).toBeGreaterThan(times[index - 1]!.timestamp)
      }
      const calendar = selectors.dialog(page, text.validation)
      expect(await calendar.getByRole('listitem').allTextContents()).toEqual(validation.data)
      await reachable(page, calendar.locator('footer').getByRole('button', { name: text.close, exact: true }))
      await calendar.locator('footer').getByRole('button', { name: text.close, exact: true }).click()
      await expect(calendar).not.toBeVisible()
      await reachable(page, editor.locator('footer').getByRole('button', { name: text.cancel, exact: true }))
      await editor.locator('footer').getByRole('button', { name: text.cancel, exact: true }).click()
      await expect(editor).not.toBeVisible()
      expect(saveRequests).toBe(0)
      expect((await backend.listJobs(name)).data.filter(row => row.jobName === name)).toHaveLength(0)
      journeys.push({ locale, viewport, complexExpression: complex, cancelledBuilderPreservedOriginalAfterReopen: true, generatedExpression: generated, cancelledDraftControls, appliedDraftControls, originalServerCalendarDates: validation.data, everyDateSundayMidnight: true, actualNativeTabAndFocusReturn: true, originalJobSaveRequests: saveRequests, persistedExactNameCount: 0 })
    }
    expect(journeys).toHaveLength(2)
    await observation(info, 'UI-041', `cron-short-${viewport.axis}`, { exactViewport: viewport, actualBilingualJourneys: journeys, noResponseFabrication: true, noBusinessWritesOrCreatedDefinitions: true })
  })
}
