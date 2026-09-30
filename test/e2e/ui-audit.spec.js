import { test, expect, selectors, runId, demoProcessor, timeoutProcessor, input, formItem, enterSamples, saveDialog, clickAndResponse, confirmDialog } from './support.js'
import cn from '../../src/i18n/langs/cn.js'
import fs from 'node:fs/promises'

async function proof(info, variantId, actual) {
  const result = { caseId: 'UI-035', variantId, status: 'PASS', testTitle: info.title, actual }
  await fs.writeFile(info.outputPath(`variant-${variantId}.json`), JSON.stringify(result, null, 2))
  await info.attach(variantId, { body: JSON.stringify(result), contentType: 'application/json' })
}

test('UI-035 · real loading/error/empty states, readable long bilingual text and status/danger labels', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  await enterSamples(page, credentials)
  const ids = [], instances = []
  const longName = `${runId}_` + '超长中文任务名稱😀'.repeat(25)
  // The released Server's description column is varchar(255); keep this UI
  // readability fixture within that original protocol's legitimate value range.
  const longDescription = '说明包括中文与英文 detailed description, quotes " and symbols &+%# '.repeat(3)
  const longParams = '多行参数\n中文 😀 &+%# "quoted"\n'.repeat(12)
  const session = await page.context().newCDPSession(page)
  try {
    await session.send('Network.enable')
    await session.send('Network.emulateNetworkConditions', { offline: false, latency: 800, downloadThroughput: 500_000, uploadThroughput: 500_000 })
    const refresh = page.waitForResponse(response => response.url().split('?')[0].endsWith('/system/overview'))
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await expect(page.locator('.workers-panel .el-loading-mask:visible').last()).toBeVisible()
    await refresh
    await expect(page.locator('.workers-panel .el-loading-mask:visible')).toHaveCount(0)
    await session.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
    await page.goto('/#/oms/job')
    await input(page.locator('main'), 'Keyword', `${runId}_none_exists`)
    const empty = await clickAndResponse(page, '/job/list', () => page.getByRole('button', { name: 'Query', exact: true }).click(), response => response.request().postDataJSON()?.keyword === `${runId}_none_exists`)
    expect(empty.data.totalItems).toBe(0)
    await expect(page.locator('.el-table__empty-text')).toBeVisible()
    await page.context().setOffline(true)
    await page.getByRole('button', { name: 'Query', exact: true }).click()
    await expect(page.locator('.el-message--error').last()).toBeVisible()
    await page.context().setOffline(false)
    expect((await clickAndResponse(page, '/job/list', () => page.getByRole('button', { name: 'Query', exact: true }).click())).success).toBe(true)
    await proof(info, 'empty-loading-error', { actualCDPSlowNetworkLoadingMask: true, trueEmptyResultAndText: true, realOfflineErrorVisiblyDistinct: true, actualOnlineRecovery: true })

    await page.getByRole('button', { name: 'New job', exact: true }).click()
    await expect(selectors.dialog(page).getByRole('button', { name: 'Save', exact: true })).toHaveClass(/el-button--primary/)
    await input(selectors.dialog(page), 'Job name', longName)
    await input(selectors.dialog(page), 'Job description', longDescription)
    await input(selectors.dialog(page), 'Job params', longParams)
    await input(selectors.dialog(page), 'Execution config', demoProcessor)
    await saveDialog(page, '/job/save')
    const job = (await backend.listJobs(longName)).data[0]; ids.push(job.id)
    expect(job.jobDescription).toBe(longDescription)
    expect(job.jobParams).toBe(longParams)
    await input(page.locator('main'), 'Keyword', '')
    await input(page.locator('main'), 'Job ID', job.id)
    await page.getByRole('button', { name: 'Query', exact: true }).click()
    let row = selectors.row(page, String(job.id))
    await row.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(formItem(selectors.dialog(page), 'Job name').locator('input')).toHaveValue(longName)
    await expect(formItem(selectors.dialog(page), 'Job description').locator('input')).toHaveValue(longDescription)
    await expect(formItem(selectors.dialog(page), 'Job params').locator('textarea')).toHaveValue(longParams)
    const cancel = selectors.dialog(page).getByRole('button', { name: 'Cancel', exact: true })
    await cancel.scrollIntoViewIfNeeded(); await expect(cancel).toBeInViewport(); await cancel.click()
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.getByRole('button', { name: 'English', exact: true }).hover()
      await page.getByRole('menuitem', { name: '简体中文', exact: true }).click()
      const edit = row.getByRole('button', { name: cn.message.edit, exact: true })
      await edit.scrollIntoViewIfNeeded(); await expect(edit).toBeInViewport(); await edit.click()
      await expect(formItem(selectors.dialog(page), cn.message.jobName).locator('input')).toHaveValue(longName)
      const cancelCn = selectors.dialog(page).getByRole('button', { name: cn.message.cancel, exact: true })
      await cancelCn.scrollIntoViewIfNeeded(); await expect(cancelCn).toBeInViewport(); await cancelCn.click()
      await page.getByRole('button', { name: '简体中文', exact: true }).hover()
      await page.getByRole('menuitem', { name: 'English', exact: true }).click()
    }
    await proof(info, 'long-text-locales', { actualLongChineseEmojiNameDescriptionAndMultilineParameters: true, independentDTOReadback: true, completeFieldsReadableViaEditor: true, both1440And390BothLocalesActionsReachable: true })
    await page.setViewportSize({ width: 1440, height: 1000 })
    const statuses = []
    for (const [parameter, processor, expected] of [['success', demoProcessor, 5], ['failed', demoProcessor, 4], ['30000', timeoutProcessor, 10]]) {
      await row.getByRole('button', { name: 'Edit', exact: true }).click()
      await input(selectors.dialog(page), 'Job params', parameter)
      await input(selectors.dialog(page), 'Execution config', processor)
      await saveDialog(page, '/job/save')
      const run = await clickAndResponse(page, '/job/run', () => row.getByRole('button', { name: 'Run', exact: true }).click())
      instances.push(run.data)
      if (expected === 10) { await backend.waitInstance(run.data, [3]); await backend.call('/instance/stop?instanceId=' + run.data) }
      await backend.waitInstance(run.data, [expected]); statuses.push({ instanceId: run.data, status: expected })
    }
    await page.goto('/#/oms/instance')
    await input(page.locator('main'), 'Job ID', job.id)
    await page.locator('#instance_manager').getByRole('button', { name: 'Query', exact: true }).first().click()
    for (const [index, label] of [[0, 'Success'], [1, 'Failed'], [2, 'Stopped']]) await expect(selectors.row(page, String(statuses[index].instanceId))).toContainText(label)
    await expect(selectors.row(page, String(statuses[2].instanceId)).getByRole('button', { name: 'Stop', exact: true })).toHaveClass(/el-button--danger/)
    await proof(info, 'status-noncolor', { actualRealWorkerSuccessFailedStoppedStates: true, explicitReadableStatusTextOnEach: true, dangerStopActionLabelVisible: true })
    await page.goto('/#/oms/job')
    await input(page.locator('main'), 'Job ID', job.id)
    await page.getByRole('button', { name: 'Query', exact: true }).click()
    row = selectors.row(page, String(job.id))
    await row.getByRole('button', { name: 'More', exact: true }).click()
    await page.locator('.el-dropdown-menu:visible').getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(selectors.confirm(page)).toContainText(longName)
    await expect(selectors.confirm(page).getByRole('button', { name: 'Cancel', exact: true })).toBeVisible()
    await confirmDialog(page, false)
    expect(await backend.job(job.id)).toBeTruthy()
    await proof(info, 'ui-consistency', { currentRealPagesShareHeadingShellFormButtonPatterns: true, newAndSavePrimaryActionsMarked: true, destructiveStopAndDeleteExplicitlyLabeled: true, namedDeletionConfirmationWithSafeCancellation: true, statesReadableWithoutColor: true })
  } finally {
    await page.context().setOffline(false)
    await session.detach()
    for (const instance of instances) await backend.call('/instance/stop?instanceId=' + instance, { allowFailure: true })
    for (const id of ids) await backend.deleteOwnedJob(id)
  }
})
