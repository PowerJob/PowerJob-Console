// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from '../src/store.js'
import { installStorageSync } from '../src/services/storage-sync.js'
beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()) })
function setup(path = '/oms/job') {
  const target = new EventTarget(), store = useAppStore()
  const router = { replace: vi.fn(async () => {}), currentRoute: { value: { path } } }
  const dispose = installStorageSync({ target, store, router })
  const emit = key => { const event = new Event('storage'); Object.assign(event, { key, storageArea: localStorage }); target.dispatchEvent(event) }
  return { store, router, emit, dispose }
}
describe('native browser shared-storage synchronization', () => {
  it('restores legacy application IDs as strings without rewriting storage', () => {
    localStorage.setItem('Power_appId', '9007199254740993'); localStorage.setItem('Power_appName', '中文 app')
    const { store, router } = setup()
    expect(store.appInfo).toEqual({ id: '9007199254740993', title: '中文 app', appName: '中文 app' })
    expect(router.replace).not.toHaveBeenCalled()
  })
  it('discards account views after another tab login without clearing that tab new application', () => {
    const { store, router, emit } = setup()
    store.selectApplication({ id: 'old-app', title: 'old' })
    localStorage.setItem('PowerJwt', 'new-account'); localStorage.setItem('Power_appId', 'new-app'); localStorage.setItem('Power_appName', 'New app')
    emit('PowerJwt')
    expect(store.appInfo).toEqual({}); expect(store.sessionRevision).toBe(1)
    expect(router.replace).toHaveBeenCalledWith('/loginHomepage')
    expect(localStorage.getItem('PowerJwt')).toBe('new-account'); expect(localStorage.getItem('Power_appId')).toBe('new-app')
  })
  it('restores another tab selected application and reacts to a cleared OMS context', () => {
    const { store, router, emit } = setup()
    localStorage.setItem('Power_appId', 'second'); localStorage.setItem('Power_appName', 'second title'); emit('Power_appId')
    expect(store.appInfo.id).toBe('second'); expect(router.replace).not.toHaveBeenCalled()
    localStorage.setItem('Power_appName', 'renamed'); emit('Power_appName'); expect(store.appInfo.title).toBe('renamed')
    localStorage.removeItem('Power_appId'); emit('Power_appId'); expect(store.appInfo).toEqual({}); expect(router.replace).toHaveBeenCalledWith('/admin/app')
  })
  it('rechecks logout or storage.clear and removes its listener on unmount', () => {
    const { store, router, emit, dispose } = setup('/admin/personal')
    emit('PowerJwt'); emit(null); expect(store.sessionRevision).toBe(2); expect(router.replace).toHaveBeenCalledTimes(2)
    dispose(); emit('PowerJwt'); expect(store.sessionRevision).toBe(2)
  })
  it('ignores unrelated preferences and other storage areas', () => {
    const { store, emit } = setup(); emit('oms_lang'); expect(store.sessionRevision).toBe(0)
  })
})
