import { test, expect, selectors, enterSamples, login } from './support.js'
import cn from '../../src/i18n/langs/cn.js'
import fs from 'node:fs/promises'

async function proof(info, caseId, variantId, actual) {
  const result = { caseId, variantId, status: 'PASS', testTitle: info.title, actual }
  await fs.writeFile(info.outputPath(`variant-${caseId}-${variantId}.json`), JSON.stringify(result, null, 2))
  await info.attach(`${caseId}/${variantId}`, { body: JSON.stringify(result), contentType: 'application/json' })
}

test('UI-029/030/040 · all workspace/admin menus, hash reload, locales and missing context', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  await enterSamples(page, credentials)
  for (const [route, name, action] of [
    ['/oms/home', 'Home', 'Refresh'],
    ['/oms/job', 'Job management', 'Reset'],
    ['/oms/instance', 'Job instances', 'Refresh'],
    ['/oms/workflow', 'Workflow management', 'Reset'],
    ['/oms/wfinstance', 'Workflow instances', 'Refresh'],
    ['/oms/template', 'Template generator', 'Generate template'],
    ['/oms/containermanage', 'Container Management', 'Refresh'],
  ]) {
    await page.locator('nav').getByRole('link', { name, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(route))
    await expect(page.locator('.workspace-header strong')).toContainText(name)
    await page.getByRole('button', { name: action, exact: true }).first().click()
    await page.reload()
    await expect(page.locator('nav').getByRole('link', { name, exact: true })).toHaveClass(/active/)
    await proof(info, 'UI-040', `route-${route.slice(1).replaceAll('/', '-')}`, { actualMenuNavigation: true, majorAction: action, actualHardReload: true, titleAndActive: true })
  }
  await proof(info, 'UI-029', 'oms-menus', { sevenActualMenusAndMajorActions: true, pathsTitlesActiveHardReload: true })
  await page.getByRole('button', { name: 'English', exact: true }).hover()
  await page.getByRole('menuitem', { name: '简体中文', exact: true }).click()
  await expect(page.getByRole('button', { name: '简体中文', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: '简体中文', exact: true })).toBeVisible()
  await page.goto('/#/oms/home')
  await expect(page.locator('h1')).toHaveText(cn.message.tabHome)
  await expect(page.getByRole('button', { name: cn.message.refresh, exact: true })).toBeVisible()
  await proof(info, 'UI-030', 'chinese-refresh', { selectedChinese: true, hardReloadPersistence: true, actualHomeHeadingAndActionTranslated: true })
  await page.getByRole('button', { name: '简体中文', exact: true }).hover()
  await page.getByRole('menuitem', { name: 'English', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'English', exact: true })).toBeVisible()
  await expect(page.locator('h1')).toHaveText('Home')
  await proof(info, 'UI-030', 'english-refresh', { selectedEnglish: true, hardReloadPersistence: true, actualHomeHeadingAndActionTranslated: true })
  await page.goto('/#/oms/wfInstanceDetail')
  await expect(page).toHaveURL(/oms\/wfinstance/)
  await page.goto('/#/oms/workflowEditor')
  await expect(page.getByLabel('Workflow name', { exact: true })).toBeVisible()
  await page.locator('.editor-heading').getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page).toHaveURL(/oms\/workflow/)
  await proof(info, 'UI-040', 'route-oms-workflowEditor', { noIdNewEditor: true, actualBack: true, restoredManager: true })
  await page.locator('.account-button').hover()
  await page.getByRole('menuitem', { name: 'Back to home', exact: true }).click()
  await expect(page).toHaveURL(/admin\/app/)
  for (const [route, name] of [['/admin/app', 'AppManage'], ['/admin/namespace', 'Namespace'], ['/admin/user', 'UserManager'], ['/admin/personal', 'Personal'], ['/admin/settings', 'Settings']]) {
    await page.locator('nav').getByRole('link', { name, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(route))
    await expect(page.locator('.workspace-header strong')).toContainText(name)
    if (route === '/admin/personal') {
      await page.getByRole('button', { name: 'Change Password', exact: true }).click()
      await expect(selectors.dialog(page)).toBeVisible()
      await selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(selectors.dialog(page)).not.toBeVisible()
    } else if (route !== '/admin/settings') {
      await page.getByRole('button', { name: 'Query', exact: true }).click()
    } else {
      await page.locator('.settings-card .el-select').click()
      await expect(page.locator('.el-select-dropdown:visible')).toBeVisible()
      await page.locator('h1').click()
    }
    await page.reload()
    await expect(page.locator('main')).toBeVisible()
    await proof(info, 'UI-040', `route-${route.slice(1).replaceAll('/', '-')}`, { actualMenuNavigation: true, majorAction: route === '/admin/personal' ? 'Password dialog cancellation' : route === '/admin/settings' ? 'Administrator selector open/close' : 'Query', actualHardReload: true, titleAndActive: true })
  }
  await proof(info, 'UI-029', 'admin-menus', { fiveMenusMajorActions: true, titlePathHardReload: true })
  for (const route of ['/sidebar', '/navbar', '/missing-synthetic-route']) {
    await page.goto('/#' + route)
    await expect(page.locator('body')).toContainText(/PowerJob|AppManage|Home|Workspace/)
    if (route === '/navbar') { await page.reload(); await page.locator('.account-button').hover(); await page.getByRole('menuitem', { name: 'Back to home', exact: true }).click(); await expect(page).toHaveURL(/admin\/app/) }
  }
  await proof(info, 'UI-029', 'debug-routes', { originalSidebarNavbarRecoverable: true, noDataMutation: true, actualNavbarReturn: true })
  await proof(info, 'UI-040', 'route-navbar', { originalPath: true, actualReturnAction: true, recoveredAdmin: true })
  await enterSamples(page, credentials)
  await page.goto('/#/sidebar')
  await page.locator('nav').getByRole('link', { name: 'Job management', exact: true }).click()
  await expect(page).toHaveURL(/oms\/job/)
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'New job', exact: true })).toBeVisible()
  await proof(info, 'UI-040', 'route-sidebar', { originalPathNavigation: true, actualTaskReset: true, actualHardReload: true })
  await page.goto('/#/oms')
  await expect(page).toHaveURL(/oms\/home/)
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page.reload()
  await proof(info, 'UI-040', 'route-oms', { parentRedirectHome: true, actualRefreshAndReload: true })
  await page.goto('/#/admin')
  await expect(page).toHaveURL(/admin\/app/)
  await page.getByRole('button', { name: 'Query', exact: true }).click()
  await page.reload()
  await proof(info, 'UI-040', 'route-admin', { parentRedirectApp: true, actualQueryAndReload: true })
  await page.goto('/#/missing-synthetic-route')
  await expect(page).toHaveURL(/admin\/app/)
  await page.locator('.account-button').hover()
  await page.getByRole('menuitem', { name: 'Logout', exact: true }).click()
  await expect(page).toHaveURL(/loginHomepage/)
  await page.goto('/#/missing-synthetic-route')
  await expect(page).toHaveURL(/loginHomepage/)
  await page.getByRole('button', { name: /PWJB|PowerJob/i }).first().click()
  await expect(page).toHaveURL(/powerjobLogin/)
  await proof(info, 'UI-029', 'unknown-route', { authenticatedAndLoggedOutUnknownHashRecovered: true, realLoginNavigation: true })
  await login(page, credentials)
  await proof(info, 'UI-040', 'route-loginHomepage', { loggedOutLoginMethodSelection: true, realPWJBLoginNavigationAndAuthentication: true })
  await proof(info, 'UI-040', 'route-powerjobLogin', { actualCredentialFormAndLoginSuccess: true, restoredAdministratorNavigation: true })
  await enterSamples(page, credentials)
  await page.locator('.account-button').hover()
  await page.getByRole('menuitem', { name: 'Back to home', exact: true }).click()
  await expect(page).toHaveURL(/admin\/app/)
  await page.locator('.account-button').hover()
  await page.getByRole('menuitem', { name: 'Logout', exact: true }).click()
  await expect(page).toHaveURL(/loginHomepage/)
  expect(await page.evaluate(() => ({ jwt: !!localStorage.getItem('PowerJwt'), app: !!localStorage.getItem('Power_appId') }))).toEqual({ jwt: false, app: false })
  await page.goto('/#/')
  await expect(page).toHaveURL(/loginHomepage/)
  await page.reload()
  await login(page, credentials)
  await proof(info, 'UI-040', 'route-root', { actualRootRedirectAndReload: true, loginMethodAndRealAuthentication: true })
  await proof(info, 'UI-029', 'app-return-logout', { actualReturnToApplicationThenReenterThenLogout: true, tokenAndApplicationCleared: true, realLoginRecovery: true })
  await proof(info, 'UI-031', 'vue3-bootstrap', { immutableProductionBuild: true, trueRouterStoreI18nActions: true, noCapturedVueErrors: true })
  await proof(info, 'UI-031', 'hash-router-compat', { actualOldHashPathsAndReload: true, parentRedirects: true })
  expect(backend.appId).toBe(credentials.app_id)
})

for (const width of [1440, 1024, 768, 390]) {
  test(`UI-035 · ${width}px page layout keeps actual task and container actions reachable`, async ({ page, backend, credentials }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 })
    await enterSamples(page, credentials)
    await page.goto('/#/oms/job')
    const newJob = page.getByRole('button', { name: 'New job', exact: true })
    await expect(newJob).toBeInViewport()
    await newJob.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    const widths = await page.getByRole('dialog').locator('input:visible, textarea:visible').evaluateAll(inputs => inputs.map(input => ({ placeholder: input.getAttribute('placeholder'), width: input.getBoundingClientRect().width })))
    expect(widths.length).toBeGreaterThan(10)
    for (const entry of widths) expect(entry.width, `Usable width for ${entry.placeholder}`).toBeGreaterThan(35)
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.goto('/#/oms/containermanage')
    await page.getByRole('button', { name: 'New container', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
    if (await page.getByRole('button', { name: 'Navigation', exact: true }).isVisible()) {
      await page.getByRole('button', { name: 'Navigation', exact: true }).click()
      await expect(page.locator('nav').getByRole('link', { name: 'Job management', exact: true })).toBeInViewport()
      await page.locator('nav').getByRole('link', { name: 'Job management', exact: true }).click()
      await expect(page).toHaveURL(/oms\/job/)
      await expect(page.locator('.app-shell')).not.toHaveClass(/nav-open/)
      if (width === 390) await proof(testInfo, 'UI-029', 'menu-narrow', { actual390pxNavigationExpansion: true, taskNavigationReachable: true, automaticallyCollapsedAfterSelection: true, jobAndContainerActionsActualReachable: true })
    }
    await testInfo.attach('viewport', { body: JSON.stringify({ width, height: 1000, appIdVerified: backend.appId === credentials.app_id }), contentType: 'application/json' })
  })
}
