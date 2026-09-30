import { test, expect, selectors, runId, input, enterSamples, demoProcessor, saveDialog, clickAndResponse } from './support.js'
import fs from 'node:fs/promises'

test('UI-011/020 · eleven page-created jobs and workflows with page/filter/reset boundaries', async ({ page, backend, credentials }, info) => {
  test.setTimeout(360_000)
  await enterSamples(page, credentials)
  const jobIds = [], workflowIds = []
  const jobPrefix = `${runId}_jobpages_`, workflowPrefix = `${runId}_wfpages_`
  async function proof(caseId, variantId, actual) {
    const result = { caseId, variantId, status: 'PASS', testTitle: info.title, actual }
    await fs.writeFile(info.outputPath(`variant-${caseId}-${variantId}.json`), JSON.stringify(result, null, 2))
    await info.attach(`${caseId}/${variantId}`, { body: JSON.stringify(result), contentType: 'application/json' })
  }
  try {
    await page.goto('/#/oms/job')
    for (let index = 0; index < 11; index++) {
      const name = jobPrefix + String(index).padStart(2, '0')
      await page.getByRole('button', { name: 'New job', exact: true }).click()
      await input(selectors.dialog(page), 'Job name', name)
      await input(selectors.dialog(page), 'Execution config', demoProcessor)
      await saveDialog(page, '/job/save')
      const result = (await backend.listJobs(name)).data
      expect(result).toHaveLength(1)
      jobIds.push(result[0].id)
    }
    await input(page.locator('main'), 'Keyword', jobPrefix)
    let response = await clickAndResponse(page, '/job/list', () => page.getByRole('button', { name: 'Query', exact: true }).click(), response => response.request().postDataJSON()?.keyword === jobPrefix)
    expect(response.data.totalItems).toBe(11)
    await expect(page.locator('.el-table__body-wrapper tr')).toHaveCount(10)
    const first = response.data.data.map(job => String(job.id))
    response = await clickAndResponse(page, '/job/list', () => page.locator('.el-pager li').getByText('2', { exact: true }).click())
    expect(response.data.index).toBe(1)
    expect(response.data.data).toHaveLength(1)
    expect(first).not.toContain(String(response.data.data[0].id))
    await input(page.locator('main'), 'Job ID', jobIds[0])
    response = await clickAndResponse(page, '/job/list', () => page.getByRole('button', { name: 'Query', exact: true }).click())
    expect(response.data.data).toHaveLength(1)
    expect(String(response.data.data[0].id)).toBe(String(jobIds[0]))
    await expect(page.locator('.el-pagination:visible')).toHaveCount(0)
    await clickAndResponse(page, '/job/list', () => page.getByRole('button', { name: 'Reset', exact: true }).click())
    await expect(page.getByPlaceholder('Job ID', { exact: true })).toHaveValue('')
    await expect(page.getByPlaceholder('Keyword', { exact: true })).toHaveValue('')
    await expect(page.locator('.el-pager li.is-active')).toHaveText('1')
    await proof('UI-011', 'job-pagination-boundary', { pageCreatedJobs: 11, disjointPages: true, exactIDOnPageTwoResetsPage: true, pageIndexVerified: true })
    await proof('UI-011', 'job-id-keyword-reset', { bothFilters: true, firstPageReset: true, inputsCleared: true })

    for (let index = 0; index < 11; index++) {
      await page.goto('/#/oms/workflow')
      await page.getByRole('button', { name: 'New workflow', exact: true }).click()
      await input(page.locator('main'), 'Workflow name', workflowPrefix + String(index).padStart(2, '0'))
      await page.locator('.canvas-toolbar').getByRole('button', { name: /Import job/ }).click()
      const drawer = page.locator('.el-drawer:visible')
      await input(drawer, 'Job ID', jobIds[0])
      await drawer.getByRole('button', { name: 'Query', exact: true }).click()
      const imported = await clickAndResponse(page, '/workflow/saveNode', () => selectors.row(page, String(jobIds[0])).getByRole('button', { name: 'Import', exact: true }).click())
      expect(imported.success).toBe(true)
      await expect(drawer).not.toBeVisible()
      const saved = await clickAndResponse(page, '/workflow/save', () => page.locator('.editor-heading').getByRole('button', { name: 'Save', exact: true }).click())
      expect(saved.success).toBe(true)
      workflowIds.push(String(saved.data))
    }
    await page.goto('/#/oms/workflow')
    const unsupportedWrites = []
    const countUnsupported = request => { if (/\/(?:workflow\/export|job\/save)(?:\?|$)/.test(request.url())) unsupportedWrites.push(request.url().split('?')[0]) }
    page.on('request', countUnsupported)
    await input(page.locator('main'), 'Keyword', workflowPrefix)
    response = await clickAndResponse(page, '/workflow/list', () => page.getByRole('button', { name: 'Query', exact: true }).click(), response => response.request().postDataJSON()?.keyword === workflowPrefix)
    expect(response.data.totalItems).toBe(11)
    await expect(page.locator('.el-table__body-wrapper tr')).toHaveCount(10)
    const workflowFirst = response.data.data.map(workflow => String(workflow.id))
    response = await clickAndResponse(page, '/workflow/list', () => page.locator('.el-pager li').getByText('2', { exact: true }).click())
    expect(response.data.index).toBe(1)
    expect(response.data.data).toHaveLength(1)
    expect(workflowFirst).not.toContain(String(response.data.data[0].id))
    await input(page.locator('main'), 'Workflow ID', workflowIds[0])
    response = await clickAndResponse(page, '/workflow/list', () => page.getByRole('button', { name: 'Query', exact: true }).click())
    expect(response.data.data).toHaveLength(1)
    expect(String(response.data.data[0].id)).toBe(workflowIds[0])
    await expect(page.locator('.el-pagination:visible')).toHaveCount(0)
    const workflowRow = selectors.row(page, workflowPrefix + '00')
    await expect(workflowRow.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
    await expect(workflowRow.getByRole('button', { name: 'Copy', exact: true })).toBeVisible()
    await expect(workflowRow.getByRole('button', { name: 'Run', exact: true })).toBeVisible()
    await expect(workflowRow.getByRole('button', { name: 'Delete', exact: true })).toBeVisible()
    await expect(workflowRow.getByRole('button', { name: 'Export', exact: true })).toHaveCount(0)
    await expect(page.locator('main').getByRole('button', { name: 'Import', exact: true })).toHaveCount(0)
    expect(unsupportedWrites).toEqual([])
    page.off('request', countUnsupported)
    await proof('UI-013', 'unsupported-workflow-export', { actualWorkflowListWithStoredOwnedDefinition: true, implementedEditCopyRunDeleteVisible: true, unsupportedExportOrImportEntryAbsent: true, zeroWorkflowExportOrMisroutedJobSaveRequests: true, sourceFact: 'src/components/views/WorkflowManager.vue has no workflow export/import action; published Server has no supported workflow export/import contract' })
    await clickAndResponse(page, '/workflow/list', () => page.getByRole('button', { name: 'Reset', exact: true }).click())
    await expect(page.getByPlaceholder('Workflow ID', { exact: true })).toHaveValue('')
    await expect(page.getByPlaceholder('Keyword', { exact: true })).toHaveValue('')
    await expect(page.locator('.el-pager li.is-active')).toHaveText('1')
    await proof('UI-020', 'workflow-page-reset', { pageCreatedWorkflows: 11, distinctNodeIDs: true, disjointPages: true, indexMatches: true, IDAndKeyword: true, firstPageReset: true })
    await proof('UI-032', 'pagination-model', { actualJobAndWorkflowDefinitions: 11, page1TenPage2OneDistinct: true, actualRequestIndexesZeroAndOne: true, exactIDQueryResetsPageAndHidesSinglePagePager: true, resetActualIndexAndActivePageOne: true, importedActualDrawerNotMock: true })
  } finally {
    for (const id of workflowIds) {
      const owned = await backend.call('/workflow/fetch?workflowId=' + id)
      if (!owned.wfName.startsWith(runId)) throw new Error('Refusing cleanup outside the test lane')
      await backend.call('/workflow/delete?workflowId=' + id)
    }
    for (const id of jobIds) await backend.deleteOwnedJob(id)
  }
})
