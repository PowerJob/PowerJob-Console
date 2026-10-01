<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../../core/api';
import { session } from '../../core/session';
import { t, toast } from '../../core/ui';
import Field from '../../shared/Field.vue';
import ScheduleFields from '../schedule/ScheduleFields.vue';
import WorkflowGraph from './WorkflowGraph.vue';
import NodeInspector from './NodeInspector.vue';
import ImportNodes from './ImportNodes.vue';
import { fetchWorkflow, saveNodes, saveWorkflow } from './api';
import { copy, emptyDag, id, initialWorkflow, nodeRequest, readDag, workflowPayload } from './domain';
import { useScope } from './useScope';
import type { Dag, Id, Workflow, WorkflowNode } from './types';

const route = useRoute(), router = useRouter(), scope = useScope();
const workflow = ref<Workflow>(initialWorkflow(session.appId)), dag = ref<Dag>(emptyDag()), selectedId = ref<Id | null>(null);
const graph = ref<InstanceType<typeof WorkflowGraph>>(), loading = ref(false), saving = ref(false), error = ref(''), metadataOpen = ref(false);
const importOpen = ref(false), importKind = ref<1 | 3>(1), pending = reactive(new Map<Id, WorkflowNode>()), alarmUsers = ref<{ id: Id; username?: string; name?: string }[]>([]);
const currentId = computed(() => id(route.query.workflowId || route.params.workflowId));
const selected = computed(() => dag.value.nodes.find(node => node.nodeId === selectedId.value));
const scheduleExpression = computed({ get: () => workflow.value.timeExpression ?? '', set: value => { workflow.value.timeExpression = value; } });
const lifecycle = computed({ get: () => workflow.value.lifeCycle ?? null, set: value => { workflow.value.lifeCycle = value; } });
const alarmSelection = computed({ get: () => workflow.value.notifyUserIds ?? [], set: value => { workflow.value.notifyUserIds = value; } });
let loadSequence = 0;
async function restore() {
  scope.invalidate(); loadSequence++; const sequence = loadSequence;
  workflow.value = initialWorkflow(session.appId); dag.value = emptyDag(); selectedId.value = null; pending.clear(); error.value = ''; saving.value = false; importOpen.value = false;
  const resourceId = currentId.value; if (!resourceId) { loading.value = false; metadataOpen.value = true; return; }
  const token = scope.capture(); loading.value = true;
  try { const result = await fetchWorkflow(resourceId, token.signal); if (token.valid() && sequence === loadSequence) { workflow.value = { ...copy(result), id: id(result.id), lifeCycle: result.lifeCycle == null ? null : copy(result.lifeCycle), notifyUserIds: result.notifyUserIds == null ? result.notifyUserIds : result.notifyUserIds.map(id) }; dag.value = readDag(result.peworkflowDAG); metadataOpen.value = false; await nextTick(); graph.value?.arrange(); } }
  catch (failure) { if (token.valid() && sequence === loadSequence) error.value = (failure as Error).message; }
  finally { if (token.valid() && sequence === loadSequence) loading.value = false; token.release(); }
}
async function users() { const token = scope.capture(); try { const response = await api<{ id: Id; username?: string; name?: string }[]>('/user/list', { signal: token.signal }); if (token.valid()) alarmUsers.value = response.map(user => ({ ...user, id: id(user.id) })); } catch { /* The list is optional; selected IDs remain intact. */ } finally { token.release(); } }
function openImport(kind: 1 | 3) { importKind.value = kind; importOpen.value = true; }
function imported(nodes: WorkflowNode[]) { dag.value = { ...dag.value, nodes: [...dag.value.nodes, ...nodes] }; selectedId.value = nodes.at(-1)?.nodeId || null; nextTick(() => graph.value?.arrange()); }
async function addCondition() { if (saving.value) return; const token = scope.capture(); saving.value = true; error.value = ''; try { const nodes = await saveNodes([{ type: 2, nodeName: t('条件', 'Condition'), nodeParams: 'true', enable: true, skipWhenFailed: false }], token.signal); if (token.valid()) imported(nodes); } catch (failure) { if (token.valid()) error.value = (failure as Error).message; } finally { if (token.valid()) saving.value = false; token.release(); } }
function preview(node: WorkflowNode) { const index = dag.value.nodes.findIndex(n => n.nodeId === node.nodeId); if (index < 0) return; dag.value.nodes[index] = copy(node); pending.set(node.nodeId, copy(node)); }
function saved(node: WorkflowNode) { const index = dag.value.nodes.findIndex(n => n.nodeId === node.nodeId); if (index >= 0) dag.value.nodes[index] = copy(node); pending.delete(node.nodeId); toast(t('节点已保存', 'Node saved'), 'success'); }
function removed(ids: Id[]) { for (const nodeId of ids) pending.delete(nodeId); if (ids.includes(selectedId.value || '')) selectedId.value = null; }
function message(reason: string) { const messages: Record<string, string> = { name: t('请输入不超过 255 字符的工作流名称', 'Enter a workflow name up to 255 characters'), parallel: t('最大并行实例数必须为正整数', 'Maximum parallel instances must be a positive integer'), empty: t('请先导入至少一个节点', 'Import at least one node'), branches: t('每个条件节点必须有 Y、N 两条连线', 'Each condition requires one Y and one N connection'), script: t('条件脚本不能为空', 'The condition script cannot be empty'), cycle: t('流程中不能存在循环', 'The workflow cannot contain a cycle'), lifecycle: t('生效时间无效，结束时间不能早于开始时间', 'Invalid lifecycle: the end must not precede the start') }; return messages[reason] || t('请检查节点和连线', 'Check the nodes and connections'); }
async function save() {
  if (saving.value || loading.value) return;
  let payload: ReturnType<typeof workflowPayload>;
  try { payload = workflowPayload(workflow.value, dag.value); } catch (failure) { error.value = message((failure as Error).message); metadataOpen.value = true; toast(error.value, 'error'); return; }
  const token = scope.capture(); saving.value = true; error.value = '';
  try { if (pending.size) { const persisted = await saveNodes([...pending.values()].filter(n => dag.value.nodes.some(present => present.nodeId === n.nodeId)).map(nodeRequest), token.signal); if (!token.valid()) return; for (const node of persisted) pending.delete(node.nodeId); }
    const workflowId = await saveWorkflow(payload, token.signal); if (!token.valid()) return; workflow.value.id = workflowId; await router.replace({ path: '/oms/workflowEditor', query: { ...route.query, workflowId } }); if (token.valid()) toast(t('工作流已保存', 'Workflow saved'), 'success');
  } catch (failure) { if (token.valid()) error.value = (failure as Error).message; }
  finally { if (token.valid()) saving.value = false; token.release(); }
}
watch([currentId, () => session.revision], () => { restore(); users(); }, { immediate: true });
</script>

<template>
  <div class="workflow-editor">
    <header class="page-head"><div class="editor-identity"><button class="editor-back" @click="router.push('/oms/workflow')">{{ t('工作流', 'Workflows') }}</button><h1 class="page-title">{{ workflow.wfName || t('新建工作流', 'New workflow') }}</h1><p v-if="workflow.id">#{{ workflow.id }}<span>{{ t('先编辑节点，再保存整个执行流程', 'Edit nodes, then save the execution flow') }}</span></p></div><div class="row-actions"><button class="btn btn-quiet" :aria-expanded="metadataOpen" @click="metadataOpen = !metadataOpen">{{ t('工作流设置', 'Workflow settings') }}</button><button class="btn btn-primary" :disabled="saving || loading" @click="save">{{ saving ? t('保存中…', 'Saving…') : t('保存工作流', 'Save workflow') }}</button></div></header>
    <p v-if="error" class="error-banner" role="alert">{{ error }}<button v-if="currentId && !workflow.id" class="btn btn-quiet" @click="restore">{{ t('重新加载', 'Reload') }}</button></p>
    <section v-show="metadataOpen" class="work-panel workflow-settings"><fieldset class="settings-columns" :disabled="saving || loading"><div class="settings-identity"><Field :label="t('工作流名称', 'Workflow name')" required v-slot="{id: inputId}"><input :id="inputId" v-model="workflow.wfName" maxlength="255" /></Field><Field :label="t('描述', 'Description')" v-slot="{id: inputId}"><textarea :id="inputId" v-model="workflow.wfDescription" rows="3" /></Field><div class="form-grid"><Field :label="t('最大并行实例数', 'Maximum parallel instances')" v-slot="{id: inputId}"><input :id="inputId" v-model.number="workflow.maxWfInstanceNum" type="number" min="1" /></Field><Field :label="t('失败告警联系人', 'Failure notifications')" v-slot="{id: inputId}"><select :id="inputId" v-model="alarmSelection" multiple><option v-for="user in alarmUsers" :key="user.id" :value="user.id">{{ user.username || user.name || user.id }}</option><option v-for="userId in workflow.notifyUserIds?.filter(userId => !alarmUsers.some(user => user.id === userId))" :key="userId" :value="userId">#{{ userId }}</option></select></Field></div></div><div class="settings-schedule"><ScheduleFields v-model:type="workflow.timeExpressionType" v-model:expression="scheduleExpression" v-model:life-cycle="lifecycle" :types="['API', 'CRON']" /></div></fieldset></section>
    <div class="editor-layout" :class="{ 'has-inspector': selected }" :aria-busy="loading"><WorkflowGraph ref="graph" v-model="dag" :readonly="saving || loading" @select="selectedId = $event" @remove="removed"><template #tools><button class="btn btn-primary" :disabled="loading || saving" @click="openImport(1)">+ {{ t('任务', 'Jobs') }}</button><button class="btn btn-quiet" :disabled="loading || saving" @click="addCondition">{{ t('条件', 'Condition') }}</button><button class="btn btn-quiet" :disabled="loading || saving" @click="openImport(3)">{{ t('子工作流', 'Workflow') }}</button></template><template #empty><button class="btn btn-primary" :disabled="loading || saving" @click="openImport(1)">{{ t('导入任务', 'Import jobs') }}</button></template></WorkflowGraph><NodeInspector v-if="selected" :key="selected.nodeId" :node="selected" @preview="preview" @saved="saved" @close="selectedId = null; graph?.clear()" /></div>
    <ImportNodes v-model="importOpen" :kind="importKind" @imported="imported" />
  </div>
</template>
<style scoped>
.workflow-editor{min-width:0}.editor-identity{min-width:0;flex:1}.editor-back{padding:0;background:none;border:0;color:var(--muted,#718099);font:inherit;font-size:12px;cursor:pointer}.editor-identity h1{margin-top:7px;overflow-wrap:anywhere}.editor-identity p{display:flex;flex-wrap:wrap;gap:14px;margin:8px 0 0;font-size:12px;color:var(--muted,#718099)}.workflow-settings{margin-bottom:20px;padding:22px}.settings-columns{border:0;margin:0;padding:0;min-width:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px}.settings-identity{display:flex;flex-direction:column;gap:18px}.settings-schedule{border-left:1px solid var(--border,#e0e6f0);padding-left:32px}.editor-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:18px;min-width:0}.editor-layout.has-inspector{grid-template-columns:minmax(0,1fr) minmax(285px,340px)}.workflow-editor .page-head>.row-actions{flex-wrap:wrap;align-self:flex-start}.workflow-editor textarea{resize:vertical}.workflow-editor .error-banner{display:flex;align-items:center;justify-content:space-between;gap:12px}@media(max-width:1100px){.editor-layout.has-inspector{grid-template-columns:minmax(0,1fr)}.editor-layout:deep(.node-inspector form){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}}@media(max-width:760px){.settings-columns{grid-template-columns:minmax(0,1fr);gap:22px}.settings-schedule{padding-left:0;border-left:0;border-top:1px solid var(--border,#e0e6f0);padding-top:22px}.workflow-settings{padding:16px}.editor-layout:deep(.node-inspector form){display:flex}.workflow-editor .page-head>.row-actions{width:100%;justify-content:space-between}.editor-identity p span{display:none}}
</style>
