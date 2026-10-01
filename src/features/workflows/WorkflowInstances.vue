<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { session } from '../../core/session';
import { t, toast } from '../../core/ui';
import Field from '../../shared/Field.vue';
import Pagination from '../../shared/Pagination.vue';
import TableState from '../../shared/TableState.vue';
import { actOnInstance, listWorkflowInstances } from './api';
import { id } from './domain';
import { workflowStatus, workflowTone } from './status';
import { useScope } from './useScope';
import type { WorkflowInstance, WorkflowInstanceQuery } from './types';

const route = useRoute(), router = useRouter(), scope = useScope();
const query = ref<WorkflowInstanceQuery>({ index: 0, pageSize: 10 }), workflowId = ref(''), instanceId = ref(''), status = ref('');
const rows = ref<WorkflowInstance[]>([]), total = ref(0), loading = ref(false), error = ref(''), busy = ref(new Set<string>());
const statuses = computed(() => [['', t('全部状态', 'All statuses')], ['WAITING', t('等待调度', 'Waiting')], ['RUNNING', t('运行中', 'Running')], ['FAILED', t('失败', 'Failed')], ['SUCCEED', t('成功', 'Succeeded')], ['STOPPED', t('已停止', 'Stopped')]]);
let sequence = 0;
async function load() { const token = scope.capture(), current = ++sequence; loading.value = true; error.value = ''; try { const page = await listWorkflowInstances({ ...query.value }, token.signal); if (token.valid() && current === sequence) { rows.value = page.data; total.value = Number(page.totalItems); } } catch (failure) { if (token.valid() && current === sequence) error.value = (failure as Error).message; } finally { if (token.valid() && current === sequence) loading.value = false; token.release(); } }
function search() { query.value = { index: 0, pageSize: 10, workflowId: workflowId.value || undefined, wfInstanceId: instanceId.value || undefined, status: status.value }; load(); }
function reset() { workflowId.value = ''; instanceId.value = ''; status.value = ''; search(); }
async function operate(row: WorkflowInstance, action: 'stop' | 'retry') {
  const key = `${row.wfInstanceId}:${action}`; if (busy.value.has(key)) return; const token = scope.capture();
  try { if (action === 'stop' && !await scope.confirm(t(`停止工作流实例 #${row.wfInstanceId}？`, `Stop workflow instance #${row.wfInstanceId}?`))) return; if (!token.valid()) return; busy.value = new Set([...busy.value, key]); await actOnInstance(action, row.wfInstanceId, undefined, token.signal); if (token.valid()) { toast(t('操作已完成', 'Operation completed'), 'success'); load(); } } catch (failure) { if (token.valid()) error.value = (failure as Error).message; } finally { if (token.valid()) { const next = new Set(busy.value); next.delete(key); busy.value = next; } token.release(); }
}
watch([() => route.query.workflowId, () => session.revision], () => { scope.invalidate(); sequence++; rows.value = []; busy.value = new Set(); workflowId.value = id(route.query.workflowId); instanceId.value = ''; status.value = ''; search(); }, { immediate: true });
</script>

<template>
  <section><header class="page-head"><div><h1 class="page-title">{{ t('工作流实例', 'Workflow instances') }}</h1><p>{{ t('查看执行结果，定位节点失败并重试流程。', 'Inspect executions, locate failed nodes and retry a flow.') }}</p></div><button class="btn btn-quiet" @click="load">{{ t('刷新', 'Refresh') }}</button></header>
    <div class="work-panel"><form class="filter-bar" @submit.prevent="search"><Field :label="t('工作流 ID', 'Workflow ID')" v-slot="{id: inputId}"><input :id="inputId" v-model="workflowId" inputmode="numeric" /></Field><Field :label="t('实例 ID', 'Instance ID')" v-slot="{id: inputId}"><input :id="inputId" v-model="instanceId" inputmode="numeric" /></Field><Field :label="t('状态', 'Status')" v-slot="{id: inputId}"><select :id="inputId" v-model="status"><option v-for="option in statuses" :key="option[0]" :value="option[0]">{{ option[1] }}</option></select></Field><button class="btn btn-primary" type="submit">{{ t('查询', 'Search') }}</button><button class="btn btn-quiet" type="button" @click="reset">{{ t('重置', 'Reset') }}</button></form>
      <p v-if="error" class="error-banner" role="alert">{{ error }}</p><TableState :loading="loading" :empty="!rows.length"><div class="table-scroll"><table class="data-table"><thead><tr><th>{{ t('工作流', 'Workflow') }}</th><th>{{ t('实例 ID', 'Instance ID') }}</th><th>{{ t('状态', 'Status') }}</th><th>{{ t('计划触发', 'Expected start') }}</th><th>{{ t('实际触发', 'Started') }}</th><th>{{ t('结束时间', 'Finished') }}</th><th>{{ t('执行结果', 'Result') }}</th><th>{{ t('操作', 'Actions') }}</th></tr></thead><tbody><tr v-for="row in rows" :key="row.wfInstanceId"><td class="instance-identity"><strong>{{ row.workflowName }}</strong><small>#{{ row.workflowId }}</small></td><td><button class="instance-link" @click="router.push({path:'/oms/wfInstanceDetail',query:{wfInstanceId:row.wfInstanceId}})">{{ row.wfInstanceId }}</button></td><td><span class="badge" :class="workflowTone(row.status)">{{ workflowStatus(row.status) }}</span></td><td>{{ row.expectedTriggerTime || '—' }}</td><td>{{ row.actualTriggerTime || '—' }}</td><td>{{ row.finishedTime || '—' }}</td><td class="instance-result">{{ row.result || '—' }}</td><td><div class="row-actions"><button class="btn btn-quiet" @click="router.push({path:'/oms/wfInstanceDetail',query:{wfInstanceId:row.wfInstanceId}})">{{ t('详情', 'Details') }}</button><button class="btn btn-quiet" :disabled="busy.has(`${row.wfInstanceId}:retry`)" @click="operate(row,'retry')">{{ t('重试', 'Retry') }}</button><button class="btn btn-quiet" :disabled="busy.has(`${row.wfInstanceId}:stop`)" @click="operate(row,'stop')">{{ t('停止', 'Stop') }}</button></div></td></tr></tbody></table></div></TableState><Pagination :index="query.index" :size="query.pageSize" :total="total" @change="query.index = $event; load()" />
    </div>
  </section>
</template>
<style scoped>
.instance-identity{min-width:180px;max-width:270px;white-space:normal;overflow-wrap:anywhere}.instance-identity strong{font-weight:600}.instance-identity small{display:block;margin-top:5px;color:var(--muted,#718099);font-size:11px}.instance-link{padding:0;border:0;background:none;color:var(--primary,#4169e1);font:inherit;cursor:pointer}.instance-result{max-width:280px;white-space:normal;overflow-wrap:anywhere}
</style>
