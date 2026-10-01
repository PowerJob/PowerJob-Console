<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '../../core/api'
import { clone, confirmAction, t, toast } from '../../core/ui'
import Field from '../../shared/Field.vue'
import Modal from '../../shared/Modal.vue'
import Pagination from '../../shared/Pagination.vue'
import TableState from '../../shared/TableState.vue'
import RolePicker from './RolePicker.vue'
import { editableNamespace, newNamespace, validIdentifier, type Namespace, type NamespaceDraft, type Page, type User } from './contracts'
import { useAdminScope } from './useAdminScope'
import { useQuery } from './useQuery'

const capture = useAdminScope()
const defaults = () => ({ codeLike: '', nameLike: '', tagLike: '', index: 0, pageSize: 10 })
const query = reactive(defaults())
const list = useQuery<Page<Namespace>>({ data: [], totalItems: 0 })
const users = ref<User[]>([])
const choicesLoaded = ref(false)
const choicesError = ref('')
const open = ref(false)
const draft = ref<NamespaceDraft>(newNamespace())
const saving = ref(false)
const deleting = ref(false)
const formError = ref('')
function load() { const body = { ...query }; return list.run(signal => api<Page<Namespace>>('/namespace/list', { body, signal, quiet: true })) }
function search() { query.index = 0; void load() }
function reset() { Object.assign(query, defaults()); void load() }
function page(index: number) { query.index = index; void load() }
async function loadUsers() {
  const scope = capture(); choicesError.value = ''
  try { const result = await api<User[]>('/user/list', { signal: scope.signal, quiet: true }); if (scope.valid()) { users.value = result || []; choicesLoaded.value = true } }
  catch (failure) { if (scope.valid()) choicesError.value = (failure as Error).message }
  finally { scope.release() }
}
function edit(row?: Namespace) { draft.value = row ? editableNamespace(clone(row)) : newNamespace(); formError.value = ''; open.value = true; if (!choicesLoaded.value) void loadUsers() }
async function save() {
  if (saving.value || deleting.value) return
  if (!validIdentifier(draft.value.code)) { formError.value = t('请输入无空白字符的命名空间编码。', 'Enter a namespace code without whitespace.'); return }
  if (!choicesLoaded.value) { formError.value = t('用户选项尚未加载，请重试。', 'User options have not loaded. Retry first.'); return }
  saving.value = true; formError.value = ''
  const scope = capture(); const body = clone(draft.value)
  try {
    await api('/namespace/save', { body, headers: { NamespaceId: body.id == null ? '' : String(body.id) }, signal: scope.signal, quiet: true })
    if (!scope.valid()) return
    open.value = false; toast(t('命名空间已保存', 'Namespace saved'), 'success'); await load()
  } catch (failure) { if (scope.valid()) formError.value = (failure as Error).message }
  finally { scope.release(); saving.value = false }
}
async function remove(row: Namespace | NamespaceDraft) {
  if (row.id == null || deleting.value || saving.value) return
  const target = clone(row); const scope = capture()
  try {
    if (!await confirmAction(t('删除命名空间 ', 'Delete namespace ') + target.code + '?') || !scope.valid()) return
    deleting.value = true; formError.value = ''
    await api('/namespace/delete', { method: 'DELETE', query: { id: target.id }, headers: { NamespaceId: String(target.id) }, signal: scope.signal, quiet: true })
    if (!scope.valid()) return
    open.value = false; toast(t('命名空间已删除', 'Namespace deleted'), 'success'); await load()
  } catch (failure) { if (scope.valid()) { if (open.value) formError.value = (failure as Error).message; else toast((failure as Error).message, 'error') } }
  finally { scope.release(); deleting.value = false }
}
onMounted(() => { void load(); void loadUsers() })
</script>

<template>
  <header class="page-head"><div><h1>{{ t('命名空间', 'Namespaces') }}</h1><p>{{ t('管理应用分组及其继承权限。', 'Manage application groups and inherited permissions.') }}</p></div><button class="btn btn-primary" @click="edit()">{{ t('新建命名空间', 'New namespace') }}</button></header>
  <section class="work-panel">
    <form class="filter-bar" @submit.prevent="search"><Field :label="t('编码', 'Code')" v-slot="{ id }"><input :id="id" v-model="query.codeLike" type="search"></Field><Field :label="t('名称', 'Name')" v-slot="{ id }"><input :id="id" v-model="query.nameLike" type="search"></Field><Field :label="t('标签', 'Tags')" v-slot="{ id }"><input :id="id" v-model="query.tagLike" type="search"></Field><div class="actions"><button class="btn btn-primary" type="submit">{{ t('查询', 'Query') }}</button><button class="btn btn-quiet" type="button" @click="reset">{{ t('重置', 'Reset') }}</button></div></form>
    <p v-if="list.error.value" class="error-banner" role="alert">{{ list.error.value }} <button class="btn btn-quiet" @click="load">{{ t('重试', 'Retry') }}</button></p>
    <p v-if="choicesError" class="error-banner" role="alert">{{ choicesError }} <button class="btn btn-quiet" @click="loadUsers">{{ t('重载用户', 'Reload users') }}</button></p>
    <TableState :loading="list.loading.value" :empty="!list.data.value.data.length"><div class="table-scroll" tabindex="0" :aria-label="t('命名空间表格，可横向滚动', 'Namespaces table, scroll horizontally')"><table class="data-table"><thead><tr><th>ID</th><th>{{ t('编码', 'Code') }}</th><th>{{ t('名称', 'Name') }}</th><th>{{ t('状态', 'Status') }}</th><th>{{ t('创建时间', 'Created') }}</th><th>{{ t('修改时间', 'Modified') }}</th><th>{{ t('创建者', 'Creator') }}</th><th>{{ t('修改者', 'Modifier') }}</th><th>{{ t('操作', 'Actions') }}</th></tr></thead><tbody><tr v-for="row in list.data.value.data" :key="String(row.id)"><td class="code">{{ row.id }}</td><td><strong>{{ row.code }}</strong></td><td>{{ row.name || '—' }}</td><td><span class="badge" :class="row.status === 1 ? 'success' : ''">{{ row.statusStr || row.status }}</span></td><td>{{ row.gmtCreateStr || '—' }}</td><td>{{ row.gmtModifiedStr || '—' }}</td><td data-private>{{ row.creatorShowName || '—' }}</td><td data-private>{{ row.modifierShowName || '—' }}</td><td><div class="row-actions"><button class="btn btn-quiet btn-small" @click="edit(row)">{{ t('编辑', 'Edit') }}</button><button class="btn btn-quiet btn-small" :disabled="deleting" @click="remove(row)">{{ t('删除', 'Delete') }}</button></div></td></tr></tbody></table></div></TableState>
    <Pagination hide-on-single-page :index="query.index" :size="query.pageSize" :total="list.data.value.totalItems" @change="page"/>
  </section>
  <Modal v-model="open" :title="draft.id == null ? t('新建命名空间', 'New namespace') : t('编辑命名空间', 'Edit namespace')" wide>
    <form id="namespace-form" @submit.prevent="save"><div class="form-grid"><Field :label="t('编码', 'Code')" required v-slot="{ id }"><input :id="id" v-model="draft.code" required pattern="\S+" :readonly="draft.id != null" :disabled="saving || deleting"></Field><Field :label="t('名称', 'Name')" v-slot="{ id }"><input :id="id" v-model="draft.name" :disabled="saving || deleting"></Field><Field :label="t('标签', 'Tags')" v-slot="{ id }"><input :id="id" v-model="draft.tags" :disabled="saving || deleting"></Field><Field v-if="draft.id != null" :label="t('访问令牌', 'Access token')" v-slot="{ id }"><input :id="id" :value="draft.token" type="password" readonly autocomplete="off"></Field><Field :label="t('扩展配置', 'Extra configuration')" class="full" v-slot="{ id }"><textarea :id="id" v-model="draft.extra" :disabled="saving || deleting" spellcheck="false"></textarea></Field></div><RolePicker v-model="draft.componentUserRoleInfo" :users="users" :disabled="saving || deleting || !choicesLoaded"/><p v-if="formError" class="error-banner" role="alert">{{ formError }}</p></form>
    <template #footer><button class="btn btn-quiet" :disabled="saving || deleting" @click="open = false">{{ t('取消', 'Cancel') }}</button><button class="btn btn-primary" form="namespace-form" type="submit" :disabled="saving || deleting || !choicesLoaded">{{ saving ? t('保存中…', 'Saving…') : t('保存', 'Save') }}</button></template>
  </Modal>
</template>
