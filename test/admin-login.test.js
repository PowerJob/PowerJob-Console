// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import ElementPlus, { ElPagination, ElSelect, ElSwitch } from 'element-plus'
import { createPinia, setActivePinia } from 'pinia'
import AppManager from '../src/components/admin/AppManager.vue'
import NamespaceManager from '../src/components/admin/NamespaceManager.vue'
import UserManager from '../src/components/admin/UserManager.vue'
import UserCenter from '../src/components/admin/UserCenter.vue'
import Settings from '../src/components/admin/Settings.vue'
import LoginHomepage from '../src/components/login/LoginHomepage.vue'
import PowerJobThirdPartyLogin from '../src/components/login/PowerJobThirdPartyLogin.vue'
import UserRole from '../src/components/common/UserRole.vue'
import { useAppStore } from '../src/store.js'

const page = { data: [], totalItems: 0, pageSize: 10 }
const users = [{ id: '9007199254740993', username: 'PWJB_qa', showName: 'QA', enable: true }]
const namespaces = [{ id: '9007199254740995', showName: 'Regression namespace' }]
const user = {
  id: '9007199254740993', username: 'PWJB_qa', originUsername: 'qa', accountType: 'PWJB',
  nick: 'QA', phone: '', email: '', webHook: '', globalRoles: ['ADMIN'],
  role2NamespaceList: {}, role2AppList: {}
}
const mounted = []
const deferred = () => {
  let resolve, reject
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}
const createAxios = () => {
  const profile = { ...user }
  return {
  get: vi.fn(async url => {
    if (url === '/user/list') return users.map(item => ({ ...item }))
    if (url === '/user/detail') return { ...profile }
    if (url === '/auth/listGlobalAdmin') return ['9007199254740993']
    if (url === '/auth/supportLoginTypes') return [{ type: 'PWJB', name: 'PowerJob account' }]
    if (url === '/auth/ifLogin') return null
    return { jwtToken: 'test-token' }
  }),
  post: vi.fn(async (url, payload) => {
    if (url === '/appInfo/list' || url === '/namespace/list') return { ...page, data: [] }
    if (url === '/namespace/listAll') return namespaces
    if (url === '/user/query') return users.map(item => ({ ...item }))
    if (url === '/auth/thirdPartyLoginDirect') return { jwtToken: 'test-token' }
    if (url === '/user/modify') Object.assign(profile, payload)
    return {}
  }),
  delete: vi.fn(async () => ({}))
  }
}
function mountPage(component, axios = createAxios(), props = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const message = { success: vi.fn(), error: vi.fn(), warning: vi.fn() }
  const router = { push: vi.fn(async () => {}) }
  const confirm = vi.fn(async () => true)
  const wrapper = mount(component, {
    props,
    attachTo: document.body,
    global: {
      plugins: [pinia, ElementPlus],
      stubs: { RouterLink: RouterLinkStub },
      mocks: { axios, $t: key => key, $message: message, $router: router, $confirm: confirm }
    }
  })
  mounted.push(wrapper)
  return { wrapper, axios, message, router, confirm, store: useAppStore(pinia) }
}
beforeEach(() => {
  localStorage.clear()
  window.history.replaceState({}, '', '/')
})
afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})
async function ready(component, axios, props) {
  const context = mountPage(component, axios, props)
  await flushPromises()
  context.axios.post.mockClear()
  context.axios.delete.mockClear()
  context.router.push.mockClear()
  return context
}

describe('admin list request ordering', () => {
  const domains = [
    ['app', AppManager, 'listApps', 'appResult', false],
    ['namespace', NamespaceManager, 'listNamespaces', 'namespaceResult', false],
    ['user', UserManager, 'listUser', 'userListResult', true]
  ]
  it.each(domains)('%s keeps loading while a newer query is pending after the older query resolves', async (_domain, component, method, resultKey, arrayResult) => {
    const { wrapper, axios } = await ready(component)
    const original = JSON.parse(JSON.stringify(wrapper.vm[resultKey]))
    const old = deferred(), next = deferred()
    axios.post.mockImplementationOnce(() => old.promise).mockImplementationOnce(() => next.promise)
    const older = wrapper.vm[method](), newer = wrapper.vm[method]()
    old.resolve(arrayResult ? [{ id: 'old' }] : { ...page, totalItems: 99, data: [{ id: 'old' }] })
    await older; await flushPromises()
    expect(wrapper.vm.loading).toBe(true)
    expect(wrapper.vm[resultKey]).toEqual(original)
    next.resolve(arrayResult ? [{ id: 'new' }] : { ...page, totalItems: 0, data: [] })
    await newer; await flushPromises()
    expect(wrapper.vm.loading).toBe(false)
    expect(arrayResult ? wrapper.vm[resultKey] : wrapper.vm[resultKey].data).toEqual(arrayResult ? [{ id: 'new' }] : [])
    if (!arrayResult) expect(wrapper.vm[resultKey].totalItems).toBe(0)
  })
  it.each(domains)('%s keeps the newest empty query when the old nonempty response arrives late', async (_domain, component, method, resultKey, arrayResult) => {
    const { wrapper, axios } = await ready(component)
    const old = deferred(), next = deferred()
    axios.post.mockImplementationOnce(() => old.promise).mockImplementationOnce(() => next.promise)
    const older = wrapper.vm[method](), newer = wrapper.vm[method]()
    next.resolve(arrayResult ? [] : { ...page, totalItems: 0, data: [] })
    await newer; await flushPromises()
    old.resolve(arrayResult ? [{ id: 'old' }] : { ...page, totalItems: 99, data: [{ id: 'old' }] })
    await older; await flushPromises()
    expect(arrayResult ? wrapper.vm[resultKey] : wrapper.vm[resultKey].data).toEqual([])
    if (!arrayResult) expect(wrapper.vm[resultKey].totalItems).toBe(0)
    expect(wrapper.vm.loading).toBe(false)
    expect(wrapper.find('.el-table__empty-block').exists()).toBe(true)
  })
  it.each(domains)('%s suppresses errors and loading changes from an obsolete rejected query', async (_domain, component, method, _resultKey, arrayResult) => {
    const { wrapper, axios, message } = await ready(component)
    const old = deferred(), next = deferred()
    axios.post.mockImplementationOnce(() => old.promise).mockImplementationOnce(() => next.promise)
    const older = wrapper.vm[method](), newer = wrapper.vm[method]()
    old.reject(new Error('Obsolete query failed'))
    await older; await flushPromises()
    expect(wrapper.vm.loading).toBe(true)
    expect(message.error).not.toHaveBeenCalled()
    next.resolve(arrayResult ? [] : { ...page, data: [] })
    await newer; await flushPromises()
    expect(wrapper.vm.loading).toBe(false)
  })
})

describe('application management contract', () => {
  it('renders safely before async lists have returned', async () => {
    const pending = deferred()
    const axios = createAxios()
    axios.post.mockImplementation(() => pending.promise)
    const { wrapper } = mountPage(AppManager, axios)
    expect(wrapper.vm.appResult).toEqual(page)
    expect(wrapper.vm.loading).toBe(true)
    pending.resolve({ ...page })
    await flushPromises()
    expect(wrapper.vm.loading).toBe(false)
  })
  it('sends every query filter and maps page 2 to Server index 1 without coercing 64-bit IDs', async () => {
    const { wrapper, axios } = await ready(AppManager)
    Object.assign(wrapper.vm.queryAppRequest, {
      appId: '9007199254740993', namespaceId: '9007199254740995', appNameLike: '中文 + %',
      tagLike: 'tag,second', showMyRelated: false
    })
    await wrapper.vm.onClickChangePage(2)
    expect(axios.post).toHaveBeenCalledWith('/appInfo/list', {
      appId: '9007199254740993', namespaceId: '9007199254740995', appNameLike: '中文 + %',
      tagLike: 'tag,second', showMyRelated: false, index: 1, pageSize: 10
    })
    await wrapper.vm.searchApps()
    expect(wrapper.vm.queryAppRequest.index).toBe(0)
    await wrapper.vm.onClickReset()
    expect(wrapper.vm.queryAppRequest).toEqual({
      appId: undefined, namespaceId: undefined, appNameLike: undefined, tagLike: undefined,
      showMyRelated: true, index: 0, pageSize: 10
    })
  })
  it('ignores an older list response after a newer search finishes', async () => {
    const { wrapper, axios } = await ready(AppManager)
    const older = deferred(), newer = deferred()
    axios.post.mockImplementationOnce(() => older.promise).mockImplementationOnce(() => newer.promise)
    const a = wrapper.vm.listApps()
    wrapper.vm.queryAppRequest.appNameLike = 'new'
    const b = wrapper.vm.listApps()
    newer.resolve({ ...page, data: [{ id: 'new' }] })
    await b
    older.resolve({ ...page, data: [{ id: 'old' }] })
    await a
    expect(wrapper.vm.appResult.data).toEqual([{ id: 'new' }])
    expect(wrapper.vm.loading).toBe(false)
  })
  it('edits incomplete historical permissions safely and creates independent role arrays', async () => {
    const { wrapper } = await ready(AppManager)
    const source = { id: '42', appName: 'legacy', componentUserRoleInfo: { admin: ['7'] } }
    wrapper.vm.onClickModify(source)
    expect(wrapper.vm.user_rule_form).toEqual({ observer: [], qa: [], developer: [], admin: ['7'] })
    wrapper.vm.user_rule_form.admin.push('8')
    expect(source.componentUserRoleInfo.admin).toEqual(['7'])
    wrapper.vm.onClickNewApps()
    expect(wrapper.vm.modifiedAppForm.namespaceId).toBeUndefined()
    expect(wrapper.vm.user_rule_form.admin).toEqual([])
  })
  it('validates required app fields before sending a save request', async () => {
    const { wrapper, axios } = await ready(AppManager)
    wrapper.vm.onClickNewApps()
    await flushPromises()
    await wrapper.vm.onClickSaveApp()
    expect(axios.post).not.toHaveBeenCalled()
    expect(wrapper.vm.modifiedAppFormVisible).toBe(true)
    expect(wrapper.vm.saving).toBe(false)
  })
  it('preserves all save fields, roles and AppId and only closes after success', async () => {
    const { wrapper, axios, message } = await ready(AppManager)
    wrapper.vm.onClickModify({
      id: '9007199254740993', appName: 'application', namespaceId: namespaces[0].id, password: 'secret',
      title: '中文 title', tags: 'one,two', extra: '{"enabled":true}', componentUserRoleInfo: { developer: ['21'] }
    })
    await flushPromises()
    await wrapper.vm.onClickSaveApp()
    expect(axios.post).toHaveBeenCalledWith('/appInfo/save', expect.objectContaining({
      id: '9007199254740993', appName: 'application', namespaceId: namespaces[0].id, password: 'secret',
      title: '中文 title', tags: 'one,two', extra: '{"enabled":true}',
      componentUserRoleInfo: { observer: [], qa: [], developer: ['21'], admin: [] }
    }), { headers: { 'Content-Type': 'application/json', AppId: '9007199254740993' } })
    expect(message.success).toHaveBeenCalled()
    expect(wrapper.vm.modifiedAppFormVisible).toBe(false)
  })
  it('retains the editor and entered data after save failure and prevents duplicate submission', async () => {
    const { wrapper, axios, message } = await ready(AppManager)
    wrapper.vm.onClickModify({ id: '11', appName: 'app', namespaceId: '1', password: 'secret' })
    await flushPromises()
    const pending = deferred()
    axios.post.mockImplementationOnce(() => pending.promise)
    const first = wrapper.vm.onClickSaveApp()
    const second = wrapper.vm.onClickSaveApp()
    await flushPromises()
    expect(axios.post.mock.calls.filter(([url]) => url === '/appInfo/save')).toHaveLength(1)
    pending.reject(new Error('save failed'))
    await Promise.all([first, second])
    expect(wrapper.vm.modifiedAppFormVisible).toBe(true)
    expect(wrapper.vm.modifiedAppForm.appName).toBe('app')
    expect(wrapper.vm.saving).toBe(false)
    expect(message.error).toHaveBeenCalledWith('save failed')
  })
  it('keeps delete cancel side-effect-free and preserves editor on an API failure', async () => {
    const { wrapper, axios, confirm, message } = await ready(AppManager)
    wrapper.vm.onClickModify({ id: '9', appName: 'app' })
    confirm.mockRejectedValueOnce('cancel')
    await wrapper.vm.onClickDeleteApp()
    expect(axios.post).not.toHaveBeenCalled()
    axios.post.mockRejectedValueOnce(new Error('delete failed'))
    await wrapper.vm.onClickDeleteApp()
    expect(axios.post).toHaveBeenCalledWith('/appInfo/delete?appId=9', {}, {
      headers: { 'Content-Type': 'application/json', AppId: '9' }
    })
    expect(wrapper.vm.modifiedAppFormVisible).toBe(true)
    expect(message.error).toHaveBeenCalledWith('delete failed')
  })
  it('enters an application through Pinia and preserves the persistent string ID', async () => {
    const { wrapper, store, router } = await ready(AppManager)
    await wrapper.vm.onClickEnter({ id: '9007199254740993', appName: 'regression' })
    expect(store.appInfo).toEqual({ id: '9007199254740993', appName: 'regression' })
    expect(localStorage.getItem('Power_appId')).toBe('9007199254740993')
    expect(router.push).toHaveBeenCalledWith('/oms/home')
  })
  it('keeps application management reachable when a previous application is selected', async () => {
    localStorage.setItem('Power_appId', '9007199254740993')
    localStorage.setItem('Power_appName', 'previous-application')
    const { wrapper, axios, router } = mountPage(AppManager)
    await flushPromises()
    expect(router.push).not.toHaveBeenCalled()
    expect(axios.post).toHaveBeenCalledWith('/appInfo/list', expect.any(Object))
    expect(axios.post).toHaveBeenCalledWith('/namespace/listAll', expect.any(Object))
    expect(localStorage.getItem('Power_appId')).toBe('9007199254740993')
    await wrapper.vm.onClickEnter({ id: '9007199254740995', appName: 'explicit-selection' })
    expect(router.push).toHaveBeenCalledWith('/oms/home')
    expect(localStorage.getItem('Power_appId')).toBe('9007199254740995')
  })
  it('clears the persisted selection when deleting the currently selected application', async () => {
    const { wrapper, store } = await ready(AppManager)
    store.selectApplication({ id: '9', appName: 'removed' })
    wrapper.vm.onClickModify({ id: '9', appName: 'removed' })
    await wrapper.vm.onClickDeleteApp()
    expect(localStorage.getItem('Power_appId')).toBeNull()
    expect(store.appInfo).toEqual({})
  })
})

describe('namespace management contract', () => {
  it('sends every query filter, paginates, searches and resets', async () => {
    const { wrapper, axios } = await ready(NamespaceManager)
    Object.assign(wrapper.vm.queryNamespaceRequest, { codeLike: 'code', nameLike: '名称', tagLike: 'tag' })
    await wrapper.vm.onClickChangePage(3)
    expect(axios.post).toHaveBeenCalledWith('/namespace/list', { codeLike: 'code', nameLike: '名称', tagLike: 'tag', index: 2, pageSize: 10 })
    await wrapper.vm.searchNamespaces()
    expect(wrapper.vm.queryNamespaceRequest.index).toBe(0)
    await wrapper.vm.onClickReset()
    expect(wrapper.vm.queryNamespaceRequest.codeLike).toBeUndefined()
  })
  it('accepts absent historical roles and isolates editing from the table row', async () => {
    const { wrapper } = await ready(NamespaceManager)
    wrapper.vm.onClickModify({ id: '10', code: 'legacy' })
    expect(wrapper.vm.user_rule_form).toEqual({ observer: [], qa: [], developer: [], admin: [] })
    wrapper.vm.onClickNewNamespace()
    expect(wrapper.vm.modifiedNamespaceForm.token).toBe('')
  })
  it('rejects empty code through the real Element Plus form', async () => {
    const { wrapper, axios } = await ready(NamespaceManager)
    wrapper.vm.onClickNewNamespace()
    await flushPromises()
    await wrapper.vm.onClickSaveNamespace()
    expect(axios.post).not.toHaveBeenCalled()
    expect(wrapper.vm.saving).toBe(false)
  })
  it('preserves metadata, role payload and NamespaceId header on save', async () => {
    const { wrapper, axios } = await ready(NamespaceManager)
    wrapper.vm.onClickModify({ id: '9007199254740993', code: 'team', name: '团队', token: 'masked',
      tags: 'one,two', status: 1, extra: '{}', componentUserRoleInfo: { qa: ['6'] } })
    await flushPromises()
    await wrapper.vm.onClickSaveNamespace()
    expect(axios.post).toHaveBeenCalledWith('/namespace/save', expect.objectContaining({
      code: 'team', name: '团队', tags: 'one,two', status: 1, extra: '{}',
      componentUserRoleInfo: { observer: [], qa: ['6'], developer: [], admin: [] }
    }), { headers: { 'Content-Type': 'application/json', NamespaceId: '9007199254740993' } })
    expect(wrapper.vm.modifiedNamespaceFormVisible).toBe(false)
  })
  it('preserves the namespace editor on save rejection and releases loading', async () => {
    const { wrapper, axios, message } = await ready(NamespaceManager)
    wrapper.vm.onClickModify({ id: '2', code: 'namespace' })
    await flushPromises()
    axios.post.mockRejectedValueOnce(new Error('not permitted'))
    await wrapper.vm.onClickSaveNamespace()
    expect(wrapper.vm.modifiedNamespaceFormVisible).toBe(true)
    expect(wrapper.vm.saving).toBe(false)
    expect(message.error).toHaveBeenCalledWith('not permitted')
  })
  it('confirms delete and passes the string ID without deleting on cancellation', async () => {
    const { wrapper, axios, confirm } = await ready(NamespaceManager)
    const data = { id: '9007199254740993', name: 'namespace' }
    confirm.mockRejectedValueOnce('cancel')
    await wrapper.vm.onClickDeleteNamespace(data)
    expect(axios.delete).not.toHaveBeenCalled()
    await wrapper.vm.onClickDeleteNamespace(data)
    expect(axios.delete).toHaveBeenCalledWith('/namespace/delete?id=9007199254740993', {
      headers: { 'Content-Type': 'application/json', NamespaceId: '9007199254740993' }
    })
    expect(wrapper.vm.deletingId).toBeNull()
  })
})

describe('user management, role selection and global administrators', () => {
  it('paginates the existing Array response locally, resets on search and keeps the Server request unchanged', async () => {
    const axios = createAxios()
    const directory = Array.from({ length: 11 }, (_, index) => ({ id: String(index + 1), username: 'User ' + (index + 1), enable: true }))
    axios.post.mockResolvedValue(directory)
    const { wrapper } = await ready(UserManager, axios)
    expect(wrapper.vm.userListResult).toHaveLength(11)
    expect(wrapper.vm.visibleUsers).toHaveLength(10)
    await wrapper.findComponent(ElPagination).vm.$emit('update:current-page', 2)
    await flushPromises()
    expect(wrapper.vm.visibleUsers.map(item => item.id)).toEqual(['11'])
    expect(axios.post).not.toHaveBeenCalled()
    wrapper.vm.queryUserRequest.nickLike = 'filter'
    await wrapper.vm.searchUser()
    expect(wrapper.vm.currentPage).toBe(1)
    expect(axios.post).toHaveBeenCalledWith('/user/query', { userIdEq: undefined, nickLike: 'filter', phoneLike: undefined })
    wrapper.vm.currentPage = 2
    await wrapper.vm.onClickReset()
    expect(wrapper.vm.currentPage).toBe(1)
  })
  it('retains a legal local page on refresh and clamps pages when the result shrinks', async () => {
    const { wrapper, axios } = await ready(UserManager)
    const directory = Array.from({ length: 11 }, (_, index) => ({ id: String(index + 1), username: 'User ' + (index + 1), enable: true }))
    wrapper.vm.userListResult = directory
    wrapper.vm.currentPage = 2
    axios.post.mockResolvedValueOnce(directory)
    await wrapper.vm.listUser()
    expect(wrapper.vm.currentPage).toBe(2)
    axios.post.mockResolvedValueOnce([directory[0]])
    await wrapper.vm.listUser()
    expect(wrapper.vm.currentPage).toBe(1)
    expect(wrapper.vm.visibleUsers).toEqual([directory[0]])
  })
  it('queries and resets all user filters', async () => {
    const { wrapper, axios } = await ready(UserManager)
    wrapper.vm.queryUserRequest = { userIdEq: '9007199254740993', nickLike: '中文', phoneLike: '123' }
    await wrapper.vm.listUser()
    expect(axios.post).toHaveBeenCalledWith('/user/query', { userIdEq: '9007199254740993', nickLike: '中文', phoneLike: '123' })
    await wrapper.vm.onClickReset()
    expect(wrapper.vm.queryUserRequest).toEqual({ userIdEq: undefined, nickLike: undefined, phoneLike: undefined })
  })
  it.each([[true, 'disable'], [false, 'enable']])('changes an enabled=%s user using the existing %s endpoint', async (enabled, action) => {
    const { wrapper, axios } = await ready(UserManager)
    expect(await wrapper.vm.changeUserStatus({ id: '9007199254740993', enable: enabled })).toBe(true)
    expect(axios.post).toHaveBeenCalledWith('/user/' + action + '?uid=9007199254740993')
  })
  it('leaves the actual Element Plus switch unchanged when the status request fails', async () => {
    const { wrapper, axios, message } = await ready(UserManager)
    axios.post.mockRejectedValueOnce(new Error('status denied'))
    const toggle = wrapper.findComponent(ElSwitch)
    await toggle.trigger('click')
    await flushPromises()
    expect(wrapper.vm.userListResult[0].enable).toBe(true)
    expect(toggle.props('modelValue')).toBe(true)
    expect(wrapper.vm.statusLoading).toEqual({})
    expect(message.error).toHaveBeenCalledWith('status denied')
  })
  it('prevents concurrent status requests for the same user', async () => {
    const { wrapper, axios } = await ready(UserManager)
    const pending = deferred()
    axios.post.mockImplementationOnce(() => pending.promise)
    const data = { id: '9', enable: true }
    const first = wrapper.vm.changeUserStatus(data)
    expect(await wrapper.vm.changeUserStatus(data)).toBe(false)
    expect(axios.post).toHaveBeenCalledTimes(1)
    pending.resolve({})
    expect(await first).toBe(true)
  })
  it('loads the user directory and emits a new role object without mutating props', async () => {
    const roles = { observer: ['1'], qa: [], developer: [], admin: [] }
    const { wrapper, axios } = await ready(UserRole, undefined, { userRuleForm: roles })
    expect(axios.get).toHaveBeenCalledWith('/user/list')
    expect(wrapper.findAllComponents(ElSelect)).toHaveLength(4)
    wrapper.vm.updateRole('developer', ['9007199254740993'])
    expect(wrapper.emitted('update:userRuleForm')[0][0]).toEqual({ ...roles, developer: ['9007199254740993'] })
    expect(roles.developer).toEqual([])
  })
  it('loads existing global administrators and sends exactly the admin array', async () => {
    const { wrapper, axios } = await ready(Settings)
    expect(wrapper.vm.adminUserIds).toEqual(['9007199254740993'])
    wrapper.vm.adminUserIds.push('7')
    await wrapper.vm.saveGlobalAdmins()
    expect(axios.post).toHaveBeenCalledWith('/auth/saveGlobalAdmin', { admin: ['9007199254740993', '7'] })
  })
  it('prevents saving an empty replacement after administrator loading has failed', async () => {
    const axios = createAxios()
    axios.get.mockImplementation(async url => {
      if (url === '/auth/listGlobalAdmin') throw new Error('load denied')
      return users
    })
    const { wrapper, message } = await ready(Settings, axios)
    expect(wrapper.vm.adminsLoaded).toBe(false)
    await wrapper.vm.saveGlobalAdmins()
    expect(axios.post).not.toHaveBeenCalled()
    expect(wrapper.vm.loading).toBe(false)
    expect(message.error).toHaveBeenCalledWith('load denied')
  })
  it('rejects an empty loaded global administrator selection before any API write', async () => {
    const { wrapper, axios, message } = await ready(Settings)
    expect(wrapper.vm.adminsLoaded).toBe(true)
    wrapper.vm.adminUserIds = []
    await wrapper.vm.saveGlobalAdmins()
    expect(axios.post).not.toHaveBeenCalled()
    expect(wrapper.vm.saving).toBe(false)
    expect(message.warning).toHaveBeenCalledWith('message.requiredField')
  })
  it('keeps the selected global administrators after save failure', async () => {
    const { wrapper, axios } = await ready(Settings)
    axios.post.mockRejectedValueOnce(new Error('save failed'))
    await wrapper.vm.saveGlobalAdmins()
    expect(wrapper.vm.adminUserIds).toEqual(['9007199254740993'])
    expect(wrapper.vm.saving).toBe(false)
  })
})

describe('profile, password change and application administrator assertion', () => {
  it('loads personal details, preserves identity fields and reads the modified profile back', async () => {
    const { wrapper, axios } = await ready(UserCenter)
    wrapper.vm.userDetailInfo.nick = 'Updated 名称'
    await wrapper.vm.onClickSaveNewUserInfo()
    expect(axios.post).toHaveBeenCalledWith('/user/modify', expect.objectContaining({
      id: '9007199254740993', username: 'PWJB_qa', originUsername: 'qa', nick: 'Updated 名称',
      globalRoles: ['ADMIN'], accountType: 'PWJB'
    }))
    expect(axios.get.mock.calls.filter(([url]) => url === '/user/detail')).toHaveLength(2)
  })
  it('prevents profile save when details failed to load', async () => {
    const axios = createAxios()
    axios.get.mockRejectedValue(new Error('read failed'))
    const { wrapper } = await ready(UserCenter, axios)
    await wrapper.vm.onClickSaveNewUserInfo()
    expect(axios.post).not.toHaveBeenCalled()
    expect(wrapper.vm.loading).toBe(false)
    expect(wrapper.vm.userLoaded).toBe(false)
  })
  it('retains the edited profile after readback fails and never reports success', async () => {
    const { wrapper, axios, message } = await ready(UserCenter)
    wrapper.vm.userDetailInfo.nick = 'saved pending verification'
    axios.get.mockRejectedValueOnce(new Error('readback failed'))
    await wrapper.vm.onClickSaveNewUserInfo()
    expect(wrapper.vm.userDetailInfo.nick).toBe('saved pending verification')
    expect(message.success).not.toHaveBeenCalled()
    expect(message.error).toHaveBeenCalledWith('readback failed')
    expect(wrapper.vm.saving).toBe(false)
  })
  it('reports Server 5.1.x ignored empty profile fields instead of showing false success', async () => {
    const { wrapper, axios, message } = await ready(UserCenter)
    wrapper.vm.userDetailInfo.nick = ''
    axios.get.mockResolvedValueOnce({ ...user, nick: 'QA' })
    await wrapper.vm.onClickSaveNewUserInfo()
    expect(wrapper.vm.userDetailInfo.nick).toBe('')
    expect(message.success).not.toHaveBeenCalled()
    expect(message.error).toHaveBeenCalledWith('message.profileUpdateMismatch')
  })
  it('clears old password input each time the password dialog opens', async () => {
    const { wrapper } = await ready(UserCenter)
    wrapper.vm.changePasswordRequest.oldPassword = 'old'
    wrapper.vm.onClickChangePassword()
    expect(wrapper.vm.changePasswordRequest).toEqual({ username: 'qa', oldPassword: '', newPassword: '', newPassword2: '' })
  })
  it('validates blank and mismatched passwords before submitting', async () => {
    const { wrapper, axios, message } = await ready(UserCenter)
    wrapper.vm.onClickChangePassword()
    await flushPromises()
    await wrapper.vm.submitChangePasswordRequest()
    expect(axios.post).not.toHaveBeenCalled()
    Object.assign(wrapper.vm.changePasswordRequest, { oldPassword: 'old', newPassword: 'new', newPassword2: 'different' })
    await wrapper.vm.submitChangePasswordRequest()
    expect(axios.post).not.toHaveBeenCalled()
    expect(message.warning).toHaveBeenCalledWith('message.passwordMismatch')
    expect(wrapper.vm.changingPassword).toBe(false)
  })
  it('preserves the password protocol and clears both token and application after success', async () => {
    const { wrapper, axios, router, store } = await ready(UserCenter)
    localStorage.setItem('PowerJwt', 'previous-token')
    store.selectApplication({ id: '9', appName: 'app' })
    wrapper.vm.onClickChangePassword()
    Object.assign(wrapper.vm.changePasswordRequest, { oldPassword: 'old', newPassword: 'new', newPassword2: 'new' })
    await flushPromises()
    await wrapper.vm.submitChangePasswordRequest()
    expect(axios.post).toHaveBeenCalledWith('/pwjbUser/changePassword', { username: 'qa', oldPassword: 'old', newPassword: 'new', newPassword2: 'new' })
    expect(localStorage.getItem('PowerJwt')).toBeNull()
    expect(localStorage.getItem('Power_appId')).toBeNull()
    expect(router.push).toHaveBeenCalledWith('/')
    expect(wrapper.vm.changePasswordFormVisible).toBe(false)
  })
  it('keeps token, application and password dialog on password change failure', async () => {
    const { wrapper, axios } = await ready(UserCenter)
    localStorage.setItem('PowerJwt', 'previous-token')
    localStorage.setItem('Power_appId', '9')
    wrapper.vm.onClickChangePassword()
    Object.assign(wrapper.vm.changePasswordRequest, { oldPassword: 'old', newPassword: 'new', newPassword2: 'new' })
    await flushPromises()
    axios.post.mockRejectedValueOnce(new Error('wrong old password'))
    await wrapper.vm.submitChangePasswordRequest()
    expect(localStorage.getItem('PowerJwt')).toBe('previous-token')
    expect(localStorage.getItem('Power_appId')).toBe('9')
    expect(wrapper.vm.changePasswordFormVisible).toBe(true)
    expect(wrapper.vm.changingPassword).toBe(false)
  })
  it('validates and sends app administrator credentials, then refreshes grants', async () => {
    const { wrapper, axios } = await ready(UserCenter)
    await wrapper.vm.onClickAuthThenBecomeAdmin()
    expect(axios.post).not.toHaveBeenCalled()
    wrapper.vm.appAssertRequest = { appName: 'app', password: 'shared-password' }
    await wrapper.vm.onClickAuthThenBecomeAdmin()
    expect(axios.post).toHaveBeenCalledWith('/appInfo/becomeAdmin', { appName: 'app', password: 'shared-password' })
    expect(wrapper.vm.appAssertRequest.password).toBe('')
    expect(axios.get.mock.calls.filter(([url]) => url === '/user/detail')).toHaveLength(2)
  })
})

describe('authentication and registration contract', () => {
  it.each([true, false])('ignores a late old-session check when a new account has logged in (rejected=%s)', async reject => {
    const { wrapper, axios, router, store } = await ready(LoginHomepage)
    router.push.mockClear()
    localStorage.setItem('PowerJwt', 'old-account')
    const pending = deferred()
    axios.get.mockImplementationOnce(() => pending.promise)
    const check = wrapper.vm.tryLogin()
    localStorage.setItem('PowerJwt', 'new-account')
    store.selectApplication({ id: 'new-app', appName: 'New app' })
    if (reject) pending.reject(new Error('Old session expired'))
    else pending.resolve({ id: 'old-account' })
    await check
    expect(localStorage.getItem('PowerJwt')).toBe('new-account')
    expect(store.appInfo.id).toBe('new-app')
    expect(router.push).not.toHaveBeenCalled()
  })
  it('clears old application state when the HTTP layer has already removed an expired checked token', async () => {
    const { wrapper, axios, store } = await ready(LoginHomepage)
    localStorage.setItem('PowerJwt', 'expired-account')
    store.selectApplication({ id: 'expired-app', appName: 'Expired app' })
    axios.get.mockImplementationOnce(async () => { localStorage.removeItem('PowerJwt'); throw new Error('Expired') })
    await wrapper.vm.tryLogin()
    expect(store.appInfo).toEqual({})
    expect(localStorage.getItem('Power_appId')).toBeNull()
  })
  it('clears a previous account application on direct login while preserving a restored session selection', async () => {
    const { wrapper, store } = await ready(PowerJobThirdPartyLogin)
    store.selectApplication({ id: 'other-account-app', appName: 'Previous application' })
    wrapper.vm.login_info = { username: 'next-user', password: 'password' }
    await wrapper.vm.doLogin()
    expect(store.appInfo).toEqual({})
    expect(localStorage.getItem('Power_appId')).toBeNull()
    expect(localStorage.getItem('Power_appName')).toBeNull()
    const existing = await ready(LoginHomepage)
    existing.store.selectApplication({ id: 'same-account-app', appName: 'Current application' })
    existing.axios.get.mockResolvedValueOnce({ id: 'same-account-user' })
    await existing.wrapper.vm.tryLogin()
    expect(existing.store.appInfo.id).toBe('same-account-app')
  })
  it.each([null, undefined])('clears the current token and old application when Server ifLogin returns no identity (%s)', async identity => {
    const { wrapper, axios, store, router } = await ready(LoginHomepage)
    localStorage.setItem('PowerJwt', 'expired-current-token')
    store.selectApplication({ id: 'old-app', appName: 'Old application' })
    axios.get.mockResolvedValueOnce(identity)
    await wrapper.vm.tryLogin()
    expect(localStorage.getItem('PowerJwt')).toBeNull()
    expect(localStorage.getItem('Power_appId')).toBeNull()
    expect(localStorage.getItem('Power_appName')).toBeNull()
    expect(store.appInfo).toEqual({})
    expect(router.push).not.toHaveBeenCalled()
  })
  it('clears an old application only after a valid callback issues a new session', async () => {
    const { wrapper, store, axios } = await ready(LoginHomepage)
    store.selectApplication({ id: 'old-app', appName: 'Old application' })
    window.history.replaceState({}, '', '/?code=valid')
    axios.get.mockResolvedValueOnce({ jwtToken: 'new-account-token' })
    await wrapper.vm.callbackLogin()
    expect(store.appInfo).toEqual({})
    expect(localStorage.getItem('Power_appName')).toBeNull()
    expect(localStorage.getItem('PowerJwt')).toBe('new-account-token')
  })
  it('loads login methods, checks existing sessions and preserves FE redirect paths', async () => {
    const { wrapper, axios, router } = await ready(LoginHomepage)
    expect(axios.get).toHaveBeenCalledWith('/auth/supportLoginTypes')
    expect(axios.get).toHaveBeenCalledWith('/auth/ifLogin')
    axios.get.mockResolvedValueOnce('FE-REDIRECT:/powerjobLogin?target=a:b')
    await wrapper.vm.onClickLoginTypeBottom({ type: 'PWJB + 中文' })
    expect(axios.get).toHaveBeenCalledWith('/auth/thirdPartyLoginUrl?type=PWJB%20%2B%20%E4%B8%AD%E6%96%87')
    expect(router.push).toHaveBeenCalledWith('/powerjobLogin?target=a:b')
  })
  it('re-encodes callback values and never issues a concurrent stale-session request', async () => {
    window.history.replaceState({}, '', '/?code=a%2Bb%26c%3Dd&state=%E4%B8%AD%E6%96%87#%2FloginHomepage')
    const pending = deferred()
    const axios = createAxios()
    axios.get.mockImplementation(url => url.startsWith('/auth/thirdPartyLoginCallback') ? pending.promise : Promise.resolve([]))
    const { wrapper, router } = mountPage(LoginHomepage, axios)
    await flushPromises()
    const request = axios.get.mock.calls.find(([url]) => url.startsWith('/auth/thirdPartyLoginCallback'))[0]
    const params = new URLSearchParams(request.split('?')[1])
    expect(params.get('code')).toBe('a+b&c=d')
    expect(params.get('state')).toBe('中文')
    expect(axios.get).not.toHaveBeenCalledWith('/auth/ifLogin')
    pending.resolve({ jwtToken: 'callback-token' })
    await flushPromises()
    expect(localStorage.getItem('PowerJwt')).toBe('callback-token')
    expect(router.push).toHaveBeenCalledWith('/admin/app')
    expect(window.location.search).toBe('')
    expect(wrapper.vm.authLoading).toBe(false)
  })
  it.each([
    {
      raw: 'code=%E4%B8%AD%E6%96%87%26%2B%3D%25%23&state=first%26%2B%3D%25%23&state=second%2B&empty=&missing&plus=+&literalPlus=%2B',
      encoded: 'code=%E4%B8%AD%E6%96%87%26%2B%3D%25%23&state=first%26%2B%3D%25%23&state=second%2B&empty=&missing=&plus=+&literalPlus=%2B',
      entries: [['code', '中文&+=%#'], ['state', 'first&+=%#'], ['state', 'second+'], ['empty', ''], ['missing', ''], ['plus', ' '], ['literalPlus', '+']]
    },
    {
      raw: '=blank&code=&state=%2526%252B%253D%2525%2523&state=',
      encoded: '=blank&code=&state=%2526%252B%253D%2525%2523&state=',
      entries: [['', 'blank'], ['code', ''], ['state', '%26%2B%3D%25%23'], ['state', '']]
    }
  ])('preserves callback ordered repeated keys, empty values and reserved Unicode exactly: $raw', async ({ raw, encoded, entries }) => {
    window.history.replaceState({}, '', '/?' + raw + '#/loginHomepage')
    const axios = createAxios(), originalGet = axios.get.getMockImplementation()
    axios.get.mockImplementation(url => url.startsWith('/auth/thirdPartyLoginCallback') ? Promise.resolve({ jwtToken: 'callback-fixture' }) : originalGet(url))
    const { router } = mountPage(LoginHomepage, axios)
    await flushPromises()
    expect(axios.get.mock.calls.filter(([url]) => url.startsWith('/auth/thirdPartyLoginCallback'))).toEqual([['/auth/thirdPartyLoginCallback?' + encoded]])
    expect([...new URLSearchParams(encoded).entries()]).toEqual(entries)
    expect(axios.get).not.toHaveBeenCalledWith('/auth/ifLogin')
    expect(localStorage.getItem('PowerJwt')).toBe('callback-fixture')
    expect(router.push).toHaveBeenCalledExactlyOnceWith('/admin/app')
    expect(window.location.search).toBe('')
  })
  it('reports callback failure without falling through to stale-session login', async () => {
    window.history.replaceState({}, '', '/?code=bad')
    const axios = createAxios()
    axios.get.mockImplementation(async url => {
      if (url.startsWith('/auth/thirdPartyLoginCallback')) throw new Error('callback rejected')
      return []
    })
    const { wrapper, message, router } = await ready(LoginHomepage, axios)
    expect(message.error).toHaveBeenCalledWith('callback rejected')
    expect(axios.get).not.toHaveBeenCalledWith('/auth/ifLogin')
    expect(router.push).not.toHaveBeenCalled()
    expect(wrapper.vm.authLoading).toBe(false)
  })
  it('rejects an invalid callback result instead of persisting undefined as a token', async () => {
    window.history.replaceState({}, '', '/?code=bad')
    const axios = createAxios()
    axios.get.mockResolvedValue([])
    const { message } = await ready(LoginHomepage, axios)
    expect(localStorage.getItem('PowerJwt')).toBeNull()
    expect(message.error).toHaveBeenCalled()
  })
  it('clears failed existing sessions and restores login-method loading after failures', async () => {
    localStorage.setItem('PowerJwt', 'stale')
    localStorage.setItem('Power_appId', '9')
    const axios = createAxios()
    axios.get.mockRejectedValue(new Error('unauthenticated'))
    const { wrapper } = await ready(LoginHomepage, axios)
    expect(localStorage.getItem('PowerJwt')).toBeNull()
    expect(localStorage.getItem('Power_appId')).toBeNull()
    expect(wrapper.vm.authLoading).toBe(false)
    expect(wrapper.vm.loadingTypes).toBe(false)
  })
  it('validates empty direct-login fields and sends the unchanged PWJB credential envelope', async () => {
    const { wrapper, axios, router } = await ready(PowerJobThirdPartyLogin)
    await wrapper.vm.doLogin()
    expect(axios.post).not.toHaveBeenCalled()
    wrapper.vm.login_info = { username: 'user + 中文', password: ' password spaces ' }
    await wrapper.vm.doLogin()
    expect(axios.post).toHaveBeenCalledWith('/auth/thirdPartyLoginDirect', {
      loginType: 'PWJB', originParams: JSON.stringify({ username: 'user + 中文', password: ' password spaces ', encryption: 'none' })
    })
    expect(localStorage.getItem('PowerJwt')).toBe('test-token')
    expect(router.push).toHaveBeenCalledWith('/admin/app')
  })
  it('releases direct-login loading on rejection and prevents duplicate requests', async () => {
    const { wrapper, axios, message } = await ready(PowerJobThirdPartyLogin)
    wrapper.vm.login_info = { username: 'qa', password: 'password' }
    const pending = deferred()
    axios.post.mockImplementationOnce(() => pending.promise)
    const first = wrapper.vm.doLogin()
    await wrapper.vm.doLogin()
    expect(axios.post).toHaveBeenCalledTimes(1)
    pending.reject(new Error('credentials rejected'))
    await first
    expect(wrapper.vm.loginLoading).toBe(false)
    expect(message.error).toHaveBeenCalledWith('credentials rejected')
  })
  it('rejects invalid direct-login response without token persistence', async () => {
    const { wrapper, axios, router } = await ready(PowerJobThirdPartyLogin)
    wrapper.vm.login_info = { username: 'qa', password: 'password' }
    axios.post.mockResolvedValueOnce({})
    await wrapper.vm.doLogin()
    expect(localStorage.getItem('PowerJwt')).toBeNull()
    expect(router.push).not.toHaveBeenCalled()
  })
  it('validates blank or mismatched registration fields before account creation', async () => {
    const { wrapper, axios, message } = await ready(PowerJobThirdPartyLogin)
    wrapper.vm.openRegister()
    await flushPromises()
    await wrapper.vm.registerUser()
    expect(axios.post).not.toHaveBeenCalled()
    Object.assign(wrapper.vm.userRegisterForm, { username: 'qa', password: 'one', password2: 'two' })
    await wrapper.vm.registerUser()
    expect(axios.post).not.toHaveBeenCalled()
    expect(message.warning).toHaveBeenCalledWith('message.passwordMismatch')
  })
  it('preserves registration fields, bootstraps the Server user without logging in and clears password fields', async () => {
    const { wrapper, axios, router } = await ready(PowerJobThirdPartyLogin)
    wrapper.vm.openRegister()
    const form = { username: 'qa', nick: '测试', phone: '123', email: 'qa@example.test', webHook: 'https://example.test/hook', password: 'one', password2: 'one' }
    Object.assign(wrapper.vm.userRegisterForm, form)
    await wrapper.vm.registerUser()
    expect(axios.post).toHaveBeenNthCalledWith(1, '/pwjbUser/create', form)
    expect(axios.post).toHaveBeenNthCalledWith(2, '/auth/thirdPartyLoginDirect', {
      loginType: 'PWJB', originParams: JSON.stringify({ username: 'qa', password: 'one', encryption: 'none' })
    })
    expect(axios.post).toHaveBeenNthCalledWith(3, '/user/modify', {
      id: '9007199254740993', nick: '测试', phone: '123', email: 'qa@example.test', webHook: 'https://example.test/hook'
    }, { headers: { PowerJwt: 'test-token' } })
    expect(axios.get).toHaveBeenCalledWith('/user/detail', { headers: { PowerJwt: 'test-token' } })
    expect(axios.get.mock.calls.filter(([url]) => url === '/user/detail')).toHaveLength(2)
    expect(localStorage.getItem('PowerJwt')).toBeNull()
    expect(router.push).not.toHaveBeenCalled()
    expect(wrapper.vm.userRegisterFormVisible).toBe(false)
    expect(wrapper.vm.userRegisterForm.password).toBe('')
    expect(wrapper.vm.login_info.username).toBe('qa')
  })
  it('preserves a pre-existing session during registration profile initialization', async () => {
    const { wrapper, axios } = await ready(PowerJobThirdPartyLogin)
    localStorage.setItem('PowerJwt', 'previous-session')
    localStorage.setItem('Power_appId', '9')
    wrapper.vm.openRegister()
    Object.assign(wrapper.vm.userRegisterForm, { username: 'new-user', password: 'one', password2: 'one', nick: 'New user' })
    await wrapper.vm.registerUser()
    expect(axios.post).toHaveBeenCalledWith('/user/modify', expect.objectContaining({ nick: 'New user' }), { headers: { PowerJwt: 'test-token' } })
    expect(localStorage.getItem('PowerJwt')).toBe('previous-session')
    expect(localStorage.getItem('Power_appId')).toBe('9')
  })
  it('reports profile initialization failure as an already-created account and prevents duplicate creation', async () => {
    const { wrapper, axios, message } = await ready(PowerJobThirdPartyLogin)
    wrapper.vm.openRegister()
    Object.assign(wrapper.vm.userRegisterForm, { username: 'new-user', password: 'one', password2: 'one', nick: 'New user' })
    axios.post.mockResolvedValueOnce({}).mockResolvedValueOnce({ jwtToken: 'new-token' }).mockRejectedValueOnce(new Error('profile update failed'))
    await wrapper.vm.registerUser()
    expect(wrapper.vm.registrationNotice).toBe('message.registrationProfileIncomplete')
    expect(wrapper.vm.userRegisterFormVisible).toBe(false)
    expect(wrapper.vm.userRegisterForm.password).toBe('')
    expect(wrapper.vm.login_info.username).toBe('new-user')
    expect(message.success).not.toHaveBeenCalled()
    expect(message.error).toHaveBeenCalledWith('profile update failed')
    const count = axios.post.mock.calls.length
    wrapper.vm.openRegister()
    Object.assign(wrapper.vm.userRegisterForm, { username: 'new-user', password: 'one', password2: 'one' })
    await wrapper.vm.registerUser()
    expect(axios.post).toHaveBeenCalledTimes(count)
  })
  it('detects profile readback mismatch instead of reporting a false successful registration', async () => {
    const { wrapper, axios, message } = await ready(PowerJobThirdPartyLogin)
    wrapper.vm.openRegister()
    Object.assign(wrapper.vm.userRegisterForm, { username: 'qa', password: 'one', password2: 'one', nick: 'requested nickname' })
    axios.get.mockResolvedValueOnce(user).mockResolvedValueOnce({ ...user, nick: '' })
    await wrapper.vm.registerUser()
    expect(wrapper.vm.registrationNotice).toBe('message.registrationProfileIncomplete')
    expect(message.success).not.toHaveBeenCalled()
  })
  it('keeps account-creation failure editable and closes a committed account before bootstrap failure', async () => {
    const { wrapper, axios, message } = await ready(PowerJobThirdPartyLogin)
    wrapper.vm.openRegister()
    Object.assign(wrapper.vm.userRegisterForm, { username: 'qa', password: 'one', password2: 'one' })
    axios.post.mockRejectedValueOnce(new Error('username exists'))
    await wrapper.vm.registerUser()
    expect(wrapper.vm.userRegisterFormVisible).toBe(true)
    expect(wrapper.vm.registerLoading).toBe(false)
    axios.post.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('bootstrap failed'))
    await wrapper.vm.registerUser()
    expect(wrapper.vm.userRegisterFormVisible).toBe(false)
    expect(wrapper.vm.registerLoading).toBe(false)
    expect(message.error).toHaveBeenCalledWith('bootstrap failed')
  })
})
