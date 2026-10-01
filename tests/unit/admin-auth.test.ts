import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import Applications from '../../src/features/admin/Applications.vue'
import Namespaces from '../../src/features/admin/Namespaces.vue'
import Users from '../../src/features/admin/Users.vue'
import Profile from '../../src/features/admin/Profile.vue'
import Settings from '../../src/features/admin/Settings.vue'
import RolePicker from '../../src/features/admin/RolePicker.vue'
import AuthLanding from '../../src/features/auth/AuthLanding.vue'
import AuthForm from '../../src/features/auth/AuthForm.vue'
import { editableApplication, editableNamespace, emptyRoles, validIdentifier } from '../../src/features/admin/contracts'
import { callbackPath, directLoginBody } from '../../src/features/auth/contracts'
import { useQuery } from '../../src/features/admin/useQuery'
import { session, selectApp, signOut } from '../../src/core/session'
import { setLocale } from '../../src/core/ui'

const mocks = vi.hoisted(() => ({ api: vi.fn(), push: vi.fn(), replace: vi.fn(), toast: vi.fn(), confirm: vi.fn() }))
vi.mock('../../src/core/api', () => ({ api: mocks.api }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push, replace: mocks.replace }) }))
vi.mock('../../src/core/ui', async importOriginal => ({ ...await importOriginal<typeof import('../../src/core/ui')>(), toast: mocks.toast, confirmAction: mocks.confirm }))

const wrappers: VueWrapper[] = []
function render(component: object) { const wrapper = mount(component, { attachTo: document.body, global: { stubs: { RouterLink: { template: '<a><slot/></a>' } } } }); wrappers.push(wrapper); return wrapper }
function field(scope: VueWrapper | DOMWrapper<Element>, label: string) {
  const box = scope.findAll('.field').find(value => value.find('.field-label').text().replace(/\s*\*$/, '') === label)
  if (!box) throw new Error('Missing field: ' + label)
  return box.find('input,select,textarea')
}
function button(scope: VueWrapper | DOMWrapper<Element>, text: string) {
  const found = scope.findAll('button').find(value => value.text() === text)
  if (!found) throw new Error('Missing button: ' + text)
  return found
}
function dialog() { const element = document.querySelector('dialog[open]'); if (!element) throw new Error('Missing open dialog'); return new DOMWrapper(element) }
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const user = { id: '9007199254740993', username: 'PWJB_fixture', originUsername: 'fixture', showName: 'Fixture', accountType: 'PWJB', nick: 'old', phone: '123', email: 'old@example.invalid', webHook: '', extra: '{"legacy":false}', globalRoles: ['ADMIN'] }
const app = { id: '9007199254740995', appName: 'owned', namespaceId: '9007199254740997', password: 'synthetic', title: 'Description', tags: 'tag', extra: '{"future":0}', future: { enabled: false }, componentUserRoleInfo: { ...emptyRoles(), admin: [user.id] } }
const ns = { id: app.namespaceId, code: 'owned_ns', name: 'Owned', showName: 'Owned(owned_ns)', token: 'synthetic-token', status: 2, dept: 'legacy', extra: '{"future":false}', componentUserRoleInfo: emptyRoles() }
function defaultApi(path: string) {
  if (path === '/user/list') return Promise.resolve([user])
  if (path === '/namespace/listAll') return Promise.resolve([ns])
  if (path === '/appInfo/list') return Promise.resolve({ data: [app], totalItems: 1 })
  if (path === '/namespace/list') return Promise.resolve({ data: [ns], totalItems: 1 })
  if (path === '/user/query') return Promise.resolve([{ ...user, enable: true }])
  if (path === '/user/detail') return Promise.resolve({ ...user })
  if (path === '/auth/listGlobalAdmin') return Promise.resolve([user.id])
  if (path === '/auth/supportLoginTypes') return Promise.resolve([{ type: 'PWJB', name: 'PowerJobAccount' }])
  if (path === '/auth/ifLogin') return Promise.resolve(null)
  return Promise.resolve(null)
}
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.open = true } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.open = false } })
})
beforeEach(() => { vi.clearAllMocks(); signOut(); localStorage.clear(); session.revision++; setLocale('en'); history.replaceState(null, '', '/'); mocks.api.mockImplementation(defaultApi); mocks.confirm.mockResolvedValue(false) })
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); document.body.innerHTML = '' })

describe('lossless admin drafts and latest queries', () => {
  it('keeps opaque fields and legacy status while isolating role arrays and new forms', () => {
    const edited = editableApplication(app); edited.componentUserRoleInfo.admin.push('2')
    expect(app.componentUserRoleInfo.admin).toEqual([user.id]); expect(edited.future).toEqual({ enabled: false })
    const space = editableNamespace(ns); expect(space.status).toBe(2); expect(space.dept).toBe('legacy'); expect(space.extra).toBe('{"future":false}')
  })
  it.each(['', 'with space', 'line\nbreak', '\tname'])('rejects invalid identifier %j', value => expect(validIdentifier(value)).toBe(false))
  it('accepts unicode identifiers without trimming or coercing their value', () => expect(validIdentifier('调度_日本')).toBe(true))
  it('does not let an older resolved response or finally overwrite the newest query', async () => {
    const one = deferred<string>(); const two = deferred<string>(); let query!: ReturnType<typeof useQuery<string>>
    render(defineComponent({ setup() { query = useQuery('initial'); return () => null } }))
    const first = query.run(() => one.promise); const second = query.run(() => two.promise)
    one.resolve('stale'); await first; expect(query.data.value).toBe('initial'); expect(query.loading.value).toBe(true)
    two.resolve('fresh'); await second; expect(query.data.value).toBe('fresh'); expect(query.loading.value).toBe(false)
  })
  it('ignores stale errors and responses arriving after unmount', async () => {
    const one = deferred<string>(); const two = deferred<string>(); let query!: ReturnType<typeof useQuery<string>>
    const wrapper = render(defineComponent({ setup() { query = useQuery('initial'); return () => null } }))
    const first = query.run(() => one.promise); const second = query.run(() => two.promise)
    one.reject(new Error('stale failure')); await first; expect(query.error.value).toBe('')
    wrapper.unmount(); two.resolve('late'); await second; expect(query.data.value).toBe('initial')
  })
})

describe('native applications and namespaces', () => {
  it.each([{ component: Applications, path: '/appInfo/list', stale: { data: [app], totalItems: 1 }, fresh: { data: [], totalItems: 0 } }, { component: Namespaces, path: '/namespace/list', stale: { data: [ns], totalItems: 1 }, fresh: { data: [], totalItems: 0 } }, { component: Users, path: '/user/query', stale: [user], fresh: [] }])('the actual $path page rejects an initial response arriving after a submitted query', async ({ component, path, stale, fresh }) => {
    const old = deferred<any>(); const latest = deferred<any>(); let count = 0
    mocks.api.mockImplementation((endpoint: string) => endpoint === path ? ++count === 1 ? old.promise : latest.promise : defaultApi(endpoint))
    const wrapper = render(component); await flushPromises(); await wrapper.find('form').trigger('submit'); latest.resolve(fresh); await flushPromises(); expect(wrapper.findAll('tbody tr')).toHaveLength(0)
    old.resolve(stale); await flushPromises(); expect(wrapper.findAll('tbody tr')).toHaveLength(0); expect(wrapper.find('.loading-line').exists()).toBe(false)
  })
  it('shows applications without automatic entry, explicitly selects the exact lossless ID', async () => {
    selectApp({ id: '77', appName: 'previous' }); const wrapper = render(Applications); await flushPromises()
    expect(mocks.push).not.toHaveBeenCalled(); await button(wrapper, 'Enter').trigger('click')
    expect(session.appId).toBe(app.id); expect(mocks.push).toHaveBeenCalledWith('/oms/home')
  })
  it('submits all application filters, resets page and defaults', async () => {
    const wrapper = render(Applications); await flushPromises()
    await field(wrapper, 'Application ID').setValue('9007199254740999'); await field(wrapper, 'Application name').setValue('测试 & +'); await field(wrapper, 'Tags').setValue('future'); await wrapper.find('form').trigger('submit'); await flushPromises()
    expect(mocks.api).toHaveBeenLastCalledWith('/appInfo/list', expect.objectContaining({ body: expect.objectContaining({ appId: '9007199254740999', appNameLike: '测试 & +', tagLike: 'future', index: 0 }) }))
    await button(wrapper, 'Reset').trigger('click'); await flushPromises(); expect(mocks.api).toHaveBeenLastCalledWith('/appInfo/list', expect.objectContaining({ body: expect.objectContaining({ appId: undefined, showMyRelated: true, index: 0 }) }))
  })
  it('saves an edited application to its own header, preserving opaque values without changing its row', async () => {
    selectApp({ id: '77', appName: 'another' }); const wrapper = render(Applications); await flushPromises(); await button(wrapper, 'Edit').trigger('click'); await flushPromises()
    expect(field(dialog(), 'Application name').attributes('readonly')).toBeDefined(); await field(dialog(), 'Description').setValue('New description'); await dialog().find('form').trigger('submit'); await flushPromises()
    const saved = mocks.api.mock.calls.find(([path]) => path === '/appInfo/save')![1]
    expect(saved.headers.AppId).toBe(app.id); expect(saved.body).toMatchObject({ title: 'New description', extra: app.extra, future: app.future }); expect(app.title).toBe('Description')
  })
  it('fresh application forms reset previous data and block empty save without API writes', async () => {
    const wrapper = render(Applications); await flushPromises(); await button(wrapper, 'Edit').trigger('click'); await flushPromises(); await button(dialog(), 'Cancel').trigger('click'); await button(wrapper, 'New application').trigger('click'); await flushPromises()
    expect(field(dialog(), 'Application name').element).toHaveProperty('value', ''); await dialog().find('form').trigger('submit'); await flushPromises(); expect(mocks.api.mock.calls.filter(([path]) => path === '/appInfo/save')).toHaveLength(0)
  })
  it('reveals application passwords explicitly, then masks the next editor without saving or mutating its row', async () => {
    const wrapper = render(Applications); await flushPromises(); await button(wrapper, 'Edit').trigger('click'); await flushPromises()
    expect(field(dialog(), 'Application password').attributes('type')).toBe('password'); expect(field(dialog(), 'Application password').element).toHaveProperty('value', app.password)
    await button(dialog(), 'Show').trigger('click'); expect(field(dialog(), 'Application password').attributes('type')).toBe('text'); expect(button(dialog(), 'Hide').attributes('aria-pressed')).toBe('true')
    await button(dialog(), 'Hide').trigger('click'); expect(field(dialog(), 'Application password').attributes('type')).toBe('password')
    await button(dialog(), 'Show').trigger('click'); await button(dialog(), 'Cancel').trigger('click'); await button(wrapper, 'Edit').trigger('click'); await flushPromises()
    expect(field(dialog(), 'Application password').attributes('type')).toBe('password'); expect(field(dialog(), 'Application password').element).toHaveProperty('value', app.password)
    await button(dialog(), 'Cancel').trigger('click'); await button(wrapper, 'New application').trigger('click'); await flushPromises(); expect(field(dialog(), 'Application password').attributes('type')).toBe('password'); expect(field(dialog(), 'Application password').element).toHaveProperty('value', '')
    expect(mocks.api.mock.calls.filter(([path]) => path === '/appInfo/save')).toHaveLength(0); expect(app.password).toBe('synthetic')
  })
  it('cancelled app deletion sends no request, and rejection retains the dialog and selected app', async () => {
    selectApp(app); const wrapper = render(Applications); await flushPromises(); await button(wrapper, 'Edit').trigger('click'); await flushPromises(); await button(dialog(), 'Delete').trigger('click'); await flushPromises(); expect(mocks.api.mock.calls.filter(([path]) => path === '/appInfo/delete')).toHaveLength(0)
    mocks.confirm.mockResolvedValue(true); mocks.api.mockImplementation((path: string) => path === '/appInfo/delete' ? Promise.reject(new Error('live workers')) : defaultApi(path)); await button(dialog(), 'Delete').trigger('click'); await flushPromises(); expect(dialog().text()).toContain('live workers'); expect(session.appId).toBe(app.id)
  })
  it('deleting the selected application clears app context only after success', async () => {
    selectApp(app); mocks.confirm.mockResolvedValue(true); const wrapper = render(Applications); await flushPromises(); await button(wrapper, 'Edit').trigger('click'); await flushPromises(); await button(dialog(), 'Delete').trigger('click'); await flushPromises(); expect(session.appId).toBe(''); expect(localStorage.getItem('Power_appId')).toBeNull()
  })
  it('namespace save preserves immutable code, disabled status and dept with authoritative header', async () => {
    const wrapper = render(Namespaces); await flushPromises(); await button(wrapper, 'Edit').trigger('click'); await flushPromises(); expect(field(dialog(), 'Code').attributes('readonly')).toBeDefined(); expect(field(dialog(), 'Access token').attributes('type')).toBe('password'); await field(dialog(), 'Name').setValue('Renamed'); await dialog().find('form').trigger('submit'); await flushPromises()
    const saved = mocks.api.mock.calls.find(([path]) => path === '/namespace/save')![1]; expect(saved.headers.NamespaceId).toBe(ns.id); expect(saved.body).toMatchObject({ code: ns.code, status: 2, dept: 'legacy', extra: ns.extra, name: 'Renamed' })
  })
  it('namespace validation and delete cancellation dispatch no mutation', async () => {
    const wrapper = render(Namespaces); await flushPromises(); await button(wrapper, 'New namespace').trigger('click'); await flushPromises(); await field(dialog(), 'Code').setValue('with space'); await dialog().find('form').trigger('submit'); await flushPromises(); expect(mocks.api.mock.calls.filter(([path]) => path === '/namespace/save')).toHaveLength(0)
    await button(dialog(), 'Cancel').trigger('click'); await button(wrapper, 'Delete').trigger('click'); await flushPromises(); expect(mocks.api.mock.calls.filter(([path]) => path === '/namespace/delete')).toHaveLength(0)
  })
  it('retains absent selected role IDs during filtering and never mutates input role arrays', async () => {
    const roles = { ...emptyRoles(), admin: ['missing', user.id] }; const wrapper = mount(RolePicker, { props: { users: [user], modelValue: roles } }); wrappers.push(wrapper)
    await wrapper.find('input[type="search"]').setValue('no matching'); expect(wrapper.text()).toContain('missing'); expect(wrapper.text()).toContain('Fixture'); await wrapper.findAll('.role-chip')[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')![0][0]).toEqual({ ...emptyRoles(), admin: [user.id] }); expect(roles.admin).toEqual(['missing', user.id])
  })
})

describe('native users, profile and settings', () => {
  it('paginates the array contract, then query resets the page and preserves large ID filters', async () => {
    mocks.api.mockImplementation((path: string) => path === '/user/query' ? Promise.resolve(Array.from({ length: 21 }, (_, index) => ({ ...user, id: String(index + 1), username: 'user_' + index, enable: true }))) : defaultApi(path))
    const wrapper = render(Users); await flushPromises(); expect(wrapper.findAll('tbody tr')).toHaveLength(10); await button(wrapper, 'Next').trigger('click'); expect(wrapper.find('tbody tr').text()).toContain('user_10')
    await field(wrapper, 'User ID').setValue('9007199254740999'); await wrapper.find('form').trigger('submit'); await flushPromises(); expect(wrapper.find('tbody tr').text()).toContain('user_0'); expect(mocks.api).toHaveBeenLastCalledWith('/user/query', expect.objectContaining({ body: expect.objectContaining({ userIdEq: '9007199254740999' }) }))
  })
  it('locks duplicate status dispatch and rolls back a rejected switch', async () => {
    const pending = deferred<null>(); mocks.api.mockImplementation((path: string) => path === '/user/disable' ? pending.promise : defaultApi(path)); const wrapper = render(Users); await flushPromises(); await wrapper.find('[role="switch"]').trigger('click'); await wrapper.find('[role="switch"]').trigger('click'); expect(mocks.api.mock.calls.filter(([path]) => path === '/user/disable')).toHaveLength(1); expect(wrapper.find('[role="switch"]').attributes('aria-checked')).toBe('true'); pending.reject(new Error('Permission denied')); await flushPromises(); expect(wrapper.find('[role="switch"]').attributes('aria-checked')).toBe('true'); expect(mocks.toast).toHaveBeenCalledWith('Permission denied', 'error')
  })
  it('does not save profile before detail is loaded, retries safely after failure', async () => {
    mocks.api.mockImplementation((path: string) => path === '/user/detail' ? Promise.reject(new Error('unavailable')) : defaultApi(path)); const wrapper = render(Profile); await flushPromises(); expect(button(wrapper, 'Save profile').element.closest('fieldset')).toHaveProperty('disabled', true); await wrapper.find('form').trigger('submit'); expect(mocks.api.mock.calls.filter(([path]) => path === '/user/modify')).toHaveLength(0); mocks.api.mockImplementation(defaultApi); await button(wrapper, 'Retry').trigger('click'); await flushPromises(); expect(button(wrapper, 'Save profile').element.closest('fieldset')).toHaveProperty('disabled', false)
  })
  it('verifies profile readback and does not report unsupported clearing as success', async () => {
    const wrapper = render(Profile); await flushPromises(); await field(wrapper, 'Nickname').setValue(''); await wrapper.find('form').trigger('submit'); await flushPromises(); expect(wrapper.text()).toContain('cannot clear existing fields'); expect(field(wrapper, 'Nickname').element).toHaveProperty('value', ''); expect(mocks.toast).not.toHaveBeenCalledWith('Profile saved', 'success')
  })
  it('saves only allowed profile fields while retaining extra and immutable identity', async () => {
    let current = { ...user }; mocks.api.mockImplementation((path: string, options: any) => { if (path === '/user/detail') return Promise.resolve(current); if (path === '/user/modify') { current = { ...current, ...options.body }; return Promise.resolve(null) } return defaultApi(path) }); const wrapper = render(Profile); await flushPromises(); expect(field(wrapper, 'Username').attributes('readonly')).toBeDefined(); await field(wrapper, 'Nickname').setValue('新昵称'); await wrapper.find('form').trigger('submit'); await flushPromises(); const body = mocks.api.mock.calls.find(([path]) => path === '/user/modify')![1].body; expect(body).toEqual({ id: user.id, nick: '新昵称', phone: user.phone, email: user.email, webHook: '', extra: user.extra }); expect(mocks.toast).toHaveBeenCalledWith('Profile saved', 'success')
  })
  it('password mismatch sends no API and cancellation discards credentials', async () => {
    const wrapper = render(Profile); await flushPromises(); await button(wrapper, 'Change password').trigger('click'); await flushPromises(); await field(dialog(), 'Old password').setValue('synthetic-old'); await field(dialog(), 'New password').setValue('one'); await field(dialog(), 'Confirm new password').setValue('two'); await dialog().find('form').trigger('submit'); await flushPromises(); expect(mocks.api.mock.calls.filter(([path]) => path === '/pwjbUser/changePassword')).toHaveLength(0); await button(dialog(), 'Cancel').trigger('click'); await button(wrapper, 'Change password').trigger('click'); await flushPromises(); expect(field(dialog(), 'Old password').element).toHaveProperty('value', '')
  })
  it('successful password change clears JWT/app and routes to sign-in', async () => {
    localStorage.setItem('PowerJwt', 'synthetic'); session.jwt = 'synthetic'; selectApp(app); const wrapper = render(Profile); await flushPromises(); await button(wrapper, 'Change password').trigger('click'); await flushPromises(); await field(dialog(), 'Old password').setValue('synthetic-old'); await field(dialog(), 'New password').setValue('same'); await field(dialog(), 'Confirm new password').setValue('same'); await dialog().find('form').trigger('submit'); await flushPromises(); expect(session.jwt).toBeNull(); expect(session.appId).toBe(''); expect(mocks.replace).toHaveBeenCalledWith('/loginHomepage')
  })
  it('reopening a cancelled password change restores a masked empty old password', async () => {
    const wrapper = render(Profile); await flushPromises(); await button(wrapper, 'Change password').trigger('click'); await flushPromises(); await dialog().find('.password-control button').trigger('click'); expect(field(dialog(), 'Old password').attributes('type')).toBe('text'); await button(dialog(), 'Cancel').trigger('click'); await button(wrapper, 'Change password').trigger('click'); await flushPromises(); expect(field(dialog(), 'Old password').attributes('type')).toBe('password'); expect(field(dialog(), 'Old password').element).toHaveProperty('value', '')
  })
  it('external accounts do not expose password change, and empty app grant sends no API', async () => {
    mocks.api.mockImplementation((path: string) => path === '/user/detail' ? Promise.resolve({ ...user, accountType: 'DING' }) : defaultApi(path)); const wrapper = render(Profile); await flushPromises(); expect(wrapper.findAll('button').some(value => value.text() === 'Change password')).toBe(false); await wrapper.findAll('form')[1].trigger('submit'); expect(mocks.api.mock.calls.filter(([path]) => path === '/appInfo/becomeAdmin')).toHaveLength(0)
  })
  it('settings cannot remove the last global admin or save failed initial loading', async () => {
    const wrapper = render(Settings); await flushPromises(); await wrapper.find('.admin-chip').trigger('click'); await wrapper.find('form').trigger('submit'); expect(mocks.api.mock.calls.filter(([path]) => path === '/auth/saveGlobalAdmin')).toHaveLength(0); expect(wrapper.text()).toContain('at least one'); wrapper.unmount()
    mocks.api.mockImplementation((path: string) => path === '/auth/listGlobalAdmin' ? Promise.reject(new Error('unavailable')) : defaultApi(path)); const failed = render(Settings); await flushPromises(); expect(button(failed, 'Save').element).toHaveProperty('disabled', true)
  })
})

describe('direct login, registration and raw OAuth callback', () => {
  it('dispatches login once while pending and ignores a response belonging to a replaced session', async () => {
    const pending = deferred<any>(); mocks.api.mockReturnValue(pending.promise); const wrapper = render(AuthForm); await field(wrapper, 'Username').setValue('fixture'); await field(wrapper, 'Password').setValue('synthetic'); await wrapper.find('form').trigger('submit'); await wrapper.find('form').trigger('submit'); expect(mocks.api).toHaveBeenCalledTimes(1)
    localStorage.setItem('PowerJwt', 'newer'); session.jwt = 'newer'; selectApp(app); pending.resolve({ jwtToken: 'late' }); await flushPromises(); expect(session.jwt).toBe('newer'); expect(session.appId).toBe(app.id); expect(mocks.replace).not.toHaveBeenCalled()
  })
  it('uses the original direct-login JSON and masks passwords until explicitly revealed', async () => {
    mocks.api.mockImplementation((path: string) => path === '/auth/thirdPartyLoginDirect' ? Promise.resolve({ jwtToken: 'new-synthetic-token' }) : defaultApi(path)); selectApp(app); const wrapper = render(AuthForm); expect(field(wrapper, 'Password').attributes('type')).toBe('password'); await field(wrapper, 'Username').setValue('用户名'); await field(wrapper, 'Password').setValue('a&+=%#'); await wrapper.find('form').trigger('submit'); await flushPromises(); expect(mocks.api).toHaveBeenCalledWith('/auth/thirdPartyLoginDirect', expect.objectContaining({ body: directLoginBody('用户名', 'a&+=%#') })); expect(session.appId).toBe(''); expect(session.jwt).toBe('new-synthetic-token'); expect(mocks.replace).toHaveBeenCalledWith('/admin/app')
  })
  it('invalid login sends no request, wrong password retains the form and unlocks retry', async () => {
    const wrapper = render(AuthForm); await wrapper.find('form').trigger('submit'); expect(mocks.api).not.toHaveBeenCalled(); mocks.api.mockRejectedValue(new Error('Wrong password')); await field(wrapper, 'Username').setValue('fixture'); await field(wrapper, 'Password').setValue('wrong'); await wrapper.find('form').trigger('submit'); await flushPromises(); expect(wrapper.text()).toContain('Wrong password'); expect(button(wrapper, 'Sign in').element).toHaveProperty('disabled', false); expect(field(wrapper, 'Password').element).toHaveProperty('value', 'wrong')
  })
  it('registration mismatch and cancellation create no account and reset every draft field', async () => {
    const wrapper = render(AuthForm); await button(wrapper, 'Create an account').trigger('click'); await flushPromises(); await field(dialog(), 'Username').setValue('owned'); await field(dialog(), 'Nickname').setValue('Unsaved'); await field(dialog(), 'Password').setValue('a'); await field(dialog(), 'Confirm password').setValue('b'); await dialog().find('form').trigger('submit'); expect(mocks.api).not.toHaveBeenCalled(); await button(dialog(), 'Cancel').trigger('click'); await button(wrapper, 'Create an account').trigger('click'); await flushPromises(); expect(field(dialog(), 'Nickname').element).toHaveProperty('value', ''); expect(field(dialog(), 'Password').element).toHaveProperty('value', '')
  })
  it('a newly reopened registration masks passwords even when the previous empty draft was revealed', async () => {
    const wrapper = render(AuthForm); await button(wrapper, 'Create an account').trigger('click'); await flushPromises(); await dialog().find('.password-control button').trigger('click'); expect(field(dialog(), 'Password').attributes('type')).toBe('text'); await button(dialog(), 'Cancel').trigger('click'); await button(wrapper, 'Create an account').trigger('click'); await flushPromises(); expect(field(dialog(), 'Password').attributes('type')).toBe('password')
  })
  it('initializes nickname/contact through a temporary token without logging in or clearing another app context', async () => {
    let saved: any = { id: user.id }; mocks.api.mockImplementation((path: string, options: any) => { if (path === '/auth/thirdPartyLoginDirect') return Promise.resolve({ jwtToken: 'temporary-only' }); if (path === '/user/detail') return Promise.resolve(saved); if (path === '/user/modify') { saved = { ...saved, ...options.body }; return Promise.resolve(null) } return defaultApi(path) }); localStorage.setItem('PowerJwt', 'current-synthetic'); session.jwt = 'current-synthetic'; selectApp(app); const wrapper = render(AuthForm); await button(wrapper, 'Create an account').trigger('click'); await flushPromises(); for (const [label, value] of Object.entries({ Username: 'owned', Nickname: '调度员', Phone: '1234', Email: 'owned@example.invalid', Webhook: 'https://example.invalid/hook', Password: 'test-password', 'Confirm password': 'test-password' })) await field(dialog(), label).setValue(value); await dialog().find('form').trigger('submit'); await flushPromises()
    expect(mocks.api.mock.calls.map(([path]) => path)).toEqual(['/pwjbUser/create', '/auth/thirdPartyLoginDirect', '/user/detail', '/user/modify', '/user/detail']); expect(mocks.api.mock.calls.filter(([path]) => path === '/user/detail' || path === '/user/modify').every(([, options]) => options.headers.PowerJwt === 'temporary-only')).toBe(true); expect(saved.nick).toBe('调度员'); expect(session.jwt).toBe('current-synthetic'); expect(session.appId).toBe(app.id); expect(mocks.replace).not.toHaveBeenCalled(); expect(wrapper.text()).toContain('Account created')
  })
  it('distinguishes a committed account from profile failure and blocks accidental re-creation', async () => {
    mocks.api.mockImplementation((path: string) => path === '/user/detail' ? Promise.reject(new Error('profile unavailable')) : path === '/auth/thirdPartyLoginDirect' ? Promise.resolve({ jwtToken: 'temporary-only' }) : defaultApi(path)); const wrapper = render(AuthForm); async function complete() { await field(dialog(), 'Username').setValue('owned'); await field(dialog(), 'Nickname').setValue('nickname'); await field(dialog(), 'Password').setValue('test-password'); await field(dialog(), 'Confirm password').setValue('test-password'); await dialog().find('form').trigger('submit'); await flushPromises() }
    await button(wrapper, 'Create an account').trigger('click'); await flushPromises(); await complete(); expect(wrapper.text()).toContain('account was created, but profile initialization was incomplete'); await button(wrapper, 'Create an account').trigger('click'); await flushPromises(); await complete(); expect(mocks.api.mock.calls.filter(([path]) => path === '/pwjbUser/create')).toHaveLength(1); expect(dialog().text()).toContain('This account was created')
  })
  it.each(['?code=%E8%B0%83%E5%BA%A6%26%2B%3D%25%23&state=DING', '?code=one&code=two&state=DING&empty=&bare', '?code=%2B+%2526%23&state=DING&x=a%3Db%26c'])('forwards callback bytes and all repeated/empty values unchanged: %s', async search => {
    history.replaceState(null, '', '/console/' + search + '#/loginHomepage'); mocks.api.mockImplementation((path: string) => path.startsWith('/auth/thirdPartyLoginCallback') ? Promise.resolve({ jwtToken: 'callback-synthetic' }) : defaultApi(path)); const wrapper = render(AuthLanding); await flushPromises(); expect(mocks.api).toHaveBeenCalledWith(callbackPath(search), expect.any(Object)); expect(mocks.api.mock.calls.some(([path]) => path === '/auth/ifLogin')).toBe(false); expect(location.search).toBe(''); expect(location.pathname).toBe('/console/'); expect(wrapper.text()).toContain('workspace'); expect(session.jwt).toBe('callback-synthetic')
  })
  it('restores valid existing login without clearing selected app', async () => {
    localStorage.setItem('PowerJwt', 'existing'); session.jwt = 'existing'; selectApp(app); mocks.api.mockImplementation((path: string) => path === '/auth/ifLogin' ? Promise.resolve({ id: user.id }) : defaultApi(path)); render(AuthLanding); await flushPromises(); expect(session.appId).toBe(app.id); expect(mocks.replace).toHaveBeenCalledWith('/admin/app')
  })
  it('clears stale selected app for an expired or missing token but ignores a newer login', async () => {
    selectApp(app); render(AuthLanding); await flushPromises(); expect(session.appId).toBe(''); expect(mocks.replace).not.toHaveBeenCalled(); wrappers.splice(0).forEach(wrapper => wrapper.unmount())
    const check = deferred<any>(); localStorage.setItem('PowerJwt', 'old'); session.jwt = 'old'; mocks.api.mockImplementation((path: string) => path === '/auth/ifLogin' ? check.promise : defaultApi(path)); render(AuthLanding); await flushPromises(); localStorage.setItem('PowerJwt', 'new'); session.jwt = 'new'; selectApp(app); check.resolve(null); await flushPromises(); expect(session.jwt).toBe('new'); expect(session.appId).toBe(app.id)
  })
  it('does not establish an obsolete callback after another session replaces it', async () => {
    const callback = deferred<any>(); history.replaceState(null, '', '/?state=DING&authCode=synthetic#/loginHomepage'); mocks.api.mockImplementation((path: string) => path.startsWith('/auth/thirdPartyLoginCallback') ? callback.promise : defaultApi(path)); render(AuthLanding); await flushPromises(); localStorage.setItem('PowerJwt', 'new'); session.jwt = 'new'; callback.resolve({ jwtToken: 'obsolete' }); await flushPromises(); expect(session.jwt).toBe('new'); expect(mocks.replace).not.toHaveBeenCalled()
  })
})
