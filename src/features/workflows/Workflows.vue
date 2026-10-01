<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { session } from '../../core/session';
import { formatTime, t, toast } from '../../core/ui';
import Field from '../../shared/Field.vue';
import Modal from '../../shared/Modal.vue';
import Pagination from '../../shared/Pagination.vue';
import TableState from '../../shared/TableState.vue';
import { changeWorkflow, copyWorkflow, listWorkflows, runWorkflow } from './api';
import { id } from './domain';
import { useScope } from './useScope';
import type { Workflow, WorkflowQuery } from './types';

const router = useRouter(), scope = useScope(), query = ref<WorkflowQuery>({ index: 0, pageSize: 10 }), keyword = ref(''), exactId = ref('');
const rows = ref<Workflow[]>([]), total = ref(0), loading = ref(false), error = ref(''), busy = ref(new Set<string>());
const parameterOpen = ref(false), parameterWorkflow = ref<Workflow | null>(null), parameter = ref('');
let sequence = 0;
async function load() { const token = scope.capture(), current = ++sequence; loading.value = true; error.value = ''; try { const page = await listWorkflows({ ...query.value }, token.signal); if (token.valid() && current === sequence) { rows.value = page.data.map(row => ({ ...row, id: id(row.id) })); total.value = Number(page.totalItems); } } catch (failure) { if (token.valid() && current === sequence) error.value = (failure as Error).message; } finally { if (token.valid() && current === sequence) loading.value = false; token.release(); } }
function search() { query.value = { index: 0, pageSize: 10, keyword: keyword.value || undefined, workflowId: exactId.value || undefined }; load(); }
function reset() { keyword.value = ''; exactId.value = ''; search(); }
async function operate(row: Workflow, action: 'enable' | 'disable' | 'delete' | 'copy' | 'run', params?: string) {
  const key = `${row.id}:${action}`; if (!row.id || busy.value.has(key)) return;
  const token = scope.capture(), previousEnable = row.enable;
  try { if (action === 'delete' && !await scope.confirm(t(`删除工作流“${row.wfName}”？`, `Delete workflow “${row.wfName}”?`))) return; if (!token.valid()) return;
    busy.value = new Set([...busy.value, key]);
    if (action === 'copy') { const copiedId = await copyWorkflow(row.id, token.signal); if (token.valid()) router.push({ path: '/oms/workflowEditor', query: { workflowId: copiedId } }); }
    else if (action === 'run') { const instanceId = await runWorkflow(row.id, params, token.signal); if (token.valid()) { parameterOpen.value = false; toast(t(`已启动工作流实例 #${instanceId}`, `Started workflow instance #${instanceId}`), 'success'); } }
    else { if (action === 'enable' || action === 'disable') row.enable = action === 'enable'; await changeWorkflow(action, row.id, token.signal); if (token.valid()) { toast(t('操作已完成', 'Operation completed'), 'success'); load(); } }
  } catch (failure) { if (token.valid()) { if (action === 'enable' || action === 'disable') row.enable = previousEnable; error.value = (failure as Error).message; } }
  finally { if (token.valid()) { const next = new Set(busy.value); next.delete(key); busy.value = next; } token.release(); }
}
function openParameters(row: Workflow) { parameterWorkflow.value = row; parameter.value = ''; parameterOpen.value = true; }
watch(() => session.revision, () => { scope.invalidate(); sequence++; rows.value = []; busy.value = new Set(); parameterOpen.value = false; query.value.index = 0; load(); }, { immediate: true });
</script>

<template>
  <section><header class="page-head"><div><h1 class="page-title">{{ t('工作流', 'Workflows') }}</h1><p>{{ t('连接任务、定义分支，并管理完整执行流程。', 'Connect jobs, define branches and manage execution flows.') }}</p></div><button class="btn btn-primary" @click="router.push('/oms/workflowEditor')">+ {{ t('新建工作流', 'New workflow') }}</button></header>
    <div class="work-panel"><form class="filter-bar" @submit.prevent="search"><Field :label="t('名称', 'Name')" v-slot="{id: inputId}"><input :id="inputId" v-model="keyword" :placeholder="t('搜索工作流', 'Search workflows')" /></Field><Field :label="t('工作流 ID', 'Workflow ID')" v-slot="{id: inputId}"><input :id="inputId" v-model="exactId" inputmode="numeric" /></Field><button class="btn btn-primary" type="submit">{{ t('查询', 'Search') }}</button><button class="btn btn-quiet" type="button" @click="reset">{{ t('重置', 'Reset') }}</button><button class="btn btn-quiet" type="button" @click="load">{{ t('刷新', 'Refresh') }}</button></form>
      <p v-if="error" class="error-banner" role="alert">{{ error }}</p><TableState :loading="loading" :empty="!rows.length"><div class="table-scroll"><table class="data-table workflow-table"><thead><tr><th>{{ t('工作流', 'Workflow') }}</th><th>{{ t('调度', 'Schedule') }}</th><th>{{ t('并行上限', 'Parallel limit') }}</th><th>{{ t('启用', 'Enabled') }}</th><th>{{ t('更新时间', 'Updated') }}</th><th>{{ t('操作', 'Actions') }}</th></tr></thead><tbody><tr v-for="row in rows" :key="row.id"><td class="workflow-identity"><button class="name-link" @click="router.push({path:'/oms/workflowEditor',query:{workflowId:row.id}})">{{ row.wfName }}</button><small>#{{ row.id }}<span v-if="row.wfDescription">{{ row.wfDescription }}</span></small></td><td class="workflow-schedule"><span class="badge">{{ row.timeExpressionType }}</span><code v-if="row.timeExpression">{{ row.timeExpression }}</code></td><td>{{ row.maxWfInstanceNum }}</td><td><input type="checkbox" role="switch" :checked="row.enable" :aria-label="`${t('启用工作流', 'Enable workflow')} ${row.wfName}`" :disabled="busy.has(`${row.id}:enable`) || busy.has(`${row.id}:disable`)" @change="operate(row,row.enable?'disable':'enable')" /></td><td>{{ formatTime(row.gmtModified) }}</td><td><div class="row-actions"><button class="btn btn-quiet" :disabled="busy.has(`${row.id}:run`)" @click="operate(row,'run')">{{ t('运行', 'Run') }}</button><button class="btn btn-quiet" @click="openParameters(row)">{{ t('参数运行', 'Run with parameters') }}</button><button class="btn btn-quiet" @click="router.push({path:'/oms/wfinstance',query:{workflowId:row.id}})">{{ t('实例', 'Instances') }}</button><details class="row-menu"><summary class="btn btn-quiet">{{ t('更多', 'More') }}</summary><div><button @click="router.push({path:'/oms/workflowEditor',query:{workflowId:row.id}})">{{ t('编辑', 'Edit') }}</button><button :disabled="busy.has(`${row.id}:copy`)" @click="operate(row,'copy')">{{ t('复制', 'Copy') }}</button><button class="danger-action" :disabled="busy.has(`${row.id}:delete`)" @click="operate(row,'delete')">{{ t('删除', 'Delete') }}</button></div></details></div></td></tr></tbody></table></div></TableState><Pagination :index="query.index" :size="query.pageSize" :total="total" @change="query.index = $event; load()" />
    </div>
    <Modal v-model="parameterOpen" :title="t('参数运行', 'Run with parameters')"><p class="parameter-name">{{ parameterWorkflow?.wfName }}</p><Field :label="t('初始参数', 'Initial parameters')" v-slot="{id: inputId}"><textarea :id="inputId" v-model="parameter" rows="7" /></Field><template #footer><button class="btn btn-quiet" @click="parameterOpen = false">{{ t('取消', 'Cancel') }}</button><button class="btn btn-primary" :disabled="busy.has(`${parameterWorkflow?.id}:run`)" @click="parameterWorkflow && operate(parameterWorkflow,'run',parameter)">{{ t('运行工作流', 'Run workflow') }}</button></template></Modal>
  </section>
</template>
<style scoped>
.workflow-identity{min-width:210px;max-width:300px}.name-link{font:inherit;font-weight:700;text-align:left;color:var(--text,#17233d);background:none;border:0;padding:0;cursor:pointer;overflow-wrap:anywhere}.name-link:hover{color:var(--primary,#4169e1)}.workflow-identity small{display:block;margin-top:5px;color:var(--muted,#718099);font-size:11px}.workflow-identity small span{display:block;margin-top:4px;max-width:280px;overflow-wrap:anywhere}.workflow-schedule{min-width:130px}.workflow-schedule code{display:block;margin-top:7px;font-size:11px;white-space:normal;overflow-wrap:anywhere}.workflow-table .row-actions{flex-wrap:nowrap}.parameter-name{font-weight:600;overflow-wrap:anywhere}.row-menu{position:relative}.row-menu summary{list-style:none}.row-menu>div{position:absolute;z-index:3;right:0;top:100%;min-width:110px;display:flex;flex-direction:column;padding:6px;background:#fff;border:1px solid var(--border,#e0e6f0);border-radius:8px;box-shadow:0 8px 20px #17233d12}.row-menu>div button{font:inherit;text-align:left;background:none;border:0;padding:8px 10px;cursor:pointer}.row-menu>div button:hover{background:#f5f7fc}.danger-action{color:#d14857}
</style>
