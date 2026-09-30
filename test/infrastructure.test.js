import { AxiosError } from 'axios'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHttpClient, parseResponse } from '../src/services/http.js'
import { resolveApiBaseUrl, websocketUrl } from '../src/config.js'
import { newJob, jobForEditor, jobForSave, validJob } from '../src/services/jobs.js'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from '../src/store.js'
import { readLogBlob } from '../src/components/dag/instance-log.js'

const adapter = data => async config => ({ data: typeof data === 'string' ? data : JSON.stringify(data), config, headers: {}, status: 200, statusText: 'OK' })
const notification = () => ({ warning: vi.fn(), error: vi.fn() })
beforeEach(() => localStorage.clear())

describe('Server API contract', () => {
  it('preserves all 64-bit IDs without changing ordinary numeric fields', () => {
    expect(parseResponse('{"instanceId":9223372036854775807,"status":5,"nodes":[{"nodeId":9007199254740993}]}')).toEqual({instanceId:'9223372036854775807',status:5,nodes:[{nodeId:'9007199254740993'}]})
  })
  it('keeps PowerJwt, explicit AppId, NamespaceId and selected-app fallback', async () => {
    localStorage.setItem('PowerJwt','synthetic-token'); localStorage.setItem('Power_appId','9007199254740993')
    const captured = []
    const client = createHttpClient({ notify: notification(), adapter: async config => { captured.push(config); return adapter({success:true,data:1})(config) } })
    await client.get('/job/list'); await client.post('/appInfo/save', {}, {headers:{AppId:'second-app',NamespaceId:'namespace',PowerJwt:'explicit-synthetic-token'}})
    expect(captured[0].headers.get('PowerJwt')).toBe('synthetic-token')
    expect(captured[0].headers.get('AppId')).toBe('9007199254740993')
    expect(captured[1].headers.get('AppId')).toBe('second-app')
    expect(captured[1].headers.get('NamespaceId')).toBe('namespace')
    expect(captured[1].headers.get('PowerJwt')).toBe('explicit-synthetic-token')
  })
  it.each([-100,'-100'])('rejects expired sessions with code %s and navigates once', async code => {
    const router={replace:vi.fn()}, notify=notification(); localStorage.setItem('PowerJwt','expired')
    const client=createHttpClient({router,notify,adapter:adapter({success:false,code,message:'Expired'})})
    await expect(client.get('/user/detail')).rejects.toThrow('Expired')
    expect(router.replace).toHaveBeenCalledWith('/loginHomepage'); expect(notify.warning).toHaveBeenCalledTimes(1); expect(localStorage.getItem('PowerJwt')).toBeNull()
  })
  it('uses ResultDTO message on business failure', async () => {
    const notify=notification(), client=createHttpClient({notify,adapter:adapter({success:false,message:'Business failure'})})
    await expect(client.post('/job/save',{})).rejects.toThrow('Business failure'); expect(notify.warning).toHaveBeenCalledWith('Business failure')
  })
  it('preserves login and reports legacy msg for a non-login business failure', async () => {
    localStorage.setItem('PowerJwt', 'active-session')
    const notify = notification(), router = { replace: vi.fn() }
    const client = createHttpClient({ notify, router, adapter: adapter({ success: false, code: 403, msg: 'Permission denied' }) })
    await expect(client.post('/job/save', {})).rejects.toThrow('Permission denied')
    expect(notify.warning).toHaveBeenCalledWith('Permission denied')
    expect(localStorage.getItem('PowerJwt')).toBe('active-session')
    expect(router.replace).not.toHaveBeenCalled()
  })
  it('reports transport failure once and leaves binary error handling to the downloader', async () => {
    const notify = notification()
    const client = createHttpClient({ notify, adapter: async config => { throw new AxiosError('Connection interrupted', 'ERR_NETWORK', config) } })
    await expect(client.get('/job/list')).rejects.toThrow('Connection interrupted')
    expect(notify.error).toHaveBeenCalledTimes(1)
    await expect(client.get('/instance/downloadLog4Console', { responseType: 'blob' })).rejects.toThrow('Connection interrupted')
    expect(notify.error).toHaveBeenCalledTimes(1)
  })
  it('captures issuing session and app for JSON, upload, binary and explicit namespace requests', async () => {
    const captured = []
    const client = createHttpClient({ adapter: async config => { captured.push(config); return adapter({ success: true, data: [] })(config) } })
    localStorage.setItem('PowerJwt', 'session-a'); localStorage.setItem('Power_appId', '9007199254740993')
    await client.post('/job/list', { appId: '9007199254740993' })
    localStorage.setItem('PowerJwt', 'session-b'); localStorage.setItem('Power_appId', '9007199254740995')
    await client.post('/container/jarUpload', new FormData())
    await client.get('/instance/downloadLog4Console', { responseType: 'blob' })
    await client.post('/namespace/save', {}, { headers: { NamespaceId: '9007199254740997', AppId: '9007199254740999' } })
    expect(captured.map(config => config.headers.get('PowerJwt'))).toEqual(['session-a', 'session-b', 'session-b', 'session-b'])
    expect(captured.map(config => config.headers.get('AppId'))).toEqual(['9007199254740993', '9007199254740995', '9007199254740995', '9007199254740999'])
    expect(captured[3].headers.get('NamespaceId')).toBe('9007199254740997')
  })
  it.each(['text/plain', 'application/octet-stream'])('keeps real %s blob bytes and disposition intact', async type => {
    const blob = new Blob(['真实日志 &+%#\n{"success":false}'], { type })
    const headers = { 'content-type': type, 'content-disposition': "attachment; filename*=UTF-8''log%20%E4%B8%AD%E6%96%87.log" }
    const client = createHttpClient({ adapter: async config => ({ data: blob, config, headers, status: 200 }) })
    const response = await client.get('/instance/downloadLog4Console', { responseType: 'blob' })
    expect(await readLogBlob(response)).toBe(blob)
    expect(response.headers['content-disposition']).toBe(headers['content-disposition'])
    expect(await response.data.text()).toBe(await blob.text())
  })
  it('keeps arraybuffer bytes without interpreting a JSON contract', async () => {
    const data = new Uint8Array([0, 255, 123, 34]).buffer
    const client = createHttpClient({ adapter: async config => ({ data, config, headers: { 'content-type': 'application/octet-stream' }, status: 200 }) })
    expect((await client.get('/binary', { responseType: 'arraybuffer' })).data).toBe(data)
  })
  it('preserves the current session when a temporary registration token expires', async () => {
    const router = { replace: vi.fn() }
    localStorage.setItem('PowerJwt', 'current-session')
    const client = createHttpClient({ router, notify: notification(), adapter: adapter({ success: false, code: -100, message: 'Expired temporary token' }) })
    await expect(client.get('/user/detail', { headers: { PowerJwt: 'temporary-registration' } })).rejects.toThrow('Expired temporary token')
    expect(localStorage.getItem('PowerJwt')).toBe('current-session')
    expect(router.replace).not.toHaveBeenCalled()
  })
  it('preserves a new login when a previous session response arrives late', async () => {
    const router = { replace: vi.fn() }
    localStorage.setItem('PowerJwt', 'previous-session')
    const client = createHttpClient({ router, notify: notification(), adapter: async config => {
      localStorage.setItem('PowerJwt', 'new-session')
      return adapter({ success: false, code: -100, message: 'Previous session expired' })(config)
    } })
    await expect(client.get('/job/list')).rejects.toThrow('Previous session expired')
    expect(localStorage.getItem('PowerJwt')).toBe('new-session')
    expect(router.replace).not.toHaveBeenCalled()
  })
  it.each(['/container/list','container/save'])('preserves container response for %s', async path => {
    const client=createHttpClient({notify:notification(),adapter:adapter({success:true,data:{id:'large-id'}})})
    expect((await client.get(path)).data).toEqual({success:true,data:{id:'large-id'}})
  })
  it('unwraps normal data and rejects unknown contract shapes', async () => {
    expect(await createHttpClient({adapter:adapter({success:true,data:{totalItems:0,data:[]}})}).post('/job/list',{})).toEqual({totalItems:0,data:[]})
    await expect(createHttpClient({notify:notification(),adapter:adapter('not-json')}).get('/job/list')).rejects.toThrow()
  })
  it('leaves blob download response intact even when it is a JSON error', async () => {
    const blob=new Blob(['{"success":false,"message":"No log"}'],{type:'application/json'})
    const client=createHttpClient({notify:notification(),adapter:async config=>({data:blob,headers:{'content-type':'application/json'},config,status:200})})
    const response=await client.get('/instance/downloadLog4Console',{responseType:'blob'})
    expect(response.data).toBe(blob); await expect(readLogBlob(response)).rejects.toThrow('No log')
  })
})

describe('Independent deployments', () => {
  it('supports runtime URL, development proxy and context path WebSocket', () => {
    expect(resolveApiBaseUrl({apiBaseUrl:'https://example.invalid/powerjob/'},{})).toBe('https://example.invalid/powerjob')
    expect(resolveApiBaseUrl({}, {DEV:true})).toBe('/api')
    expect(websocketUrl('/container/deploy/9007199254740993','https://example.invalid:8443/powerjob',{href:'http://localhost/console/'})).toBe('wss://example.invalid:8443/powerjob/container/deploy/9007199254740993')
    expect(websocketUrl('/container/deploy/1','/api',{href:'http://localhost:5173/'})).toBe('ws://localhost:5173/api/container/deploy/1')
  })
  it.each([
    ['/', 'http://localhost:7700/', 'ws://localhost:7700/container/deploy/9007199254740993'],
    ['/powerjob/', 'https://console.example.test:8443/ui/', 'wss://console.example.test:8443/powerjob/container/deploy/9007199254740993'],
    ['api', 'http://localhost:5173/console/', 'ws://localhost:5173/console/api/container/deploy/9007199254740993'],
    ['https://server.example.test:9443/nested/powerjob/', 'http://localhost/', 'wss://server.example.test:9443/nested/powerjob/container/deploy/9007199254740993'],
    ['http://server.example.test:7700', 'https://console.example.test/', 'ws://server.example.test:7700/container/deploy/9007199254740993'],
  ])('preserves API base %s and browser origin %s', (base, href, expected) => {
    expect(websocketUrl('/container/deploy/9007199254740993', base, { href })).toBe(expected)
  })
  it('restores language/application preferences and clears app on switch', () => {
    setActivePinia(createPinia()); const store=useAppStore(); store.selectApplication({id:'9007199254740993',title:'Synthetic app'})
    expect(localStorage.getItem('Power_appId')).toBe('9007199254740993'); expect(store.appInfo.title).toBe('Synthetic app')
    store.clearApplication(); expect(localStorage.getItem('Power_appId')).toBeNull(); expect(store.appInfo).toEqual({})
  })
})

describe('Job editor regression', () => {
  it('creates isolated defaults for every new job', () => {
    const first=newJob('1'); first.alarmConfig.alertThreshold=8; first.logConfig.type=999; first.designatedWorkers='old-worker'
    expect(newJob('1')).toMatchObject({designatedWorkers:'',alarmConfig:{alertThreshold:0},logConfig:{type:1}})
  })
  it('fills missing older-version config without mutating the list row', () => {
    const row={id:'9223372036854775807',jobName:'old',lifeCycle:{start:1000,end:2000},notifyUserIds:[1]}
    const edited=jobForEditor(row,'1'); edited.jobName='edited'
    expect(row.jobName).toBe('old'); expect(edited.lifeCycle).toEqual({start:1000,end:2000}); expect(edited.notifyUserIds).toEqual(['1']); expect(edited.logConfig.type).toBe(1)
  })
  it('converts Element Plus lifecycle timestamps and preserves all advanced fields', () => {
    const form={...newJob('9007199254740993'),id:'9223372036854775807',lifeCycle:['1790700000000','1790800000000'],dispatchStrategy:'SPECIFY',dispatchStrategyConfig:'worker',advancedRuntimeConfig:{taskTrackerBehavior:11},logConfig:{type:999,level:99,loggerName:'custom'},alarmConfig:{alertThreshold:2,statisticWindowLen:3,silenceWindowLen:4}}
    const saved=jobForSave(form)
    expect(saved.lifeCycle).toEqual({start:1790700000000,end:1790800000000}); expect(form.lifeCycle).toEqual(['1790700000000','1790800000000'])
    expect(saved.id).toBe('9223372036854775807'); expect(saved.advancedRuntimeConfig.taskTrackerBehavior).toBe(11); expect(saved.alarmConfig).toEqual(form.alarmConfig); expect(saved.logConfig).toEqual(form.logConfig)
  })
  it('can save historical jobs whose known optional config fields are null', () => {
    const row = { ...newJob('1'), jobName: 'Old API-created job', processorInfo: 'example.Processor', alarmConfig: { alertThreshold: null, statisticWindowLen: null, silenceWindowLen: null, futureSetting: null }, logConfig: { type: null, level: null, loggerName: null }, advancedRuntimeConfig: { taskTrackerBehavior: null, futureOption: false } }
    const editor = jobForEditor(row)
    expect(jobForSave(editor)).toMatchObject({ alarmConfig: { alertThreshold: 0, statisticWindowLen: 0, silenceWindowLen: 0, futureSetting: null }, logConfig: { type: 1, level: 2, loggerName: '' }, advancedRuntimeConfig: { taskTrackerBehavior: 1, futureOption: false } })
    expect(row.alarmConfig.alertThreshold).toBeNull()
  })
  it.each(['API','WORKFLOW','CRON','FIXED_RATE','FIXED_DELAY','DAILY_TIME_INTERVAL'])('validates schedule %s correctly', type => {
    const form={...newJob('1'),jobName:'Synthetic job',processorInfo:'com.example.Processor',timeExpressionType:type}
    expect(validJob(form)).toBe(['API','WORKFLOW'].includes(type)); form.timeExpression='valid-expression'; expect(validJob(form)).toBe(true)
  })
})
