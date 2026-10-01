<template>
  <section class="instance-detail" :style="panelStyle" v-loading="loading">
    <div class="detail-toolbar"><el-button size="small" @click="fetchInstanceDetail">{{ $t('message.refresh') }}</el-button><el-button v-if="nodeType === 3 && nodeDetail?.instanceId" size="small" type="primary" @click="handleToDetail">{{ $t('message.detail') }}</el-button></div>
    <el-tabs v-model="activeTab" @tab-change="onTabChange">
      <el-tab-pane :label="$t('message.detail')" name="detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item v-if="nodeType !== 2" :label="$t('message.instanceId')">{{ instanceId || instanceDetail.instanceId || '—' }}</el-descriptions-item>
          <el-descriptions-item :label="$t('message.status')">{{ common.translateInstanceStatus(instanceDetail.status) }}</el-descriptions-item>
          <el-descriptions-item v-if="normalInstance" :label="$t('message.runningTimes')">{{ instanceDetail.runningTimes }}</el-descriptions-item>
          <el-descriptions-item v-if="normalInstance" :label="$t('message.taskTrackerAddress')">{{ instanceDetail.taskTrackerAddress || '—' }}</el-descriptions-item>
          <el-descriptions-item v-if="normalInstance" :label="$t('message.expectedTriggerTime')">{{ instanceDetail.expectedTriggerTime || '—' }}</el-descriptions-item>
          <el-descriptions-item :label="$t('message.startTime')">{{ instanceDetail.actualTriggerTime || instanceDetail.startTime || '—' }}</el-descriptions-item>
          <el-descriptions-item :label="$t('message.finishedTime')">{{ instanceDetail.finishedTime || '—' }}</el-descriptions-item>
          <el-descriptions-item v-if="normalInstance" :label="$t('message.nodeParams')"><pre class="detail-value">{{ instanceDetail.jobParams ?? instanceDetail.nodeParams ?? '—' }}</pre></el-descriptions-item>
          <el-descriptions-item v-if="normalInstance" :label="$t('message.instanceParams')"><pre class="detail-value">{{ instanceDetail.instanceParams || '—' }}</pre></el-descriptions-item>
          <el-descriptions-item :label="$t('message.result')"><pre class="detail-value">{{ instanceDetail.result || '—' }}</pre></el-descriptions-item>
          <el-descriptions-item v-if="instanceDetail.taskDetail && nodeType !== 2" :label="$t('message.taskDetail')"><pre class="detail-value">{{ instanceDetail.taskDetail }}</pre></el-descriptions-item>
        </el-descriptions>
        <div class="detail-extra"><slot /></div>
        <template v-if="instanceDetail.subInstanceDetails?.length"><el-divider>{{ $t('message.secondlyJobHistory') }}</el-divider><el-table :data="instanceDetail.subInstanceDetails"><el-table-column prop="subInstanceId" :label="$t('message.subInstanceId')" min-width="150" /><el-table-column prop="startTime" :label="$t('message.startTime')" min-width="160" /><el-table-column prop="finishedTime" :label="$t('message.finishedTime')" min-width="160" /><el-table-column :label="$t('message.status')" min-width="120"><template #default="{row}">{{ common.translateInstanceStatus(row.status) }}</template></el-table-column><el-table-column prop="result" :label="$t('message.result')" min-width="160" show-overflow-tooltip /></el-table></template>
        <template v-if="showQueriedTaskDetailInfoList"><el-divider>{{ $t('message.queriedTaskDetailInfoList') }}</el-divider><div class="task-query"><el-input v-model="customQuery" @keyup.enter="fetchInstanceDetail"><template #prepend>select * from task_info where</template><template #append>limit 10</template></el-input><el-button type="primary" @click="fetchInstanceDetail">{{ $t('message.query') }}</el-button></div><el-table :data="instanceDetail.queriedTaskDetailInfoList || []"><el-table-column v-for="column in taskColumns" :key="column.prop" :prop="column.prop" :label="column.key ? $t(`message.${column.key}`) : column.prop" :min-width="column.width || 140" show-overflow-tooltip /></el-table></template>
      </el-tab-pane>
      <el-tab-pane v-if="normalInstance && instanceId" :label="$t('message.log')" name="log"><div class="log-toolbar"><el-switch v-model="autoRefresh" :active-text="$t('message.autoRefresh')" /><el-button size="small" :loading="logLoading" @click="fetchLog">{{ $t('message.refresh') }}</el-button><el-button size="small" :loading="downloadLoading" @click="downloadLog">{{ $t('message.download') }}</el-button></div><pre v-loading="logLoading" class="instance-log">{{ log.data || '—' }}</pre><el-pagination :current-page="logPage + 1" :page-count="Math.max(1, log.totalPages || 0)" layout="prev, pager, next" @current-change="changeLogPage" /></el-tab-pane>
    </el-tabs>
  </section>
</template>
<script>
import { instanceRequest } from '../dag/workflow-model.js';
import { downloadInstanceLog } from '../dag/instance-log.js';
export default {
  name: 'InstanceDetail', props: ['instanceId', 'fixedWidth', 'resultAll', 'nodeDetail'],
  data() { return { instanceDetail: {}, loading: false, customQuery: 'status in (5, 6) order by last_modified_time desc', showQueriedTaskDetailInfoList: false, requestSequence: 0, logSequence: 0, activeTab: 'detail', log: { data: '', totalPages: 0 }, logPage: 0, logLoading: false, downloadLoading: false, autoRefresh: false, refreshTimer: null, taskColumns: [{ prop:'taskId', width:100 }, { prop:'taskName' }, { prop:'taskContent' }, { prop:'processorAddress' }, { prop:'failedCnt', key:'failedCnt', width:100 }, { prop:'statusStr', key:'status' }, { prop:'createdTimeStr', key:'createdTime' }, { prop:'lastModifiedTimeStr', key:'lastModifiedTime' }, { prop:'lastReportTimeStr', key:'lastReportTime' }, { prop:'result', key:'result' }] }; },
  computed: { nodeType() { return Number(this.nodeDetail?.nodeType || this.instanceDetail.nodeType || 1); }, normalInstance() { return this.nodeType !== 2 && this.nodeType !== 3; }, panelStyle() { return { width: this.fixedWidth ? `${Number(this.fixedWidth)}px` : '100%', maxWidth: '100%' }; } },
  mounted() { this.fetchInstanceDetail().catch(() => {}); },
  beforeUnmount() { this.requestSequence++; this.logSequence++; clearInterval(this.refreshTimer); },
  watch: {
    instanceId() { this.resetInstance(); }, nodeDetail: { deep: true, handler() { if (!this.normalInstance) { this.activeTab = 'detail'; this.logSequence++; } this.fetchInstanceDetail().catch(() => {}); } },
    autoRefresh(value) { clearInterval(this.refreshTimer); if (value) this.refreshTimer = setInterval(() => { if (this.activeTab === 'log' && !this.logLoading) this.fetchLog().catch(() => {}); }, 5000); },
  },
  methods: {
    resetInstance() { this.instanceDetail = {}; this.showQueriedTaskDetailInfoList = false; this.log = { data: '', totalPages: 0 }; this.logPage = 0; this.logSequence++; this.fetchInstanceDetail().catch(() => {}); if (this.activeTab === 'log') this.fetchLog().catch(() => {}); },
    async fetchInstanceDetail() {
      const sequence = ++this.requestSequence;
      if (this.nodeDetail && [2, 3].includes(Number(this.nodeDetail.nodeType))) { this.instanceDetail = { ...this.nodeDetail }; this.loading = false; return; }
      const request = instanceRequest(this.instanceId, this.customQuery);
      if (!request) { this.instanceDetail = this.nodeDetail ? { ...this.nodeDetail } : {}; this.loading = false; return; }
      this.loading = true;
      try { const detail = await this.axios.post('/instance/detailPlus', request); if (sequence === this.requestSequence) { this.instanceDetail = detail || {}; if (Array.isArray(detail?.queriedTaskDetailInfoList)) this.showQueriedTaskDetailInfoList = true; } } catch { /* Preserve the last details while the HTTP client reports the failure. */ } finally { if (sequence === this.requestSequence) this.loading = false; }
    },
    handleToDetail() { if (this.nodeType === 3 && this.nodeDetail?.instanceId) this.$router.push({ name:'WorkflowInstanceDetail', query:{ wfInstanceId:String(this.nodeDetail.instanceId) } }); },
    onTabChange(tab) { if (tab === 'log') this.fetchLog(); },
    changeLogPage(page) { this.logPage = page - 1; this.fetchLog(); },
    async fetchLog() { if (!this.instanceId || !this.normalInstance) return; const sequence = ++this.logSequence; this.logLoading = true; try { const log = await this.axios.get('/instance/log', { params: { instanceId:String(this.instanceId), index:this.logPage, appId:window.localStorage.getItem('Power_appId') } }); if (sequence === this.logSequence) this.log = log || { data:'', totalPages:0 }; } catch { /* Preserve the current log page for retry. */ } finally { if (sequence === this.logSequence) this.logLoading = false; } },
    async downloadLog() { if (!this.instanceId || this.downloadLoading) return; this.downloadLoading = true; try { await downloadInstanceLog(this.axios, this.instanceId); } catch (error) { this.$message.error(error.message); } finally { this.downloadLoading = false; } },
  },
};
</script>
<style scoped>
.instance-detail { box-sizing:border-box; }.detail-toolbar { display:flex; justify-content:flex-end; gap:8px; margin-bottom:10px; }.detail-value { margin:0; white-space:pre-wrap; overflow-wrap:anywhere; font:inherit; }.detail-extra { margin-top:12px; }.task-query { display:flex; gap:8px; margin-bottom:16px; }.log-toolbar { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:14px; }.instance-log { min-height:240px; max-height:440px; padding:16px; overflow:auto; white-space:pre-wrap; overflow-wrap:anywhere; border-radius:6px; color:var(--pj-log-text); background:var(--pj-log-bg); font:12px/1.7 ui-monospace,SFMono-Regular,monospace; }.instance-detail :deep(.el-descriptions__label) { width:150px; }.instance-detail :deep(.el-descriptions__content) { overflow-wrap:anywhere; }
@media(max-width:700px) { .task-query { flex-direction:column; }.instance-detail :deep(.el-input-group__prepend) { display:none; } }
</style>
