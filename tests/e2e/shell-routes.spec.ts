import { jobSection } from './job-ui'
import { test, expect, enterSamples, selectors, fill, check, cancelDialog, ownedName, observation, type RecordDTO } from './helpers'

test.use({ actionTimeout: 15_000 })

test('UI-029/030/040 · authenticated native bookmarks, navigation modes, refresh and language retain every existing route surface', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  await enterSamples(page, credentials)
  const workerRows = await backend.call<RecordDTO[]>('/system/listWorker', { query: { appId: backend.appId } })
  for (const worker of workerRows.filter(value => Number(value.status) !== 9999)) await expect(selectors.row(page, String(worker.address))).toHaveCount(1)
  const routes = [
    ['/oms/home', 'Operations overview', 'route-oms-home'], ['/oms/job', 'Jobs', 'route-oms-job'],
    ['/oms/instance', 'Job instances', 'route-oms-instance'], ['/oms/workflow', 'Workflows', 'route-oms-workflow'],
    ['/oms/wfinstance', 'Workflow instances', 'route-oms-wfinstance'], ['/oms/template', 'Processor templates', 'route-oms-template'],
    ['/oms/containermanage', 'Containers', 'route-oms-containermanage'], ['/oms/workflowEditor', 'New workflow', 'route-oms-workflowEditor'],
    ['/oms/wfInstanceDetail', 'Execution details', 'route-oms-wfInstanceDetail'],
    ['/admin/app', 'Applications', 'route-admin-app'], ['/admin/namespace', 'Namespaces', 'route-admin-namespace'],
    ['/admin/user', 'Users', 'route-admin-user'], ['/admin/personal', 'Profile', 'route-admin-personal'], ['/admin/settings', 'Settings', 'route-admin-settings'],
    ['/sidebar', 'Operations overview', 'route-sidebar'], ['/navbar', 'Applications', 'route-navbar'],
    ['/admin', 'Applications', 'route-admin'], ['/oms', 'Operations overview', 'route-oms'],
  ]
  for (const [route, heading, variant] of routes) {
    await page.goto('/#' + route)
    await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible()
    if (route === '/oms/wfInstanceDetail') await expect(page.getByRole('alert')).toContainText('The workflow instance ID is missing')
    await observation(info, 'UI-040', variant, { actualHashBookmarkAndCorrectNativePage: route, actualHeading: heading, functionalActions: 'COVERED_BY_SEPARATE_DOMAIN_TESTS_NOT_INFERRED_FROM_HEADING' })
  }
  await page.goto('/#/oms/home')
  const expand = page.getByRole('button', { name: 'Expand navigation', exact: true })
  await expect(expand).toBeVisible()
  await expand.click()
  await expect(page.getByRole('button', { name: 'Collapse navigation', exact: true })).toHaveAttribute('aria-expanded', 'true')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Collapse navigation', exact: true })).toBeVisible()
  await page.getByRole('complementary', { name: 'Navigation', exact: true }).getByRole('link', { name: 'Jobs', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Jobs', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Collapse navigation', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Expand navigation', exact: true })).toHaveAttribute('aria-expanded', 'false')
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('zh')
  await expect(page.getByRole('heading', { name: '任务', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: '任务', exact: true })).toBeVisible()
  await observation(info, 'UI-030', 'chinese-refresh', { realNativeLanguageSelectionAndHardReload: true })
  await page.getByRole('combobox', { name: '语言', exact: true }).selectOption('en')
  await expect(page.getByRole('heading', { name: 'Jobs', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Jobs', exact: true })).toBeVisible()
  await observation(info, 'UI-030', 'english-refresh', { realNativeLanguageSelectionAndHardReload: true })
  await page.setViewportSize({ width: 390, height: 780 })
  const open = page.getByRole('button', { name: 'Open navigation', exact: true, includeHidden: true })
  const rail = page.getByRole('complementary', { name: 'Navigation', exact: true, includeHidden: true })
  await expect(rail).toHaveAttribute('inert', '')
  await open.click()
  await expect(open).toHaveAttribute('aria-expanded', 'true')
  await expect(rail.getByRole('link', { name: 'PowerJob', exact: true })).toBeFocused()
  await rail.getByRole('link', { name: 'PowerJob', exact: true }).press('Shift+Tab')
  await expect(rail.getByRole('link', { name: 'Administration', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(rail).toHaveAttribute('inert', '')
  await expect(open).toBeFocused()
  await open.click()
  await rail.getByRole('link', { name: 'Templates', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Processor templates', exact: true })).toBeVisible()
  await expect(rail).toHaveAttribute('inert', '')
  await observation(info, 'UI-029', 'menu-narrow', { actualMobileDrawerOpenRouteCloseEscapeAndFocusTrap: true, desktopExpandCollapsePersistedAfterHardReload: true })
  await expect(page.getByText(/Vue\s*[23]|5\.1\.6_fev[23]/)).toHaveCount(0)
})

test('UI-029/040 · no-session native deep links and unknown bookmarks recover to the real supported sign-in page', async ({ page }, info) => {
  for (const route of ['/admin/app', '/oms/job', '/not-a-console-route', '/']) {
    await page.goto('/#' + route)
    await expect(page).toHaveURL(/#\/loginHomepage(?:\?|$)/)
    await expect(page.getByRole('heading', { name: 'Sign in to your workspace', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'PowerJob account', exact: true })).toBeEnabled()
    await expect(page.locator('dialog[open]')).toHaveCount(0)
  }
  await observation(info, 'UI-029', 'unknown-route', { unauthenticatedUnknownAndProtectedBookmarksRecoveredWithoutLoopOrOverlay: true })
  await observation(info, 'UI-040', 'route-root', { actualPublicRootRedirectAndLoadedSupportedMethods: true })
  await observation(info, 'UI-040', 'route-loginHomepage', { actualPublicSignInMethodPage: true })
  await page.getByRole('button', { name: 'PowerJob account', exact: true }).click()
  await expect(page).toHaveURL(/#\/powerjobLogin(?:\?|$)/)
  await expect(page.getByRole('heading', { name: 'Sign in with PowerJob', exact: true })).toBeVisible()
  await observation(info, 'UI-040', 'route-powerjobLogin', { actualNativeSupportedProviderLinkAndSignInForm: true })
})

for (const viewport of [{ width: 1440, height: 680, axis: 'desktop' }, { width: 390, height: 520, axis: 'mobile' }]) {
  test(`UI-041 · short ${viewport.axis} native Sunday CRON first fill, Apply/Cancel and dialog focus remain usable`, async ({ page, backend, credentials }, info) => {
    await enterSamples(page, credentials)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/#/oms/job')
    await page.getByRole('button', { name: 'New job', exact: true }).click()
    const editor = selectors.dialog(page, 'New job')
    await fill(editor, 'Job name', ownedName(`short_${viewport.axis}`))
    await check(editor, 'Enable job', false)
    await jobSection(editor, 'Schedule')
    await editor.getByLabel('Schedule type', { exact: true }).selectOption('CRON')
    await fill(editor, 'Schedule expression', '0 11 13 ? * MON#2 *')
    await editor.getByRole('button', { name: 'Quick setup', exact: true }).click()
    const builder = selectors.dialog(page, 'CRON quick setup')
    await builder.getByLabel('Frequency', { exact: true }).selectOption('weekly')
    await builder.getByLabel('Weekday', { exact: true }).selectOption({ label: 'Sunday' })
    await fill(builder, 'Hour', 0)
    await builder.getByLabel('Hour', { exact: true }).press('Tab')
    await fill(builder, 'Minute', 0)
    await builder.getByLabel('Minute', { exact: true }).press('Tab')
    await expect(builder.locator('code')).toHaveText('0 0 0 ? * 1')
    const apply = builder.getByRole('button', { name: 'Apply expression', exact: true })
    const cancel = builder.getByRole('button', { name: 'Cancel', exact: true })
    await apply.scrollIntoViewIfNeeded()
    await expect(apply).toBeInViewport()
    await expect(cancel).toBeInViewport()
    await apply.click()
    await expect(builder).not.toBeVisible()
    await expect(editor.getByLabel('Schedule expression', { exact: true })).toHaveValue('0 0 0 ? * 1')
    await expect(editor.getByRole('button', { name: 'Quick setup', exact: true })).toBeFocused()
    await cancelDialog(page, 'New job')
    expect((await backend.listJobs(ownedName(`short_${viewport.axis}`))).data).toHaveLength(0)
    await observation(info, 'UI-041', `fev3-short-${viewport.axis}`, { viewport, realRapidNativeWeekdayHourMinuteTab: true, generatedExpression: '0 0 0 ? * 1', applyAndCancelInViewport: true, parentCancelledWithoutObjectCreation: true })
  })
}
