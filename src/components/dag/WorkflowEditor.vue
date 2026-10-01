<template>
  <div class="workflow-editor">
    <div class="editor-heading"><div><h2>{{ workflowInfo.wfName || $t('message.workflow') }}</h2><p>{{ $t('message.wfDescription') }}</p></div><div><el-button @click="back">{{ $t('message.back') }}</el-button><el-button type="primary" :loading="saveLoading" @click="saveWorkflow">{{ $t('message.save') }}</el-button></div></div>
    <el-card class="workflow-settings" shadow="never">
      <el-form :model="workflowInfo" label-position="top">
        <div class="settings-grid">
          <el-form-item :label="$t('message.wfName')" required><el-input v-model="workflowInfo.wfName" maxlength="255" /></el-form-item>
          <el-form-item :label="$t('message.wfDescription')"><el-input v-model="workflowInfo.wfDescription" /></el-form-item>
          <el-form-item :label="$t('message.scheduleInfo')"><div class="schedule-fields"><el-select v-model="workflowInfo.timeExpressionType" style="width:120px"><el-option label="API" value="API" /><el-option label="CRON" value="CRON" /></el-select><el-input v-model="workflowInfo.timeExpression" :placeholder="$t('message.wfTimeExpressionPLH')" data-testid="workflow-time-expression" /><CronQuickStart v-if="workflowInfo.timeExpressionType === 'CRON'" v-model="workflowInfo.timeExpression" /><el-button @click="timeExpressionValidatorVisible = true">{{ $t('message.validateTimeExpression') }}</el-button></div></el-form-item>
          <el-form-item :label="$t('message.lifeCycle')"><LifeCycleFields v-model="workflowInfo.lifeCycle" /></el-form-item>
          <el-form-item :label="$t('message.maxInstanceNum')"><el-input-number v-model="workflowInfo.maxWfInstanceNum" :min="1" /></el-form-item>
          <el-form-item :label="$t('message.alarmConfig')"><el-select v-model="workflowInfo.notifyUserIds" multiple filterable :placeholder="$t('message.alarmSelectorPLH')" style="width:100%"><el-option v-for="user in userList" :key="user.id" :label="user.username" :value="user.id" /></el-select></el-form-item>
        </div>
      </el-form>
    </el-card>
    <PowerWorkflow ref="dag" :nodes="peworkflowDAG.nodes" :edges="peworkflowDAG.edges" :on-click-import-node="onClickImportNode" :on-click-import-special-node="onClickImportSpecialNode" @get-dag="getDag" @on-selected-node="handleSelectedNode" @on-clear-select-node="handleClearSelectNode" @dag-change="onDagChange">
      <div v-if="nodeInfo" class="node-panel">
        <h3>{{ $t('message.nodeName') }}</h3>
        <el-form :model="nodeInfo" label-position="top">
          <el-form-item v-if="nodeInfo.type !== 2" :label="nodeInfo.type === 3 ? $t('message.workflow') : $t('message.jobName')"><el-select v-model="nodeInfo.jobId" filterable remote reserve-keyword :placeholder="$t('message.keyword')" :remote-method="remoteTaskData" :loading="taskLoading" style="width:100%" @focus="remoteTaskData('')" @change="handleWaitTaskChange"><el-option v-for="item in waitTaskList" :key="item.id" :label="item.jobName || item.wfName" :value="item.id" /></el-select></el-form-item>
          <el-form-item :label="$t('message.nodeName')"><el-input v-model="nodeInfo.nodeName" @input="updatePreview" /></el-form-item>
          <el-form-item :label="$t('message.nodeParams')"><JSEditor v-if="nodeInfo.type === 2" :code="nodeInfo.nodeParams || ''" @on-code-change="onCodeChange" /><el-input v-else v-model="nodeInfo.nodeParams" type="textarea" :rows="4" @input="updatePreview" /></el-form-item>
          <el-form-item v-if="nodeInfo.type !== 2" :label="$t('message.enable')"><el-switch v-model="nodeInfo.enable" @change="updatePreview" /></el-form-item>
          <el-form-item v-if="nodeInfo.type !== 2" :label="$t('message.skipWhenFailed')"><el-switch v-model="nodeInfo.skipWhenFailed" @change="updatePreview" /></el-form-item>
        </el-form>
        <el-button type="primary" :loading="nodeSaveLoading" @click="handleNodeSave">{{ $t('message.save') }}</el-button>
      </div>
    </PowerWorkflow>
    <el-drawer v-model="importDrawerVisible" :title="$t('message.importJobTitle')" size="min(760px, 95vw)">
      <el-form :inline="true" :model="jobQueryContent" @submit.prevent="queryJobs"><el-form-item :label="$t('message.jobId')"><el-input v-model="jobQueryContent.jobId" /></el-form-item><el-form-item :label="$t('message.keyword')"><el-input v-model="jobQueryContent.keyword" /></el-form-item><el-form-item><el-button type="primary" :loading="jobsLoading" @click="queryJobs">{{ $t('message.query') }}</el-button><el-button @click="resetJobs">{{ $t('message.reset') }}</el-button><el-button @click="onBulkImport">{{ $t('message.bulkImport') }}</el-button></el-form-item></el-form>
      <el-table ref="jobImportTable" v-loading="jobsLoading" :data="jobInfoPageResult.data" :row-key="row => String(row.id)" @selection-change="multipleSelection = $event"><el-table-column type="selection" :reserve-selection="true" width="50" /><el-table-column prop="id" :label="$t('message.jobId')" /><el-table-column prop="jobName" :label="$t('message.jobName')" /><el-table-column :label="$t('message.operation')" width="110"><template #default="{ row }"><el-button size="small" :loading="importLoading" @click="importTask([row])">{{ $t('message.import') }}</el-button></template></el-table-column></el-table>
      <el-pagination :current-page="jobQueryContent.index + 1" layout="total, prev, pager, next" :total="jobInfoPageResult.totalItems" :page-size="jobQueryContent.pageSize" @current-change="onClickChangePage" />
    </el-drawer>
    <el-dialog v-model="timeExpressionValidatorVisible" destroy-on-close><TimeExpressionValidator v-if="timeExpressionValidatorVisible" :time-expression="workflowInfo.timeExpression" :time-expression-type="workflowInfo.timeExpressionType" /></el-dialog>
    <el-drawer v-model="workflowVisible" :title="$t('message.importWorkflowTitle')" size="min(960px, 95vw)" destroy-on-close><WorkflowManager v-if="workflowVisible" :is-workflow="true" @on-import-node="onImportChildWorkflowNode" /></el-drawer>
  </div>
</template>
<script>
import { markRaw, defineAsyncComponent } from 'vue';
import CronQuickStart from '../common/CronQuickStart.vue';
import TimeExpressionValidator from '../common/TimeExpressionValidator.vue';
import PowerWorkflow from './PowerWorkflow.vue';
import WorkflowManager from '../views/WorkflowManager.vue';
import LifeCycleFields from '../common/LifeCycleFields.vue';
import { lifeCycleForSave } from '../../services/jobs.js';
import { serializeDag, validateDag } from './workflow-model.js';
const emptyWorkflowInfo = () => ({ id:'', appId:window.localStorage.getItem('Power_appId'), enable:true, maxWfInstanceNum:1, notifyUserIds:[], timeExpression:'', timeExpressionType:'API', wfDescription:'', wfName:'', lifeCycle:null });
export default {
  name: 'WorkflowEditor', components: { CronQuickStart, JSEditor: defineAsyncComponent(() => import('./JSEditor.vue')), TimeExpressionValidator, PowerWorkflow, WorkflowManager, LifeCycleFields },
  data() { return {
    workflowInfo: emptyWorkflowInfo(),
    peworkflowDAG: { nodes: [], edges: [] }, nodeInfo: null, powerFlow: null, selectedId: null, pendingNodes: {}, userList: [],
    saveLoading: false, nodeSaveLoading: false, importLoading: false, jobsLoading: false, importDrawerVisible: false, workflowVisible: false, timeExpressionValidatorVisible: false,
    jobQueryContent: { appId: window.localStorage.getItem('Power_appId'), index: 0, pageSize: 8, jobId: undefined, keyword: undefined }, jobInfoPageResult: { data: [], totalItems: 0 }, multipleSelection: [], waitTaskList: [], taskLoading: false, taskTimeout: null, searchSequence: 0, fetchSequence: 0, jobQuerySequence:0,
  }; },
  mounted() { this.axios.get('/user/list').then(users => { this.userList = users || []; }).catch(() => {}); this.restoreWorkflow().catch(() => this.$router.replace('/oms/workflow')); },
  beforeUnmount() { clearTimeout(this.taskTimeout); this.searchSequence++; this.fetchSequence++; this.jobQuerySequence++; },
  watch: { '$route.query.workflowId'(value) { if (String(value || '') !== String(this.workflowInfo.id)) this.restoreWorkflow().catch(() => this.$router.replace('/oms/workflow')); } },
  methods: {
    back() { this.$router.push('/oms/workflow'); },
    getDag(flow) { this.powerFlow = markRaw(flow); },
    async restoreWorkflow() {
      const legacy = this.$route.params.workflowInfo; const id = this.$route.query.workflowId || this.$route.params.workflowId || legacy?.id;
      if (id) { this.workflowInfo.id = String(id); await this.getWorkflowInfo(); }
      else { this.fetchSequence++; this.workflowInfo = emptyWorkflowInfo(); this.peworkflowDAG = { nodes:[],edges:[] }; this.pendingNodes = {}; this.handleClearSelectNode(); }
    },
    async getWorkflowInfo() {
      const generation = ++this.fetchSequence;
      try {
        const res = await this.axios.get('/workflow/fetch', { params: { workflowId: this.workflowInfo.id, appId: this.workflowInfo.appId } });
        if (generation !== this.fetchSequence) return;
        this.workflowInfo = { ...this.workflowInfo, ...res, id: String(res.id), lifeCycle: res.lifeCycle ? { ...res.lifeCycle } : null, notifyUserIds: res.notifyUserIds || [] };
        this.peworkflowDAG = res.peworkflowDAG || { nodes: [], edges: [] }; this.pendingNodes = {}; this.handleClearSelectNode();
        await this.$nextTick(); this.powerFlow?.graph.layout();
      } catch (error) { if (generation === this.fetchSequence) throw error; }
    },
    handleSelectedNode(item) {
      const node = item.get('model'); this.selectedId = node.id;
      this.nodeInfo = { id: node.id, type: Number(node.nodeType), jobId: node.jobId, nodeName: node.nodeName || (Number(node.nodeType) === 2 ? this.$t('message.condition') : ''), nodeParams: node.nodeParams || '', enable: node.enable !== false, skipWhenFailed: !!node.skipWhenFailed, ...this.pendingNodes[node.id] };
      this.waitTaskList = node.jobId ? [{ id: node.jobId, jobName: node.nodeName }] : [];
      if (this.nodeInfo.type !== 2) this.remoteTaskData('', node.jobId);
    },
    handleClearSelectNode() { this.selectedId = null; this.nodeInfo = null; clearTimeout(this.taskTimeout); this.searchSequence++; },
    updatePreview() { if (!this.nodeInfo) return; this.pendingNodes[this.nodeInfo.id] = { ...this.nodeInfo }; this.powerFlow.graph.updateItem(this.nodeInfo.id, { ...this.nodeInfo, nodeType: this.nodeInfo.type }); },
    onCodeChange(code) { this.nodeInfo.nodeParams = code; this.updatePreview(); },
    onDagChange(dag) { const present = new Set(dag.nodes.map(node => node.id)); Object.keys(this.pendingNodes).forEach(id => { if (!present.has(id)) delete this.pendingNodes[id]; }); },
    async handleNodeSave() {
      if (!this.nodeInfo || this.nodeSaveLoading) return; this.nodeSaveLoading = true;
      const generation = this.fetchSequence, edited = { ...this.nodeInfo, appId:this.workflowInfo.appId };
      try { const [node] = await this.axios.post('/workflow/saveNode', [edited]); if (generation !== this.fetchSequence) return; this.powerFlow.graph.updateItem(edited.id, { ...node, id: String(node.id), nodeId: String(node.id), nodeType: Number(node.type) }); delete this.pendingNodes[edited.id]; this.$message.success(this.$t('message.success')); } catch { /* The HTTP client already presents the business error; retain the draft. */ } finally { this.nodeSaveLoading = false; }
    },
    async saveWorkflow() {
      if (this.saveLoading) return;
      if (!this.workflowInfo.wfName?.trim()) { this.$message.warning(this.$t('message.workflowNameRequired')); return; }
      const flow = this.powerFlow?.graph.save() || { nodes: [], edges: [] }, validation = validateDag(flow);
      if (!validation.valid) { this.$message.warning(this.$t(`message.${validation.reason}`)); return; }
      let lifeCycle;
      try { lifeCycle = this.workflowInfo.lifeCycle == null ? { start:null, end:null } : lifeCycleForSave(this.workflowInfo.lifeCycle); }
      catch { this.$message.warning(this.$t('message.lifeCycleInvalid')); return; }
      const generation = this.fetchSequence;
      const payload = { ...JSON.parse(JSON.stringify(this.workflowInfo)), id:this.workflowInfo.id || undefined, lifeCycle, dag:serializeDag(flow) };
      this.saveLoading = true;
      try {
        const pending = Object.values(this.pendingNodes);
        if (pending.length) { await this.axios.post('/workflow/saveNode', pending.map(node => ({ ...node, appId: payload.appId }))); if (generation !== this.fetchSequence) return; this.pendingNodes = {}; }
        // The existing Server skips a null lifeCycle; explicit null bounds clear an old range.
        const res = await this.axios.post('/workflow/save', payload);
        if (generation !== this.fetchSequence) return;
        this.workflowInfo.id = String(res);
        await this.$router.replace({ name: 'workflowEditor', query: { ...this.$route.query, workflowId: String(res) } });
        this.$message.success(this.$t('message.success'));
      } catch { /* Keep the current graph and draft available for retry. */ } finally { this.saveLoading = false; }
    },
    async listJobInfos() { const sequence = ++this.jobQuerySequence; this.jobsLoading = true; try { const result = await this.axios.post('/job/list', { ...this.jobQueryContent }); if (sequence === this.jobQuerySequence) this.jobInfoPageResult = result; } catch { /* Keep the loaded page available while the error is displayed. */ } finally { if (sequence === this.jobQuerySequence) this.jobsLoading = false; } },
    queryJobs() { this.jobQueryContent.index = 0; this.$refs.jobImportTable?.clearSelection(); this.multipleSelection = []; this.listJobInfos(); }, resetJobs() { this.jobQueryContent.keyword = undefined; this.jobQueryContent.jobId = undefined; this.queryJobs(); },
    onClickChangePage(index) { this.jobQueryContent.index = index - 1; this.listJobInfos(); },
    onClickImportNode() { this.importDrawerVisible = true; this.listJobInfos(); this.$nextTick(() => this.$refs.jobImportTable?.clearSelection()); this.multipleSelection = []; },
    onClickImportSpecialNode({ type }) { if (type === 3) this.workflowVisible = true; else this.importTask([{ type: 2, jobName: this.$t('message.condition'), jobParams: 'true', enable: true }]); },
    async onImportChildWorkflowNode(data) { await this.importTask([{ ...data, jobName: data.wfName, type: 3, jobParams: '' }]); this.workflowVisible = false; },
    async importTask(tasks) {
      if (!tasks.length || this.importLoading) return; this.importLoading = true;
      const generation = this.fetchSequence;
      try {
        const nodes = await this.axios.post('/workflow/saveNode', tasks.map(item => ({ appId: this.workflowInfo.appId, type: Number(item.type || 1), jobId: item.id, nodeName: item.jobName || item.wfName || '', nodeParams: item.jobParams || '', enable: item.enable !== false, skipWhenFailed: !!item.skipWhenFailed })));
        if (generation !== this.fetchSequence) return;
        const point = this.powerFlow.graph.getPointByCanvas(140, 100);
        nodes.forEach((node, index) => this.powerFlow.graph.add('node', { ...node, id: String(node.id), nodeId: String(node.id), nodeType: Number(node.type), x: point.x + index * 35, y: point.y + index * 110 }));
        this.$refs.dag.autoLayout(); this.importDrawerVisible = false; this.multipleSelection = [];
      } catch { /* Failed imports leave the drawer and selection available for retry. */ } finally { this.importLoading = false; }
    },
    onBulkImport() { if (!this.multipleSelection.length) this.$message.warning(this.$t('message.noSelect')); else this.importTask(this.multipleSelection); },
    remoteTaskData(keyword, jobId) {
      clearTimeout(this.taskTimeout); const generation = ++this.searchSequence, type = this.nodeInfo?.type;
      if (type === 2 || !type) return;
      this.taskTimeout = setTimeout(async () => {
        this.taskLoading = true;
        try { const result = await this.axios.post(type === 3 ? '/workflow/list' : '/job/list', { ...this.jobQueryContent, index: 0, keyword, jobId: type === 3 ? undefined : jobId, workflowId: type === 3 ? jobId : undefined }); if (generation === this.searchSequence) this.waitTaskList = result.data || []; } catch { /* A remote search failure must not reject the debounce timer. */ } finally { if (generation === this.searchSequence) this.taskLoading = false; }
      }, 180);
    },
    handleWaitTaskChange() { this.updatePreview(); },
  },
};
</script>
<style scoped>
.workflow-editor { min-width:0; color:var(--pj-text); }
.editor-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:20px; }
.editor-heading > div:first-child { flex:1; min-width:0; }
.editor-heading > div:last-child { display:flex; align-items:center; flex-shrink:0; gap:8px; }
.editor-heading :deep(.el-button + .el-button) { margin-left:0; }
.editor-heading h2 { margin:0; font-size:24px; font-weight:600; line-height:1.3; overflow-wrap:anywhere; }
.editor-heading p { margin:7px 0 0; color:var(--pj-muted); font-size:12px; line-height:1.5; }
.workflow-settings { margin-bottom:24px; padding-top:20px; border:0; border-top:1px solid var(--pj-border); border-radius:0; box-shadow:none; }
.workflow-settings :deep(.el-card__body) { padding:0; }
.settings-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0 24px; }
.settings-grid :deep(.el-form-item) { min-width:0; margin-bottom:18px; }
.schedule-fields { width:100%; display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
.schedule-fields :deep(.el-input) { flex:1 1 160px; min-width:120px; }
.node-panel { min-width:0; }
.node-panel h3 { font-size:14px; font-weight:600; margin:0 0 18px; }
.node-panel :deep(.code-edit) { width:100%; }
.workflow-editor :deep(.el-pagination) { margin-top:20px; }
@media(max-width:1050px) { .settings-grid { grid-template-columns:1fr; } }
@media(max-width:760px) {
  .editor-heading { flex-wrap:wrap; gap:12px; }
  .editor-heading > div:first-child { flex-basis:100%; }
  .editor-heading > div:last-child { width:100%; justify-content:flex-end; }
  .editor-heading h2 { font-size:22px; }
  .workflow-settings { padding-top:16px; margin-bottom:20px; }
}
</style>
