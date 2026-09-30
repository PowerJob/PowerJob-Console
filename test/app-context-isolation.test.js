// @vitest-environment happy-dom
// Real App/AppShell/JobManager lifecycle with controlled deferred Server responses.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createI18n } from 'vue-i18n'
import ElementPlus from 'element-plus'
import App from '../src/App.vue'
import AppShell from '../src/components/common/AppShell.vue'
import JobManager from '../src/components/views/JobManager.vue'
import LoginHomepage from '../src/components/login/LoginHomepage.vue'
import PjIcon from '../src/components/common/PjIcon.vue'
import { useAppStore } from '../src/store.js'
import { newJob } from '../src/services/jobs.js'
const mounted = []
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
const page = name => ({ pageSize: 10, totalItems: 1, data: [{ ...newJob(name), id: name + '-job-id', jobName: name + ' job', processorInfo: 'fixture.Processor' }] })
beforeEach(() => { localStorage.clear() })
afterEach(() => { mounted.splice(0).forEach(wrapper => wrapper.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks() })
async function setup() {
  const pinia = createPinia(); setActivePinia(pinia)
  const store = useAppStore(pinia); store.selectApplication({ id: 'A', appName: 'Application A' }); localStorage.setItem('PowerJwt', 'session-A')
  const pendingA = deferred(), pendingB = deferred()
  const captured = []
  const axios = {
    get: vi.fn(async url => url === '/auth/ifLogin' ? { id: 'account-B' } : []),
    post: vi.fn((url, body) => { captured.push({ url, body: JSON.parse(JSON.stringify(body)) }); return String(body.appId) === 'A' ? pendingA.promise : pendingB.promise })
  }
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/oms', component: AppShell, children: [{ path: 'job', component: JobManager }] },
    { path: '/loginHomepage', component: LoginHomepage },
    { path: '/admin/app', component: { template: '<div class="new-account-view">New account restored</div>' } },
    { path: '/:pathMatch(.*)*', component: { template: '<div>Inactive route</div>' } }
  ] })
  await router.push('/oms/job'); await router.isReady()
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: {} }, missingWarn: false, fallbackWarn: false })
  const wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia, router, i18n, ElementPlus], components: { PjIcon }, mocks: { axios, $t: key => key, $message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() }, common: { switchLanguage: vi.fn(), timestamp2Str: String, translateInstanceStatus: String } } } })
  mounted.push(wrapper); await flushPromises()
  return { wrapper, store, router, axios, captured, pendingA, pendingB }
}
describe('actual native App shell isolates async request contexts', () => {
  it('remounts the real Job view for another application and isolates the late old response', async () => {
    const { wrapper, store, captured, pendingA, pendingB } = await setup()
    const oldView = wrapper.findComponent(JobManager)
    expect(captured.filter(item => item.url === '/job/list').map(item => item.body.appId)).toEqual(['A'])
    store.selectApplication({ id: 'B', appName: 'Application B' }); await flushPromises()
    expect(wrapper.findComponent(JobManager).vm).not.toBe(oldView.vm)
    expect(captured.filter(item => item.url === '/job/list').map(item => item.body.appId)).toEqual(['A', 'B'])
    pendingB.resolve(page('B')); await flushPromises(); expect(wrapper.text()).toContain('B job')
    pendingA.resolve(page('A')); await flushPromises()
    expect(wrapper.text()).toContain('B job'); expect(wrapper.text()).not.toContain('A job')
    expect(wrapper.findComponent(JobManager).vm.jobInfoPageResult.data[0].id).toBe('B-job-id')
    expect(wrapper.find('.application-tag').text()).toBe('Application B')
  })
  it('unmounts old-account views on actual storage event and ignores their late response after restoring the new session', async () => {
    const { wrapper, store, router, pendingA } = await setup()
    localStorage.setItem('PowerJwt', 'session-B'); localStorage.setItem('Power_appId', 'B'); localStorage.setItem('Power_appName', 'Application B')
    window.dispatchEvent(new StorageEvent('storage', { key: 'PowerJwt', storageArea: localStorage, oldValue: 'session-A', newValue: 'session-B' }))
    await flushPromises()
    expect(store.sessionRevision).toBe(1)
    expect(wrapper.findComponent(JobManager).exists()).toBe(false)
    expect(router.currentRoute.value.path).toBe('/admin/app')
    expect(wrapper.find('.new-account-view').exists()).toBe(true)
    pendingA.resolve(page('A')); await flushPromises()
    expect(wrapper.text()).not.toContain('A job'); expect(wrapper.find('.new-account-view').exists()).toBe(true)
    expect(localStorage.getItem('PowerJwt')).toBe('session-B')
    expect(localStorage.getItem('Power_appId')).toBe('B')
    expect(store.appInfo.id).toBe('B')
  })
})
