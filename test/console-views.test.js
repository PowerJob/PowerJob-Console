// @vitest-environment happy-dom
// Component regressions use native Vue 3 / Element Plus and mocked Server responses.
// These tests do not substitute for browser + Server + Worker acceptance.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus, { ElCheckbox, ElDialog, ElInput, ElRadio, ElSwitch, ElTabs, ElUpload } from 'element-plus'
import { reactive } from 'vue'
import JobManager from '../src/components/views/JobManager.vue'
import WorkflowManager from '../src/components/views/WorkflowManager.vue'
import InstanceManager from '../src/components/views/InstanceManager.vue'
import WFInstanceManager from '../src/components/views/WFInstanceManager.vue'
import ContainerManager from '../src/components/views/ContainerManager.vue'
import ContainerTemplate from '../src/components/views/ContainerTemplate.vue'
import Home from '../src/components/views/Home.vue'
import DailyTimeIntervalForm from '../src/components/common/DailyTimeIntervalForm.vue'
import Exporter from '../src/components/common/Exporter.vue'
import TimeExpressionValidator from '../src/components/common/TimeExpressionValidator.vue'
import { resolveApiBaseUrl, websocketUrl } from '../src/config.js'

const appId = '9007199254740993'
const jobId = '9007199254740995'
const instanceId = '9007199254740997'
const page = { data: [], totalItems: 0, pageSize: 10 }
const mounted = []
const deferred = () => {
  let resolve, reject
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}
const fullJob = () => ({
  id: jobId, appId, jobName: 'Regression 中文', jobDescription: 'multi\nline', jobParams: '{"中文":"a+b&c"}',
  timeExpressionType: 'CRON', timeExpression: '0 0/5 * * * ?', executeType: 'MAP_REDUCE',
  processorType: 'EXTERNAL', processorInfo: '17:example.Processor', concurrency: 9, maxInstanceNum: 2,
  instanceTimeLimit: 3600, instanceRetryNum: 3, taskRetryNum: 4, minCpuCores: 2,
  minMemorySpace: 512, minDiskSpace: 1024, enable: false, maxWorkerCount: 7,
  designatedWorkers: 'worker-a:27777,worker-b:27777', dispatchStrategy: 'SPECIFY', dispatchStrategyConfig: '{"tag":"production"}',
  notifyUserIds: ['9007199254740999', '12'], extra: '{"feature":true}', tag: '业务',
  lifeCycle: { start: 1790812800000, end: 1790899200000 },
  alarmConfig: { alertThreshold: 5, statisticWindowLen: 120, silenceWindowLen: 600, unknownAlarm: 'retain' },
  logConfig: { type: 4, level: 3, loggerName: 'jobs', customLoggerSetting: 'retain' },
  advancedRuntimeConfig: { taskTrackerBehavior: 11, unknownRuntime: { max: 2 } },
  unknownFutureField: { nested: ['retain', { precisionId: '9007199254740999' }] }
})
const createAxios = () => ({
  get: vi.fn(async url => {
    if (url === '/user/list') return [{ id: '9007199254740999', username: 'QA' }]
    if (url === '/container/list') return { data: { success: true, data: [] } }
    if (url === '/container/listDeployedWorker') return { data: { success: true, data: 'worker-a\nworker-b' } }
    if (url === '/system/listWorker') return []
    if (url === '/system/overview') return {}
    if (url === '/validate/timeExpression') return ['2026-10-01 12:00:00']
    if (url.startsWith('/instance/log?')) return { index: 0, totalPages: 2, data: '中文 log\nline2' }
    return {}
  }),
  post: vi.fn(async url => url.endsWith('/list') ? { ...page, data: [] } : {})
})
function mountPage(component, { axios = createAxios(), props = {}, query = {} } = {}) {
  const message = { success: vi.fn(), error: vi.fn(), warning: vi.fn() }
  const router = { push: vi.fn(async () => {}) }
  const route = reactive({ query })
  const confirm = vi.fn(async () => true)
  const wrapper = mount(component, {
    props, attachTo: document.body,
    global: {
      plugins: [ElementPlus],
      stubs: { PjIcon: { template: '<span class="icon-stub" />' }, InstanceDetail: { name: 'InstanceDetail', props: ['instanceId', 'resultAll'], template: '<div class="instance-detail-stub" />' } },
      mocks: {
        axios, $t: key => key, $message: message, $router: router, $route: route, $confirm: confirm,
        common: { translateInstanceStatus: String, translateWfInstanceStatus: String, timestamp2Str: value => String(value ?? '—') }
      }
    }
  })
  mounted.push(wrapper)
  return { wrapper, axios, message, router, route, confirm }
}
async function ready(component, options) {
  const context = mountPage(component, options)
  await flushPromises()
  context.axios.get.mockClear()
  context.axios.post.mockClear()
  return context
}
async function clickButton(wrapper, text) {
  const button = wrapper.findAll('button').find(item => item.text().trim() === text)
  expect(button, 'Button ' + text + ' must be visible').toBeDefined()
  await button.trigger('click')
  await flushPromises()
}
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('Power_appId', appId)
  localStorage.setItem('PowerJwt', 'test-token')
})
afterEach(() => {
  mounted.splice(0).forEach(wrapper => { if (wrapper.exists()) wrapper.unmount() })
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('List response ordering', () => {
  it.each([
    ['jobs', JobManager, 'listJobInfos', 'jobQueryContent', 'jobInfoPageResult'],
    ['workflows', WorkflowManager, 'listWorkflow', 'workflowQueryContent', 'workflowPageResult'],
    ['instances', InstanceManager, 'listInstanceInfos', 'instanceQueryContent', 'instancePageResult'],
    ['workflow instances', WFInstanceManager, 'listWfInstances', 'wfInstanceQueryContent', 'wfInstancePageResult'],
  ])('keeps the latest %s query result when an earlier response arrives after it', async (_, component, method, query, result) => {
    const { wrapper, axios } = await ready(component)
    const old = deferred()
    axios.post.mockImplementationOnce(() => old.promise).mockResolvedValueOnce({ ...page, totalItems: 0, data: [] })
    wrapper.vm[query].keyword = 'previous'
    const previousRequest = wrapper.vm[method]()
    wrapper.vm[query].keyword = 'current'
    await wrapper.vm[method]()
    old.resolve({ ...page, totalItems: 1, data: [{ id: jobId, jobName: 'previous query', wfName: 'previous query' }] })
    await previousRequest
    expect(wrapper.vm[result]).toMatchObject({ totalItems: 0, data: [] })
    expect(axios.post.mock.calls[0][1].keyword).toBe('previous')
    expect(axios.post.mock.calls[1][1].keyword).toBe('current')
  })
  it('keeps a newer overview and Workers when an earlier refresh arrives late', async () => {
    const { wrapper, axios } = await ready(Home)
    const oldWorkers = deferred(), oldOverview = deferred()
    axios.get.mockImplementationOnce(() => oldWorkers.promise).mockImplementationOnce(() => oldOverview.promise)
      .mockResolvedValueOnce([{ address: 'current', status: 1 }]).mockResolvedValueOnce({ jobCount: 7 })
    const previous = wrapper.vm.refresh()
    await wrapper.vm.refresh()
    oldWorkers.resolve([{ address: 'previous', status: 1 }]); oldOverview.resolve({ jobCount: 1 })
    await previous
    expect(wrapper.vm.workerList[0].address).toBe('current')
    expect(wrapper.vm.systemInfo.jobCount).toBe(7)
    expect(wrapper.vm.loading).toBe(false)
  })
  it('does not resurrect a removed container from an older list response', async () => {
    const { wrapper, axios } = await ready(ContainerManager)
    const old = deferred()
    axios.get.mockImplementationOnce(() => old.promise).mockResolvedValueOnce({ data: { data: [] } })
    const previous = wrapper.vm.listContainers()
    await wrapper.vm.listContainers()
    old.resolve({ data: { data: [{ id: jobId, containerName: 'deleted' }] } })
    await previous
    expect(wrapper.vm.containerList).toEqual([])
    expect(wrapper.vm.loading).toBe(false)
  })
})

describe('job definition editor and execution', () => {
  it('saves historical nullable alarm fields with valid defaults while keeping unknown keys', async () => {
    const { wrapper, axios } = await ready(JobManager)
    wrapper.vm.onClickModify({ ...fullJob(), alarmConfig: { alertThreshold: null, statisticWindowLen: null, silenceWindowLen: null, futureField: { precisionId: jobId } } })
    await wrapper.vm.saveJob()
    const payload = axios.post.mock.calls.find(([url]) => url === '/job/save')[1]
    expect(payload.alarmConfig).toEqual({ alertThreshold: 0, statisticWindowLen: 0, silenceWindowLen: 0, futureField: { precisionId: jobId } })
  })
  it.each([{ start: 1790899200000, end: 1790812800000 }, { start: 'not-a-timestamp' }])('rejects an invalid lifecycle before any Server write %j', async lifeCycle => {
    const { wrapper, axios, message } = await ready(JobManager)
    wrapper.vm.onClickModify(fullJob())
    wrapper.vm.modifiedJobForm.lifeCycle = lifeCycle
    await wrapper.vm.saveJob()
    expect(axios.post).not.toHaveBeenCalled()
    expect(message.warning).toHaveBeenCalledWith('message.lifeCycleInvalid')
    expect(wrapper.vm.modifiedJobFormVisible).toBe(true)
  })
  it('edits a deep copy and preserves every known and future Server field on save', async () => {
    const { wrapper, axios } = await ready(JobManager)
    const source = fullJob()
    wrapper.vm.onClickModify(source)
    wrapper.vm.modifiedJobForm.jobDescription = 'updated description'
    wrapper.vm.modifiedJobForm.alarmConfig.alertThreshold = 8
    wrapper.vm.modifiedJobForm.logConfig.loggerName = 'edited'
    wrapper.vm.modifiedJobForm.advancedRuntimeConfig.unknownRuntime.max = 3
    wrapper.vm.modifiedJobForm.notifyUserIds.push('23')
    await wrapper.vm.saveJob()
    const payload = axios.post.mock.calls.find(([url]) => url === '/job/save')[1]
    expect(payload).toEqual({
      ...source, jobDescription: 'updated description',
      alarmConfig: { ...source.alarmConfig, alertThreshold: 8 },
      logConfig: { ...source.logConfig, loggerName: 'edited' },
      advancedRuntimeConfig: { ...source.advancedRuntimeConfig, unknownRuntime: { max: 3 } },
      notifyUserIds: [...source.notifyUserIds, '23']
    })
    expect(source.alarmConfig.alertThreshold).toBe(5)
    expect(source.logConfig.loggerName).toBe('jobs')
    expect(source.advancedRuntimeConfig.unknownRuntime.max).toBe(2)
    expect(source.notifyUserIds).toHaveLength(2)
    expect(wrapper.vm.modifiedJobFormVisible).toBe(false)
  })
  it('renders incomplete historical nested configuration and resets every field for a new job', async () => {
    const { wrapper } = await ready(JobManager)
    const source = { id: jobId, jobName: 'legacy', appId, processorInfo: 'Processor' }
    wrapper.vm.onClickModify(source)
    await flushPromises()
    expect(wrapper.vm.modifiedJobForm.alarmConfig.alertThreshold).toBe(0)
    expect(wrapper.vm.modifiedJobForm.logConfig.type).toBe(1)
    expect(wrapper.vm.modifiedJobForm.advancedRuntimeConfig.taskTrackerBehavior).toBe(1)
    wrapper.vm.modifiedJobForm.jobParams = 'edited'
    wrapper.vm.onClickNewJob()
    expect(wrapper.vm.modifiedJobForm.id).toBeUndefined()
    expect(wrapper.vm.modifiedJobForm.appId).toBe(appId)
    expect(wrapper.vm.modifiedJobForm.jobParams).toBe('')
    expect(wrapper.vm.modifiedJobForm.timeExpressionType).toBe('API')
    expect(source).not.toHaveProperty('jobParams')
  })
  it.each([{ start: 1790812800000 }, { end: 1790899200000 }])('preserves a legal one-sided lifecycle %j when editing other fields', async lifeCycle => {
    const { wrapper, axios } = await ready(JobManager)
    wrapper.vm.onClickModify({ ...fullJob(), lifeCycle })
    wrapper.vm.modifiedJobForm.jobDescription = 'changed metadata'
    await wrapper.vm.saveJob()
    const payload = axios.post.mock.calls.find(([url]) => url === '/job/save')[1]
    expect(payload.lifeCycle).toEqual(lifeCycle)
  })
  it('preserves a one-sided lifecycle when enabling the existing job', async () => {
    const { wrapper, axios } = await ready(JobManager)
    await wrapper.vm.changeJobStatus({ ...fullJob(), enable: true, lifeCycle: { end: 1790899200000 } })
    const payload = axios.post.mock.calls.find(([url]) => url === '/job/save')[1]
    expect(payload.lifeCycle).toEqual({ end: 1790899200000 })
  })
  it.each(['jobName', 'processorInfo', 'timeExpression'])('rejects missing required %s without a write', async field => {
    const { wrapper, axios, message } = await ready(JobManager)
    wrapper.vm.onClickModify(fullJob())
    wrapper.vm.modifiedJobForm[field] = ''
    await wrapper.vm.saveJob()
    expect(axios.post).not.toHaveBeenCalled()
    expect(message.warning).toHaveBeenCalled()
  })
  it('retains a job draft after rejected saving and releases loading', async () => {
    const { wrapper, axios } = await ready(JobManager)
    wrapper.vm.onClickModify(fullJob())
    axios.post.mockRejectedValueOnce(new Error('save denied'))
    await wrapper.vm.saveJob()
    expect(wrapper.vm.modifiedJobFormVisible).toBe(true)
    expect(wrapper.vm.modifiedJobForm.jobName).toBe('Regression 中文')
    expect(wrapper.vm.saveLoading).toBe(false)
  })
  it('submits a pending save once when clicked repeatedly', async () => {
    const { wrapper, axios } = await ready(JobManager)
    wrapper.vm.onClickModify(fullJob())
    const pending = deferred()
    axios.post.mockImplementationOnce(() => pending.promise)
    const first = wrapper.vm.saveJob(), second = wrapper.vm.saveJob()
    expect(axios.post.mock.calls.filter(([url]) => url === '/job/save')).toHaveLength(1)
    pending.resolve({})
    await Promise.all([first, second])
  })
  it.each([true, false])('rolls back a failed optimistic enable=%s switch', async enable => {
    const { wrapper, axios } = await ready(JobManager)
    const row = { ...fullJob(), enable }
    axios.get.mockRejectedValueOnce(new Error('disable denied'))
    axios.post.mockRejectedValueOnce(new Error('enable denied'))
    await wrapper.vm.changeJobStatus(row)
    expect(row.enable).toBe(!enable)
  })
  it('runs a parameterized job with Unicode and URL metacharacters preserved', async () => {
    const { wrapper, axios } = await ready(JobManager)
    const row = { id: jobId }
    wrapper.vm.onClickRunByParameter(row)
    wrapper.vm.runParameter = '{"中文":"+ & = % ? #\\n"}'
    const value = wrapper.vm.runParameter
    wrapper.vm.onClickRun(row)
    await flushPromises()
    const params = new URLSearchParams(axios.get.mock.calls[0][0].split('?')[1])
    expect(params.get('jobId')).toBe(jobId)
    expect(params.get('appId')).toBe(appId)
    expect(params.get('instanceParams')).toBe(value)
    expect(wrapper.vm.temporaryRowData).toBeNull()
    expect(wrapper.vm.runLoading).toBe(false)
  })
  it('keeps failed run parameters available and allows cancellation', async () => {
    const { wrapper, axios } = await ready(JobManager)
    const row = { id: jobId }
    wrapper.vm.onClickRunByParameter(row)
    wrapper.vm.runParameter = 'retry params'
    axios.get.mockRejectedValueOnce(new Error('run rejected'))
    wrapper.vm.onClickRun(row)
    await flushPromises()
    expect(wrapper.vm.temporaryRowData).toEqual(row)
    expect(wrapper.vm.runLoading).toBe(false)
    wrapper.vm.onClickRunCancel()
    expect(wrapper.vm.temporaryRowData).toBeNull()
    expect(wrapper.vm.runParameter).toBeNull()
  })
  it('loads the Server-created copy without carrying edits into the original and uses a durable history query', async () => {
    const { wrapper, axios, router } = await ready(JobManager)
    axios.post.mockResolvedValueOnce({ ...fullJob(), id: '9007199254740999', jobName: 'copy' })
    wrapper.vm.onClickCopyJob({ id: jobId })
    await flushPromises()
    expect(axios.post).toHaveBeenCalledWith('/job/copy?jobId=' + jobId)
    expect(wrapper.vm.modifiedJobForm.id).toBe('9007199254740999')
    wrapper.vm.onClickRunHistory({ id: jobId })
    expect(router.push).toHaveBeenCalledWith({ name: 'instanceManager', query: { jobId } })
  })
  it('uses the actual query button to reset a stale page and preserves explicit page navigation', async () => {
    const { wrapper, axios } = await ready(JobManager)
    wrapper.vm.onClickChangePage(4)
    await flushPromises()
    expect(wrapper.vm.jobQueryContent.index).toBe(3)
    wrapper.vm.jobQueryContent.keyword = 'new filter'
    await clickButton(wrapper, 'message.query')
    expect(wrapper.vm.jobQueryContent.index).toBe(0)
    expect(axios.post).toHaveBeenLastCalledWith('/job/list', expect.objectContaining({ appId, keyword: 'new filter', index: 0 }))
    wrapper.vm.onClickReset()
    await flushPromises()
    expect(wrapper.vm.jobQueryContent.jobId).toBeUndefined()
    expect(wrapper.vm.jobQueryContent.keyword).toBeUndefined()
  })
  it('routes time-expression and import/export child callbacks into the editor', async () => {
    const { wrapper, axios } = await ready(JobManager)
    wrapper.vm.onClickEditTimeExpression()
    wrapper.vm.eventFromDailyTimeIntervalExpress('{"interval":45}')
    expect(wrapper.vm.modifiedJobForm.timeExpression).toBe('{"interval":45}')
    expect(wrapper.vm.timeExpressionEditorVisible).toBe(false)
    wrapper.vm.onClickJobExportButton({ id: jobId })
    expect(wrapper.vm.jobExporterMode).toBe('EXPORT')
    expect(wrapper.vm.jobExporterTargetId).toBe(jobId)
    wrapper.vm.onClickJobInputButton()
    wrapper.vm.eventFromExporter('ok')
    await flushPromises()
    expect(wrapper.vm.jobExporterDialogVisible).toBe(false)
    expect(axios.post).toHaveBeenCalledWith('/job/list', expect.any(Object))
  })
})

describe('workflow listing, execution and copied deep links', () => {
  it('opens and cancels a parameter dialog using a boolean Element Plus model', async () => {
    const { wrapper } = await ready(WorkflowManager)
    wrapper.vm.onClickRunByParameter({ id: jobId })
    await flushPromises()
    const dialog = wrapper.findAllComponents(ElDialog).find(item => item.props('modelValue') === true)
    expect(dialog).toBeDefined()
    expect(dialog.props('modelValue')).toBe(true)
    wrapper.vm.onClickRunCancel()
    await flushPromises()
    expect(wrapper.vm.temporaryRowData).toBeNull()
  })
  it('encodes workflow initialization parameters and retains failed drafts', async () => {
    const { wrapper, axios } = await ready(WorkflowManager)
    const row = { id: jobId }
    wrapper.vm.onClickRunByParameter(row)
    wrapper.vm.runParameter = '中文 + & = ? # %'
    axios.get.mockRejectedValueOnce(new Error('run denied'))
    wrapper.vm.onClickRunWorkflow(row)
    await flushPromises()
    const params = new URLSearchParams(axios.get.mock.calls[0][0].split('?')[1])
    expect(params.get('initParams')).toBe('中文 + & = ? # %')
    expect(params.get('workflowId')).toBe(jobId)
    expect(wrapper.vm.temporaryRowData).toEqual(row)
    expect(wrapper.vm.runLoading).toBe(false)
  })
  it.each([true, false])('restores enable=%s after a rejected optimistic switch', async enable => {
    const { wrapper, axios } = await ready(WorkflowManager)
    const row = { id: jobId, enable }
    axios.get.mockRejectedValueOnce(new Error('not permitted'))
    wrapper.vm.switchWorkflow(row)
    await flushPromises()
    expect(row.enable).toBe(!enable)
    expect(axios.get).toHaveBeenCalledWith('/workflow/' + (enable ? 'enable' : 'disable') + '?appId=' + appId + '&workflowId=' + jobId)
  })
  it('opens new, edit and copy routes with refresh-safe query parameters', async () => {
    const { wrapper, axios, router } = await ready(WorkflowManager)
    wrapper.vm.onClickNewWorkflow()
    expect(router.push).toHaveBeenCalledWith({ name: 'workflowEditor', query: { modify: 'false' } })
    wrapper.vm.onClickModifyWorkflow({ id: jobId })
    expect(router.push).toHaveBeenCalledWith({ name: 'workflowEditor', query: { workflowId: jobId } })
    axios.post.mockResolvedValueOnce('9007199254740999')
    wrapper.vm.onClickCopy({ id: jobId })
    await flushPromises()
    expect(router.push).toHaveBeenLastCalledWith({ name: 'workflowEditor', query: { workflowId: '9007199254740999' } })
    expect(wrapper.vm.copyLoading).toBe(false)
  })
  it('releases copy loading after failure without navigating', async () => {
    const { wrapper, axios, router } = await ready(WorkflowManager)
    axios.post.mockRejectedValueOnce(new Error('copy denied'))
    wrapper.vm.onClickCopy({ id: jobId })
    await flushPromises()
    expect(wrapper.vm.copyLoading).toBe(false)
    expect(router.push).not.toHaveBeenCalled()
  })
  it('resets pagination from the real query button while preserving filter fields', async () => {
    const { wrapper, axios } = await ready(WorkflowManager)
    wrapper.vm.workflowQueryContent.index = 3
    wrapper.vm.workflowQueryContent.keyword = '新筛选'
    await clickButton(wrapper, 'message.query')
    expect(wrapper.vm.workflowQueryContent.index).toBe(0)
    expect(axios.post).toHaveBeenLastCalledWith('/workflow/list', expect.objectContaining({ keyword: '新筛选', index: 0 }))
  })
})

describe('ordinary and workflow instance pages', () => {
  it.each([[InstanceManager, 'instance', 'instanceId'], [WFInstanceManager, 'wfInstance', 'wfInstanceId']])('cancels stopping %s without any API request', async (component, domain, field) => {
    const { wrapper, confirm, axios, message } = await ready(component)
    confirm.mockRejectedValueOnce('cancel')
    await wrapper.vm.onClickStop({ [field]: instanceId })
    expect(confirm).toHaveBeenCalledWith('message.stopConfirmation', 'message.confirmTitle', expect.any(Object))
    expect(axios.get).not.toHaveBeenCalled()
    expect(axios.post).not.toHaveBeenCalled()
    expect(message.success).not.toHaveBeenCalled()
    expect(message.error).not.toHaveBeenCalled()
  })
  it.each([[InstanceManager, 'instance', 'instanceId'], [WFInstanceManager, 'wfInstance', 'wfInstanceId']])('reports rejected stop for %s without success or list refresh', async (component, domain, field) => {
    const { wrapper, axios, message } = await ready(component)
    axios.get.mockRejectedValueOnce(new Error('stop denied'))
    await wrapper.vm.onClickStop({ [field]: instanceId })
    expect(axios.get).toHaveBeenCalledWith('/' + domain + '/stop?' + field + '=' + instanceId + '&appId=' + appId)
    expect(axios.post).not.toHaveBeenCalled()
    expect(message.success).not.toHaveBeenCalled()
    expect(axios.get).toHaveBeenCalledTimes(1)
  })
  it('initializes an ordinary history filter from a string route query', async () => {
    const { wrapper, axios } = await ready(InstanceManager, { query: { jobId } })
    expect(wrapper.vm.instanceQueryContent.jobId).toBe(jobId)
    expect(wrapper.vm.instanceQueryContent.type).toBe('NORMAL')
    await wrapper.vm.listInstanceInfos()
    expect(axios.post).toHaveBeenCalledWith('/instance/list', expect.objectContaining({ jobId, type: 'NORMAL', appId }))
  })
  it.each(['9007199254741001', undefined])('updates a reused instance page when the history job query changes to %s', async nextJobId => {
    const { wrapper, route, axios } = await ready(InstanceManager, { query: { jobId } })
    wrapper.vm.instanceQueryContent.index = 3
    route.query = nextJobId ? { jobId: nextJobId } : {}
    await flushPromises()
    expect(wrapper.vm.instanceQueryContent.jobId).toBe(nextJobId)
    expect(wrapper.vm.instanceQueryContent.index).toBe(0)
    expect(axios.post).toHaveBeenLastCalledWith('/instance/list', expect.objectContaining({ jobId: nextJobId, index: 0 }))
  })
  it('changes the native NORMAL/WORKFLOW tab, resets paging and exposes workflow filtering', async () => {
    const { wrapper, axios } = await ready(InstanceManager)
    wrapper.vm.instanceQueryContent.index = 3
    const tabs = wrapper.findComponent(ElTabs)
    await tabs.vm.$emit('update:modelValue', 'WORKFLOW')
    await tabs.vm.$emit('tab-change', 'WORKFLOW')
    await flushPromises()
    expect(wrapper.vm.instanceQueryContent.type).toBe('WORKFLOW')
    expect(wrapper.vm.instanceQueryContent.index).toBe(0)
    expect(wrapper.text()).toContain('message.wfInstanceId')
    expect(axios.post).toHaveBeenCalledWith('/instance/list', expect.objectContaining({ type: 'WORKFLOW', index: 0 }))
  })
  it('passes the exact detail ID to its mounted child and restarts log pages at zero for another instance', async () => {
    const { wrapper, axios } = await ready(InstanceManager)
    wrapper.vm.onClickShowDetail({ instanceId })
    await flushPromises()
    expect(wrapper.findComponent({ name: 'InstanceDetail' }).props('instanceId')).toBe(instanceId)
    wrapper.vm.onClickShowLog({ instanceId })
    await flushPromises()
    expect(axios.get).toHaveBeenCalledWith('/instance/log?instanceId=' + instanceId + '&index=0&appId=' + appId)
    expect(wrapper.vm.paginableInstanceLog.data).toBe('中文 log\nline2')
    wrapper.vm.onClickChangeLogPage(2)
    await flushPromises()
    expect(wrapper.vm.logQueryContent.index).toBe(1)
    wrapper.vm.onClickShowLog({ instanceId: '9007199254741001' })
    await flushPromises()
    expect(wrapper.vm.logQueryContent.index).toBe(0)
  })
  it('retries and stops the selected ordinary instance and refreshes the list', async () => {
    const { wrapper, axios, message } = await ready(InstanceManager)
    wrapper.vm.onClickRetryJob({ instanceId })
    await flushPromises()
    expect(axios.get).toHaveBeenCalledWith('/instance/retry?instanceId=' + instanceId + '&appId=' + appId)
    wrapper.vm.onClickStop({ instanceId })
    await flushPromises()
    expect(axios.get).toHaveBeenCalledWith('/instance/stop?instanceId=' + instanceId + '&appId=' + appId)
    expect(axios.post.mock.calls.filter(([url]) => url === '/instance/list')).toHaveLength(2)
    expect(message.success).toHaveBeenCalledTimes(2)
  })
  it('resets a stale instance query page from the visible search button', async () => {
    const { wrapper } = await ready(InstanceManager)
    wrapper.vm.instanceQueryContent.index = 2
    wrapper.vm.instanceQueryContent.instanceId = instanceId
    await clickButton(wrapper, 'message.query')
    expect(wrapper.vm.instanceQueryContent.index).toBe(0)
  })
  it('saves the downloaded log Blob and releases its object URL', async () => {
    const { wrapper, axios } = await ready(InstanceManager)
    const blob = new Blob(['中文日志\n'], { type: 'text/plain' })
    axios.get.mockResolvedValueOnce({ data: blob, headers: { 'content-type': 'text/plain;charset=UTF-8' } })
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:log-test')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    let filename
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { filename = this.download })
    wrapper.vm.logQueryContent.instanceId = instanceId
    vi.useFakeTimers()
    await wrapper.vm.onclickDownloadLog()
    expect(axios.get).toHaveBeenCalledWith('/instance/downloadLog4Console', { params: { instanceId }, responseType: 'blob', timeout: 75000 })
    expect(create).toHaveBeenCalledWith(blob)
    expect(filename).toBe('powerjob-instance-' + instanceId + '.log')
    vi.advanceTimersByTime(1000)
    expect(revoke).toHaveBeenCalledWith('blob:log-test')
  })
  it('never downloads a JSON business error as an apparent log file', async () => {
    const { wrapper, axios, message } = await ready(InstanceManager)
    axios.get.mockResolvedValueOnce({ data: new Blob(['{"success":false,"message":"log denied"}'], { type: 'application/json' }), headers: {} })
    const create = vi.spyOn(URL, 'createObjectURL')
    await wrapper.vm.onclickDownloadLog()
    expect(create).not.toHaveBeenCalled()
    expect(message.error).toHaveBeenCalledWith('log denied')
  })
  it('opens a durable workflow-instance detail route and refreshes after stop/retry', async () => {
    const { wrapper, axios, router } = await ready(WFInstanceManager)
    wrapper.vm.onClickShowDetail({ wfInstanceId: instanceId })
    expect(router.push).toHaveBeenCalledWith({ name: 'WorkflowInstanceDetail', query: { wfInstanceId: instanceId } })
    wrapper.vm.onClickStop({ wfInstanceId: instanceId })
    await flushPromises()
    expect(axios.get).toHaveBeenCalledWith('/wfInstance/stop?wfInstanceId=' + instanceId + '&appId=' + appId)
    await wrapper.vm.restart({ wfInstanceId: instanceId })
    expect(axios.get).toHaveBeenCalledWith('/wfInstance/retry', { params: { appId, wfInstanceId: instanceId } })
    expect(axios.post.mock.calls.filter(([url]) => url === '/wfInstance/list')).toHaveLength(2)
  })
})

describe('container assets, deployment sockets and templates', () => {
  it.each(['[]', 'null', '123', '"text"'])('rejects malformed historical Git configuration %s', async sourceInfo => {
    const { wrapper, axios, message } = await ready(ContainerManager)
    wrapper.vm.editItem({ id: jobId, containerName: 'malformed', sourceType: 'Git', sourceInfo })
    expect(wrapper.vm.dialogVisible).toBe(false)
    expect(message.warning).toHaveBeenCalledWith('message.invalidJson')
    expect(axios.post).not.toHaveBeenCalled()
  })
  it('preserves a disabled container status and unknown Git source fields on metadata save', async () => {
    const { wrapper, axios } = await ready(ContainerManager)
    const source = { repo: 'https://example.test/git', branch: 'main', futureConfig: { precisionId: jobId } }
    wrapper.vm.editItem({ id: jobId, containerName: 'disabled', status: 'DISABLE', sourceType: 'Git', sourceInfo: JSON.stringify(source) })
    wrapper.vm.form.containerName = 'changed'
    await wrapper.vm.onSubmit()
    const payload = axios.post.mock.calls.find(([url]) => url === '/container/save')[1]
    expect(payload.status).toBe('DISABLE')
    expect(JSON.parse(payload.sourceInfo).futureConfig).toEqual(source.futureConfig)
    expect(JSON.parse(payload.sourceInfo).repo).toBe(source.repo)
  })
  it('keeps an existing FatJar reference when editing and saving metadata', async () => {
    const { wrapper, axios } = await ready(ContainerManager)
    wrapper.vm.editItem({ id: jobId, containerName: 'artifact', sourceType: 'FatJar', sourceInfo: 'store://existing-artifact.jar' })
    wrapper.vm.form.containerName = 'renamed'
    await wrapper.vm.onSubmit()
    expect(axios.post).toHaveBeenCalledWith('/container/save', { appId, id: jobId, containerName: 'renamed', status: 'ENABLE', sourceType: 'FatJar', sourceInfo: 'store://existing-artifact.jar' })
    expect(wrapper.vm.dialogVisible).toBe(false)
  })
  it('parses historical Git credentials and uses the native radio values', async () => {
    const { wrapper, axios } = await ready(ContainerManager)
    wrapper.vm.editItem({ id: jobId, containerName: 'git', sourceType: 'Git', sourceInfo: '{"repo":"https://example.test/git","branch":"feature","username":"fixture","password":"synthetic"}' })
    await flushPromises()
    expect(wrapper.findAllComponents(ElRadio).map(item => item.props('value'))).toEqual(['Git', 'FatJar'])
    await wrapper.vm.onSubmit()
    expect(JSON.parse(axios.post.mock.calls[0][1].sourceInfo)).toEqual({ repo: 'https://example.test/git', branch: 'feature', username: 'fixture', password: 'synthetic' })
  })
  it('validates an uploaded .jar, accepts only business success and clears a rejected upload', async () => {
    const { wrapper, message } = await ready(ContainerManager)
    expect(wrapper.vm.beforeUpload({ name: 'PROCESSORS.JAR' })).toBe(true)
    expect(wrapper.vm.beforeUpload({ name: 'image.png' })).toBe(false)
    const file = { name: 'processors.jar', uid: 1 }
    wrapper.vm.onSuccess({ success: true, data: 'store://processors.jar' }, file)
    expect(wrapper.vm.sourceInfo).toBe('store://processors.jar')
    expect(wrapper.vm.fileList).toEqual([file])
    wrapper.vm.onSuccess({ success: false, message: 'upload denied' }, file)
    expect(wrapper.vm.sourceInfo).toBe('')
    expect(wrapper.vm.fileList).toEqual([])
    expect(message.error).toHaveBeenCalledWith('upload denied')
    wrapper.vm.onUploadError(new Error('network error'))
    expect(message.error).toHaveBeenCalled()
    wrapper.vm.onRemove()
    expect(wrapper.vm.sourceInfo).toBe('')
  })
  it('rejects a missing FatJar reference in the submit method and prevents duplicated writes', async () => {
    const { wrapper, axios } = await ready(ContainerManager)
    wrapper.vm.newContainer()
    wrapper.vm.form = { sourceType: 'FatJar', containerName: 'jar' }
    await wrapper.vm.onSubmit()
    expect(axios.post).not.toHaveBeenCalled()
    wrapper.vm.sourceInfo = 'store://jar'
    const pending = deferred()
    axios.post.mockImplementationOnce(() => pending.promise)
    const first = wrapper.vm.onSubmit(), second = wrapper.vm.onSubmit()
    expect(axios.post).toHaveBeenCalledTimes(1)
    pending.resolve({})
    await Promise.all([first, second])
  })
  it('preserves a rejected container draft and resets inherited identity for new containers', async () => {
    const { wrapper, axios } = await ready(ContainerManager)
    wrapper.vm.editItem({ id: jobId, sourceType: 'FatJar', containerName: 'existing', sourceInfo: 'store://jar' })
    axios.post.mockRejectedValueOnce(new Error('save denied'))
    await wrapper.vm.onSubmit()
    expect(wrapper.vm.dialogVisible).toBe(true)
    expect(wrapper.vm.saving).toBe(false)
    expect(wrapper.vm.sourceInfo).toBe('store://jar')
    wrapper.vm.newContainer()
    expect(wrapper.vm.id).toBe('')
    expect(wrapper.vm.sourceInfo).toBe('')
    expect(wrapper.vm.fileList).toEqual([])
    expect(wrapper.vm.gitForm).toEqual({ repo: '', branch: '', username: '', password: '' })
  })
  it('uses the configured context path and current authentication headers for file upload', async () => {
    const { wrapper } = await ready(ContainerManager)
    wrapper.vm.newContainer()
    wrapper.vm.form.sourceType = 'FatJar'
    await flushPromises()
    const upload = wrapper.findComponent(ElUpload)
    expect(upload.props('action')).toBe(wrapper.vm.requestUrl + '/container/jarUpload')
    expect(upload.props('headers')).toEqual({ PowerJwt: 'test-token', AppId: appId })
    localStorage.setItem('PowerJwt', 'updated-token')
    localStorage.setItem('Power_appId', '9007199254740999')
    wrapper.vm.beforeUpload({ name: 'processors.jar' })
    await flushPromises()
    expect(upload.props('headers')).toEqual({ PowerJwt: 'updated-token', AppId: '9007199254740999' })
    expect(resolveApiBaseUrl({ apiBaseUrl: 'https://console.example.test/nested/powerjob/' }, {})).toBe('https://console.example.test/nested/powerjob')
    expect(websocketUrl('/container/deploy/1', 'https://console.example.test/nested/powerjob/', { href: 'https://console.example.test/ui/' })).toBe('wss://console.example.test/nested/powerjob/container/deploy/1')
  })
  it.each(['SYSTEM: [ERROR] prepare jar file failed: invalid ref', '[INFO] BUILD FAILURE', "SYSTEM: can't find packaged jar(maybe maven build failed), so deploy failed.", 'SYSTEM: acquire deploy lock failed, maybe other user is deploying'])('keeps a visible deployment failure after a legacy success message: %s', async error => {
    class FakeSocket { constructor() { this.close = vi.fn(); this.send = vi.fn() } }
    vi.stubGlobal('WebSocket', FakeSocket)
    const { wrapper } = await ready(ContainerManager)
    wrapper.vm.arrangeItem({ id: jobId, containerName: 'failing' })
    const socket = wrapper.vm.socket
    socket.onmessage({ data: error })
    socket.onmessage({ data: 'SYSTEM: deploy finished, congratulations!' })
    await flushPromises()
    expect(wrapper.vm.deploymentStatus).toBe('error')
    expect(document.querySelector('[data-status="error"]').textContent).toContain('message.deploymentError')
    expect(wrapper.vm.logs).toEqual([error, 'SYSTEM: deploy finished, congratulations!'])
    wrapper.vm.arrangeItem({ id: jobId, containerName: 'retry' })
    wrapper.vm.socket.onmessage({ data: '[INFO] Error stacktraces are turned on.' })
    expect(wrapper.vm.deploymentStatus).toBe('running')
    wrapper.vm.socket.onmessage({ data: 'SYSTEM: deploy finished, congratulations!' })
    expect(wrapper.vm.deploymentStatus).toBe('success')
  })
  it('shows a socket transport failure and ignores stale deployment messages', async () => {
    class FakeSocket { constructor() { this.close = vi.fn(); this.send = vi.fn() } }
    vi.stubGlobal('WebSocket', FakeSocket)
    const { wrapper, message } = await ready(ContainerManager)
    wrapper.vm.arrangeItem({ id: jobId, containerName: 'first' })
    const first = wrapper.vm.socket
    const staleMessage = first.onmessage
    first.onerror()
    expect(wrapper.vm.deploymentStatus).toBe('error')
    expect(message.error).toHaveBeenCalled()
    wrapper.vm.arrangeItem({ id: '2', containerName: 'second' })
    staleMessage({ data: 'SYSTEM: [ERROR] failure on previous attempt' })
    expect(wrapper.vm.deploymentStatus).toBe('running')
  })
  it('does not replace a newer deployment with an earlier Worker list response', async () => {
    class FakeSocket { constructor() { this.close = vi.fn(); this.send = vi.fn() } }
    vi.stubGlobal('WebSocket', FakeSocket)
    const { wrapper, axios } = await ready(ContainerManager)
    const pending = deferred()
    axios.get.mockImplementationOnce(() => pending.promise)
    const previous = wrapper.vm.listOfItem({ id: jobId })
    wrapper.vm.arrangeItem({ id: '2', containerName: 'latest' })
    const socket = wrapper.vm.socket
    pending.resolve({ data: { data: 'old Worker list' } })
    await previous
    expect(wrapper.vm.socket).toBe(socket)
    expect(socket.close).not.toHaveBeenCalled()
    expect(wrapper.vm.arrangeTitle).toContain('latest')
    expect(wrapper.vm.logs).toEqual([])
  })
  it('safely closes an unopened socket and disposes old callbacks on reuse and unmount', async () => {
    const sockets = []
    class FakeSocket {
      static OPEN = 1
      static CONNECTING = 0
      static CLOSED = 3
      constructor(url) { this.url = url; this.readyState = 0; this.send = vi.fn(); this.close = vi.fn(() => { this.readyState = 3 }); sockets.push(this) }
    }
    vi.stubGlobal('WebSocket', FakeSocket)
    const { wrapper } = await ready(ContainerManager)
    expect(() => wrapper.vm.closeArrange()).not.toThrow()
    wrapper.vm.arrangeItem({ id: jobId, containerName: 'first' })
    const first = sockets[0]
    const staleMessage = first.onmessage
    first.readyState = 1
    first.onopen()
    expect(first.send).toHaveBeenCalledWith('{"jwtToken":"test-token"}')
    first.onmessage({ data: 'deploying worker-a' })
    expect(wrapper.vm.logs).toEqual(['deploying worker-a'])
    wrapper.vm.arrangeItem({ id: '2', containerName: 'second' })
    expect(first.close).toHaveBeenCalledOnce()
    expect(first.onmessage).toBeNull()
    staleMessage({ data: 'stale deployment event' })
    expect(wrapper.vm.logs).toEqual([])
    expect(sockets[1].url).toContain('/container/deploy/2')
    wrapper.unmount()
    expect(sockets[1].close).toHaveBeenCalledOnce()
  })
  it('does not delete on confirmation cancellation and renders deployed workers', async () => {
    const { wrapper, axios, confirm } = await ready(ContainerManager)
    confirm.mockRejectedValueOnce('cancel')
    await wrapper.vm.deleteItem({ id: jobId })
    expect(axios.get).not.toHaveBeenCalled()
    await wrapper.vm.listOfItem({ id: jobId })
    expect(axios.get).toHaveBeenCalledWith('/container/listDeployedWorker', { params: { containerId: jobId, appId } })
    expect(wrapper.vm.logs).toEqual(['worker-a', 'worker-b'])
    expect(wrapper.vm.arrangeVisible).toBe(true)
  })
  it.each(['8', '11'])('generates a Java %s ZIP from the native radio model', async version => {
    const { wrapper, axios } = await ready(ContainerTemplate)
    wrapper.vm.form = { group: 'com.example', artifact: 'fixture', name: 'Fixture', packageName: 'com.example.fixture', javaVersion: version }
    const blob = new Blob(['ZIP fixture'], { type: 'application/zip' })
    axios.post.mockResolvedValueOnce({ data: blob, headers: { 'content-type': 'application/zip' } })
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:zip')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    let filename
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { filename = this.download })
    expect(wrapper.findAllComponents(ElRadio).map(item => item.props('value'))).toEqual(['8', '11'])
    vi.useFakeTimers()
    await wrapper.vm.onSubmit()
    expect(axios.post).toHaveBeenCalledWith('/container/downloadContainerTemplate', { group: 'com.example', artifact: 'fixture', name: 'Fixture', packageName: 'com.example.fixture', javaVersion: version }, { responseType: 'blob' })
    expect(create).toHaveBeenCalledWith(blob)
    expect(filename).toBe('template.zip')
    vi.advanceTimersByTime(1000)
    expect(revoke).toHaveBeenCalledWith('blob:zip')
  })
  it.each(['application/json', 'text/html', 'text/plain'])('rejects a %s template error without downloading', async type => {
    const { wrapper, axios, message } = await ready(ContainerTemplate)
    wrapper.vm.form = { group: 'com.example', artifact: 'fixture', name: 'Fixture', packageName: 'com.example.fixture', javaVersion: '8' }
    axios.post.mockResolvedValueOnce({ data: new Blob([type.includes('json') ? '{"success":false,"message":"template denied"}' : 'template denied'], { type }), headers: { 'content-type': type } })
    const create = vi.spyOn(URL, 'createObjectURL')
    await wrapper.vm.onSubmit()
    expect(create).not.toHaveBeenCalled()
    expect(message.error).toHaveBeenCalled()
    expect(wrapper.vm.loading).toBe(false)
  })
})

describe('time expressions, daily interval and import/export', () => {
  it('keeps numeric weekday models when toggling real Element Plus checkboxes', async () => {
    const expression = '{"interval":60,"startTimeOfDay":"09:00:00","endTimeOfDay":"18:00:00","daysOfWeek":["1","3"],"intervalUnit":"SECONDS"}'
    const { wrapper } = await ready(DailyTimeIntervalForm, { props: { timeExpression: expression } })
    expect(wrapper.vm.dailyTimeIntervalExpress.daysOfWeek).toEqual([1, 3])
    const saturday = wrapper.findAllComponents(ElCheckbox).find(item => item.props('value') === 6)
    await saturday.trigger('click')
    await flushPromises()
    wrapper.vm.onSubmit()
    const emitted = JSON.parse(wrapper.emitted('contentChanged')[0][0])
    expect(emitted.daysOfWeek).toEqual([1, 3, 6])
    expect(emitted.daysOfWeek.every(day => typeof day === 'number')).toBe(true)
    expect(wrapper.props('timeExpression')).toBe(expression)
  })
  it('preserves legal all-week, equal-time and non-second historical expressions', async () => {
    const { wrapper } = await ready(DailyTimeIntervalForm, { props: { timeExpression: '{"interval":2,"intervalUnit":"HOURS","startTimeOfDay":"09:00:00","endTimeOfDay":"09:00:00","daysOfWeek":[]}' } })
    wrapper.vm.onSubmit()
    expect(JSON.parse(wrapper.emitted('contentChanged')[0][0])).toEqual({ interval: 2, intervalUnit: 'HOURS', startTimeOfDay: '09:00:00', endTimeOfDay: '09:00:00', daysOfWeek: [] })
  })
  it.each([
    { interval: 0 }, { interval: -1 }, { interval: 1.5 }, { interval: 'not-number' },
    { startTimeOfDay: '25:00:00' }, { endTimeOfDay: '18:99:00' },
    { startTimeOfDay: '19:00:00', endTimeOfDay: '18:00:00' }, { daysOfWeek: [0] }, { daysOfWeek: [8] }
  ])('rejects invalid daily input %j without saving', async invalid => {
    const { wrapper, message } = await ready(DailyTimeIntervalForm)
    Object.assign(wrapper.vm.dailyTimeIntervalExpress, invalid)
    wrapper.vm.onSubmit()
    expect(wrapper.emitted('contentChanged')).toBeUndefined()
    expect(message.warning).toHaveBeenCalled()
  })
  it('reports malformed daily JSON while preserving a usable default draft', async () => {
    const { wrapper, message } = await ready(DailyTimeIntervalForm, { props: { timeExpression: '{bad' } })
    expect(message.warning).toHaveBeenCalledWith('message.invalidJson')
    expect(wrapper.vm.dailyTimeIntervalExpress.interval).toBe(60)
  })
  it.each(['[]', 'null', '42', '"text"'])('reports a non-object historical daily expression %s', async timeExpression => {
    const { wrapper, message } = await ready(DailyTimeIntervalForm, { props: { timeExpression } })
    expect(message.warning).toHaveBeenCalledWith('message.invalidJson')
    expect(wrapper.vm.dailyTimeIntervalExpress.interval).toBe(60)
  })
  it('uses Axios params for a complex expression without mutating either prop', async () => {
    const expression = '0 0/5 * * * ? + &= 中文'
    const { wrapper, axios } = await ready(TimeExpressionValidator, { props: { timeExpressionType: 'CRON', timeExpression: expression } })
    await wrapper.vm.checkTimeExpression()
    expect(axios.get).toHaveBeenCalledWith('/validate/timeExpression', { params: { timeExpressionType: 'CRON', timeExpression: expression } })
    expect(wrapper.props('timeExpression')).toBe(expression)
    expect(wrapper.props('timeExpressionType')).toBe('CRON')
    expect(wrapper.vm.nextNTriggerTime).toEqual(['2026-10-01 12:00:00'])
  })
  it('shows request failure as a recoverable validation error', async () => {
    const { wrapper, axios } = await ready(TimeExpressionValidator, { props: { timeExpressionType: 'CRON', timeExpression: 'bad' } })
    axios.get.mockRejectedValueOnce(new Error('invalid cron'))
    await wrapper.vm.checkTimeExpression()
    expect(wrapper.vm.error).toBe('invalid cron')
    expect(wrapper.vm.loading).toBe(false)
  })
  it('treats Server success-wrapped validation errors as errors rather than future trigger times', async () => {
    const { wrapper, axios } = await ready(TimeExpressionValidator, { props: { timeExpressionType: 'CRON', timeExpression: 'invalid' } })
    axios.get.mockResolvedValueOnce(['Expression is invalid: Unexpected end of expression.'])
    await wrapper.vm.checkTimeExpression()
    expect(wrapper.vm.error).toBeTruthy()
    expect(wrapper.vm.nextNTriggerTime).toEqual([])
  })
  it.each(['{bad', 'null', '[]', '"text"', '42'])('rejects import JSON %s before any API request', async json => {
    const { wrapper, axios } = await ready(Exporter, { props: { type: 'JOB', mode: 'INPUT' } })
    const editor = wrapper.findComponent(ElInput)
    await editor.vm.$emit('update:modelValue', json)
    await wrapper.vm.onClickConfirmButton()
    expect(axios.post).not.toHaveBeenCalled()
    expect(wrapper.emitted('finished')).toBeUndefined()
    expect(wrapper.vm.error).toBe('message.invalidJson')
  })
  it.each([['JOB', '/job/save'], ['WORKFLOW', '/workflow/save']])('imports %s through %s and retains 64-bit integer precision', async (type, path) => {
    const { wrapper, axios } = await ready(Exporter, { props: { type, mode: 'INPUT' } })
    wrapper.vm.jsonContent = '{"id":9007199254740995,"name":"中文","appId":1}'
    await wrapper.vm.onClickConfirmButton()
    expect(axios.post).toHaveBeenCalledWith(path, { id: jobId, name: '中文', appId })
    expect(wrapper.emitted('finished')).toEqual([['ok']])
  })
  it('keeps an API-rejected import open without issuing a successful finished event', async () => {
    const { wrapper, axios } = await ready(Exporter, { props: { type: 'JOB', mode: 'INPUT' } })
    wrapper.vm.jsonContent = '{"jobName":"fixture"}'
    axios.post.mockRejectedValueOnce(new Error('import denied'))
    await wrapper.vm.onClickConfirmButton()
    expect(wrapper.emitted('finished')).toBeUndefined()
    expect(wrapper.vm.error).toBe('import denied')
    expect(wrapper.vm.loading).toBe(false)
  })
  it('emits completion once and prevents overlapping imports while a request is pending', async () => {
    const { wrapper, axios } = await ready(Exporter, { props: { type: 'JOB', mode: 'INPUT' } })
    wrapper.vm.jsonContent = '{"jobName":"fixture"}'
    const pending = deferred()
    axios.post.mockImplementationOnce(() => pending.promise)
    const first = wrapper.vm.onClickConfirmButton(), second = wrapper.vm.onClickConfirmButton()
    expect(axios.post).toHaveBeenCalledTimes(1)
    pending.resolve({})
    await Promise.all([first, second])
    expect(wrapper.emitted('finished')).toEqual([['ok']])
  })
  it('loads a job export using its ID and makes its JSON editor read-only', async () => {
    const axios = createAxios()
    axios.get.mockResolvedValueOnce({ jobId, jobName: 'exported' })
    const { wrapper } = await ready(Exporter, { axios, props: { type: 'JOB', mode: 'EXPORT', targetId: jobId } })
    expect(JSON.parse(wrapper.vm.jsonContent)).toEqual({ jobId, jobName: 'exported' })
    expect(wrapper.findComponent(ElInput).props('readonly')).toBe(true)
    await wrapper.vm.onClickConfirmButton()
    expect(wrapper.emitted('finished')).toEqual([['ok']])
  })
})

describe('overview readback', () => {
  it('sorts workers, displays loaded metrics and refreshes using the selected string app ID', async () => {
    const axios = createAxios()
    axios.get.mockImplementation(async url => url === '/system/listWorker'
      ? [{ address: 'offline', status: 9999 }, { address: 'healthy', status: 1 }, { address: 'busy', status: 2 }]
      : { jobCount: 3, runningInstanceCount: 2, failedInstanceCount: 1, appName: 'fixture', scheduleServerInfo: { ip: 'localhost', bornTime: 1 } })
    const { wrapper } = await ready(Home, { axios })
    expect(wrapper.vm.workerList.map(item => item.address)).toEqual(['healthy', 'busy', 'offline'])
    expect(wrapper.vm.activeWorkerCount).toBe(2)
    expect(wrapper.vm.metrics.map(item => item.value)).toEqual([3, 2, 1, 2])
    await clickButton(wrapper, 'message.refresh')
    expect(axios.get).toHaveBeenCalledWith('/system/listWorker', { params: { appId } })
    expect(axios.get).toHaveBeenCalledWith('/system/overview', { params: { appId } })
    expect(wrapper.vm.loading).toBe(false)
  })
})
