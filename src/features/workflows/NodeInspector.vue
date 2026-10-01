<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { t } from '../../core/ui';
import Field from '../../shared/Field.vue';
import CodeEditor from '../../shared/CodeEditor.vue';
import { copy, id, nodeRequest } from './domain';
import { listJobs, listWorkflows, saveNodes } from './api';
import { useScope } from './useScope';
import type { WorkflowNode } from './types';

const props = defineProps<{ node: WorkflowNode }>();
const emit = defineEmits<{ preview: [node: WorkflowNode]; saved: [node: WorkflowNode]; close: [] }>();
const scope = useScope(), draft = ref<WorkflowNode>(copy(props.node)), search = ref(''), options = ref<{ id: string; name: string }[]>([]), loading = ref(false), saving = ref(false), error = ref('');
let timer: ReturnType<typeof setTimeout> | undefined, sequence = 0;
const kind = computed(() => draft.value.nodeType === 2 ? t('条件节点', 'Condition') : draft.value.nodeType === 3 ? t('子工作流', 'Nested workflow') : t('任务节点', 'Job node'));
const code = computed({ get: () => draft.value.nodeParams || '', set: value => { draft.value.nodeParams = value; } });
watch(() => props.node.nodeId, () => { scope.invalidate(); clearTimeout(timer); sequence++; draft.value = copy(props.node); options.value = []; search.value = ''; error.value = ''; saving.value = false; if (draft.value.nodeType !== 2) find(true); });
// Parent refreshes the draft after explicit save, never while the user is typing.
watch(() => draft.value, value => emit('preview', copy(value)), { deep: true, flush: 'sync' });
async function find(selected = false) {
  const token = scope.capture(), current = ++sequence; loading.value = true;
  try { const page = draft.value.nodeType === 3 ? await listWorkflows({ index: 0, pageSize: 20, keyword: search.value || undefined, workflowId: selected ? draft.value.jobId || undefined : undefined }, token.signal) : await listJobs({ index: 0, pageSize: 20, keyword: search.value || undefined, jobId: selected ? draft.value.jobId || undefined : undefined }, token.signal); if (token.valid() && current === sequence) options.value = page.data.map(item => ({ id: id(item.id), name: String('jobName' in item ? item.jobName : item.wfName) })); }
  catch (failure) { if (token.valid() && current === sequence) error.value = (failure as Error).message; }
  finally { if (token.valid() && current === sequence) loading.value = false; token.release(); }
}
function queueSearch() { clearTimeout(timer); timer = setTimeout(() => find(), 180); }
async function save() {
  if (saving.value) return; if (draft.value.nodeType === 2 && !draft.value.nodeParams?.trim()) { error.value = t('条件脚本不能为空', 'The condition script cannot be empty'); return; } if (draft.value.nodeType !== 2 && !draft.value.jobId) { error.value = t('请选择任务或工作流', 'Choose a job or workflow'); return; }
  const token = scope.capture(); saving.value = true; error.value = '';
  try { const [saved] = await saveNodes([nodeRequest(draft.value)], token.signal); if (token.valid() && saved) { draft.value = { ...draft.value, ...saved }; emit('saved', copy(draft.value)); } }
  catch (failure) { if (token.valid()) error.value = (failure as Error).message; }
  finally { if (token.valid()) saving.value = false; token.release(); }
}
if (draft.value.nodeType !== 2) find(true);
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <aside class="node-inspector"><header><div><span>{{ kind }}</span><strong>{{ draft.nodeName || t('未命名节点', 'Untitled node') }}</strong><small>#{{ draft.nodeId }}</small></div><button class="icon-button" :aria-label="t('关闭节点面板', 'Close node inspector')" @click="emit('close')">×</button></header>
    <form @submit.prevent="save"><fieldset :disabled="saving"><Field :label="t('节点名称', 'Node name')" v-slot="{id: inputId}"><input :id="inputId" v-model="draft.nodeName" maxlength="255" /></Field>
      <template v-if="draft.nodeType !== 2"><Field :label="draft.nodeType === 3 ? t('查找子工作流', 'Find a workflow') : t('查找任务', 'Find a job')" v-slot="{id: inputId}"><input :id="inputId" v-model="search" :placeholder="t('输入名称搜索', 'Search by name')" @input="queueSearch" /></Field><Field :label="draft.nodeType === 3 ? t('工作流', 'Workflow') : t('任务', 'Job')" required v-slot="{id: inputId}"><select :id="inputId" v-model="draft.jobId" :aria-busy="loading"><option v-if="draft.jobId && !options.some(item => item.id === draft.jobId)" :value="draft.jobId">#{{ draft.jobId }}</option><option v-for="item in options" :key="item.id" :value="item.id">{{ item.name }} (#{{ item.id }})</option><option v-if="!draft.jobId" value="">{{ t('请选择', 'Choose') }}</option></select></Field></template>
      <Field :label="draft.nodeType === 2 ? t('条件脚本（Groovy）', 'Condition script (Groovy)') : t('节点参数', 'Node parameters')" :hint="draft.nodeType === 2 ? t('返回布尔值或数值：大于 0 为 Y，其余数值为 N。', 'Return a boolean or number: values above 0 select Y, other numbers select N.') : undefined"><CodeEditor v-if="draft.nodeType === 2" v-model="code" language="java" :height="300" /><textarea v-else v-model="draft.nodeParams" rows="5" /></Field>
      <div v-if="draft.nodeType !== 2" class="node-flags"><label><input v-model="draft.enable" type="checkbox" />{{ t('启用此节点', 'Enable node') }}</label><label><input v-model="draft.skipWhenFailed" type="checkbox" />{{ t('执行失败时继续', 'Continue after failure') }}</label></div><p v-if="error" class="error-banner" role="alert">{{ error }}</p><button class="btn btn-primary" type="submit" :disabled="saving">{{ saving ? t('保存中…', 'Saving…') : t('保存节点', 'Save node') }}</button>
    </fieldset></form>
  </aside>
</template>
<style scoped>
.node-inspector{min-width:0;border:1px solid var(--border,#e0e6f0);border-radius:16px;background:#fff;align-self:start}.node-inspector header{display:flex;gap:12px;justify-content:space-between;padding:18px;border-bottom:1px solid var(--border,#e0e6f0)}.node-inspector header div{display:flex;flex-direction:column;gap:5px;min-width:0}.node-inspector header span,.node-inspector header small{font-size:11px;color:var(--muted,#718099)}.node-inspector header strong{overflow-wrap:anywhere;font-size:15px}.node-inspector form{display:flex;flex-direction:column;gap:17px;padding:18px}.node-inspector fieldset{display:contents;border:0;margin:0;padding:0}.node-inspector .btn{align-self:flex-start}.node-flags{display:flex;flex-direction:column;gap:10px;font-size:13px}.node-flags label{display:flex;align-items:center;gap:8px}.node-flags input{width:auto}.node-inspector textarea{width:100%;box-sizing:border-box;resize:vertical}
</style>
