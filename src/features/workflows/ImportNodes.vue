<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { t } from '../../core/ui';
import { session } from '../../core/session';
import Modal from '../../shared/Modal.vue';
import Field from '../../shared/Field.vue';
import Pagination from '../../shared/Pagination.vue';
import TableState from '../../shared/TableState.vue';
import { listJobs, listWorkflows, saveNodes } from './api';
import { id } from './domain';
import { useScope } from './useScope';
import type { Id, JobOption, Workflow, WorkflowNode } from './types';

const props = defineProps<{ modelValue: boolean; kind: 1 | 3 }>();
const emit = defineEmits<{ 'update:modelValue': [open: boolean]; imported: [nodes: WorkflowNode[]] }>();
const scope = useScope(), keyword = ref(''), exactId = ref(''), index = ref(0), total = ref(0), loading = ref(false), saving = ref(false), error = ref('');
const items = ref<(JobOption | Workflow)[]>([]), selected = ref<Map<Id, JobOption | Workflow>>(new Map());
let sequence = 0;
const title = computed(() => props.kind === 1 ? t('导入任务', 'Import jobs') : t('导入子工作流', 'Import a workflow'));
function label(item: JobOption | Workflow): string { return String(props.kind === 1 ? item.jobName || '' : item.wfName || ''); }
function description(item: JobOption | Workflow): string { return String(props.kind === 1 ? item.jobDescription || '' : item.wfDescription || ''); }
async function load() {
  const token = scope.capture(), current = ++sequence; loading.value = true; error.value = '';
  try { const page = props.kind === 1 ? await listJobs({ index: index.value, pageSize: 8, keyword: keyword.value || undefined, jobId: exactId.value || undefined }, token.signal) : await listWorkflows({ index: index.value, pageSize: 8, keyword: keyword.value || undefined, workflowId: exactId.value || undefined }, token.signal); if (token.valid() && current === sequence) { items.value = page.data; total.value = Number(page.totalItems); } }
  catch (failure) { if (token.valid() && current === sequence) error.value = (failure as Error).message; }
  finally { if (token.valid() && current === sequence) loading.value = false; token.release(); }
}
function search() { index.value = 0; selected.value = new Map(); load(); }
function reset() { keyword.value = ''; exactId.value = ''; search(); }
function toggle(item: JobOption | Workflow) { const next = new Map(selected.value), key = id(item.id); if (next.has(key)) next.delete(key); else next.set(key, item); selected.value = next; }
function selectPage() { const next = new Map(selected.value), all = items.value.every(item => next.has(id(item.id))); for (const item of items.value) { if (all) next.delete(id(item.id)); else next.set(id(item.id), item); } selected.value = next; }
async function importSelected(single?: JobOption | Workflow) {
  const rows = single ? [single] : [...selected.value.values()]; if (!rows.length || saving.value) return;
  const token = scope.capture(); saving.value = true; error.value = '';
  try { const nodes = await saveNodes(rows.map(item => ({ type: props.kind, jobId: id(item.id), nodeName: label(item), nodeParams: '', enable: true, skipWhenFailed: false })), token.signal); if (token.valid()) { emit('imported', nodes); emit('update:modelValue', false); selected.value = new Map(); } }
  catch (failure) { if (token.valid()) error.value = (failure as Error).message; }
  finally { if (token.valid()) saving.value = false; token.release(); }
}
watch([() => props.modelValue, () => props.kind, () => session.revision], ([open]) => { scope.invalidate(); sequence++; if (open) { index.value = 0; selected.value = new Map(); items.value = []; keyword.value = ''; exactId.value = ''; saving.value = false; load(); } else { saving.value = false; loading.value = false; } }, { immediate: true });
</script>

<template>
  <Modal :model-value="modelValue" :title="title" wide @update:model-value="emit('update:modelValue', $event)">
    <form class="filter-bar import-filter" @submit.prevent="search"><Field :label="t('名称', 'Name')" v-slot="{id: inputId}"><input :id="inputId" v-model="keyword" /></Field><Field :label="kind === 1 ? t('任务 ID', 'Job ID') : t('工作流 ID', 'Workflow ID')" v-slot="{id: inputId}"><input :id="inputId" v-model="exactId" inputmode="numeric" /></Field><button class="btn btn-primary" type="submit">{{ t('查询', 'Search') }}</button><button class="btn btn-quiet" type="button" @click="reset">{{ t('重置', 'Reset') }}</button></form>
    <p v-if="error" class="error-banner" role="alert">{{ error }}</p>
    <TableState :loading="loading" :empty="!items.length"><div class="table-scroll"><table class="data-table"><thead><tr><th><input type="checkbox" :aria-label="t('选择本页', 'Select this page')" :checked="!!items.length && items.every(item => selected.has(id(item.id)))" @change="selectPage" /></th><th>{{ t('名称', 'Name') }}</th><th>ID</th><th>{{ t('描述', 'Description') }}</th><th>{{ t('操作', 'Actions') }}</th></tr></thead><tbody><tr v-for="item in items" :key="id(item.id)"><td><input type="checkbox" :aria-label="`${t('选择', 'Select')} ${label(item)}`" :checked="selected.has(id(item.id))" @change="toggle(item)" /></td><td class="import-name">{{ label(item) }}</td><td>{{ item.id }}</td><td class="import-description">{{ description(item) || '—' }}</td><td><button class="btn btn-quiet" :disabled="saving" @click="importSelected(item)">{{ t('导入', 'Import') }}</button></td></tr></tbody></table></div></TableState>
    <Pagination :index="index" :size="8" :total="total" @change="index = $event; load()" />
    <template #footer><span class="selection-count">{{ t('已选择', 'Selected') }} {{ selected.size }}</span><button class="btn btn-quiet" @click="emit('update:modelValue', false)">{{ t('取消', 'Cancel') }}</button><button class="btn btn-primary" :disabled="saving || !selected.size" @click="importSelected()">{{ saving ? t('导入中…', 'Importing…') : `${t('导入所选', 'Import selected')} (${selected.size})` }}</button></template>
  </Modal>
</template>
<style scoped>
.import-filter{align-items:end}.import-name{max-width:260px;overflow-wrap:anywhere;font-weight:600}.import-description{max-width:320px;white-space:normal;overflow-wrap:anywhere}.selection-count{margin-right:auto;color:var(--muted,#718099);font-size:13px}
</style>
