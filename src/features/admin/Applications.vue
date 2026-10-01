<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../core/api'
import { clearApp, selectApp, session } from '../../core/session'
import { clone, confirmAction, t, toast } from '../../core/ui'
import Field from '../../shared/Field.vue'
import Modal from '../../shared/Modal.vue'
import Pagination from '../../shared/Pagination.vue'
import TableState from '../../shared/TableState.vue'
import PasswordInput from '../auth/PasswordInput.vue'
import RolePicker from './RolePicker.vue'
import { editableApplication, newApplication, sameID, validIdentifier, type Application, type AppDraft, type Namespace, type Page, type User } from './contracts'
import { useQuery } from './useQuery'
import { useAdminScope } from './useAdminScope'

const router = useRouter()
const capture = useAdminScope()
const defaults = () => ({ appId: '', namespaceId: '', appNameLike: '', tagLike: '', showMyRelated: true, index: 0, pageSize: 10 })
const query = reactive(defaults())
const list = useQuery<Page<Application>>({ data: [], totalItems: 0 })
const namespaces = ref<Namespace[]>([])
const users = ref<User[]>([])
const choicesError = ref('')
const choicesLoaded = ref(false)
const open = ref(false)
const draft = ref<AppDraft>(newApplication())
const saving = ref(false)
const deleting = ref(false)
const formError = ref('')

function load() {
  const body = { ...query, appId: query.appId || undefined, namespaceId: query.namespaceId || undefined }
  return list.run(signal => api<Page<Application>>('/appInfo/list', { body, signal, quiet: true }))
}
function search() { query.index = 0; void load() }
function reset() { Object.assign(query, defaults()); void load() }
function page(index: number) { query.index = index; void load() }
async function loadChoices() {
  const scope = capture()
  choicesError.value = ''
  try {
    const [spaces, people] = await Promise.all([api<Namespace[]>('/namespace/listAll', { body: {}, signal: scope.signal, quiet: true }), api<User[]>('/user/list', { signal: scope.signal, quiet: true })])
    if (scope.valid()) { namespaces.value = spaces || []; users.value = people || []; choicesLoaded.value = true }
  } catch (failure) { if (scope.valid()) choicesError.value = (failure as Error).message }
  finally { scope.release() }
}
function edit(row?: Application) {
  draft.value = row ? editableApplication(clone(row)) : newApplication()
  formError.value = ''; open.value = true
  if (!choicesLoaded.value) void loadChoices()
}
async function save() {
  if (saving.value || deleting.value) return
  if (!validIdentifier(draft.value.appName) || !draft.value.password || draft.value.namespaceId == null || draft.value.namespaceId === '') {
    formError.value = t('请填写命名空间、无空白字符的应用名和密码。', 'Choose a namespace and enter an application name without whitespace and a password.'); return
  }
  if (!choicesLoaded.value) { formError.value = t('用户与命名空间选项尚未加载，请重试。', 'User and namespace options have not loaded. Retry first.'); return }
  saving.value = true; formError.value = ''
  const scope = capture()
  const body = clone(draft.value)
  try {
    await api<Application>('/appInfo/save', { body, headers: { AppId: body.id == null ? '' : String(body.id) }, signal: scope.signal, quiet: true })
    if (!scope.valid()) return
    open.value = false; toast(t('应用已保存', 'Application saved'), 'success'); await load()
  } catch (failure) { if (scope.valid()) formError.value = (failure as Error).message }
  finally { scope.release(); saving.value = false }
}
async function remove() {
  if (draft.value.id == null || saving.value || deleting.value) return
  const target = clone(draft.value)
  const scope = capture()
  try {
    if (!await confirmAction(t('删除应用 ', 'Delete application ') + target.appName + '?') || !scope.valid()) return
    deleting.value = true; formError.value = ''
    await api('/appInfo/delete', { body: {}, query: { appId: target.id }, headers: { AppId: String(target.id) }, signal: scope.signal, quiet: true })
    if (!scope.valid()) return
    open.value = false
    if (sameID(target.id, session.appId)) clearApp()
    toast(t('应用已删除', 'Application deleted'), 'success'); await load()
  } catch (failure) { if (scope.valid()) formError.value = (failure as Error).message }
  finally { scope.release(); deleting.value = false }
}
function enter(row: Application) { selectApp(row); void router.push('/oms/home') }
onMounted(() => { void load(); void loadChoices() })
</script>

<template>
  <header class="page-head"><div><h1>{{ t('应用', 'Applications') }}</h1><p>{{ t('选择应用，进入任务与工作流工作台。', 'Choose an application to manage jobs and workflows.') }}</p></div><button class="btn btn-primary" @click="edit()">{{ t('新建应用', 'New application') }}</button></header>
  <section class="work-panel" :aria-label="t('应用列表', 'Application list')">
    <form class="filter-bar" @submit.prevent="search">
      <Field :label="t('应用 ID', 'Application ID')" v-slot="{ id }"><input :id="id" v-model="query.appId" inputmode="numeric" pattern="[0-9]*"></Field>
      <Field :label="t('命名空间', 'Namespace')" v-slot="{ id }"><select :id="id" v-model="query.namespaceId"><option value="">{{ t('全部', 'All') }}</option><option v-for="space in namespaces" :key="String(space.id)" :value="String(space.id)">{{ space.showName || space.name || space.code }}</option></select></Field>
      <Field :label="t('应用名', 'Application name')" v-slot="{ id }"><input :id="id" v-model="query.appNameLike" type="search"></Field>
      <Field :label="t('标签', 'Tags')" v-slot="{ id }"><input :id="id" v-model="query.tagLike" type="search"></Field>
      <label class="related-filter"><input v-model="query.showMyRelated" type="checkbox" @change="search">{{ t('与我相关', 'Related to me') }}</label>
      <div class="actions"><button class="btn btn-primary" type="submit">{{ t('查询', 'Query') }}</button><button class="btn btn-quiet" type="button" @click="reset">{{ t('重置', 'Reset') }}</button></div>
    </form>
    <div v-if="list.error.value" class="error-banner" role="alert">{{ list.error.value }} <button class="btn btn-quiet" @click="load">{{ t('重试', 'Retry') }}</button></div>
    <div v-if="choicesError" class="error-banner" role="alert">{{ choicesError }} <button class="btn btn-quiet" @click="loadChoices">{{ t('重载选项', 'Reload options') }}</button></div>
    <TableState :loading="list.loading.value" :empty="!list.data.value.data.length">
      <div class="table-scroll" tabindex="0" :aria-label="t('应用表格，可横向滚动', 'Applications table, scroll horizontally')"><table class="data-table"><thead><tr><th>ID</th><th>{{ t('应用名', 'Application') }}</th><th>{{ t('描述', 'Description') }}</th><th>{{ t('命名空间', 'Namespace') }}</th><th>{{ t('创建时间', 'Created') }}</th><th>{{ t('修改时间', 'Modified') }}</th><th>{{ t('创建者', 'Creator') }}</th><th>{{ t('修改者', 'Modifier') }}</th><th>{{ t('操作', 'Actions') }}</th></tr></thead><tbody><tr v-for="row in list.data.value.data" :key="String(row.id)"><td class="code">{{ row.id }}</td><td><strong>{{ row.appName }}</strong></td><td>{{ row.title || '—' }}</td><td>{{ row.namespaceName || '—' }}</td><td>{{ row.gmtCreateStr || '—' }}</td><td>{{ row.gmtModifiedStr || '—' }}</td><td data-private>{{ row.creatorShowName || '—' }}</td><td data-private>{{ row.modifierShowName || '—' }}</td><td><div class="row-actions"><button class="btn btn-quiet btn-small" @click="edit(row)">{{ t('编辑', 'Edit') }}</button><button class="btn btn-primary btn-small" @click="enter(row)">{{ t('进入', 'Enter') }}</button></div></td></tr></tbody></table></div>
    </TableState>
    <Pagination :index="query.index" :size="query.pageSize" :total="list.data.value.totalItems" @change="page"/>
  </section>
  <Modal v-model="open" :title="draft.id == null ? t('新建应用', 'New application') : t('编辑应用', 'Edit application')" wide>
    <form id="application-form" @submit.prevent="save"><div class="form-grid">
      <Field :label="t('命名空间', 'Namespace')" required v-slot="{ id }"><select :id="id" v-model="draft.namespaceId" required :disabled="saving || deleting"><option :value="undefined" disabled>{{ t('请选择', 'Choose a namespace') }}</option><option v-for="space in namespaces" :key="String(space.id)" :value="space.id">{{ space.showName || space.name || space.code }}</option></select></Field>
      <Field :label="t('应用名', 'Application name')" required v-slot="{ id }"><input :id="id" v-model="draft.appName" required pattern="\S+" :readonly="draft.id != null" :disabled="saving || deleting"></Field>
      <Field :label="t('应用密码', 'Application password')" required v-slot="{ id }"><PasswordInput :id="id" v-model="draft.password" required autocomplete="new-password" :disabled="saving || deleting" :reset-key="open"/></Field>
      <Field :label="t('描述', 'Description')" v-slot="{ id }"><input :id="id" v-model="draft.title" :disabled="saving || deleting"></Field>
      <Field :label="t('标签', 'Tags')" v-slot="{ id }"><input :id="id" v-model="draft.tags" :disabled="saving || deleting"></Field>
      <Field :label="t('扩展配置', 'Extra configuration')" class="full" v-slot="{ id }"><textarea :id="id" v-model="draft.extra" :disabled="saving || deleting" spellcheck="false"></textarea></Field>
    </div><RolePicker v-model="draft.componentUserRoleInfo" :users="users" :disabled="saving || deleting || !choicesLoaded"/><p v-if="formError" class="error-banner" role="alert">{{ formError }}</p></form>
    <template #footer><button v-if="draft.id != null" class="btn btn-danger" :disabled="saving || deleting" @click="remove">{{ t('删除', 'Delete') }}</button><button class="btn btn-quiet" :disabled="saving || deleting" @click="open = false">{{ t('取消', 'Cancel') }}</button><button class="btn btn-primary" form="application-form" type="submit" :disabled="saving || deleting || !choicesLoaded">{{ saving ? t('保存中…', 'Saving…') : t('保存', 'Save') }}</button></template>
  </Modal>
</template>

<style scoped>
.related-filter { display: flex; align-items: center; gap: 7px; white-space: nowrap; font-size: 12px; min-height: 38px; }
.filter-bar .field { flex: 1 1 150px; min-width: 130px; max-width: 240px; }
.filter-bar .actions { flex-shrink: 0; }
@media (max-width: 640px) { .filter-bar .field { max-width: none; flex-basis: calc(50% - 10px); }.related-filter { flex: 1 1 100%; } }
</style>
