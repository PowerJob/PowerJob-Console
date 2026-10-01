import { test, expect, enterSamples, fill, selectors, cancelDialog, clickAndResponse, observation, type Backend, type RecordDTO } from './helpers';
import { WorkflowActions } from './workflow-actions';
import { editJob, jobSection, searchJob } from './job-ui';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const historicRule = { interval: 7, intervalUnit: 'MINUTES', startTimeOfDay: '09:05:07', endTimeOfDay: '18:23:45', future: { zero: 0, absent: null, disabled: false } };

async function prepare(backend: Backend, jobId: string, type: string, expression: string): Promise<RecordDTO> {
  const original = await backend.job(jobId);
  expect(original).not.toBeNull();
  // Preparation uses the published Void save contract; all acceptance edits are native UI actions.
  const alarm = original!.alarmConfig as RecordDTO | null;
  // A fresh API fixture's absent alarm fields are displayed as null by JobInfoVO.
  // SaveJobInfoRequest requires explicit non-null counters whenever the section exists.
  const result = await backend.call<null>('/job/save', { method: 'POST', data: { ...original, alarmConfig: { ...alarm, alertThreshold: alarm?.alertThreshold ?? 0, statisticWindowLen: alarm?.statisticWindowLen ?? 0, silenceWindowLen: alarm?.silenceWindowLen ?? 0 }, enable: false, timeExpressionType: type, timeExpression: expression }, allowFailure: true });
  expect(result.success, result.message).toBe(true);
  const seeded = (await backend.job(jobId))!;
  expect(seeded.enable).toBe(false); expect(seeded.timeExpressionType).toBe(type); expect(seeded.timeExpression).toBe(expression);
  return seeded;
}

test.describe('Daily historical ALL_DAY and explicitly applied type transitions', () => {
  test.use({ actionTimeout: 15_000 }); test.setTimeout(90_000);
  for (const variant of ['missing', 'null'] as const) {
    test(`historic Daily JSON with ${variant} weekdays stays every day through cancel, Apply, real save and hard reload`, async ({ page, backend, credentials }, info) => {
      const actions = new WorkflowActions(page, backend, info);
      try {
        const job = await actions.job(`daily_historic_${variant}`), raw = JSON.stringify({ ...historicRule, ...(variant === 'null' ? { daysOfWeek: null } : {}) });
        const seeded = await prepare(backend, job.id, 'DAILY_TIME_INTERVAL', raw);
        await enterSamples(page, credentials); await page.goto('/#/oms/job'); await searchJob(page, job.name); let editor = await editJob(page, job.name); await jobSection(editor, 'Schedule');
        let writes = 0; page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/job/save')) writes++; });
        await expect(editor.getByLabel('Schedule expression', { exact: true })).toHaveValue(raw); await editor.getByRole('button', { name: 'Set daily interval', exact: true }).click(); let daily = selectors.dialog(page, 'Daily interval');
        await expect(daily.getByText('An empty selection means every day in the Server contract.', { exact: true })).toBeVisible();
        for (const day of days) await expect(daily.getByLabel(day, { exact: true })).not.toBeChecked();
        await expect(daily.getByLabel('Interval', { exact: true })).toHaveValue('7'); await expect(daily.getByLabel('Unit', { exact: true })).toHaveValue('MINUTES'); await expect(daily.getByLabel('Daily start time', { exact: true })).toHaveValue('09:05:07'); await expect(daily.getByLabel('Daily end time', { exact: true })).toHaveValue('18:23:45');
        await fill(daily, 'Interval', 999); await cancelDialog(page, 'Daily interval'); await expect(editor.getByLabel('Schedule expression', { exact: true })).toHaveValue(raw); expect(writes).toBe(0); expect((await backend.job(job.id))?.timeExpression).toBe(raw);
        await editor.getByRole('button', { name: 'Set daily interval', exact: true }).click(); daily = selectors.dialog(page, 'Daily interval'); await expect(daily.getByLabel('Interval', { exact: true })).toHaveValue('7'); for (const day of days) await expect(daily.getByLabel(day, { exact: true })).not.toBeChecked();
        await daily.getByRole('button', { name: 'Apply configuration', exact: true }).click(); await expect(daily).not.toBeVisible(); const applied = JSON.parse(await editor.getByLabel('Schedule expression', { exact: true }).inputValue()); expect(applied).toEqual({ ...historicRule, daysOfWeek: [] }); expect(writes).toBe(0);
        expect((await clickAndResponse(page, '/job/save', () => editor.getByRole('button', { name: 'Save job', exact: true }).click())).success).toBe(true); await expect(editor).not.toBeVisible(); expect(writes).toBe(1); const saved = (await backend.job(job.id))!; expect(JSON.parse(String(saved.timeExpression))).toEqual(applied); expect(saved.enable).toBe(false); expect(saved.timeExpressionType).toBe('DAILY_TIME_INTERVAL');
        for (const field of ['jobName', 'jobDescription', 'jobParams', 'processorInfo', 'lifeCycle']) expect(saved[field]).toEqual(seeded[field]);
        await page.reload(); await searchJob(page, job.name); editor = await editJob(page, job.name); await jobSection(editor, 'Schedule'); expect(JSON.parse(await editor.getByLabel('Schedule expression', { exact: true }).inputValue())).toEqual(applied); await editor.getByRole('button', { name: 'Set daily interval', exact: true }).click(); daily = selectors.dialog(page, 'Daily interval'); for (const day of days) await expect(daily.getByLabel(day, { exact: true })).not.toBeChecked(); await cancelDialog(page, 'Daily interval'); await cancelDialog(page, 'Edit job');
        await observation(info, 'UI-012', `daily-historic-${variant}-weekdays`, { jobId: job.id, seededExpression: raw, appliedExpression: applied, realServerSavedExpression: saved.timeExpression, nativeCancelZeroWrites: true, applyDoesNotWriteUntilSave: true, oneRealSave: writes, nativeHardReloadAndAllWeekdaysUnchecked: true, formalServerContract: 'd928 DailyTimeIntervalStrategyHandler: null/empty daysOfWeek => ALL_DAY(1..7)', schedulingAcrossCalendarDays: 'NOT_EXECUTED: disabled fixture; this test verifies native editing and real DTO roundtrip.' });
      } finally { await actions.cleanup(); }
    });
  }
  test('complex CRON switches to a valid staged Daily builder while Cancel and invalid JSON preserve the manual expression until explicit Apply', async ({ page, backend, credentials }, info) => {
    const actions = new WorkflowActions(page, backend, info);
    try {
      const job = await actions.job('daily_cron_transition'), cron = '0 13 9 ? * MON#2 *'; await prepare(backend, job.id, 'CRON', cron);
      await enterSamples(page, credentials); await page.goto('/#/oms/job'); await searchJob(page, job.name); let editor = await editJob(page, job.name); await jobSection(editor, 'Schedule'); await editor.getByLabel('Schedule type', { exact: true }).selectOption('DAILY_TIME_INTERVAL'); await expect(editor.getByLabel('Schedule expression', { exact: true })).toHaveValue(cron);
      let writes = 0; page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/job/save')) writes++; });
      await editor.getByRole('button', { name: 'Set daily interval', exact: true }).click(); let daily = selectors.dialog(page, 'Daily interval'); await expect(daily.getByLabel('Interval', { exact: true })).toHaveValue('60'); await fill(daily, 'Interval', 11); await cancelDialog(page, 'Daily interval'); await expect(editor.getByLabel('Schedule expression', { exact: true })).toHaveValue(cron); expect(writes).toBe(0); expect((await backend.job(job.id))?.timeExpression).toBe(cron);
      await fill(editor, 'Schedule expression', '{broken'); await editor.getByRole('button', { name: 'Set daily interval', exact: true }).click(); await expect(selectors.dialog(page, 'Daily interval')).not.toBeVisible(); await expect(page.getByRole('alert').filter({ hasText: 'The daily interval is invalid JSON. Correct the expression.' })).toBeVisible(); await expect(editor.getByLabel('Schedule expression', { exact: true })).toHaveValue('{broken'); expect(writes).toBe(0);
      await fill(editor, 'Schedule expression', cron); await editor.getByRole('button', { name: 'Set daily interval', exact: true }).click(); daily = selectors.dialog(page, 'Daily interval'); await expect(daily.getByLabel('Interval', { exact: true })).toHaveValue('60'); await daily.getByRole('button', { name: 'Apply configuration', exact: true }).click(); await expect(daily).not.toBeVisible(); const applied = JSON.parse(await editor.getByLabel('Schedule expression', { exact: true }).inputValue()); expect(applied).toEqual({ interval: 60, intervalUnit: 'SECONDS', startTimeOfDay: '09:00:00', endTimeOfDay: '18:00:00', daysOfWeek: [1, 2, 3, 4, 5] }); expect(writes).toBe(0);
      expect((await clickAndResponse(page, '/job/save', () => editor.getByRole('button', { name: 'Save job', exact: true }).click())).success).toBe(true); await expect(editor).not.toBeVisible(); expect(writes).toBe(1); const saved = (await backend.job(job.id))!; expect(saved.timeExpressionType).toBe('DAILY_TIME_INTERVAL'); expect(saved.enable).toBe(false); expect(JSON.parse(String(saved.timeExpression))).toEqual(applied);
      await page.reload(); await searchJob(page, job.name); editor = await editJob(page, job.name); await jobSection(editor, 'Schedule'); await expect(editor.getByLabel('Schedule type', { exact: true })).toHaveValue('DAILY_TIME_INTERVAL'); expect(JSON.parse(await editor.getByLabel('Schedule expression', { exact: true }).inputValue())).toEqual(applied); await cancelDialog(page, 'Edit job');
      await observation(info, 'UI-012', 'daily-cron-transition-explicit-apply', { jobId: job.id, originalManualCron: cron, stagedDailyDefaults: applied, nativeTypeChangeWithoutClearingRawExpression: true, cancelZeroWritesAndOriginalServerValue: true, invalidStructuredDraftRejectedWithoutOverwrite: true, applyExplicitlyReplacesManualExpression: true, oneRealSave: writes, hardReloadReadback: true, disabledDefinitionNoSchedulingSideEffects: true });
    } finally { await actions.cleanup(); }
  });
});
