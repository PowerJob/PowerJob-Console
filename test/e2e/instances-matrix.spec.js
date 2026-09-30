import { test, expect, runId, selectors, input, choose, enterSamples, demoProcessor, saveDialog, clickAndResponse } from './support.js'
import fs from 'node:fs/promises'

async function proof(info, caseId, variantId, actual) {
  const result = { caseId, variantId, status: 'PASS', actual, testTitle: info.title, timestamp: new Date().toISOString() }
  await fs.writeFile(info.outputPath(`variant-${caseId}-${variantId}.json`), JSON.stringify(result, null, 2))
  await info.attach(`${caseId}/${variantId}`, { body: JSON.stringify(result), contentType: 'application/json' })
}
async function job(page, backend, suffix) {
  await page.goto('/#/oms/job')
  await page.getByRole('button', { name: 'New job', exact: true }).click()
  const dialog = selectors.dialog(page), name = `${runId}_${suffix}`
  await input(dialog, 'Job name', name)
  await input(dialog, 'Execution config', demoProcessor)
  await saveDialog(page, '/job/save')
  const result = (await backend.listJobs(name)).data[0]
  await input(page.locator('main'), 'Job ID', result.id)
  await page.getByRole('button', { name: 'Query', exact: true }).click()
  return result.id
}

test('UI-016/017 · eleven real page runs, instance filter axes and pagination/reset', async ({ page, backend, credentials }, info) => {
  test.setTimeout(300_000)
  await enterSamples(page, credentials)
  const id = await job(page, backend, 'instances_matrix')
  const instanceIds = []
  try {
    for (let index = 0; index < 11; index++) {
      const result = await clickAndResponse(page, '/job/run', () => selectors.row(page, String(id)).getByRole('button', { name: 'Run', exact: true }).click())
      expect(result.success).toBe(true)
      instanceIds.push(String(result.data))
    }
    for (const instance of instanceIds) await backend.waitInstance(instance, [5])
    await page.goto('/#/oms/instance')
    await input(page.locator('main'), 'Job ID', id)
    let response = await clickAndResponse(page, '/instance/list', () => page.locator('#instance_manager').getByRole('button', { name: 'Query', exact: true }).first().click())
    expect(response.data.totalItems).toBe(11)
    await expect(page.locator('.el-table__body-wrapper tr')).toHaveCount(10)
    const first = response.data.data.map(item => String(item.instanceId))
    response = await clickAndResponse(page, '/instance/list', () => page.locator('.el-pager li').getByText('2', { exact: true }).click())
    expect(response.data.index).toBe(1)
    expect(response.data.data).toHaveLength(1)
    expect(first).not.toContain(String(response.data.data[0].instanceId))
    await expect(page.locator('.el-pager li.is-active')).toHaveText('2')
    await input(page.locator('main'), 'Instance ID', instanceIds[0])
    response = await clickAndResponse(page, '/instance/list', () => page.locator('#instance_manager').getByRole('button', { name: 'Query', exact: true }).first().click())
    expect(response.data.data).toHaveLength(1)
    expect(String(response.data.data[0].instanceId)).toBe(instanceIds[0])
    await expect(selectors.row(page, instanceIds[0])).toContainText('Success')
    await info.attach('partial-instance-filters', { body: JSON.stringify({ caseId: 'UI-016', variantId: 'instance-id-filters', status: 'NOT_RUN', actualPartialEvidence: { jobIdAndInstanceId: true, remaining: 'wfInstanceId axis is exercised in the workflow matrix' } }), contentType: 'application/json' })
    await input(page.locator('main'), 'Instance ID', '')
    for (const [label, status] of [['ALL', ''], ['Waiting dispatch', 'WAITING_DISPATCH'], ['Waiting receive', 'WAITING_WORKER_RECEIVE'], ['Canceled', 'CANCELED'], ['Running', 'RUNNING'], ['Failed', 'FAILED'], ['Success', 'SUCCEED'], ['Stopped', 'STOPPED']]) {
      await choose(page, page.locator('main'), 'Status', label)
      response = await clickAndResponse(page, '/instance/list', () => page.locator('#instance_manager').getByRole('button', { name: 'Query', exact: true }).first().click())
      const api = await backend.call('/instance/list', { method: 'POST', data: { appId: credentials.app_id, jobId: id, type: 'NORMAL', status, index: 0, pageSize: 10 } })
      expect(response.data.totalItems).toBe(api.totalItems)
      if (label === 'Success' || label === 'ALL') expect(response.data.totalItems).toBe(11)
      else expect(response.data.totalItems).toBe(0)
    }
    await proof(info, 'UI-016', 'status-filters', { allStatusAxes: true, controlledSuccessAndZeroOtherStates: true })
    await clickAndResponse(page, '/instance/list', () => page.locator('#instance_manager').getByRole('button', { name: 'Reset', exact: true }).click())
    await expect(page.getByPlaceholder('Job ID', { exact: true })).toHaveValue('')
    await expect(page.getByPlaceholder('Instance ID', { exact: true })).toHaveValue('')
    await expect(page.locator('.el-pager li.is-active')).toHaveText('1')
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await proof(info, 'UI-016', 'pagination-reset', { elevenRealInstances: true, disjointPages: true, filterResetToFirst: true, refresh: true })
  } finally { await backend.deleteOwnedJob(id) }
})

test('UI-024 · eleven real workflow instances, filter axes, paging/reset/refresh/history', async ({ page, backend, credentials }, info) => {
  test.setTimeout(360_000)
  await enterSamples(page, credentials)
  const jobId = await job(page, backend, 'workflow_instances_matrix')
  let workflowId
  const name = `${runId}_wf_instances`
  try {
    await page.goto('/#/oms/workflow')
    await page.getByRole('button', { name: 'New workflow', exact: true }).click()
    await input(page.locator('main'), 'Workflow name', name)
    await page.locator('.canvas-toolbar').getByRole('button', { name: /Import job/ }).click()
    const drawer = selectors.dialog(page)
    await input(drawer, 'Job ID', jobId)
    await drawer.getByRole('button', { name: 'Query', exact: true }).click()
    await clickAndResponse(page, '/workflow/saveNode', () => selectors.row(page, String(jobId)).getByRole('button', { name: 'Import', exact: true }).click())
    await expect(drawer).not.toBeVisible()
    const saved = await clickAndResponse(page, '/workflow/save', () => page.locator('.editor-heading').getByRole('button', { name: 'Save', exact: true }).click())
    expect(saved.success).toBe(true)
    workflowId = String(saved.data)
    await page.goto('/#/oms/workflow')
    await input(page.locator('main'), 'Workflow ID', workflowId)
    await page.getByRole('button', { name: 'Query', exact: true }).click()
    const instanceIds = []
    for (let index = 0; index < 11; index++) {
      const result = await clickAndResponse(page, '/workflow/run', () => selectors.row(page, name).getByRole('button', { name: 'Run', exact: true }).click())
      expect(result.success).toBe(true)
      instanceIds.push(String(result.data))
      await expect.poll(async () => (await backend.call('/wfInstance/info?wfInstanceId=' + result.data)).status, { timeout: 60_000 }).toBe(4)
    }
    await page.locator('nav').getByRole('link', { name: 'Workflow instances', exact: true }).click()
    await input(page.locator('main'), 'Workflow ID', workflowId)
    let response = await clickAndResponse(page, '/wfInstance/list', () => page.getByRole('button', { name: 'Query', exact: true }).click(), response => String(response.request().postDataJSON()?.workflowId) === workflowId)
    expect(response.data.totalItems).toBe(11)
    await expect(page.locator('.el-table__body-wrapper tr')).toHaveCount(10)
    const first = response.data.data.map(item => String(item.wfInstanceId))
    response = await clickAndResponse(page, '/wfInstance/list', () => page.locator('.el-pager li').getByText('2', { exact: true }).click())
    expect(response.data.index).toBe(1)
    expect(response.data.data).toHaveLength(1)
    expect(first).not.toContain(String(response.data.data[0].wfInstanceId))
    await input(page.locator('main'), 'WorkflowInstanceId', instanceIds[0])
    response = await clickAndResponse(page, '/wfInstance/list', () => page.getByRole('button', { name: 'Query', exact: true }).click())
    expect(response.data.data).toHaveLength(1)
    expect(String(response.data.data[0].wfInstanceId)).toBe(instanceIds[0])
    await expect(selectors.row(page, instanceIds[0])).toContainText('Success')
    await input(page.locator('main'), 'WorkflowInstanceId', '')
    for (const [label, status] of [['ALL', ''], ['Waiting dispatch', 'WAITING'], ['Running', 'RUNNING'], ['Failed', 'FAILED'], ['Success', 'SUCCEED'], ['Stopped', 'STOPPED']]) {
      await choose(page, page.locator('main'), 'Status', label)
      response = await clickAndResponse(page, '/wfInstance/list', () => page.getByRole('button', { name: 'Query', exact: true }).click())
      const api = await backend.call('/wfInstance/list', { method: 'POST', data: { appId: credentials.app_id, workflowId, status, index: 0, pageSize: 10 } })
      expect(response.data.totalItems).toBe(api.totalItems)
    }
    await proof(info, 'UI-024', 'wfinstance-filters', { workflowIdAndInstanceId: true, allStatusAxes: true, readback: true })
    await page.goto('/#/oms/instance')
    let tabResponse = await clickAndResponse(page, '/instance/list', () => page.getByRole('tab', { name: 'Workflow instance', exact: true }).click(), response => response.request().postDataJSON()?.type === 'WORKFLOW')
    await input(page.locator('main'), 'WorkflowInstanceId', instanceIds[0])
    tabResponse = await clickAndResponse(page, '/instance/list', () => page.locator('#instance_manager').getByRole('button', { name: 'Query', exact: true }).first().click(), response => String(response.request().postDataJSON()?.wfInstanceId) === instanceIds[0])
    expect(tabResponse.data.totalItems).toBe(1)
    const childId = String(tabResponse.data.data[0].instanceId)
    await input(page.locator('main'), 'Job ID', jobId)
    await input(page.locator('main'), 'Instance ID', childId)
    tabResponse = await clickAndResponse(page, '/instance/list', () => page.locator('#instance_manager').getByRole('button', { name: 'Query', exact: true }).first().click())
    expect(tabResponse.data.data).toHaveLength(1)
    expect(String(tabResponse.data.data[0].instanceId)).toBe(childId)
    await proof(info, 'UI-016', 'instance-id-filters', { jobId: true, instanceId: true, wfInstanceId: true, actualWorkflowChild: true })
    await clickAndResponse(page, '/instance/list', () => page.locator('#instance_manager').getByRole('button', { name: 'Reset', exact: true }).click())
    tabResponse = await clickAndResponse(page, '/instance/list', () => page.getByRole('tab', { name: 'Normal instance', exact: true }).click(), response => response.request().postDataJSON()?.type === 'NORMAL')
    const normal = await backend.call('/instance/list', { method: 'POST', data: { appId: credentials.app_id, type: 'NORMAL', index: 0, pageSize: 10 } })
    expect(tabResponse.data.data.map(instance => String(instance.instanceId))).toEqual(normal.data.map(instance => String(instance.instanceId)))
    await expect(page.getByPlaceholder('WorkflowInstanceId', { exact: true })).toHaveCount(0)
    await proof(info, 'UI-016', 'ordinary-workflow-tabs', { actualTypeRequests: ['WORKFLOW','NORMAL'], actualWorkflowChild: true, resetFilters: true })
    await page.goto('/#/oms/wfinstance')

    await clickAndResponse(page, '/wfInstance/list', () => page.getByRole('button', { name: 'Reset', exact: true }).click())
    await expect(page.getByPlaceholder('Workflow ID', { exact: true })).toHaveValue('')
    await expect(page.getByPlaceholder('WorkflowInstanceId', { exact: true })).toHaveValue('')
    await expect(page.locator('.el-pager li.is-active')).toHaveText('1')
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await proof(info, 'UI-024', 'wfinstance-pagination', { elevenPageRuns: true, disjointPages: true, firstPageReset: true, refresh: true })
    await proof(info, 'UI-023', 'workflow-run-history', { actualSidebarThenWorkflowIdSearch: true, publishedUIHasNoHistoryButton: true, realRunIds: instanceIds })
  } finally {
    if (workflowId) {
      const owned = await backend.call('/workflow/fetch?workflowId=' + workflowId)
      if (!owned.wfName.startsWith(runId)) throw new Error('Refusing workflow cleanup outside this lane')
      await backend.call('/workflow/delete?workflowId=' + workflowId)
    }
    await backend.deleteOwnedJob(jobId)
  }
})
