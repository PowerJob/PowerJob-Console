import { jobSection } from './job-ui'
import { test, expect, selectors, fill, check, clickAndResponse, enterSamples, id, ownedName, processors, observation, type RecordDTO, type PageDTO } from './helpers'
import { OwnedResources } from './owned'
import { configureCron, calendarTime } from './cron-oracle'

test.use({ actionTimeout: 15_000 })

for (const mode of ['CRON', 'FIXED_RATE', 'FIXED_DELAY', 'DAILY_TIME_INTERVAL'] as const) test(`UI-012/015 · native ${mode} automatically executes on the real Worker without Run requests`, async ({ page, backend, credentials }, info) => {
  test.setTimeout(mode === 'CRON' ? 240_000 : 180_000)
  const ledger = new OwnedResources(backend)
  const name = ownedName('automatic_' + mode.toLowerCase())
  let jobId = ''
  const tracked = new Set<string>()
  let explicitRunRequests = 0
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/job/run')) explicitRunRequests++ })
  const readRuns = () => backend.call<PageDTO<RecordDTO>>('/instance/list', { method: 'POST', data: { appId: backend.appId, jobId, type: 'NORMAL', index: 0, pageSize: 100 } })
  const record = (rows: RecordDTO[]) => { for (const row of rows) { const key = id(row.instanceId); if (!tracked.has(key)) { ledger.trackInstance(key, jobId); tracked.add(key) } } }
  try {
    await enterSamples(page, credentials)
    await page.goto('/#/oms/job')
    await page.getByRole('button', { name: 'New job', exact: true }).click()
    const editor = selectors.dialog(page, 'New job')
    await fill(editor, 'Job name', name)
    await fill(editor, 'Processor', processors.simple)
    await fill(editor, 'Job parameters', 'CN ' + name + ' 中文😀')
    await check(editor, 'Enable job', false)
    await jobSection(editor, 'Schedule')
    await editor.getByLabel('Schedule type', { exact: true }).selectOption(mode)
    if (mode === 'CRON') await configureCron(page, editor, { key: 'automatic_minute', frequency: 'minutes', fields: { Interval: 1 }, expression: '0 0/1 * * * ?', matches: time => time.second === 0 })
    else if (mode === 'DAILY_TIME_INTERVAL') {
      await editor.getByRole('button', { name: 'Set daily interval', exact: true }).click()
      const daily = selectors.dialog(page, 'Daily interval')
      await fill(daily, 'Interval', 5)
      await daily.getByLabel('Unit', { exact: true }).selectOption('SECONDS')
      await fill(daily, 'Daily start time', '00:00:00')
      await fill(daily, 'Daily end time', '23:59:59')
      for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) await check(daily, day, false)
      await daily.getByRole('button', { name: 'Apply configuration', exact: true }).click()
      await expect(daily).not.toBeVisible()
    } else await fill(editor, 'Schedule expression', '5000')
    expect((await clickAndResponse(page, '/job/save', () => editor.getByRole('button', { name: 'Save job', exact: true }).click())).success).toBe(true)
    await expect(editor).not.toBeVisible()
    const job = (await backend.listJobs(name)).data.find(row => row.jobName === name)!
    jobId = ledger.track('job', id(job.id), name)
    expect(job.enable).toBe(false)
    expect(job.timeExpressionType).toBe(mode)
    await fill(page, 'Keyword', name)
    expect((await clickAndResponse(page, '/job/list', () => page.getByRole('button', { name: 'Search', exact: true }).click(), response => response.request().postDataJSON()?.keyword === name)).success).toBe(true)
    const startedAt = Date.now()
    expect((await clickAndResponse(page, '/job/save', () => selectors.row(page, name).getByRole('switch', { name: 'Enable job ' + name, exact: true }).check())).success).toBe(true)
    expect((await backend.job(jobId))?.enable).toBe(true)
    let actual: RecordDTO | undefined
    await expect.poll(async () => {
      const runs = (await readRuns()).data
      record(runs)
      actual = runs.find(row => ['FIXED_RATE', 'FIXED_DELAY'].includes(mode) ? Number(row.status) === 3 : Number(row.status) === 5)
      return !!actual
    }, { timeout: 120_000, intervals: [1000, 2000], message: 'An enabled native schedule must create its own real Worker instance' }).toBe(true)
    const instanceId = id(actual!.instanceId)
    expect(calendarTime(String(actual!.actualTriggerTime)).timestamp).toBeGreaterThanOrEqual(startedAt - 5000)
    let childRuns: RecordDTO[] = []
    if (mode === 'FIXED_RATE' || mode === 'FIXED_DELAY') {
      await expect.poll(async () => {
        const detail = await backend.call<RecordDTO>('/instance/detailPlus', { method: 'POST', data: { instanceId, customQuery: 'status in (5, 6) order by last_modified_time desc' } })
        childRuns = (detail.subInstanceDetails as RecordDTO[] || []).filter(row => Number(row.status) === 5)
        return childRuns.length >= 2
      }, { timeout: 60_000, intervals: [1000, 2000], message: 'A frequent parent Running status requires at least two actual successful sub-runs' }).toBe(true)
      const ordered = [...childRuns].sort((a, b) => calendarTime(String(a.startTime)).timestamp - calendarTime(String(b.startTime)).timestamp)
      for (const child of ordered) {
        expect(calendarTime(String(child.finishedTime)).timestamp).toBeGreaterThanOrEqual(calendarTime(String(child.startTime)).timestamp)
        expect(child.result).toBe('任务成功啦！！！')
      }
      // Formal detail dates have one-second resolution, so preserve that precision boundary.
      if (mode === 'FIXED_DELAY') expect(calendarTime(String(ordered[1].startTime)).timestamp).toBeGreaterThanOrEqual(calendarTime(String(ordered[0].finishedTime)).timestamp + 4000)
    } else {
      expect(Number(actual!.status)).toBe(5)
      expect(actual!.result).toBe('任务成功啦！！！')
    }
    // Frequent sub-run history is a live Worker contract; inspect it before disabling its parent tracker.
    await page.goto('/#/oms/instance?jobId=' + jobId)
    await fill(page, 'Instance ID', instanceId)
    expect((await clickAndResponse(page, '/instance/list', () => page.getByRole('button', { name: 'Search', exact: true }).click(), response => response.request().postDataJSON()?.instanceId === instanceId)).success).toBe(true)
    await selectors.row(page, instanceId).getByRole('button', { name: 'Details', exact: true }).click()
    const detailDialog = selectors.dialog(page, `Instance details #${instanceId}`)
    await expect(detailDialog).toContainText(instanceId)
    if (childRuns.length) await expect(detailDialog.getByRole('heading', { name: 'High frequency runs', exact: true })).toBeVisible()
    else await expect(detailDialog).toContainText(String(actual!.result))
    await detailDialog.getByRole('button', { name: 'Close', exact: true }).click()
    await page.goto('/#/oms/job')
    await fill(page, 'Keyword', name)
    expect((await clickAndResponse(page, '/job/list', () => page.getByRole('button', { name: 'Search', exact: true }).click(), response => response.request().postDataJSON()?.keyword === name)).success).toBe(true)
    expect((await clickAndResponse(page, '/job/disable', () => selectors.row(page, name).getByRole('switch', { name: 'Enable job ' + name, exact: true }).uncheck())).success).toBe(true)
    expect((await backend.job(jobId))?.enable).toBe(false)
    record((await readRuns()).data)
    if (mode === 'DAILY_TIME_INTERVAL') {
      // Allow already-dispatched work to become visible, then observe more than two complete five-second trigger intervals.
      await page.waitForTimeout(2000)
      const disabledBaseline = (await readRuns()).data; record(disabledBaseline)
      await page.waitForTimeout(11000)
      const disabledLater = (await readRuns()).data; record(disabledLater)
      expect(disabledLater.map(row => id(row.instanceId)).sort()).toEqual(disabledBaseline.map(row => id(row.instanceId)).sort())
      expect((await backend.job(jobId))?.enable).toBe(false)
      await observation(info, 'UI-014', 'disable-job', { jobId, actualDailyIntervalSeconds: 5, nativeDisableSucceeded: true, inFlightObservationSettledMilliseconds: 2000, disabledObservationWindowMilliseconds: 11000, exactInstanceIDsBeforeAndAfterWindow: disabledLater.map(row => id(row.instanceId)), noNewScheduledInstancesAcrossMoreThanTwoCadences: true, noManualRunRequests: explicitRunRequests })
      await observation(info, 'UI-014', 'enable-job', { jobId, nativeSaveEnableSucceeded: true, actualAutomaticWorkerSucceededInstanceId: instanceId, actualSuccessfulResult: actual!.result, originalJobParameters: job.jobParams, actualReadbackJobParameters: (await backend.job(jobId))?.jobParams, noManualRunRequests: explicitRunRequests })
      expect((await backend.job(jobId))?.jobParams).toBe(job.jobParams)
    }
    expect(explicitRunRequests).toBe(0)
    await observation(info, 'UI-012', `fev3-${mode.toLowerCase()}-automatic-worker`, { jobId, actualInstanceId: instanceId, actualScheduleExpression: job.timeExpression, enabledThroughNativeSwitchThenDisabled: true, zeroJobRunRequests: true, actualWorkerInstance: actual, actualSuccessfulFrequentSubRuns: childRuns, nativeInstanceDetailsReached: true, singleHostProcessesNotHA: true })
  } finally {
    // Recovery is API-assisted, but only for the exact independently recorded definition.
    if (jobId) {
      const actual = await backend.job(jobId)
      if (actual && actual.jobName === name && id(actual.appId) === id(backend.appId)) {
        if (actual.enable === true) await backend.call('/job/disable', { query: { jobId } })
        record((await readRuns()).data)
      }
    }
    await ledger.cleanup(info)
  }
})
