import { test as projectTest, expect, login, selectors, formItem, input, clickAndResponse, runId } from './support.js'
import fs from 'node:fs/promises'
import enBase from '../../src/i18n/langs/en.js'
import cnBase from '../../src/i18n/langs/cn.js'
import { en as enAdded, cn as cnAdded } from '../../src/i18n/langs/enhancements.js'

const messages = { en: { ...enBase.message, ...enAdded }, cn: { ...cnBase.message, ...cnAdded } }
const viewports = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 1000 }]
const privateContent = page => [
  page.locator('input'), page.locator('textarea'), page.locator('.el-table__body-wrapper td .cell'),
  page.locator('.profile-summary'), page.locator('.el-select__selected-item:not(.el-select__placeholder)'),
  page.locator('.el-select-dropdown__item'), page.locator('.role-field .el-select__selection'), page.locator('.el-popper'),
]

// Replace the shared final screenshot fixture: admin tables and selected users
// contain private fixture data in addition to password and disabled inputs.
const test = projectTest.extend({
  consoleErrors: [async ({ page }, use, info) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (/\[Vue warn\]|\[intlify\]|Failed to resolve component/.test(message.text())) errors.push(message.text()) })
    page.on('response', response => { if (response.status() === 404 && /\.(?:js|css|woff2)(?:[?#]|$)/.test(response.url())) errors.push('An application asset returned 404') })
    await page.addInitScript(() => { if (!localStorage.getItem('oms_lang') && !localStorage.getItem('lang')) localStorage.setItem('oms_lang', 'en') })
    await use(errors)
    if (!page.isClosed()) {
      const filename = info.outputPath('final-redacted.png')
      await page.screenshot({ path: filename, fullPage: true, mask: privateContent(page), maskColor: '#c8d8e2' }).catch(() => {})
      await info.attach('final-redacted', { path: filename, contentType: 'image/png' }).catch(() => {})
    }
    expect(errors, 'Real browser renders must not raise application or asset errors').toEqual([])
  }, { auto: true }],
})

async function setLanguage(page, locale) {
  const name = locale === 'en' ? 'English' : '简体中文'
  const control = page.locator('.header-actions .header-button').first()
  await control.hover()
  await page.getByRole('menuitem', { name, exact: true }).click()
  await expect(control).toContainText(name)
}
async function logout(page, text) {
  await page.locator('.account-button').hover()
  await page.getByRole('menuitem', { name: text.logout, exact: true }).click()
  await expect(page).toHaveURL(/loginHomepage/)
  await expect(page.getByRole('heading', { name: text.welcomeTitle, exact: true })).toBeVisible()
  expect(await page.evaluate(() => Boolean(localStorage.getItem('PowerJwt')))).toBe(false)
}
async function noPageOverflow(page) {
  // Element Plus observes width changes asynchronously. Require the actual
  // rendered page to settle inside its viewport; persistent overflow still fails.
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth), { timeout: 5000, message: 'Overflow belongs inside data tables after layout settles' }).toBeLessThanOrEqual((await page.viewportSize()).width + 1)
  const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }))
  expect(sizes.document, 'Overflow belongs inside data tables, not the whole page').toBeLessThanOrEqual(sizes.viewport + 1)
  expect(sizes.body).toBeLessThanOrEqual(sizes.viewport + 1)
  return sizes
}
async function reachable(page, control, focus = false) {
  await control.scrollIntoViewIfNeeded()
  await expect(control).toBeVisible()
  await expect(control).toBeInViewport()
  const geometry = await control.evaluate(element => {
    const box = element.getBoundingClientRect()
    return { x: box.x, width: box.width, right: box.right, viewport: innerWidth }
  })
  expect(geometry.x, 'A control must have a reachable left edge').toBeGreaterThanOrEqual(-1)
  expect(geometry.right, 'A control must not be horizontally clipped by the viewport').toBeLessThanOrEqual(geometry.viewport + 1)
  if (focus) {
    await control.focus()
    await expect(control).toBeFocused()
    const hit = () => control.evaluate(element => {
      const box = element.getBoundingClientRect(), target = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
      return target === element || element.contains(target)
    })
    if (!await hit()) await test.info().attach('focus-overlay-observed', { body: JSON.stringify(await control.evaluate(element => {
      const box = element.getBoundingClientRect(), target = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
      return { focusedTag: element.tagName, targetTag: target?.tagName, targetClass: target?.getAttribute('class'), box: box.toJSON() }
    })), contentType: 'application/json' })
    // A loading mask can still be fading when its underlying form is enabled.
    await expect.poll(hit, { timeout: 5000, message: 'The focused control must be reachable after loading/transition settles' }).toBe(true)
  }
  return geometry
}
async function dialogFields(page, dialog, labels) {
  for (const label of labels) await reachable(page, dialog.getByLabel(label, { exact: true }), true)
}
async function tableScroll(page) {
  await expect(page.locator('.el-loading-mask:visible')).toHaveCount(0)
  const area = page.locator('.el-table__body-wrapper .el-scrollbar__wrap').first()
  await expect(area).toBeVisible()
  const dimensions = await area.evaluate(element => ({ width: element.clientWidth, contentWidth: element.scrollWidth }))
  let scrolled = false
  if (dimensions.contentWidth > dimensions.width + 1) {
    await area.scrollIntoViewIfNeeded()
    // Aim inside ordinary body cells, rather than a sticky action/status column.
    await area.hover({ position: { x: 24, y: 24 } })
    await test.info().attach('table-scroll-before', { body: JSON.stringify(await area.evaluate(element => {
      const box = element.getBoundingClientRect(), target = document.elementFromPoint(box.x + 24, box.y + 24)
      return { box: box.toJSON(), clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, scrollLeft: element.scrollLeft, overflowX: getComputedStyle(element).overflowX, targetTag: target?.tagName, targetClass: target?.getAttribute('class'), targetInsideScrollArea: element.contains(target) }
    })), contentType: 'application/json' })
    await page.mouse.wheel(900, 0)
    await expect.poll(() => area.evaluate(element => element.scrollLeft), { message: 'Real horizontal input scrolls the table independently' }).toBeGreaterThan(0)
    scrolled = true
    await page.mouse.wheel(-900, 0)
    await expect.poll(() => area.evaluate(element => element.scrollLeft)).toBe(0)
  }
  await noPageOverflow(page)
  return { ...dimensions, actualHorizontalWheelScroll: scrolled }
}
async function snapshot(page, info, name) {
  const filename = info.outputPath(`${name}-redacted.png`)
  await page.screenshot({ path: filename, fullPage: true, mask: privateContent(page), maskColor: '#c8d8e2' })
  await info.attach(name, { path: filename, contentType: 'image/png' })
  return filename
}
async function evidence(info, page, surface, locale, viewport, actual) {
  const screenshot = await snapshot(page, info, surface)
  const value = { surface, locale, viewport, status: 'PASS', testTitle: info.title, runId, actual, screenshot, noBusinessMutations: true }
  const filename = info.outputPath(`responsive-${surface}.json`)
  await fs.writeFile(filename, JSON.stringify(value, null, 2))
  await info.attach(`responsive-${surface}`, { path: filename, contentType: 'application/json' })
}

for (const locale of ['cn', 'en']) for (const viewport of viewports) {
  test(`frontend-design responsive admin/auth · ${locale} ${viewport.width}`, async ({ page, credentials }, info) => {
    test.setTimeout(180_000)
    const text = messages[locale], mutations = []
    page.on('request', request => {
      if (/\/(?:appInfo\/(?:save|delete|becomeAdmin)|namespace\/(?:save|delete)|user\/(?:modify|enable|disable)|pwjbUser\/(?:create|changePassword)|auth\/saveGlobalAdmin)(?:\?|$)/.test(request.url())) mutations.push(new URL(request.url()).pathname)
    })
    // The credentials fixture does not log in; use the actual normal UI flow.
    await login(page, credentials)
    await setLanguage(page, locale)
    await page.setViewportSize(viewport)
    const lists = [
      { surface: 'app', route: '/admin/app', title: 'tabAppManage', endpoint: '/appInfo/list', field: 'appNameLike', label: 'appName', add: true },
      { surface: 'namespace', route: '/admin/namespace', title: 'tabNamespace', endpoint: '/namespace/list', field: 'codeLike', label: 'Code', add: true },
      { surface: 'users', route: '/admin/user', title: 'tabUserManager', endpoint: '/user/query', field: 'nickLike', label: text.nick },
    ]
    for (const list of lists) {
      await page.goto('/#' + list.route)
      await expect(page.getByRole('heading', { name: text[list.title], level: 1, exact: true })).toBeInViewport()
      const filters = page.locator('.filter-panel')
      for (const control of await filters.getByRole('textbox').all()) await reachable(page, control, true)
      for (const select of await filters.locator('.el-select').all()) {
        await reachable(page, select)
        await select.getByRole('combobox').focus(); await expect(select.getByRole('combobox')).toBeFocused()
      }
      const query = filters.getByRole('button', { name: text.query, exact: true }), reset = filters.getByRole('button', { name: text.reset, exact: true })
      await reachable(page, query, true); await reachable(page, reset, true)
      const initialGeometry = await noPageOverflow(page)
      await input(filters, list.label, `${runId}_not_present`)
      const queried = await clickAndResponse(page, list.endpoint, () => query.click(), response => response.request().postDataJSON()?.[list.field] === `${runId}_not_present`)
      expect(queried.success).toBe(true)
      await expect(page.locator('.el-table__empty-block')).toBeVisible()
      const restored = await clickAndResponse(page, list.endpoint, () => reset.click(), response => !response.request().postDataJSON()?.[list.field])
      expect(restored.success).toBe(true)
      await expect(formItem(filters, list.label).locator('input')).toHaveValue('')
      const scrolling = await tableScroll(page)
      await page.getByRole('heading', { name: text[list.title], level: 1, exact: true }).scrollIntoViewIfNeeded()
      await evidence(info, page, list.surface, locale, viewport, { headingAndQueryResetReachable: true, filterFocusUnclipped: true, actualQueryResetResponsesSucceeded: true, emptyQueryRecovered: true, document: initialGeometry, table: scrolling })
      if (list.add) {
        await reachable(page, page.getByRole('button', { name: text.add, exact: true }), true)
        await page.getByRole('button', { name: text.add, exact: true }).click()
        const dialog = selectors.dialog(page)
        await expect(dialog).toBeVisible()
        await dialogFields(page, dialog, list.surface === 'app' ? ['appName', text.name, text.password, text.tag, text.extra] : ['Code', text.name, text.tag, text.extra])
        const cancel = dialog.getByRole('button', { name: text.cancel, exact: true })
        await reachable(page, cancel, true)
        await snapshot(page, info, `${list.surface}-new-dialog`)
        await cancel.click(); await expect(dialog).not.toBeVisible()
        await noPageOverflow(page)
      }
    }

    await page.goto('/#/admin/personal')
    await expect(page.getByRole('heading', { name: text.tabPersonal, level: 1, exact: true })).toBeInViewport()
    const profile = page.locator('.profile-card').first()
    await expect(profile.getByRole('button', { name: text.save, exact: true })).toBeEnabled()
    for (const label of [text.nick, text.phone, text.email, text.webhook]) await reachable(page, profile.getByLabel(label, { exact: true }), true)
    await reachable(page, profile.getByRole('button', { name: text.save, exact: true }), true)
    const access = page.locator('.app-admin-card')
    for (const label of ['appName', text.password]) await reachable(page, access.getByLabel(label, { exact: true }), true)
    await reachable(page, access.getByRole('button', { name: text.authThenBecomeAdmin, exact: true }), true)
    await page.getByRole('heading', { name: text.tabPersonal, level: 1, exact: true }).scrollIntoViewIfNeeded()
    await evidence(info, page, 'profile', locale, viewport, { identityContactAndAccessFormsVisible: true, editableControlsFocusUnclipped: true, saveAndAccessActionsReachable: true, document: await noPageOverflow(page) })
    await profile.getByRole('button', { name: text.changePassword, exact: true }).click()
    let dialog = selectors.dialog(page)
    await dialogFields(page, dialog, [text.oldPassword, text.newPassword, text.newPassword2])
    for (const label of [text.oldPassword, text.newPassword, text.newPassword2]) await expect(dialog.getByLabel(label, { exact: true })).toHaveAttribute('type', 'password')
    await snapshot(page, info, 'password-dialog')
    await dialog.getByRole('button', { name: text.cancel, exact: true }).click(); await expect(dialog).not.toBeVisible()

    await page.goto('/#/admin/settings')
    await expect(page.getByRole('heading', { name: text.tabSettings, level: 1, exact: true })).toBeInViewport()
    const settings = page.locator('.settings-card'), adminSelect = settings.locator('.el-select')
    await expect(settings.getByRole('button', { name: text.save, exact: true })).toBeEnabled()
    await reachable(page, adminSelect)
    await adminSelect.click(); await expect(page.locator('.el-select-dropdown:visible')).toBeVisible()
    await page.keyboard.press('Escape'); await expect(page.locator('.el-select-dropdown:visible')).toHaveCount(0)
    await reachable(page, settings.getByRole('button', { name: text.save, exact: true }), true)
    await evidence(info, page, 'settings', locale, viewport, { administratorSelectOpenedAndCancelled: true, saveActionReachable: true, document: await noPageOverflow(page) })

    // Real logout avoids the login homepage's normal existing-session redirect.
    await logout(page, text)
    await expect(page.getByRole('heading', { name: text.consoleTagline, level: 1, exact: true })).toBeInViewport()
    const method = page.getByRole('button', { name: /PWJB|PowerJob/i }).first()
    await reachable(page, method, true)
    await evidence(info, page, 'login-homepage', locale, viewport, { actualLogout: true, welcomeAndMethodVisible: true, methodFocusUnclipped: true, document: await noPageOverflow(page) })
    await method.click(); await expect(page).toHaveURL(/powerjobLogin/)
    await expect(page.getByRole('heading', { name: text.login, level: 1, exact: true })).toBeInViewport()
    const username = page.getByLabel(text.username, { exact: true }), password = page.getByLabel(text.password, { exact: true })
    await username.fill('unsent-layout-draft'); await password.fill('Synthetic.Unsent.Layout.Only')
    await reachable(page, username, true); await reachable(page, password, true)
    await expect(password).toHaveAttribute('type', 'password')
    await reachable(page, page.getByRole('button', { name: text.login, exact: true }), true)
    await reachable(page, page.getByRole('button', { name: text.userRegister, exact: true }), true)
    await evidence(info, page, 'direct-login', locale, viewport, { passwordMasked: true, usernamePasswordAndPrimaryActionsReachable: true, unsentDraftOnly: true, document: await noPageOverflow(page) })
    await page.getByRole('button', { name: text.userRegister, exact: true }).click()
    dialog = selectors.dialog(page)
    await expect(dialog).toBeVisible()
    await dialogFields(page, dialog, [text.username, text.nick, text.phone, text.email, text.webhook, text.newPassword, text.newPassword2])
    await dialog.getByLabel(text.username, { exact: true }).fill(`${runId}_cancel_only`)
    for (const label of [text.newPassword, text.newPassword2]) {
      await dialog.getByLabel(label, { exact: true }).fill('Synthetic.Cancel.Layout.Only')
      await expect(dialog.getByLabel(label, { exact: true })).toHaveAttribute('type', 'password')
    }
    await reachable(page, dialog.getByRole('button', { name: text.register, exact: true }), true)
    await reachable(page, dialog.getByRole('button', { name: text.cancel, exact: true }), true)
    await evidence(info, page, 'registration', locale, viewport, { allSevenFieldsFocusUnclipped: true, passwordsMasked: true, registerAndCancelReachable: true, document: await noPageOverflow(page) })
    await dialog.getByRole('button', { name: text.cancel, exact: true }).click(); await expect(dialog).not.toBeVisible()
    await page.getByRole('button', { name: text.userRegister, exact: true }).click()
    dialog = selectors.dialog(page)
    for (const label of [text.username, text.newPassword, text.newPassword2]) await expect(dialog.getByLabel(label, { exact: true })).toHaveValue('')
    await dialog.getByRole('button', { name: text.cancel, exact: true }).click(); await expect(dialog).not.toBeVisible()
    expect(mutations, 'Layout checks must not write shared business data, permissions or account credentials').toEqual([])
    await info.attach('readonly-closure', { body: JSON.stringify({ locale, viewport, actualMutationRequests: mutations.length, registrationCancelledAndFreshDraftEmpty: true, noRegistrationSubmitted: true }), contentType: 'application/json' })
  })
}
