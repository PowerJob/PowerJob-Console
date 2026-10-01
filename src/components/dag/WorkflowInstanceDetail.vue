<template>
  <div class="workflow-instance">
    <div class="instance-heading"><div><h2>{{ wfInstanceDetail.workflowName || wfInstanceDetail.wfName || $t('message.wfInstanceId') }} <span>#{{ wfInstanceId }}</span></h2><p>{{ common.translateWfInstanceStatus(wfInstanceDetail.status) }}</p></div><div class="instance-actions"><el-switch v-model="autoRefresh" :active-text="$t('message.autoRefresh')" /><el-button @click="back">{{ $t('message.back') }}</el-button><el-button :loading="loading" @click="fetchWfInstanceInfo().catch(() => {})">{{ $t('message.refresh') }}</el-button><el-button type="warning" :loading="operationLoading" @click="restart">{{ $t('message.reRun') }}</el-button><el-button type="danger" :loading="operationLoading" @click="stop">{{ $t('message.stop') }}</el-button></div></div>
    <el-card class="instance-summary" shadow="never" v-loading="loading"><el-descriptions :column="3" border><el-descriptions-item :label="$t('message.wfId')">{{ wfInstanceDetail.workflowId }}</el-descriptions-item><el-descriptions-item :label="$t('message.wfInstanceId')">{{ wfInstanceDetail.wfInstanceId }}</el-descriptions-item><el-descriptions-item :label="$t('message.status')">{{ common.translateWfInstanceStatus(wfInstanceDetail.status) }}</el-descriptions-item><el-descriptions-item :label="$t('message.expectedTriggerTime')">{{ wfInstanceDetail.expectedTriggerTime || '—' }}</el-descriptions-item><el-descriptions-item :label="$t('message.triggerTime')">{{ wfInstanceDetail.actualTriggerTime || '—' }}</el-descriptions-item><el-descriptions-item :label="$t('message.finishedTime')">{{ wfInstanceDetail.finishedTime || '—' }}</el-descriptions-item><el-descriptions-item :label="$t('message.wfInitParams')" :span="3"><pre>{{ wfInstanceDetail.wfInitParams || '—' }}</pre></el-descriptions-item><el-descriptions-item :label="$t('message.wfContext')" :span="3"><el-collapse><el-collapse-item :title="$t('message.wfContext')"><pre>{{ formattedContext || '—' }}</pre></el-collapse-item></el-collapse></el-descriptions-item><el-descriptions-item :label="`${$t('message.result')} (${$t('message.wfTips')})`" :span="3"><pre>{{ wfInstanceDetail.result || '—' }}</pre></el-descriptions-item></el-descriptions></el-card>
    <PowerWorkflow ref="dag" :nodes="peworkflowDAG.nodes" :edges="peworkflowDAG.edges" :right-fixed="430" :intercept-selected-node="interceptSelectedNode" mode="view" @get-dag="getDag" @on-selected-node="handleSelectedNode" @on-clear-select-node="handleClearSelectNode">
      <template #tool><el-button :disabled="!selectedModel || Number(selectedModel.status) !== 4" :loading="operationLoading" @click="markedSuccess">{{ $t('message.markerSuccess') }}</el-button></template>
      <InstanceDetail v-if="selectedModel" :instance-id="currentInstanceId" :node-detail="selectedModel"><template #default><el-descriptions v-if="Number(selectedModel.nodeType) !== 2" :column="1" border><el-descriptions-item :label="$t('message.enable')">{{ selectedModel.enable ? $t('message.yes') : $t('message.no') }}</el-descriptions-item><el-descriptions-item :label="$t('message.skipWhenFailed')">{{ selectedModel.skipWhenFailed ? $t('message.yes') : $t('message.no') }}</el-descriptions-item></el-descriptions><div v-else class="condition-code"><p>{{ $t('message.nodeParams') }}</p><JSEditor :code="selectedModel.nodeParams || ''" :editor-options="{ readOnly:true }" /></div></template></InstanceDetail>
    </PowerWorkflow>
  </div>
</template>
<script>
import { markRaw, defineAsyncComponent } from 'vue';
import InstanceDetail from '../common/InstanceDetail.vue';
import PowerWorkflow from './PowerWorkflow.vue';
import { formatContext } from './workflow-model.js';
export default {
  name:'WorkflowInstanceDetail', components:{ InstanceDetail, PowerWorkflow, JSEditor: defineAsyncComponent(() => import('./JSEditor.vue')) },
  data() { return { wfInstanceDetail:{}, peworkflowDAG:{ nodes:[],edges:[] }, powerFlow:null, selectedModel:null, currentInstanceId:undefined, loading:false, operationLoading:false, autoRefresh:false, refreshTimer:null, fetchSequence:0, routeSequence:0 }; },
  computed:{ wfInstanceId() { return this.$route.query.wfInstanceId || this.$route.params.wfInstanceId; }, formattedContext() { return formatContext(this.wfInstanceDetail.wfContext); } },
  mounted() { this.fetchWfInstanceInfo().catch(() => this.$router.replace('/oms/wfinstance')); },
  beforeUnmount() { clearInterval(this.refreshTimer); this.fetchSequence++; this.routeSequence++; },
  watch:{ wfInstanceId() { this.routeSequence++; this.handleClearSelectNode(); this.fetchWfInstanceInfo().catch(() => this.$router.replace('/oms/wfinstance')); }, autoRefresh(value) { clearInterval(this.refreshTimer); if (value) this.refreshTimer = setInterval(() => { if (!this.loading && !this.operationLoading) this.fetchWfInstanceInfo().catch(() => {}); },5000); } },
  methods:{
    getDag(flow) { this.powerFlow = markRaw(flow); },
    async fetchWfInstanceInfo() {
      if (!this.wfInstanceId) { this.$message.warning(this.$t('message.missingWfInstanceId')); this.$router.replace('/oms/wfinstance'); return; }
      const sequence = ++this.fetchSequence, selectedId = this.selectedModel?.id; this.loading = true;
      try {
        const res = await this.axios.get('/wfInstance/info',{ params:{ appId:window.localStorage.getItem('Power_appId'), wfInstanceId:String(this.wfInstanceId) } });
        if (sequence !== this.fetchSequence) return;
        this.wfInstanceDetail = res; this.peworkflowDAG = res.peworkflowDAG || { nodes:[],edges:[] };
        await this.$nextTick();
        if (selectedId) { const node = this.powerFlow?.graph.findById(selectedId); if (node) this.handleSelectedNode(node); else this.handleClearSelectNode(); }
      } catch (error) { if (sequence === this.fetchSequence) throw error; }
      finally { if (sequence === this.fetchSequence) this.loading = false; }
    },
    async operate(endpoint, extra={}) {
      if (this.operationLoading) return; this.operationLoading = true;
      try { await this.axios.get(endpoint,{ params:{ appId:window.localStorage.getItem('Power_appId'), wfInstanceId:String(this.wfInstanceId), ...extra } }); this.$message.success(this.$t('message.success')); await this.fetchWfInstanceInfo(); } catch { /* The HTTP client displays the failure; allow a fresh attempt. */ } finally { this.operationLoading = false; }
    },
    markedSuccess() { if (Number(this.selectedModel?.status) === 4) this.operate('/wfInstance/markNodeAsSuccess',{ nodeId:String(this.selectedModel.id) }); },
    restart() { this.operate('/wfInstance/retry'); },
    async stop() {
      const id = String(this.wfInstanceId), sequence = this.routeSequence;
      try { await this.$confirm(this.$t('message.stopConfirmation', { id }), this.$t('message.confirmTitle'), { type:'warning' }); } catch { return; }
      if (sequence !== this.routeSequence || id !== String(this.wfInstanceId)) return;
      await this.operate('/wfInstance/stop');
    },
    interceptSelectedNode(node) { const model = node.get('model'); return !!model.instanceId || Number(model.nodeType) === 2; },
    handleSelectedNode(node) { const model = node.get('model'); this.selectedModel = model; this.currentInstanceId = model.instanceId; if (!model.instanceId && Number(model.nodeType) !== 2) this.$message.warning(this.$t('message.ntfClickNoInstanceNode')); },
    handleClearSelectNode() { this.selectedModel = null; this.currentInstanceId = undefined; },
    back() { this.$router.push('/oms/wfinstance'); },
  },
};
</script>
<style scoped>
.workflow-instance { min-width:0; color:var(--pj-text); }
.instance-heading { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; margin-bottom:20px; }
.instance-heading > div:first-child { flex:1; min-width:0; }
.instance-heading h2 { margin:0; font-size:24px; font-weight:600; line-height:1.3; overflow-wrap:anywhere; }
.instance-heading h2 span { color:var(--pj-muted); font-size:14px; font-weight:400; }
.instance-heading p { margin:8px 0 0; color:var(--pj-muted); font-size:12px; }
.instance-actions { display:flex; flex-wrap:wrap; align-items:center; gap:8px; max-width:100%; }
.instance-actions :deep(.el-button + .el-button) { margin-left:0; }
.instance-summary { margin-bottom:24px; border:0; border-radius:0; box-shadow:none; }
.instance-summary :deep(.el-card__body) { padding:0; }
.instance-summary pre { margin:0; white-space:pre-wrap; overflow-wrap:anywhere; font:inherit; }
.instance-summary :deep(.el-descriptions__table) { table-layout:fixed; }
.instance-summary :deep(.el-descriptions__cell) { overflow-wrap:anywhere; }
.instance-summary :deep(.el-collapse) { border:0; }
.instance-summary :deep(.el-collapse-item__header) { border:0; height:28px; color:var(--pj-text); }
.condition-code p { font-size:12px; color:var(--pj-muted); }
@media(max-width:760px) {
  .instance-heading > div:first-child { flex-basis:100%; }
  .instance-heading h2 { font-size:22px; }
  .instance-actions { width:100%; }
  .instance-summary :deep(.el-descriptions__table),.instance-summary :deep(.el-descriptions__table tbody) { display:block; width:100%; }
  .instance-summary :deep(.el-descriptions__table tr) { display:grid; grid-template-columns:minmax(105px,38%) minmax(0,1fr); }
  .instance-summary :deep(.el-descriptions__cell) { display:block; min-width:0; width:auto; }
}
</style>
