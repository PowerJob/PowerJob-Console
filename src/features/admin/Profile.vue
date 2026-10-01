<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../core/api'
import { session, signOut } from '../../core/session'
import { clone, t, toast } from '../../core/ui'
import Field from '../../shared/Field.vue'
import Modal from '../../shared/Modal.vue'
import PasswordInput from '../auth/PasswordInput.vue'
import type { Profile } from './contracts'
import { useAdminScope } from './useAdminScope'

const capture = useAdminScope()
const router = useRouter()
const profile = ref<Profile>({ id: '', nick: '', phone: '', email: '', webHook: '' })
const loaded = ref(false)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const grant = reactive({ appName: '', password: '' })
const granting = ref(false)
const grantError = ref('')
const passwordOpen = ref(false)
const password = reactive({ username: '', oldPassword: '', newPassword: '', newPassword2: '' })
const changing = ref(false)
const passwordError = ref('')
const roleGroups = computed(() => [
  { title: t('命名空间权限', 'Namespace permissions'), roles: profile.value.role2NamespaceList || {}, kind: 'namespace' },
  { title: t('应用权限', 'Application permissions'), roles: profile.value.role2AppList || {}, kind: 'app' },
])
async function load() {
  if (loading.value) return false
  const scope = capture(); loading.value = true; error.value = ''
  try {
    const result = await api<Profile>('/user/detail', { signal: scope.signal, quiet: true })
    if (!scope.valid()) return false
    if (result?.id == null) throw new Error(t('无法读取个人资料，请重试。', 'Your profile could not be loaded. Try again.'))
    profile.value = { ...result, nick: result.nick || '', phone: result.phone || '', email: result.email || '', webHook: result.webHook || '' }; session.user = clone(result); loaded.value = true
    return true
  } catch (failure) { if (scope.valid()) error.value = (failure as Error).message; return false }
  finally { scope.release(); loading.value = false }
}
async function save() {
  if (!loaded.value || loading.value || saving.value) return
  const scope = capture(); saving.value = true; error.value = ''
  const draft = clone(profile.value)
  const body = { id: draft.id, nick: draft.nick || '', phone: draft.phone || '', email: draft.email || '', webHook: draft.webHook || '', extra: draft.extra }
  try {
    await api('/user/modify', { body, signal: scope.signal, quiet: true })
    if (!scope.valid()) return
    const result = await api<Profile>('/user/detail', { signal: scope.signal, quiet: true })
    if (!scope.valid()) return
    if (result?.id == null || !['nick', 'phone', 'email', 'webHook'].every(key => String(result[key as keyof Profile] || '') === String(body[key as keyof typeof body] || ''))) throw new Error(t('服务器未保存全部资料。请检查后重试；当前服务器不支持清空已有字段。', 'The server did not save every field. Review and retry; this server cannot clear existing fields.'))
    profile.value = { ...result, nick: result.nick || '', phone: result.phone || '', email: result.email || '', webHook: result.webHook || '' }; session.user = clone(result)
    toast(t('个人资料已保存', 'Profile saved'), 'success')
  } catch (failure) { if (scope.valid()) { profile.value = draft; error.value = (failure as Error).message } }
  finally { scope.release(); saving.value = false }
}
function openPassword() {
  Object.assign(password, { username: profile.value.originUsername || '', oldPassword: '', newPassword: '', newPassword2: '' }); passwordError.value = ''; passwordOpen.value = true
}
function resetPassword() { Object.assign(password, { username: '', oldPassword: '', newPassword: '', newPassword2: '' }); passwordError.value = '' }
async function changePassword() {
  if (changing.value || !loaded.value || profile.value.accountType !== 'PWJB') return
  if (!password.username || !password.oldPassword || !password.newPassword || !password.newPassword2) { passwordError.value = t('请填写旧密码和两次新密码。', 'Enter your old password and confirm the new password.'); return }
  if (password.newPassword !== password.newPassword2) { passwordError.value = t('两次新密码不一致。', 'The new passwords do not match.'); return }
  const scope = capture(); changing.value = true; passwordError.value = ''
  try {
    await api('/pwjbUser/changePassword', { body: { ...password }, signal: scope.signal, quiet: true })
    if (!scope.valid()) return
    passwordOpen.value = false; resetPassword(); signOut(); toast(t('密码已修改，请重新登录。', 'Password changed. Sign in again.'), 'success'); await router.replace('/loginHomepage')
  } catch (failure) { if (scope.valid()) passwordError.value = (failure as Error).message }
  finally { scope.release(); changing.value = false }
}
async function becomeAdmin() {
  if (granting.value) return
  if (!grant.appName || !grant.password) { grantError.value = t('请填写应用名和应用密码。', 'Enter the application name and password.'); return }
  const scope = capture(); granting.value = true; grantError.value = ''
  try {
    await api('/appInfo/becomeAdmin', { body: { ...grant }, signal: scope.signal, quiet: true })
    if (!scope.valid()) return
    grant.password = ''; toast(t('已获得应用管理权限', 'Application administration granted'), 'success'); await load()
  } catch (failure) { if (scope.valid()) grantError.value = (failure as Error).message }
  finally { scope.release(); granting.value = false }
}
onMounted(() => void load())
</script>

<template>
  <header class="page-head"><div><h1>{{ t('个人中心', 'Profile') }}</h1><p>{{ t('维护联系资料和账号访问权限。', 'Manage your contact details and account access.') }}</p></div></header>
  <div class="profile-layout">
    <section class="work-panel profile-panel" :aria-busy="loading"><div class="profile-heading" data-private><div class="profile-avatar" aria-hidden="true">{{ Array.from(profile.nick || profile.username || 'P')[0]?.toUpperCase() }}</div><div><h2>{{ profile.nick || profile.username || t('个人资料', 'Your profile') }}</h2><p class="muted">{{ profile.accountType || '—' }} · ID {{ profile.id || '—' }}</p></div></div>
      <p v-if="error" class="error-banner" role="alert">{{ error }} <button v-if="!loaded" type="button" class="btn btn-quiet" @click="load">{{ t('重试', 'Retry') }}</button></p><p v-if="loading" class="muted" role="status">{{ t('正在加载…', 'Loading…') }}</p>
      <form @submit.prevent="save"><fieldset class="profile-fields" data-private :disabled="!loaded || loading || saving"><div class="form-grid"><Field :label="t('用户名', 'Username')" v-slot="{ id }"><input :id="id" :value="profile.username" readonly></Field><Field :label="t('原始用户名', 'Original username')" v-slot="{ id }"><input :id="id" :value="profile.originUsername" readonly></Field><Field :label="t('账号类型', 'Account type')" v-slot="{ id }"><input :id="id" :value="profile.accountType" readonly></Field><Field :label="t('全局角色', 'Global roles')" v-slot="{ id }"><input :id="id" :value="profile.globalRoles?.join(', ') || '—'" readonly></Field></div><div class="form-grid contact-fields"><Field :label="t('昵称', 'Nickname')" v-slot="{ id }"><input :id="id" v-model="profile.nick"></Field><Field :label="t('手机号', 'Phone')" v-slot="{ id }"><input :id="id" v-model="profile.phone" type="tel" autocomplete="tel"></Field><Field :label="t('邮箱', 'Email')" v-slot="{ id }"><input :id="id" v-model="profile.email" autocomplete="email"></Field><Field :label="t('Webhook', 'Webhook')" v-slot="{ id }"><input :id="id" v-model="profile.webHook"></Field></div><div class="profile-actions"><button v-if="profile.accountType === 'PWJB'" type="button" class="btn" :disabled="changing" @click="openPassword">{{ t('修改密码', 'Change password') }}</button><button class="btn btn-primary" type="submit">{{ saving ? t('保存中…', 'Saving…') : t('保存资料', 'Save profile') }}</button></div></fieldset></form>
      <details v-if="roleGroups.some(group => Object.keys(group.roles).length)" class="profile-entitlements" data-private><summary>{{ t('查看已有权限', 'View assigned permissions') }}</summary><section v-for="group in roleGroups" :key="group.kind"><h3>{{ group.title }}</h3><div v-for="(targets, role) in group.roles" :key="role" class="entitlement-row"><span class="badge">{{ role }}</span><span>{{ targets.map(target => 'appName' in target ? target.appName : target.showName || target.name || target.code).join(', ') || '—' }}</span></div></section></details>
    </section>
    <aside class="work-panel grant-panel"><h2>{{ t('获取应用管理权限', 'Become an application administrator') }}</h2><p class="muted">{{ t('使用应用名和应用密码获取该应用的管理权限。', 'Use an application name and password to obtain administration access.') }}</p><form @submit.prevent="becomeAdmin"><Field :label="t('应用名', 'Application name')" required v-slot="{ id }"><input :id="id" v-model="grant.appName" required :disabled="granting"></Field><Field :label="t('应用密码', 'Application password')" required v-slot="{ id }"><PasswordInput :id="id" v-model="grant.password" required :disabled="granting" autocomplete="off"/></Field><p v-if="grantError" class="error-banner" role="alert">{{ grantError }}</p><button class="btn btn-primary" type="submit" :disabled="granting">{{ granting ? t('提交中…', 'Submitting…') : t('获取权限', 'Get access') }}</button></form></aside>
  </div>
  <Modal v-model="passwordOpen" :title="t('修改密码', 'Change password')" @closed="resetPassword"><form id="password-form" @submit.prevent="changePassword"><div class="password-fields"><Field :label="t('用户名', 'Username')" v-slot="{ id }"><input :id="id" :value="password.username" readonly autocomplete="username"></Field><Field :label="t('旧密码', 'Old password')" required v-slot="{ id }"><PasswordInput :id="id" v-model="password.oldPassword" :reset-key="passwordOpen" required :disabled="changing"/></Field><Field :label="t('新密码', 'New password')" required v-slot="{ id }"><PasswordInput :id="id" v-model="password.newPassword" :reset-key="passwordOpen" required :disabled="changing" autocomplete="new-password"/></Field><Field :label="t('确认新密码', 'Confirm new password')" required v-slot="{ id }"><PasswordInput :id="id" v-model="password.newPassword2" :reset-key="passwordOpen" required :disabled="changing" autocomplete="new-password"/></Field></div><p v-if="passwordError" class="error-banner" role="alert">{{ passwordError }}</p></form><template #footer><button class="btn btn-quiet" :disabled="changing" @click="passwordOpen = false; resetPassword()">{{ t('取消', 'Cancel') }}</button><button class="btn btn-primary" form="password-form" type="submit" :disabled="changing">{{ changing ? t('提交中…', 'Submitting…') : t('修改密码', 'Change password') }}</button></template></Modal>
</template>

<style scoped>
.profile-layout { display: grid; grid-template-columns: minmax(0,1fr) minmax(280px,.45fr); gap: 20px; align-items: start; }
.profile-panel,.grant-panel { padding: 24px; min-width: 0; }
.profile-heading { display: flex; gap: 13px; align-items: center; margin-bottom: 24px; }
.profile-heading>div { min-width: 0; overflow-wrap: anywhere; }.profile-heading p { font-size: 12px; margin-top: 3px; }
.profile-avatar { display: grid; place-items: center; width: 44px; height: 44px; flex-shrink: 0; border-radius: 13px; background: var(--blue-soft); color: var(--blue); font-size: 20px; font-weight: 750; }
.profile-fields { border: 0; padding: 0; min-width: 0; }.contact-fields { border-top: 1px solid var(--line); margin-top: 22px; padding-top: 22px; }
.profile-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; margin-top: 22px; }
.grant-panel>p { font-size: 12px; margin: 9px 0 22px; }.grant-panel form,.password-fields { display: grid; gap: 18px; }.grant-panel .btn { justify-self: start; }
.profile-entitlements { margin-top: 24px; border-top: 1px solid var(--line); padding-top: 18px; font-size: 12px; }.profile-entitlements summary { cursor: pointer; font-weight: 650; }.profile-entitlements section { margin-top: 18px; }.entitlement-row { display: flex; gap: 10px; align-items: flex-start; margin-top: 9px; overflow-wrap: anywhere; }.entitlement-row>span:last-child { min-width: 0; }
@media (max-width: 1000px) { .profile-layout { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .profile-panel,.grant-panel { padding: 17px; } }
</style>
