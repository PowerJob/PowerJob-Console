// Native shell components with real Router, Pinia, i18n and Element Plus.
// These are component contracts; responsive browser geometry is verified separately.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import ElementPlus from 'element-plus'
import AppShell from '../src/components/common/AppShell.vue'
import Navbar from '../src/components/bar/Navbar.vue'
import { useAppStore } from '../src/store.js'
import common from '../src/common.js'
import i18n from '../src/i18n/i18n.js'

const mounted = []
const paths = ['/oms/home', '/oms/job', '/oms/instance', '/oms/workflow', '/oms/wfinstance', '/oms/template', '/oms/containermanage', '/oms/workflowEditor', '/oms/wfInstanceDetail', '/admin/app', '/admin/namespace', '/admin/user', '/admin/personal', '/admin/settings', '/loginHomepage']
const Fixture = defineComponent({ name: 'WorkspaceFixture', setup() { const count = ref(0); return { count } }, template: '<section><button class="draft-control" @click="count++">Draft {{ count }}</button></section>' })
function viewport(initial) {
  const listeners = new Set()
  const media = { matches: initial, addEventListener: vi.fn((type, callback) => listeners.add(callback)), removeEventListener: vi.fn((type, callback) => listeners.delete(callback)), set(matches) { media.matches = matches; listeners.forEach(callback => callback({ matches })) }, listeners }
  vi.spyOn(window, 'matchMedia').mockReturnValue(media)
  return media
}
beforeEach(() => { localStorage.clear(); i18n.global.locale.value = 'en'; document.documentElement.lang = 'en' })
afterEach(() => { mounted.splice(0).forEach(wrapper => wrapper.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks() })
async function setup({ mobile = false, path = '/oms/job', admin = false } = {}) {
  const media = viewport(mobile), pinia = createPinia(); setActivePinia(pinia)
  const store = useAppStore(pinia); store.selectApplication({ id: '9007199254740993', title: 'Controlled application' }); localStorage.setItem('PowerJwt', 'synthetic-session')
  const router = createRouter({ history: createMemoryHistory(), routes: paths.map(path => ({ path, component: Fixture })) })
  await router.push(path); await router.isReady()
  const wrapper = mount(AppShell, { attachTo: document.body, props: { admin }, global: { plugins: [pinia, router, i18n, ElementPlus], mocks: { common } } })
  mounted.push(wrapper); await flushPromises()
  return { wrapper, router, store, media }
}
async function command(wrapper, index, label) {
  const dropdown = wrapper.findComponent(Navbar).findAllComponents({ name: 'ElDropdown' })[index]
  dropdown.vm.handleOpen(); await flushPromises()
  const item = [...document.querySelectorAll('.el-dropdown-menu__item')].find(item => item.textContent.trim() === label)
  expect(item, 'The real Element Plus menu command must exist').toBeTruthy()
  await new DOMWrapper(item).trigger('click'); await flushPromises()
}

describe('compact workspace navigation', () => {
  it('collapses desktop navigation without remounting a draft or changing application, session or route', async () => {
    const { wrapper, router, store } = await setup()
    const viewElement = wrapper.find('.draft-control').element
    await wrapper.find('.draft-control').trigger('click')
    const toggle = wrapper.find('.nav-toggle')
    expect(toggle.element.tagName).toBe('BUTTON'); expect(toggle.attributes('aria-controls')).toBe('workspace-navigation'); expect(toggle.attributes('aria-expanded')).toBe('true')
    await toggle.trigger('click')
    expect(wrapper.classes()).toContain('nav-collapsed'); expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.attributes('aria-label')).toBe(i18n.global.t('message.expandNavigation'))
    expect(wrapper.find('.app-nav a[href="/oms/job"]').attributes('aria-label')).toBe(i18n.global.t('message.tabJobManage'))
    expect(wrapper.find('.app-nav a[href="/oms/job"]').attributes('title')).toBe(i18n.global.t('message.tabJobManage'))
    expect(wrapper.find('.draft-control').element).toBe(viewElement); expect(wrapper.find('.draft-control').text()).toBe('Draft 1')
    expect(store.appInfo.id).toBe('9007199254740993'); expect(localStorage.getItem('PowerJwt')).toBe('synthetic-session'); expect(localStorage.getItem('Power_appId')).toBe('9007199254740993'); expect(router.currentRoute.value.path).toBe('/oms/job')
    await toggle.trigger('click'); expect(wrapper.classes()).not.toContain('nav-collapsed'); expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('.app-nav a[href="/oms/job"]').attributes('title')).toBeUndefined()
  })
  it.each([['/oms/workflowEditor', '/oms/workflow'], ['/oms/wfInstanceDetail', '/oms/wfinstance']])('preserves active parent navigation on %s', async (path, active) => {
    const { wrapper } = await setup({ path })
    expect(wrapper.findAll('.app-nav [aria-current="page"]').map(link => link.attributes('href'))).toEqual([active])
  })
  it('preserves the five administration destinations and removes framework/version decorations', async () => {
    const { wrapper } = await setup({ path: '/admin/app', admin: true })
    expect(wrapper.findAll('.app-nav nav a').map(link => link.attributes('href'))).toEqual(['/admin/app', '/admin/namespace', '/admin/user', '/admin/personal', '/admin/settings'])
    expect(wrapper.find('.nav-footer').exists()).toBe(false); expect(wrapper.find('.console-version').exists()).toBe(false); expect(wrapper.text()).not.toContain('Vue 3')
    expect(wrapper.find('.brand').attributes('aria-label')).toBe('PowerJob Console')
    expect(wrapper.find('.application-tag').exists()).toBe(false)
  })
  it('keeps a closed mobile drawer inert, traps Tab when open, and restores the toggle focus after Escape', async () => {
    const { wrapper } = await setup({ mobile: true })
    const navigation = wrapper.find('.app-nav'), toggle = wrapper.find('.nav-toggle')
    expect(navigation.attributes('inert')).toBeDefined(); expect(navigation.attributes('role')).toBeUndefined()
    toggle.element.focus(); await toggle.trigger('click'); await flushPromises()
    expect(wrapper.classes()).toContain('nav-open'); expect(navigation.attributes('inert')).toBeUndefined(); expect(navigation.attributes('role')).toBe('dialog'); expect(navigation.attributes('aria-modal')).toBe('true')
    expect(document.activeElement).toBe(navigation.find('[aria-current="page"]').element)
    const first = navigation.find('a'), last = navigation.findAll('nav a').at(-1)
    first.element.focus(); await first.trigger('keydown', { key: 'Tab', shiftKey: true }); expect(document.activeElement).toBe(last.element)
    await last.trigger('keydown', { key: 'Tab' }); expect(document.activeElement).toBe(first.element)
    await first.trigger('keydown', { key: 'Escape' }); await flushPromises()
    expect(wrapper.classes()).not.toContain('nav-open'); expect(navigation.attributes('inert')).toBeDefined(); expect(document.activeElement).toBe(toggle.element); expect(toggle.attributes('aria-expanded')).toBe('false')
  })
  it.each(['.nav-close', '.nav-scrim'])('closes the mobile drawer via %s and returns focus without changing application', async selector => {
    const { wrapper, store, router } = await setup({ mobile: true })
    const toggle = wrapper.find('.nav-toggle'); await toggle.trigger('click'); await flushPromises()
    await wrapper.find(selector).trigger('click'); await flushPromises()
    expect(wrapper.classes()).not.toContain('nav-open'); expect(document.activeElement).toBe(toggle.element); expect(store.appInfo.id).toBe('9007199254740993'); expect(router.currentRoute.value.path).toBe('/oms/job')
  })
  it('closes the drawer after a real navigation link while preserving the requested route and current application', async () => {
    const { wrapper, router, store } = await setup({ mobile: true })
    await wrapper.find('.nav-toggle').trigger('click'); await wrapper.find('.app-nav nav a[href="/oms/instance"]').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.path).toBe('/oms/instance'); expect(wrapper.classes()).not.toContain('nav-open'); expect(store.appInfo.id).toBe('9007199254740993')
  })
  it('preserves desktop collapse across viewport changes, closes the mobile drawer on desktop, and removes its viewport listener', async () => {
    const { wrapper, media } = await setup()
    await wrapper.find('.nav-toggle').trigger('click'); media.set(true); await flushPromises()
    expect(wrapper.classes()).not.toContain('nav-collapsed'); expect(wrapper.find('.app-nav').attributes('inert')).toBeDefined()
    await wrapper.find('.nav-toggle').trigger('click'); expect(wrapper.classes()).toContain('nav-open')
    media.set(false); await flushPromises()
    expect(wrapper.classes()).toContain('nav-collapsed'); expect(wrapper.classes()).not.toContain('nav-open'); expect(wrapper.find('.app-nav').attributes('inert')).toBeUndefined()
    expect(media.listeners.size).toBe(1); wrapper.unmount(); mounted.splice(mounted.indexOf(wrapper), 1); expect(media.listeners.size).toBe(0)
  })
  it('moves skip-link keyboard focus into main without corrupting the hash-router route', async () => {
    const { wrapper, router } = await setup({ path: '/oms/workflowEditor' })
    await wrapper.find('.skip-link').trigger('click')
    expect(document.activeElement).toBe(wrapper.find('#main-content').element); expect(router.currentRoute.value.path).toBe('/oms/workflowEditor')
  })
})

describe('unchanged header commands', () => {
  it('dispatches the actual language menu into existing locale storage without changing application or session', async () => {
    const { wrapper, store, router } = await setup()
    await command(wrapper, 0, '简体中文')
    expect(i18n.global.locale.value).toBe('cn'); expect(document.documentElement.lang).toBe('zh-CN'); expect(localStorage.getItem('oms_lang')).toBe('cn')
    expect(store.appInfo.id).toBe('9007199254740993'); expect(localStorage.getItem('PowerJwt')).toBe('synthetic-session'); expect(router.currentRoute.value.path).toBe('/oms/job')
    await command(wrapper, 0, 'English'); expect(i18n.global.locale.value).toBe('en'); expect(localStorage.getItem('oms_lang')).toBe('en')
  })
  it('opens the existing profile route without clearing a valid selected application or JWT', async () => {
    const { wrapper, store, router } = await setup()
    await command(wrapper, 1, i18n.global.t('message.tabPersonal'))
    expect(router.currentRoute.value.path).toBe('/admin/personal'); expect(store.appInfo.id).toBe('9007199254740993'); expect(localStorage.getItem('PowerJwt')).toBe('synthetic-session')
  })
  it('returns to the application list and clears only the application context', async () => {
    const { wrapper, store, router } = await setup()
    await command(wrapper, 1, i18n.global.t('message.back2Home'))
    expect(router.currentRoute.value.path).toBe('/admin/app'); expect(store.appInfo).toEqual({}); expect(localStorage.getItem('Power_appId')).toBeNull(); expect(localStorage.getItem('PowerJwt')).toBe('synthetic-session')
  })
  it('logs out through the real account menu and preserves the language preference', async () => {
    const { wrapper, store, router } = await setup(); localStorage.setItem('oms_lang', 'en')
    await command(wrapper, 1, i18n.global.t('message.logout'))
    expect(router.currentRoute.value.path).toBe('/loginHomepage'); expect(store.appInfo).toEqual({}); expect(localStorage.getItem('PowerJwt')).toBeNull(); expect(localStorage.getItem('Power_appName')).toBeNull(); expect(localStorage.getItem('oms_lang')).toBe('en')
  })
})
