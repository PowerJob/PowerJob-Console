import crypto from 'node:crypto'
import { test, expect, selectors, fill, clickAndResponse, cancelDialog, enterSamples, id, ownedName, observation, type RecordDTO, type PageDTO } from './helpers'
import { OwnedResources } from './owned'
import { createJob, editJob, saveJob, searchJob, jobSection } from './job-ui'

test.use({ actionTimeout: 15_000 })

test('UI-012 · malformed Daily JSON and shape recover through native expression correction, CRON type switch never parses the other draft', async ({ page, backend, credentials }, info) => {
  const owned = new OwnedResources(backend)
  try {
    await enterSamples(page, credentials); const job = await createJob(page, backend, owned, ownedName('daily_recovery'))
    const editor = await editJob(page, String(job.jobName)); await jobSection(editor, 'Schedule')
    await editor.getByLabel('Schedule type', { exact: true }).selectOption('DAILY_TIME_INTERVAL'); await fill(editor, 'Schedule expression', '{malformed')
    let saves = 0; page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/job/save')) saves++ })
    await editor.getByRole('button', { name: 'Set daily interval', exact: true }).click()
    await expect(selectors.dialog(page, 'Daily interval')).not.toBeVisible(); await expect(page.getByRole('alert').filter({ hasText: 'The daily interval is invalid JSON. Correct the expression.' })).toBeVisible()
    await expect(editor.getByLabel('Schedule expression', { exact: true })).toHaveValue('{malformed'); expect(saves).toBe(0)
    await editor.getByLabel('Schedule type', { exact: true }).selectOption('CRON'); await fill(editor, 'Schedule expression', '0 3 7 * * ?')
    await editor.getByRole('button', { name: 'Quick setup', exact: true }).click(); await expect(selectors.dialog(page, 'CRON quick setup')).toBeVisible(); await cancelDialog(page, 'CRON quick setup')
    await expect(editor.getByLabel('Schedule expression', { exact: true })).toHaveValue('0 3 7 * * ?')
    await editor.getByLabel('Schedule type', { exact: true }).selectOption('DAILY_TIME_INTERVAL')
    for (const invalid of ['[]', 'null', '{"daysOfWeek":"bad-shape"}']) { await fill(editor, 'Schedule expression', invalid); await editor.getByRole('button', { name: 'Set daily interval', exact: true }).click(); await expect(selectors.dialog(page, 'Daily interval')).not.toBeVisible(); await expect(editor.getByLabel('Schedule expression', { exact: true })).toHaveValue(invalid); expect(saves).toBe(0) }
    await fill(editor, 'Schedule expression', '')
    await editor.getByRole('button', { name: 'Set daily interval', exact: true }).click(); let daily = selectors.dialog(page, 'Daily interval')
    await expect(daily.getByLabel('Interval', { exact: true })).toHaveValue('60'); await expect(daily.getByLabel('Unit', { exact: true })).toHaveValue('SECONDS'); await expect(daily.getByLabel('Daily start time', { exact: true })).toHaveValue('09:00:00')
    await fill(daily, 'Interval', 13); await cancelDialog(page, 'Daily interval'); await expect(editor.getByLabel('Schedule expression', { exact: true })).toHaveValue('')
    await editor.getByRole('button', { name: 'Set daily interval', exact: true }).click(); daily = selectors.dialog(page, 'Daily interval'); await expect(daily.getByLabel('Interval', { exact: true })).toHaveValue('60')
    await fill(daily, 'Interval', 9); await daily.getByRole('button', { name: 'Apply configuration', exact: true }).click(); const expression = await editor.getByLabel('Schedule expression', { exact: true }).inputValue(); expect(JSON.parse(expression).interval).toBe(9)
    await editor.getByLabel('Schedule type', { exact: true }).selectOption('API'); await editor.getByLabel('Schedule type', { exact: true }).selectOption('DAILY_TIME_INTERVAL'); await expect(editor.getByLabel('Schedule expression', { exact: true })).toHaveValue(expression)
    await saveJob(page); expect((await backend.job(id(job.id)))?.timeExpression).toBe(expression)
    await page.reload(); await searchJob(page, String(job.jobName)); const reopened = await editJob(page, String(job.jobName)); await jobSection(reopened, 'Schedule'); await reopened.getByRole('button', { name: 'Set daily interval', exact: true }).click(); await expect(selectors.dialog(page, 'Daily interval').getByLabel('Interval', { exact: true })).toHaveValue('9')
    await cancelDialog(page, 'Daily interval'); await cancelDialog(page, 'Edit job')
    await observation(info, 'UI-012', 'daily-invalid-shape', { malformedAndThreeInvalidShapesRejectedBeforeOpeningOrServerWrite: true, correctedEmptyExpressionResetDefaults: true, cancelledInterval13DiscardedOnReopen: true, nativeValidConfigSavedAndHardReopened: JSON.parse(expression), cronTypeQuickSetupDidNotParseDailyOrMutateComplexDraft: true, realSaveCount: saves })
  } finally { await owned.cleanup(info) }
})

test('UI-011/030/038 · latest native Reset wins over held original Job Query, list and Home actual network errors recover without fake rows', async ({ page, backend, credentials }, info) => {
  const owned = new OwnedResources(backend)
  let release: (() => void) | undefined
  try {
    await enterSamples(page, credentials); const job = await createJob(page, backend, owned, ownedName('list_generation'))
    let held = false, oldSHA = ''
    const gate = new Promise<void>(resolve => { release = resolve })
    await page.route('**/job/list', async route => { const body = route.request().postDataJSON(); if (body.keyword !== job.jobName) return route.continue(); const original = await route.fetch(); expect(original.ok()).toBe(true); oldSHA = crypto.createHash('sha256').update(await original.body()).digest('hex'); held = true; await gate; await route.fulfill({ response: original }).catch(() => {}) })
    await fill(page, 'Keyword', String(job.jobName)); await page.getByRole('button', { name: 'Search', exact: true }).click(); await expect.poll(() => held).toBe(true)
    const latest = await clickAndResponse<PageDTO<RecordDTO>>(page, '/job/list', () => page.getByRole('button', { name: 'Reset', exact: true }).click(), response => !response.request().postDataJSON()?.keyword && response.request().postDataJSON()?.index === 0)
    expect(latest.success).toBe(true); await expect(page.locator('tbody tr')).toHaveCount(latest.data.data.length)
    const latestText = await page.locator('tbody').innerText()
    if (!release) throw new Error('The original old Query was not held'); release(); await page.waitForTimeout(200)
    await expect(page.getByLabel('Keyword', { exact: true })).toHaveValue(''); expect(await page.locator('tbody').innerText()).toBe(latestText)
    await page.unroute('**/job/list')
    await page.route('**/job/list', route => route.abort('failed')); await page.getByRole('button', { name: 'Reset', exact: true }).click(); await expect(page.getByRole('alert').last()).toBeVisible(); expect(await page.locator('tbody').innerText()).toBe(latestText)
    await page.unroute('**/job/list'); await searchJob(page, String(job.jobName)); await expect(selectors.row(page, String(job.jobName))).toHaveCount(1)
    await page.goto('/#/oms/home'); await expect(page.getByRole('heading', { name: 'Operations overview', exact: true })).toBeVisible()
    await page.route('**/system/listWorker?*', route => route.abort('failed')); await page.getByRole('button', { name: 'Refresh', exact: true }).click(); await expect(page.getByRole('alert').last()).toBeVisible(); await page.unroute('**/system/listWorker?*')
    const recovered = await clickAndResponse<RecordDTO[]>(page, '/system/listWorker', () => page.getByRole('button', { name: 'Refresh', exact: true }).click())
    expect(recovered.success).toBe(true)
    for (const worker of recovered.data) await expect(page.getByRole('row').filter({ hasText: String(worker.address) })).toHaveCount(1)
    await observation(info, 'UI-010', 'home-refresh-error', { actualWorkerRequestNetworkFailureVisible: true, subsequentNativeRefreshActualWorkerRows: recovered.data.map(value => ({ address: value.address, status: value.status })), noResponseBodiesFabricated: true })
    await observation(info, 'UI-030', 'network-recovery', { exactJobID: id(job.id), originalJobListAndHomeWorkerRequestsAborted: true, oldRowsPreservedWithVisibleFeedback: true, actualNativeListQueryAndHomeRefreshRecovered: true, separateSaveDraftRecoveryEvidenceRequired: true })
    await observation(info, 'UI-038', 'request-race-app', { domain: 'same-app Job query generation', heldOriginalOldResponseSHA256: oldSHA, latestNativeResetOriginalResponseWon: true, staleReleaseDidNotReplaceCurrentDOM: true, crossAppEvidenceRequired: true })
  } finally { release?.(); await page.unroute('**/job/list'); await page.unroute('**/system/listWorker?*'); await owned.cleanup(info) }
})
