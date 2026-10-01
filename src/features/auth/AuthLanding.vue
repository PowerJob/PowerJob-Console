<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../core/api'
import { establishSession, session, signOut } from '../../core/session'
import { t } from '../../core/ui'
import AuthFrame from './AuthFrame.vue'
import { callbackPath, type LoginMethod, type LoginUser } from './contracts'

const router = useRouter()
const methods = ref<LoginMethod[]>([])
const loading = ref(false)
const checking = ref(false)
const pending = ref('')
const error = ref('')
const authError = ref('')
let generation = 0
let disposed = false
const requests = new Set<AbortController>()
function request() { const controller = new AbortController(); requests.add(controller); return controller }
onBeforeUnmount(() => { disposed = true; generation++; requests.forEach(value => value.abort()) })
async function loadMethods() {
  if (loading.value) return
  const controller = request(); loading.value = true; error.value = ''
  try { const result = await api<LoginMethod[]>('/auth/supportLoginTypes', { signal: controller.signal, quiet: true }); if (!disposed) methods.value = result || [] }
  catch (failure) { if (!disposed) error.value = (failure as Error).message }
  finally { requests.delete(controller); loading.value = false }
}
async function initialize() {
  const current = ++generation
  const checkedToken = localStorage.getItem('PowerJwt')
  const callback = location.search.length > 1
  const controller = request(); checking.value = true; authError.value = ''
  const valid = () => !disposed && generation === current && checkedToken === localStorage.getItem('PowerJwt')
  try {
    const result = await api<LoginUser | null>(callback ? callbackPath(location.search) : '/auth/ifLogin', { signal: controller.signal, quiet: true })
    if (!valid()) return
    if (callback) {
      if (!result?.jwtToken) throw new Error(t('登录回调未返回有效凭证，请重新登录。', 'The callback did not return a valid session. Sign in again.'))
      establishSession(result.jwtToken); session.user = result
      history.replaceState(history.state, '', location.pathname + location.hash)
      await router.replace('/admin/app')
    } else if (result) { session.user = result; await router.replace('/admin/app') }
    else signOut()
  } catch (failure) {
    if (!disposed && generation === current) {
      authError.value = (failure as Error).message
      if (!callback && valid()) signOut()
    }
  } finally { requests.delete(controller); if (generation === current) checking.value = false }
}
async function choose(method: LoginMethod) {
  if (pending.value || checking.value) return
  pending.value = method.type; authError.value = ''
  const controller = request(); const checkedToken = localStorage.getItem('PowerJwt')
  try {
    const result = await api<string>('/auth/thirdPartyLoginUrl', { query: { type: method.type }, signal: controller.signal, quiet: true })
    if (disposed || localStorage.getItem('PowerJwt') !== checkedToken) return
    if (!result) throw new Error(t('未获取到登录地址。', 'No sign-in URL was returned.'))
    if (result.startsWith('FE-REDIRECT:')) await router.push('/' + result.slice('FE-REDIRECT:'.length).replace(/^\//, ''))
    else location.assign(result)
  } catch (failure) { if (!disposed) authError.value = (failure as Error).message }
  finally { requests.delete(controller); pending.value = '' }
}
onMounted(() => { void loadMethods(); void initialize() })
</script>

<template><AuthFrame><div class="auth-heading"><h1>{{ t('登录工作台', 'Sign in to your workspace') }}</h1><p>{{ t('选择你的登录方式。', 'Choose your sign-in method.') }}</p></div><p v-if="checking" class="auth-status" role="status">{{ t('正在检查登录状态…', 'Checking your session…') }}</p><p v-if="authError" class="error-banner" role="alert">{{ authError }}</p><p v-if="error" class="error-banner" role="alert">{{ error }} <button type="button" class="btn btn-quiet" @click="loadMethods">{{ t('重试', 'Retry') }}</button></p><div class="login-methods" :aria-busy="loading"><button v-for="method in methods" :key="method.type" class="login-method" :disabled="checking || !!pending" @click="choose(method)"><span class="method-icon" aria-hidden="true">{{ method.type === 'PWJB' ? 'P' : Array.from(method.name || method.type)[0] }}</span><span>{{ method.type === 'PWJB' ? t('PowerJob 账号', 'PowerJob account') : method.name }}</span><span class="method-arrow" aria-hidden="true">{{ pending === method.type ? '…' : '→' }}</span></button><p v-if="loading" class="auth-status" role="status">{{ t('正在加载登录方式…', 'Loading sign-in methods…') }}</p><p v-if="!loading && !error && !methods.length" class="auth-status">{{ t('服务器尚未提供登录方式。', 'No sign-in methods are available from the server.') }}</p></div></AuthFrame></template>

<style scoped>
.auth-heading { margin-bottom: 34px; }.auth-heading h1 { font-size: 28px; margin-top: 13px; line-height: 1.35; }.auth-heading p { font-size: 13px; color: var(--muted); margin-top: 11px; }.login-methods { display: grid; gap: 12px; }.login-method { display: flex; align-items: center; gap: 13px; width: 100%; border: 1px solid var(--line); background: white; border-radius: 10px; padding: 15px 17px; text-align: left; font-size: 13px; font-weight: 650; }.login-method:hover:not(:disabled) { border-color: var(--blue); background: var(--blue-soft); }.method-icon { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; font-weight: 750; font-size: 17px; color: var(--blue); background: var(--blue-soft); }.method-arrow { margin-left: auto; color: var(--muted); font-size: 20px; }.auth-status { color: var(--muted); font-size: 12px; margin: 16px 0; }
</style>
