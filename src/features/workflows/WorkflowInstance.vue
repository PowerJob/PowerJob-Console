<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { session } from '../../core/session';
import { t, toast } from '../../core/ui';
import WorkflowGraph from './WorkflowGraph.vue';
import { actOnInstance, fetchWorkflowInstance } from './api';
import { displayContext, emptyDag, id, readDag } from './domain';
import { nodeStatus, nodeTone, workflowStatus, workflowTone } from './status';
import { useScope } from './useScope';
import type { Dag, Id, WorkflowInstance } from './types';

const InstanceDetail = defineAsyncComponent(() => import('../instances/InstanceDetail.vue'));
const route = useRoute(), router = useRouter(), scope = useScope();
const resourceId = computed(() => id(route.query.wfInstanceId || route.params.wfInstanceId));
const detail = ref<WorkflowInstance | null>(null), dag = ref<Dag>(emptyDag()), selectedId = ref<Id | null>(null), graph = ref<InstanceType<typeof WorkflowGraph>>();
const loading = ref(false), operating = ref(false), error = ref(''), autoRefresh = ref(false);
const selected = computed(() => dag.value.nodes.find(n => n.nodeId === selectedId.value));
const canMark = computed(() => !!selected.value?.instanceId && selected.value.status === 4 && !selected.value.skipWhenFailed && ![1, 2].includes(detail.value?.status || 0));
let sequence = 0, refreshTimer: ReturnType<typeof setInterval> | undefined;
async function load(initial = false) {
  if (!resourceId.value) { error.value = t('缺少工作流实例 ID', 'The workflow instance ID is missing'); return; }
  const token = scope.capture(), current = ++sequence; loading.value = true; error.value = '';
  try { const result = await fetchWorkflowInstance(resourceId.value, token.signal); if (token.valid() && current === sequence) { detail.value = result; dag.value = readDag(result.peworkflowDAG); if (selectedId.value && !dag.value.nodes.some(n => n.nodeId === selectedId.value)) selectedId.value = null; if (initial) { await nextTick(); graph.value?.arrange(); } } }
  catch (failure) { if (token.valid() && current === sequence) error.value = (failure as Error).message; }
  finally { if (token.valid() && current === sequence) loading.value = false; token.release(); }
}
async function operate(action: 'stop' | 'retry' | 'markNodeAsSuccess') {
  if (!resourceId.value || operating.value || action === 'markNodeAsSuccess' && !canMark.value) return;
  const token = scope.capture(), target = resourceId.value, nodeId = action === 'markNodeAsSuccess' ? selected.value?.nodeId : undefined;
  try { if (action === 'stop' && !await scope.confirm(t(`停止工作流实例 #${target}？嵌套实例会同时停止所属父工作流。`, `Stop workflow instance #${target}? Stopping a nested instance also stops its parent workflow.`))) return; if (!token.valid() || target !== resourceId.value) return; operating.value = true;
    await actOnInstance(action, target, nodeId, token.signal); if (token.valid()) { toast(t('操作已完成', 'Operation completed'), 'success'); await load(); }
  } catch (failure) { if (token.valid()) error.value = (failure as Error).message; }
  finally { if (token.valid()) operating.value = false; token.release(); }
}
function reset() { scope.invalidate(); sequence++; detail.value = null; dag.value = emptyDag(); selectedId.value = null; operating.value = false; loading.value = false; load(true); }
watch([resourceId, () => session.revision], reset, { immediate: true });
watch(autoRefresh, enabled => { clearInterval(refreshTimer); if (enabled) refreshTimer = setInterval(() => { if (!loading.value && !operating.value) load(); }, 5000); });
onBeforeUnmount(() => clearInterval(refreshTimer));
</script>

<template>
  <section class="workflow-run"><header class="page-head"><div class="run-title"><button class="run-back" @click="router.push('/oms/wfinstance')">{{ t('工作流实例', 'Workflow instances') }}</button><h1 class="page-title">{{ detail?.workflowName || t('执行详情', 'Execution details') }}</h1><p><span>#{{ resourceId || '—' }}</span><span v-if="detail" class="badge" :class="workflowTone(detail.status)">{{ workflowStatus(detail.status) }}</span></p></div><div class="row-actions"><label class="refresh-toggle"><input v-model="autoRefresh" type="checkbox" />{{ t('自动刷新', 'Auto refresh') }}</label><button class="btn btn-quiet" :disabled="loading" @click="load()">{{ t('刷新', 'Refresh') }}</button><button class="btn btn-quiet" :disabled="operating || !detail" @click="operate('retry')">{{ t('重试', 'Retry') }}</button><button class="btn btn-danger" :disabled="operating || !detail" @click="operate('stop')">{{ t('停止', 'Stop') }}</button></div></header>
    <p v-if="error" class="error-banner" role="alert">{{ error }}</p>
    <section v-if="detail" class="work-panel run-summary"><dl><div><dt>{{ t('工作流 ID', 'Workflow ID') }}</dt><dd>{{ detail.workflowId }}</dd></div><div><dt>{{ t('计划触发', 'Expected start') }}</dt><dd>{{ detail.expectedTriggerTime || '—' }}</dd></div><div><dt>{{ t('开始时间', 'Started') }}</dt><dd>{{ detail.actualTriggerTime || '—' }}</dd></div><div><dt>{{ t('结束时间', 'Finished') }}</dt><dd>{{ detail.finishedTime || '—' }}</dd></div></dl><details><summary>{{ t('参数、上下文与结果', 'Parameters, context and result') }}</summary><div class="run-data"><div><h3>{{ t('初始参数', 'Initial parameters') }}</h3><pre>{{ detail.wfInitParams || '—' }}</pre></div><div><h3>{{ t('上下文', 'Context') }}</h3><pre>{{ displayContext(detail.wfContext) || '—' }}</pre></div><div><h3>{{ t('工作流结果', 'Workflow result') }}</h3><pre>{{ detail.result || '—' }}</pre><small>{{ t('工作流节点与任务实例各自保留执行结果。', 'Workflow nodes and job instances keep their own execution results.') }}</small></div></div></details></section>
    <div class="run-layout" :class="{'has-selection':selected}"><WorkflowGraph ref="graph" :model-value="dag" readonly @select="selectedId = $event"><template #tools><button class="btn btn-quiet" :disabled="!canMark || operating" @click="operate('markNodeAsSuccess')">{{ t('标记节点成功', 'Mark node successful') }}</button></template></WorkflowGraph>
      <aside v-if="selected" class="work-panel run-inspector"><header><div><small>{{ selected.nodeType === 3 ? t('子工作流', 'Nested workflow') : selected.nodeType === 2 ? t('条件', 'Condition') : t('任务节点', 'Job node') }}</small><h2>{{ selected.nodeName }}</h2><span class="badge" :class="nodeTone(selected.status)">{{ nodeStatus(selected.status) }}</span></div><button class="icon-button" :aria-label="t('关闭节点详情', 'Close node details')" @click="selectedId = null; graph?.clear()">×</button></header><dl class="node-facts"><div><dt>{{ t('节点 ID', 'Node ID') }}</dt><dd>{{ selected.nodeId }}</dd></div><div v-if="selected.nodeType !== 2"><dt>{{ t('启用', 'Enabled') }}</dt><dd>{{ selected.enable === false ? t('否', 'No') : t('是', 'Yes') }}</dd></div><div v-if="selected.nodeType !== 2"><dt>{{ t('失败可跳过', 'Skip after failure') }}</dt><dd>{{ selected.skipWhenFailed ? t('是', 'Yes') : t('否', 'No') }}</dd></div><div v-if="selected.disableByControlNode"><dt>{{ t('条件控制', 'Branch control') }}</dt><dd>{{ t('已跳过', 'Skipped') }}</dd></div></dl>
        <template v-if="selected.nodeType === 2"><h3>{{ t('条件脚本（Groovy）', 'Condition script (Groovy)') }}</h3><pre class="condition-script">{{ selected.nodeParams }}</pre><dl class="node-facts"><div><dt>{{ t('开始时间', 'Started') }}</dt><dd>{{ selected.startTime || '—' }}</dd></div><div><dt>{{ t('结束时间', 'Finished') }}</dt><dd>{{ selected.finishedTime || '—' }}</dd></div></dl><h3>{{ t('结果', 'Result') }}</h3><pre>{{ selected.result || '—' }}</pre></template>
        <template v-else-if="selected.nodeType === 3"><dl class="node-facts"><div><dt>{{ t('工作流 ID', 'Workflow ID') }}</dt><dd>{{ selected.jobId }}</dd></div><div><dt>{{ t('子实例 ID', 'Child instance ID') }}</dt><dd>{{ selected.instanceId || '—' }}</dd></div><div><dt>{{ t('开始时间', 'Started') }}</dt><dd>{{ selected.startTime || '—' }}</dd></div><div><dt>{{ t('结束时间', 'Finished') }}</dt><dd>{{ selected.finishedTime || '—' }}</dd></div></dl><h3>{{ t('节点参数', 'Node parameters') }}</h3><pre>{{ selected.nodeParams || '—' }}</pre><h3>{{ t('结果', 'Result') }}</h3><pre>{{ selected.result || '—' }}</pre><button v-if="selected.instanceId" class="btn btn-primary" @click="router.push({path:'/oms/wfInstanceDetail',query:{wfInstanceId:selected.instanceId}})">{{ t('查看子工作流实例', 'Open child workflow') }}</button></template>
        <InstanceDetail v-else-if="selected.instanceId" :key="selected.instanceId" :instance-id="selected.instanceId" /><p v-else class="unstarted-node">{{ t('此节点尚未创建任务实例。', 'This node has not created a job instance.') }}</p>
      </aside>
    </div>
  </section>
</template>
<style scoped>
.workflow-run{min-width:0}.run-title{min-width:0;flex:1}.run-back{font:inherit;font-size:12px;color:var(--muted,#718099);border:0;background:none;padding:0;cursor:pointer}.run-title h1{margin-top:7px;overflow-wrap:anywhere}.run-title p{display:flex;align-items:center;gap:12px;margin:8px 0 0;color:var(--muted,#718099);font-size:12px}.refresh-toggle{display:flex;align-items:center;gap:7px;font-size:12px}.refresh-toggle input{width:auto}.run-summary{margin-bottom:20px;padding:20px 22px}.run-summary>dl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;margin:0}.run-summary dt,.node-facts dt{color:var(--muted,#718099);font-size:11px}.run-summary dd,.node-facts dd{margin:7px 0 0;font-size:13px;overflow-wrap:anywhere}.run-summary details{margin-top:20px;border-top:1px solid var(--border,#e0e6f0);padding-top:14px}.run-summary summary{cursor:pointer;font-size:12px}.run-data{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin-top:18px}.run-data h3,.run-inspector h3{font-size:12px;font-weight:600}.run-data small{color:var(--muted,#718099);font-size:11px}.run-data pre,.run-inspector pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.6;max-height:280px;overflow:auto}.run-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:18px}.run-layout.has-selection{grid-template-columns:minmax(0,1fr) minmax(320px,400px)}.run-inspector{padding:18px;min-width:0;align-self:start}.run-inspector header{display:flex;justify-content:space-between;gap:12px;margin-bottom:18px}.run-inspector header>div{min-width:0}.run-inspector h2{font-size:16px;overflow-wrap:anywhere;margin:6px 0 10px}.run-inspector header small{font-size:11px;color:var(--muted,#718099)}.node-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:20px}.condition-script{padding:14px;border-radius:8px;background:#f5f7fc}.unstarted-node{font-size:13px;color:var(--muted,#718099)}@media(max-width:1200px){.run-layout.has-selection{grid-template-columns:minmax(0,1fr)}}@media(max-width:760px){.run-summary>dl{grid-template-columns:repeat(2,minmax(0,1fr))}.run-data{grid-template-columns:minmax(0,1fr)}.workflow-run .page-head>.row-actions{flex-wrap:wrap}.run-summary{padding:16px}.refresh-toggle{width:100%}}
</style>
