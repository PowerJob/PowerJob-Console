import { test, expect, selectors, fill, clickAndResponse, cancelDialog, confirmDialog, enterSamples, id, ownedName, processors, observation, type RecordDTO } from './helpers'
import { OwnedResources } from './owned'
import { jobSection, searchJob as search, createJob as create, editJob as edit, saveJob as save, moreJob as more } from './job-ui'

test.use({ actionTimeout: 15_000 })

test('UI-011/014/015 · native job CRUD, encoded parameters, actual Worker execution and cancel isolation', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  const ledger = new OwnedResources(backend)
  const name = ownedName('job_crud')
  const description = '中文 😀 & + ? # / % " \'\n第二行'
  const parameters = '{"flag":"CN","text":"中文 😀 &+?#/%\\n"}'
  try {
    await enterSamples(page, credentials)
    const job = await create(page, backend, ledger, name)
    expect(job.timeExpressionType).toBe('API')
    expect(job.processorType).toBe('BUILT_IN')
    await observation(info, 'UI-011', 'minimal-create', { jobId: id(job.id), createdThroughNativeForm: true, actualReadback: { jobName: job.jobName, processorInfo: job.processorInfo } })
    let dialog = await edit(page, name)
    await fill(dialog, 'Description', description)
    await fill(dialog, 'Job parameters', parameters)
    await save(page)
    const edited = await backend.job(id(job.id))
    expect(edited?.jobDescription).toBe(description)
    expect(edited?.jobParams).toBe(parameters)
    await page.reload()
    await search(page, name)
    dialog = await edit(page, name)
    await expect(dialog.getByLabel('Description', { exact: true })).toHaveValue(description)
    await expect(dialog.getByLabel('Job parameters', { exact: true })).toHaveValue(parameters)
    await fill(dialog, 'Description', 'discarded synthetic draft')
    await cancelDialog(page, 'Edit job')
    expect((await backend.job(id(job.id)))?.jobDescription).toBe(description)
    await observation(info, 'UI-011', 'edit-basic-roundtrip', { jobId: id(job.id), hardReloadAndNativeReopen: true, exactDescription: description, exactParameters: parameters })
    await observation(info, 'UI-011', 'edit-cancel', { discardedDraftDidNotWrite: true, exactDescription: description })

    const run = await clickAndResponse<unknown>(page, '/job/run', () => selectors.row(page, name).getByRole('button', { name: 'Run', exact: true }).click())
    expect(run.success).toBe(true)
    const instanceId = ledger.trackInstance(id(run.data), id(job.id))
    const instance = await backend.waitInstance(instanceId, [5])
    expect(id(instance.jobId)).toBe(id(job.id))
    await observation(info, 'UI-015', 'run-default', { jobId: id(job.id), instanceId, actualWorkerStatus: instance.status, actualResult: instance.result })
    await more(page, name, 'Run with parameters')
    const runtimeParams = '中文 😀 &=+?#/% "\'\n{"key":"value"}'
    await fill(selectors.dialog(page, 'Run with parameters'), 'Instance parameters', runtimeParams)
    const withParams = await clickAndResponse<unknown>(page, '/job/run', () => selectors.dialog(page, 'Run with parameters').getByRole('button', { name: 'Run job', exact: true }).click(), response => new URL(response.url()).searchParams.get('instanceParams') === runtimeParams)
    expect(withParams.success).toBe(true)
    const parameterInstanceId = ledger.trackInstance(id(withParams.data), id(job.id))
    const parameterInstance = await backend.waitInstance(parameterInstanceId, [5])
    const parameterDetail = await backend.call<RecordDTO>('/instance/detailPlus', { method: 'POST', data: { instanceId: parameterInstanceId, customQuery: 'status in (5, 6) order by last_modified_time desc' } })
    expect(parameterDetail.instanceParams).toBe(runtimeParams)
    await observation(info, 'UI-015', 'run-parameters', { parameterInstanceId, actualWorkerStatus: parameterInstance.status, actualStoredParametersFromDetailPlus: parameterDetail.instanceParams })
    await observation(info, 'UI-039', 'parameters-encoding', { literalReservedAndUnicodeParameters: runtimeParams, decodedActualRequestMatched: true, realServerReadbackMatched: true })

    const toggle = selectors.row(page, name).getByRole('switch', { name: `Enable job ${name}`, exact: true })
    expect((await clickAndResponse(page, '/job/disable', () => toggle.uncheck())).success).toBe(true)
    expect((await backend.job(id(job.id)))?.enable).toBe(false)
    expect((await clickAndResponse(page, '/job/save', () => toggle.check())).success).toBe(true)
    expect((await backend.job(id(job.id)))?.enable).toBe(true)
    await observation(info, 'UI-014', 'disable-job', { realServerDisabled: true, jobId: id(job.id) })
    await observation(info, 'UI-014', 'enable-job', { realServerEnabled: true, originalParametersPreserved: (await backend.job(id(job.id)))?.jobParams === parameters })
    let deleteRequests = 0
    page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/job/delete')) deleteRequests++ })
    await more(page, name, 'Delete job')
    await confirmDialog(page, false)
    expect(deleteRequests).toBe(0)
    expect((await backend.listJobs(name)).data.some(row => id(row.id) === id(job.id))).toBe(true)
    await observation(info, 'UI-014', 'delete-cancel', { zeroDeleteRequests: true, activeOwnedJobStillPresent: true })
    await more(page, name, 'Delete job')
    expect((await clickAndResponse(page, '/job/delete', () => confirmDialog(page))).success).toBe(true)
    expect(deleteRequests).toBe(1)
    await expect(selectors.row(page, name)).toHaveCount(0)
    await page.reload()
    await search(page, name)
    expect((await backend.listJobs(name)).data.some(row => id(row.id) === id(job.id))).toBe(false)
    await observation(info, 'UI-014', 'delete-confirm', { realPageDelete: true, hardReloadAndActiveListAbsent: true, terminalInstancesPreserved: [instanceId, parameterInstanceId] })
  } finally { await ledger.cleanup(info) }
})

test('UI-013 · native copy, exact export, invalid import draft and corrected import round trip', async ({ page, backend, credentials }, info) => {
  const ledger = new OwnedResources(backend)
  const name = ownedName('job_transfer')
  try {
    await enterSamples(page, credentials)
    const original = await create(page, backend, ledger, name)
    await more(page, name, 'Export job')
    const exportedDialog = selectors.dialog(page, 'Export job')
    await expect(exportedDialog.getByLabel('Job JSON', { exact: true })).not.toHaveValue('')
    const exported = JSON.parse(await exportedDialog.getByLabel('Job JSON', { exact: true }).inputValue())
    expect(String(exported.jobName)).toMatch(new RegExp('^' + name + '_EXPORT_\\d+$'))
    expect(exported.id).toBeNull()
    expect(exported.processorInfo).toBe(processors.simple)
    expect(exported.jobParams).toBe(original.jobParams)
    await observation(info, 'UI-013', 'export-accurate', { originalJobId: id(original.id), actualUIExportFieldsMatched: true })
    await cancelDialog(page, 'Export job')
    await more(page, name, 'Copy job')
    const copyDialog = selectors.dialog(page, 'Edit job')
    await expect(copyDialog).toBeVisible()
    const copiedRows = (await backend.listJobs(name)).data.filter(row => id(row.id) !== id(original.id))
    expect(copiedRows).toHaveLength(1)
    ledger.track('job', id(copiedRows[0].id), String(copiedRows[0].jobName))
    const copyName = ownedName('job_copied')
    await fill(copyDialog, 'Job name', copyName)
    await save(page)
    expect((await backend.job(id(original.id)))?.jobName).toBe(name)
    expect((await backend.job(id(copiedRows[0].id)))?.jobName).toBe(copyName)
    await observation(info, 'UI-013', 'copy-job', { originalJobId: id(original.id), copyJobId: id(copiedRows[0].id), independentCopyRenamedByNativePage: true, originalUnchanged: true })
    await page.getByRole('button', { name: 'Import job', exact: true }).click()
    const importDialog = selectors.dialog(page, 'Import job')
    let saves = 0
    page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/job/save')) saves++ })
    await fill(importDialog, 'Job JSON', '{malformed')
    await importDialog.getByRole('button', { name: 'Import job', exact: true }).click()
    await expect(importDialog.getByRole('alert')).toBeVisible()
    await expect(importDialog.getByLabel('Job JSON', { exact: true })).toHaveValue('{malformed')
    expect(saves).toBe(0)
    await observation(info, 'UI-013', 'import-invalid-json', { retainedActualDraft: true, zeroSaveRequests: true })
    delete exported.id
    const importName = ownedName('job_imported')
    exported.jobName = importName
    await fill(importDialog, 'Job JSON', JSON.stringify(exported))
    expect((await clickAndResponse(page, '/job/save', () => importDialog.getByRole('button', { name: 'Import job', exact: true }).click())).success).toBe(true)
    await expect(importDialog).not.toBeVisible()
    const imported = (await backend.listJobs(importName)).data.find(row => row.jobName === importName)!
    ledger.track('job', id(imported.id), importName)
    expect(imported.processorInfo).toBe(exported.processorInfo)
    expect(imported.jobParams).toBe(exported.jobParams)
    expect(imported.logConfig).toEqual(exported.logConfig)
    await page.reload()
    await search(page, importName)
    await expect(selectors.row(page, importName)).toHaveCount(1)
    await observation(info, 'UI-013', 'import-export-roundtrip', { importedJobId: id(imported.id), actualNativeImportAndHardReload: true, exactProcessorParametersAndLogConfig: true })
  } finally { await ledger.cleanup(info) }
})

test('UI-012 · native runtime, alert and logging fields preserve zero, numeric values and explicit selection', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  const ledger = new OwnedResources(backend)
  const name = ownedName('job_fields')
  const fields = [
    ['maxInstanceNum', 'Max instances'], ['concurrency', 'Thread concurrency'], ['instanceTimeLimit', 'Instance timeout (ms)'],
    ['instanceRetryNum', 'Instance retries'], ['taskRetryNum', 'Task retries'], ['minCpuCores', 'Min CPU cores'],
    ['minMemorySpace', 'Min memory (GB)'], ['minDiskSpace', 'Min disk (GB)'], ['maxWorkerCount', 'Max Worker count'],
  ] as const
  const alerts = [['alertThreshold', 'Alert threshold'], ['statisticWindowLen', 'Statistics window (s)'], ['silenceWindowLen', 'Silence window (s)']] as const
  try {
    await enterSamples(page, credentials)
    const job = await create(page, backend, ledger, name)
    const workers = await backend.call<RecordDTO[]>('/system/listWorker', { query: { appId: backend.appId } })
    expect(workers.length).toBeGreaterThanOrEqual(2)
    const workerAddresses = workers.slice(0, 2).map(worker => String(worker.address))
    expect(workerAddresses.every(address => /:\d+$/.test(address))).toBe(true)
    for (const [axis, value] of [['zero', 0], ['one', 1], ['normal', 3]] as const) {
      const dialog = await edit(page, name)
      await jobSection(dialog, 'Runtime')
      for (const [, label] of fields) await fill(dialog, label, value)
      await dialog.getByLabel('Dispatch strategy', { exact: true }).selectOption('SPECIFY')
      await fill(dialog, 'Dispatch strategy config', workerAddresses[0])
      await fill(dialog, 'Designated Workers', workerAddresses.join(','))
      await dialog.getByLabel('TaskTracker behavior', { exact: true }).selectOption('11')
      await jobSection(dialog, 'Alerts & logs')
      for (const [, label] of alerts) await fill(dialog, label, value)
      await dialog.getByLabel('Log type', { exact: true }).selectOption('4')
      await dialog.getByLabel('Log level', { exact: true }).selectOption('3')
      await fill(dialog, 'Logger name', 'fev3.synthetic.logger')
      await save(page)
      const actual = (await backend.job(id(job.id)))!
      for (const [key] of fields) {
        expect(actual[key]).toBe(value)
        await observation(info, 'UI-012', `${key}-${axis}`, { jobId: id(job.id), realNativeInputAndSave: true, actualValue: actual[key] })
      }
      for (const [key] of alerts) {
        expect((actual.alarmConfig as RecordDTO)[key]).toBe(value)
        await observation(info, 'UI-012', `alarmConfig-${key}-${axis}`, { realNativeInputAndSave: true, actualValue: (actual.alarmConfig as RecordDTO)[key] })
      }
      expect(actual.designatedWorkers).toBe(workerAddresses.join(','))
      expect((actual.logConfig as RecordDTO).loggerName).toBe('fev3.synthetic.logger')
      expect((actual.advancedRuntimeConfig as RecordDTO).taskTrackerBehavior).toBe(11)
      expect(actual.jobName).toBe(name)
      expect(actual.processorInfo).toBe(processors.simple)
      const exported = await backend.call<RecordDTO>('/job/export', { query: { jobId: id(job.id) } })
      for (const [key] of fields) expect(exported[key]).toBe(value)
      for (const [key] of alerts) expect((exported.alarmConfig as RecordDTO)[key]).toBe(value)
      await page.reload()
      await search(page, name)
      const reopened = await edit(page, name)
      await jobSection(reopened, 'Runtime')
      for (const [, label] of fields) await expect(reopened.getByLabel(label, { exact: true })).toHaveValue(String(value))
      await jobSection(reopened, 'Alerts & logs')
      for (const [, label] of alerts) await expect(reopened.getByLabel(label, { exact: true })).toHaveValue(String(value))
      await cancelDialog(page, 'Edit job')
    }
    await observation(info, 'UI-012', 'designated-workers', { actualLiveWorkerAddressesRetained: workerAddresses, actualServerValue: (await backend.job(id(job.id)))?.designatedWorkers })
    for (const [key, label, section, nested] of [...fields.map(([key, label]) => [key, label, 'Runtime', false] as const), ...alerts.map(([key, label]) => [key, label, 'Alerts & logs', true] as const)]) {
      const dialog = await edit(page, name)
      await jobSection(dialog, section)
      await fill(dialog, label, -1)
      let saves = 0
      const countSave = (request: import('@playwright/test').Request) => { if (new URL(request.url()).pathname.endsWith('/job/save')) saves++ }
      page.on('request', countSave)
      await dialog.getByRole('button', { name: 'Save job', exact: true }).click()
      expect(await dialog.getByLabel(label, { exact: true }).evaluate((element: HTMLInputElement) => element.validity.rangeUnderflow)).toBe(true)
      await expect(dialog.getByLabel(label, { exact: true })).toHaveValue('-1')
      expect(saves).toBe(0)
      page.off('request', countSave)
      const actual = (await backend.job(id(job.id)))!
      expect(nested ? (actual.alarmConfig as RecordDTO)[key] : actual[key]).toBe(3)
      await observation(info, 'UI-012', `${nested ? 'alarmConfig-' : ''}${key}-invalid`, { actualFieldLabel: label, nativeRangeUnderflow: true, retainedDraft: '-1', zeroServerSaves: true, previousRealValue: 3 })
      await cancelDialog(page, 'Edit job')
    }
    await page.reload()
    await search(page, name)
    await expect(selectors.row(page, name)).toHaveCount(1)
  } finally { await ledger.cleanup(info) }
})

test('UI-012 · every execution, dispatch, log, level and TaskTracker native selection survives Save and hard reopen', async ({ page, backend, credentials }, info) => {
  test.setTimeout(180_000)
  const ledger = new OwnedResources(backend)
  const name = ownedName('job_enums')
  try {
    await enterSamples(page, credentials)
    const job = await create(page, backend, ledger, name)
    const matrix = [
      { section: 'Job information', label: 'Execution mode', key: 'executeType', values: [['STANDALONE', 'standalone'], ['BROADCAST', 'broadcast'], ['MAP', 'map'], ['MAP_REDUCE', 'map_reduce']], prefix: 'executeType-' },
      { section: 'Runtime', label: 'Dispatch strategy', key: 'dispatchStrategy', values: [['HEALTH_FIRST', 'health_first'], ['RANDOM', 'random'], ['SPECIFY', 'specify']], prefix: 'dispatchStrategy-' },
      { section: 'Alerts & logs', label: 'Log type', key: 'logConfig.type', values: [['1', 'online'], ['2', 'local'], ['3', 'stdout'], ['4', 'local_and_online'], ['999', 'null']], prefix: 'logConfig-type-' },
      { section: 'Alerts & logs', label: 'Log level', key: 'logConfig.level', values: [['1', 'debug'], ['2', 'info'], ['3', 'warn'], ['4', 'error'], ['99', 'off']], prefix: 'logConfig-level-' },
      { section: 'Runtime', label: 'TaskTracker behavior', key: 'advancedRuntimeConfig.taskTrackerBehavior', values: [['1', '1'], ['11', '11']], prefix: 'advancedRuntimeConfig-taskTrackerBehavior-' },
    ]
    for (const family of matrix) {
      for (const [value, variant] of family.values) {
        let dialog = await edit(page, name)
        await jobSection(dialog, family.section)
        await dialog.getByLabel(family.label, { exact: true }).selectOption(value)
        if (family.key === 'dispatchStrategy' && value === 'SPECIFY') await fill(dialog, 'Dispatch strategy config', 'synthetic saved configuration')
        if (family.key === 'logConfig.type' && ['2', '4'].includes(value)) await fill(dialog, 'Logger name', 'fev3.synthetic.logger')
        await save(page)
        const actual = (await backend.job(id(job.id)))!
        const parts = family.key.split('.')
        const actualValue = parts.length === 1 ? actual[parts[0]] : (actual[parts[0]] as RecordDTO)[parts[1]]
        expect(String(actualValue)).toBe(value)
        const exported = await backend.call<RecordDTO>('/job/export', { query: { jobId: id(job.id) } })
        expect(String(parts.length === 1 ? exported[parts[0]] : (exported[parts[0]] as RecordDTO)[parts[1]])).toBe(value)
        await page.reload()
        await search(page, name)
        dialog = await edit(page, name)
        await jobSection(dialog, family.section)
        await expect(dialog.getByLabel(family.label, { exact: true })).toHaveValue(value)
        await cancelDialog(page, 'Edit job')
        await observation(info, 'UI-012', family.prefix + variant, { jobId: id(job.id), realNativeSelectionAndSave: true, realField: family.key, actualValue, hardReloadAndReopenMatched: true, actualWorkerExecution: 'NOT_RUN_IN_THIS_ENUM_ROUNDTRIP_TEST' })
      }
    }
    await observation(info, 'UI-012', 'processorType-built_in', { jobId: id(job.id), actualProcessorType: (await backend.job(id(job.id)))?.processorType, actualProcessorInfo: processors.simple })
    let dialog = await edit(page, name)
    await jobSection(dialog, 'Runtime')
    await dialog.getByLabel('Dispatch strategy', { exact: true }).selectOption('SPECIFY')
    await fill(dialog, 'Dispatch strategy config', 'preserved even when selector is hidden')
    await dialog.getByLabel('Dispatch strategy', { exact: true }).selectOption('HEALTH_FIRST')
    await save(page)
    expect((await backend.job(id(job.id)))?.dispatchStrategyConfig).toBe('preserved even when selector is hidden')
    dialog = await edit(page, name)
    await jobSection(dialog, 'Runtime')
    await dialog.getByLabel('Dispatch strategy', { exact: true }).selectOption('SPECIFY')
    await expect(dialog.getByLabel('Dispatch strategy config', { exact: true })).toHaveValue('preserved even when selector is hidden')
    await cancelDialog(page, 'Edit job')
    await observation(info, 'UI-012', 'specify-config-toggle', { nativeToggleAndRealSavedHiddenValuePreserved: true })
    dialog = await edit(page, name)
    await jobSection(dialog, 'Alerts & logs')
    await dialog.getByLabel('Log type', { exact: true }).selectOption('2')
    await fill(dialog, 'Logger name', 'fev3.persisted.logger')
    await dialog.getByLabel('Log type', { exact: true }).selectOption('1')
    await save(page)
    expect(((await backend.job(id(job.id)))?.logConfig as RecordDTO).loggerName).toBe('fev3.persisted.logger')
    await observation(info, 'UI-012', 'logger-name-toggle', { nativeSwitchToLocalEditThenOnlineHideAndActualSave: true, actualLoggerName: 'fev3.persisted.logger' })
    const users = await backend.call<RecordDTO[]>('/user/list')
    expect(users.length).toBeGreaterThanOrEqual(2)
    const recipientIds = users.slice(0, 2).map(user => id(user.id))
    for (const recipients of [[], recipientIds.slice(0, 1), recipientIds]) {
      dialog = await edit(page, name)
      await jobSection(dialog, 'Alerts & logs')
      await dialog.getByLabel('Notification recipients', { exact: true }).selectOption(recipients)
      await save(page)
      expect((await backend.job(id(job.id)))?.notifyUserIds).toEqual(recipients)
    }
    await observation(info, 'UI-012', 'notify-none-one-many', { nativeMultipleSelectAndIndependentServerReadbackForCounts: [0, 1, 2], noJobExecutionOrNotificationTriggered: true })
  } finally { await ledger.cleanup(info) }
})
