<script setup lang="ts">
import { onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../core/api'
import { establishSession, session } from '../../core/session'
import { t, toast } from '../../core/ui'
import Field from '../../shared/Field.vue'
import Modal from '../../shared/Modal.vue'
import type { Profile } from '../admin/contracts'
import AuthFrame from './AuthFrame.vue'
import PasswordInput from './PasswordInput.vue'
import { directLoginBody, newRegistration, registrationValid, type LoginUser } from './contracts'

const router = useRouter()
const login = reactive({ username: '', password: '' })
const loggingIn = ref(false)
const error = ref('')
const registerOpen = ref(false)
const registration = ref(newRegistration())
const registering = ref(false)
const registerError = ref('')
const registrationNotice = ref('')
const createdNames = new Set<string>()
let disposed = false
const requests = new Set<AbortController>()
function capture() {
  const controller = new AbortController(); requests.add(controller)
  const jwt = localStorage.getItem('PowerJwt')
  return { signal: controller.signal, valid: () => !disposed && !controller.signal.aborted && localStorage.getItem('PowerJwt') === jwt, release: () => requests.delete(controller) }
}
onBeforeUnmount(() => { disposed = true; requests.forEach(request => request.abort()) })
async function signIn() {
  if (loggingIn.value || registering.value) return
  if (!login.username || !login.password) { error.value = t('请输入用户名和密码。', 'Enter your username and password.'); return }
  const scope = capture(); loggingIn.value = true; error.value = ''
  try {
    const result = await api<LoginUser>('/auth/thirdPartyLoginDirect', { body: directLoginBody(login.username, login.password), signal: scope.signal, quiet: true })
    if (!scope.valid()) return
    if (!result?.jwtToken) throw new Error(t('服务器未返回登录凭证。', 'The server did not return a session token.'))
    establishSession(result.jwtToken); session.user = result; login.password = ''; await router.replace('/admin/app')
  } catch (failure) { if (scope.valid()) error.value = (failure as Error).message }
  finally { scope.release(); loggingIn.value = false }
}
function openRegistration() {
  registration.value = newRegistration(); registerError.value = ''; registerOpen.value = true
}
function resetRegistration() { registration.value = newRegistration(); registerError.value = '' }
async function register() {
  if (registering.value || loggingIn.value) return
  const draft = { ...registration.value }
  if (!registrationValid(draft)) { registerError.value = !draft.username || !draft.password || !draft.password2 ? t('请输入用户名和两次密码。', 'Enter a username and confirm the password.') : t('两次密码不一致。', 'The passwords do not match.'); return }
  if (createdNames.has(draft.username)) { registerError.value = t('此账号已创建，请直接登录完善个人资料。', 'This account was created. Sign in to finish your profile.'); return }
  const scope = capture(); registering.value = true; registerError.value = ''; registrationNotice.value = ''
  let created = false
  try {
    await api('/pwjbUser/create', { body: draft, signal: scope.signal, quiet: true })
    created = true; createdNames.add(draft.username)
    if (!scope.valid()) return
    registerOpen.value = false; resetRegistration(); login.username = draft.username; login.password = ''
    const fields = { nick: draft.nick, phone: draft.phone, email: draft.email, webHook: draft.webHook }
    if (Object.values(fields).some(value => value !== '')) {
      const temporary = await api<LoginUser>('/auth/thirdPartyLoginDirect', { body: directLoginBody(draft.username, draft.password), signal: scope.signal, quiet: true })
      if (!scope.valid()) return
      if (!temporary.jwtToken) throw new Error(t('无法初始化个人资料。', 'Your profile could not be initialized.'))
      const headers = { PowerJwt: temporary.jwtToken }
      const profile = await api<Profile>('/user/detail', { headers, signal: scope.signal, quiet: true })
      if (!scope.valid()) return
      if (profile?.id == null) throw new Error(t('无法读取新账号资料。', 'The new account profile could not be loaded.'))
      await api('/user/modify', { body: { id: profile.id, ...fields }, headers, signal: scope.signal, quiet: true })
      if (!scope.valid()) return
      const readback = await api<Profile>('/user/detail', { headers, signal: scope.signal, quiet: true })
      if (!scope.valid()) return
      if (!Object.entries(fields).every(([key, value]) => value === '' || readback[key as keyof Profile] === value)) throw new Error(t('部分个人资料未能保存。', 'Some profile details could not be saved.'))
    }
    if (scope.valid()) { registrationNotice.value = t('账号已创建，请登录。', 'Account created. Sign in to continue.'); toast(registrationNotice.value, 'success') }
  } catch (failure) {
    if (scope.valid()) {
      if (created) {
        registrationNotice.value = t('账号已创建，但个人资料初始化未完成。请直接登录，在个人中心补充资料。', 'Your account was created, but profile initialization was incomplete. Sign in and finish your profile.')
        error.value = (failure as Error).message
      } else registerError.value = (failure as Error).message
    }
  } finally { scope.release(); registering.value = false; draft.password = ''; draft.password2 = '' }
}
</script>

<template>
  <AuthFrame><div class="auth-heading"><RouterLink to="/loginHomepage" class="back-methods">← {{ t('其他登录方式', 'Other sign-in methods') }}</RouterLink><h1>{{ t('PowerJob 账号登录', 'Sign in with PowerJob') }}</h1><p>{{ t('输入账号信息，进入调度工作台。', 'Enter your account details to open the scheduling workspace.') }}</p></div><p v-if="registrationNotice" class="registration-notice" role="status">{{ registrationNotice }}</p><p v-if="error" class="error-banner" role="alert">{{ error }}</p><form class="login-form" @submit.prevent="signIn"><Field :label="t('用户名', 'Username')" required v-slot="{ id }"><input :id="id" v-model="login.username" required autocomplete="username" :disabled="loggingIn || registering"></Field><Field :label="t('密码', 'Password')" required v-slot="{ id }"><PasswordInput :id="id" v-model="login.password" required :disabled="loggingIn || registering"/></Field><button class="btn btn-primary sign-in" type="submit" :disabled="loggingIn || registering">{{ loggingIn ? t('登录中…', 'Signing in…') : t('登录', 'Sign in') }}</button></form><div class="register-prompt"><span>{{ t('还没有账号？', 'New to PowerJob?') }}</span><button type="button" :disabled="loggingIn || registering" @click="openRegistration">{{ t('注册账号', 'Create an account') }}</button></div></AuthFrame>
  <Modal v-model="registerOpen" :title="t('注册账号', 'Create an account')" @closed="resetRegistration"><form id="register-form" @submit.prevent="register"><div class="form-grid"><Field :label="t('用户名', 'Username')" required v-slot="{ id }"><input :id="id" v-model="registration.username" required autocomplete="username" :disabled="registering"></Field><Field :label="t('昵称', 'Nickname')" v-slot="{ id }"><input :id="id" v-model="registration.nick" :disabled="registering"></Field><Field :label="t('手机号', 'Phone')" v-slot="{ id }"><input :id="id" v-model="registration.phone" type="tel" autocomplete="tel" :disabled="registering"></Field><Field :label="t('邮箱', 'Email')" v-slot="{ id }"><input :id="id" v-model="registration.email" autocomplete="email" :disabled="registering"></Field><Field :label="t('Webhook', 'Webhook')" class="full" v-slot="{ id }"><input :id="id" v-model="registration.webHook" :disabled="registering"></Field><Field :label="t('密码', 'Password')" required v-slot="{ id }"><PasswordInput :id="id" v-model="registration.password" :reset-key="registerOpen" required :disabled="registering" autocomplete="new-password"/></Field><Field :label="t('确认密码', 'Confirm password')" required v-slot="{ id }"><PasswordInput :id="id" v-model="registration.password2" :reset-key="registerOpen" required :disabled="registering" autocomplete="new-password"/></Field></div><p v-if="registerError" class="error-banner" role="alert">{{ registerError }}</p></form><template #footer><button class="btn btn-quiet" :disabled="registering" @click="registerOpen = false; resetRegistration()">{{ t('取消', 'Cancel') }}</button><button class="btn btn-primary" form="register-form" type="submit" :disabled="registering">{{ registering ? t('创建中…', 'Creating…') : t('创建账号', 'Create account') }}</button></template></Modal>
</template>

<style scoped>
.auth-heading { margin-bottom: 30px; }.back-methods { display: inline-block; font-size: 12px; margin-bottom: 25px; color: var(--muted); }.back-methods:hover { color: var(--blue); }.auth-heading h1 { font-size: 27px; line-height: 1.35; }.auth-heading p { color: var(--muted); font-size: 13px; line-height: 1.7; margin-top: 11px; }.login-form { display: grid; gap: 21px; }.sign-in { margin-top: 4px; min-height: 42px; }.register-prompt { margin-top: 27px; font-size: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; color: var(--muted); }.register-prompt button { background: transparent; border: 0; color: var(--blue); font-weight: 650; padding: 5px; font-size: 12px; }.registration-notice { padding: 13px 15px; background: var(--blue-soft); color: #304e94; border-radius: 8px; font-size: 12px; margin-bottom: 20px; overflow-wrap: anywhere; }
</style>
