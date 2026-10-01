<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '../../core/api'
import { t, toast } from '../../core/ui'
import Field from '../../shared/Field.vue'
import Pagination from '../../shared/Pagination.vue'
import TableState from '../../shared/TableState.vue'
import type { ID, User } from './contracts'
import { useQuery } from './useQuery'
import { useAdminScope } from './useAdminScope'

const capture = useAdminScope()
const query = reactive({ userIdEq: '', nickLike: '', phoneLike: '' })
const index = ref(0)
const size = 10
const list = useQuery<User[]>([])
const pending = reactive(new Set<string>())
const rows = computed(() => list.data.value.slice(index.value * size, (index.value + 1) * size))
async function load() {
  const body = { ...query, userIdEq: query.userIdEq || undefined }
  if (await list.run(signal => api<User[]>('/user/query', { body, signal, quiet: true }))) index.value = Math.min(index.value, Math.max(0, Math.ceil(list.data.value.length / size) - 1))
}
function search() { index.value = 0; void load() }
function reset() { Object.assign(query, { userIdEq: '', nickLike: '', phoneLike: '' }); search() }
async function toggle(user: User) {
  const id: ID = user.id; const key = String(id)
  if (pending.has(key)) return
  pending.add(key); const scope = capture()
  const enabled = user.enable === true
  try {
    await api('/user/' + (enabled ? 'disable' : 'enable'), { method: 'POST', query: { uid: id }, signal: scope.signal, quiet: true })
    if (!scope.valid()) return
    user.enable = !enabled
    toast(enabled ? t('用户已禁用', 'User disabled') : t('用户已启用', 'User enabled'), 'success')
    await load()
  } catch (failure) { if (scope.valid()) toast((failure as Error).message, 'error') }
  finally { scope.release(); pending.delete(key) }
}
onMounted(() => void load())
</script>

<template>
  <header class="page-head"><div><h1>{{ t('用户', 'Users') }}</h1><p>{{ t('查询账号与管理启用状态。', 'Find accounts and manage access status.') }}</p></div></header>
  <section class="work-panel"><form class="filter-bar" @submit.prevent="search"><Field :label="t('用户 ID', 'User ID')" v-slot="{ id }"><input :id="id" v-model="query.userIdEq" inputmode="numeric" pattern="[0-9]*"></Field><Field :label="t('昵称', 'Nickname')" v-slot="{ id }"><input :id="id" v-model="query.nickLike" type="search"></Field><Field :label="t('手机号', 'Phone')" v-slot="{ id }"><input :id="id" v-model="query.phoneLike" type="search"></Field><div class="actions"><button class="btn btn-primary" type="submit">{{ t('查询', 'Query') }}</button><button class="btn btn-quiet" type="button" @click="reset">{{ t('重置', 'Reset') }}</button></div></form>
    <p v-if="list.error.value" class="error-banner" role="alert">{{ list.error.value }} <button class="btn btn-quiet" @click="load">{{ t('重试', 'Retry') }}</button></p>
    <TableState :loading="list.loading.value" :empty="!list.data.value.length"><div class="table-scroll" tabindex="0" :aria-label="t('用户表格，可横向滚动', 'Users table, scroll horizontally')"><table class="data-table"><thead><tr><th>ID</th><th>{{ t('账号类型', 'Account type') }}</th><th>{{ t('用户名', 'Username') }}</th><th>{{ t('昵称', 'Nickname') }}</th><th>{{ t('手机号', 'Phone') }}</th><th>{{ t('邮箱', 'Email') }}</th><th>{{ t('状态', 'Status') }}</th></tr></thead><tbody data-private><tr v-for="user in rows" :key="String(user.id)"><td class="code">{{ user.id }}</td><td><span class="badge">{{ user.accountType }}</span></td><td>{{ user.username }}</td><td>{{ user.nick || '—' }}</td><td>{{ user.phone || '—' }}</td><td>{{ user.email || '—' }}</td><td><button role="switch" type="button" class="user-switch" :aria-checked="user.enable === true" :aria-label="t('启用用户', 'Enable user') + ' ' + (user.username || user.id)" :disabled="pending.has(String(user.id))" @click="toggle(user)"><span class="switch-track" :class="{ enabled: user.enable }" aria-hidden="true"><span></span></span><span>{{ user.enable ? t('已启用', 'Enabled') : t('已禁用', 'Disabled') }}</span></button></td></tr></tbody></table></div></TableState>
    <Pagination :index="index" :size="size" :total="list.data.value.length" @change="index = $event"/>
  </section>
</template>

<style scoped>
.user-switch { display: inline-flex; align-items: center; gap: 8px; border: 0; background: transparent; padding: 5px 0; font-size: 12px; }
.switch-track { width: 30px; height: 18px; border-radius: 12px; background: #c8d0df; padding: 3px; display: flex; align-items: center; }
.switch-track span { height: 12px; width: 12px; border-radius: 50%; background: white; box-shadow: 0 1px 3px #17233d22; }
.switch-track.enabled { background: var(--green); justify-content: flex-end; }
</style>
