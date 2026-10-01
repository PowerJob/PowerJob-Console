<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '../../core/api'
import { t, toast } from '../../core/ui'
import type { ID, User } from './contracts'
import { useAdminScope } from './useAdminScope'

const capture = useAdminScope()
const users = ref<User[]>([])
const admins = ref<ID[]>([])
const search = ref('')
const loading = ref(false)
const loaded = ref(false)
const saving = ref(false)
const error = ref('')
const matches = computed(() => users.value.filter(user => [user.showName, user.username, user.id].some(value => String(value ?? '').toLowerCase().includes(search.value.toLowerCase()))))
function selected(id: ID) { return admins.value.some(item => String(item) === String(id)) }
function name(id: ID) { const user = users.value.find(user => String(user.id) === String(id)); return user?.showName || user?.username || String(id) }
function toggle(id: ID) { admins.value = selected(id) ? admins.value.filter(item => String(item) !== String(id)) : [...admins.value, id] }
async function load() {
  if (loading.value || saving.value) return
  const scope = capture(); loading.value = true; loaded.value = false; error.value = ''
  try {
    const [people, ids] = await Promise.all([api<User[]>('/user/list', { signal: scope.signal, quiet: true }), api<ID[]>('/auth/listGlobalAdmin', { signal: scope.signal, quiet: true })])
    if (scope.valid()) { users.value = people || []; admins.value = ids || []; loaded.value = true }
  } catch (failure) { if (scope.valid()) error.value = (failure as Error).message }
  finally { scope.release(); loading.value = false }
}
async function save() {
  if (saving.value || loading.value || !loaded.value) return
  if (!admins.value.length) { error.value = t('至少保留一位全局管理员。', 'Keep at least one global administrator.'); return }
  const scope = capture(); const submitted = [...admins.value]; saving.value = true; error.value = ''
  try {
    await api('/auth/saveGlobalAdmin', { body: { admin: submitted }, signal: scope.signal, quiet: true })
    if (scope.valid()) toast(t('全局管理员已保存', 'Global administrators saved'), 'success')
  } catch (failure) { if (scope.valid()) error.value = (failure as Error).message }
  finally { scope.release(); saving.value = false }
}
onMounted(() => void load())
</script>

<template>
  <header class="page-head"><div><h1>{{ t('系统设置', 'Settings') }}</h1><p>{{ t('配置跨命名空间与应用的全局管理权限。', 'Configure administration across namespaces and applications.') }}</p></div></header>
  <section class="work-panel settings-panel" :aria-busy="loading"><form @submit.prevent="save"><div class="settings-heading"><div><h2>{{ t('全局管理员', 'Global administrators') }}</h2><p class="muted">{{ t('至少保留一位管理员。此权限可管理全部应用和用户。', 'Keep at least one administrator. This role can manage all applications and users.') }}</p></div><button class="btn btn-primary" type="submit" :disabled="loading || saving || !loaded">{{ saving ? t('保存中…', 'Saving…') : t('保存', 'Save') }}</button></div>
    <p v-if="loading" role="status" class="muted">{{ t('正在加载…', 'Loading…') }}</p><p v-if="error" class="error-banner" role="alert">{{ error }} <button v-if="!loaded" type="button" class="btn btn-quiet" @click="load">{{ t('重试', 'Retry') }}</button></p>
    <fieldset :disabled="loading || saving || !loaded" class="admin-selection"><legend class="sr-only">{{ t('选择全局管理员', 'Select global administrators') }}</legend><div class="admin-chips" data-private><button v-for="id in admins" :key="String(id)" class="admin-chip" type="button" :aria-label="t('移除管理员', 'Remove administrator') + ' ' + name(id)" @click="toggle(id)">{{ name(id) }} <span aria-hidden="true">×</span></button></div><label class="admin-search">{{ t('搜索用户', 'Search users') }}<input v-model="search" type="search"></label><div class="admin-options" data-private><label v-for="user in matches" :key="String(user.id)"><input type="checkbox" :checked="selected(user.id)" @change="toggle(user.id)"><span>{{ user.showName || user.username || user.id }}</span></label><p v-if="!matches.length && loaded" class="muted">{{ t('无匹配用户', 'No matching users') }}</p></div></fieldset>
  </form></section>
</template>

<style scoped>
.settings-panel { padding: 24px; max-width: 1050px; }
.settings-heading { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; margin-bottom: 24px; }
.settings-heading p { margin-top: 7px; font-size: 12px; }
.admin-selection { padding: 0; border: 0; min-width: 0; }
.admin-chips { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 18px; }
.admin-chip { display: flex; align-items: center; gap: 7px; border: 1px solid var(--line); padding: 6px 10px; background: var(--blue-soft); color: var(--blue); border-radius: 7px; font-size: 12px; overflow-wrap: anywhere; }
.admin-search { display: grid; gap: 6px; font-size: 12px; max-width: 420px; }
.admin-options { margin-top: 18px; display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px 20px; max-height: 320px; overflow: auto; padding: 4px; }
.admin-options label { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; overflow-wrap: anywhere; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
@media (max-width: 640px) { .settings-panel { padding: 17px; }.settings-heading { flex-wrap: wrap; }.admin-options { grid-template-columns: 1fr; } }
</style>
