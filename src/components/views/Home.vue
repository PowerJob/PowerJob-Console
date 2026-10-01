<template>
  <div class="overview-page">
    <div class="page-heading overview-heading">
      <div><h1>{{ $t('message.tabHome') }}</h1><p>{{ $t('message.overviewDescription') }}</p></div>
      <el-button :loading="loading" @click="refresh"><PjIcon name="refresh"/>{{ $t('message.refresh') }}</el-button>
    </div>
    <div class="overview-body">
      <section class="overview-summary">
        <article v-for="metric in metrics" :key="metric.title" class="summary-row">
          <div class="summary-label"><PjIcon :name="metric.icon"/><span>{{ $t('message.' + metric.title) }}</span></div>
          <strong>{{ metric.value ?? '—' }}</strong>
        </article>
      </section>
      <section class="workers-panel">
      <div class="panel-heading">
        <div class="worker-summary"><h2>{{ $t('message.workerResources') }}</h2><span class="worker-count">{{ activeWorkerCount }} {{ $t('message.activeWorkers') }} <span class="count-divider">/</span> {{ workerList.length }} {{ $t('message.totalWorkers') }}</span></div>
        <el-tag effect="plain">{{ systemInfo.appName }}</el-tag>
      </div>
      <el-table :data="workerList" :row-class-name="workerTableRowClassName" max-height="320" v-loading="loading">
        <el-table-column prop="address" :label="$t('message.workerAddress')" min-width="220" show-overflow-tooltip><template #default="scope"><span class="worker-address"><span class="worker-state" :class="workerTableRowClassName({row:scope.row})" aria-hidden="true"></span><span>{{ scope.row.address }}<small class="worker-status-label">{{ $t('message.' + workerStatusKey(scope.row.status)) }}</small></span></span></template></el-table-column>
        <el-table-column prop="cpuLoad" :label="$t('message.cpuLoad')" min-width="120"><template #default="scope"><span class="resource-value">{{ scope.row.cpuLoad ?? '—' }}</span></template></el-table-column>
        <el-table-column prop="memoryLoad" :label="$t('message.memoryLoad')" min-width="130"><template #default="scope"><span class="resource-value">{{ scope.row.memoryLoad ?? '—' }}</span></template></el-table-column>
        <el-table-column prop="diskLoad" :label="$t('message.diskLoad')" min-width="120"><template #default="scope"><span class="resource-value">{{ scope.row.diskLoad ?? '—' }}</span></template></el-table-column>
        <el-table-column prop="tag" label="Tag" min-width="100" show-overflow-tooltip/>
        <el-table-column prop="lastActiveTime" :label="$t('message.lastActiveTime')" min-width="180"/>
      </el-table>
      </section>
    </div>
    <div class="system-grid">
      <section class="system-facts"><h2>{{ $t('message.overviewServerFacts') }}</h2><dl><dt>{{ $t('message.omsServerIP') }}</dt><dd>{{ systemInfo.scheduleServerInfo?.ip || '—' }}</dd><dt>{{ $t('message.omsServerBornTime') }}</dt><dd>{{ common.timestamp2Str(systemInfo.scheduleServerInfo?.bornTime) }}</dd><dt>{{ $t('message.omsServerTimezone') }}</dt><dd>{{ systemInfo.timezone || '—' }}</dd><dt>{{ $t('message.omsServerTime') }}</dt><dd>{{ systemInfo.serverTime || '—' }}</dd></dl></section>
      <section class="system-facts"><h2>{{ $t('message.overviewBrowserFacts') }}</h2><dl><dt>{{ $t('message.localBrowserTimezone') }}</dt><dd>{{ browserTimezone }}</dd><dt>{{ $t('message.localBrowserTime') }}</dt><dd>{{ common.timestamp2Str(updatedAt) }}</dd><dt>{{ $t('message.appName') }}</dt><dd>{{ systemInfo.appName || '—' }}</dd><dt>{{ $t('message.refreshTime') }}</dt><dd>{{ common.timestamp2Str(updatedAt) }}</dd></dl></section>
    </div>
  </div>
</template>
<script>
export default {
  name: 'Home',
  data() { return { systemInfo: {}, workerList: [], loading: false, listGeneration: 0, updatedAt: null, browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone } },
  computed: {
    activeWorkerCount() { return this.workerList.filter(worker => worker.status !== 9999).length },
    metrics() { return [{title:'totalJobNum',icon:'job',value:this.systemInfo.jobCount},{title:'runningInstanceNum',icon:'instance',value:this.systemInfo.runningInstanceCount},{title:'recentFailedInstanceNum',icon:'bell',value:this.systemInfo.failedInstanceCount},{title:'workerNum',icon:'cpu',value:this.activeWorkerCount}] },
  },
  methods: {
    workerStatusKey(status) { return ({1:'workerHealthy',2:'workerResourceWarning',3:'workerResourcePressure',4:'workerResourcePressure',9999:'workerOffline'})[status] || 'workerUnknown' },
    workerTableRowClassName({ row }) { return ({1:'success-row',2:'warning-row',9999:'offline-row'})[row.status] || 'error-row' },
    async refresh() {
      const generation = ++this.listGeneration
      this.loading = true
      const appId = localStorage.getItem('Power_appId')
      const results = await Promise.allSettled([this.axios.get('/system/listWorker', {params:{appId}}), this.axios.get('/system/overview', {params:{appId}})])
      if (generation !== this.listGeneration) return
      if (results[0].status === 'fulfilled') this.workerList = [...results[0].value].sort((a,b) => a.status - b.status)
      if (results[1].status === 'fulfilled') this.systemInfo = results[1].value
      this.updatedAt = Date.now(); this.loading = false
    },
  },
  mounted() { this.refresh() },
  beforeUnmount() { this.listGeneration++ },
}
</script>
<style scoped>
.overview-page { min-width:0; color:var(--pj-text); }
.overview-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; }
.overview-heading > div { min-width:0; }
.overview-heading .pj-icon { width:15px; height:15px; margin-right:6px; }
.overview-body { display:grid; grid-template-columns:minmax(190px,232px) minmax(0,1fr); gap:28px; padding:4px 0 26px; }
.overview-summary { align-self:start; min-width:0; padding-right:24px; border-right:1px solid var(--pj-border); }
.summary-row { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:12px; min-height:52px; padding:10px 0; border-bottom:1px solid var(--pj-border); }
.summary-row:first-child { padding-top:0; }
.summary-row:last-child { border-bottom:0; padding-bottom:0; }
.summary-label { display:flex; align-items:center; gap:8px; color:var(--pj-muted); font-size:12px; line-height:1.5; }
.summary-label .pj-icon { width:16px; height:16px; color:var(--pj-primary); flex-shrink:0; }
.summary-row strong { font-size:25px; line-height:1.2; font-weight:600; font-variant-numeric:tabular-nums; }
.workers-panel { min-width:0; overflow:hidden; }
.panel-heading { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; padding:0 0 12px; }
.worker-summary { display:flex; flex-wrap:wrap; align-items:center; gap:8px 18px; min-width:0; }
.panel-heading h2,.system-facts h2 { font-size:14px; font-weight:600; line-height:1.5; margin:0; }
.worker-count { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:var(--pj-muted); }
.count-divider { padding:0 2px; }
.panel-heading .el-tag { max-width:160px; flex-shrink:0; }
.panel-heading :deep(.el-tag__content) { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.workers-panel :deep(.el-table) { border:0; border-radius:0; }
.workers-panel :deep(.el-table th.el-table__cell),.workers-panel :deep(.el-table td.el-table__cell) { padding:6px 0; }
.worker-address { display:flex; align-items:center; gap:9px; min-width:0; color:var(--pj-text); }
.worker-state { width:6px; height:6px; border-radius:50%; background:var(--el-color-danger); flex-shrink:0; }
.worker-state.success-row { background:var(--el-color-success); }
.worker-state.warning-row { background:var(--el-color-warning); }
.worker-state.offline-row { background:var(--pj-muted); }
.resource-value { font-variant-numeric:tabular-nums; color:var(--pj-text); }
.system-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); border-top:1px solid var(--pj-border); }
.system-facts { min-width:0; padding:20px 28px 0 0; }
.system-facts + .system-facts { border-left:1px solid var(--pj-border); padding-left:28px; padding-right:0; }
.system-facts dl { display:grid; grid-template-columns:minmax(105px,auto) minmax(0,1fr); gap:10px 20px; font-size:12px; line-height:1.5; margin:16px 0 0; }
.system-facts dt { color:var(--pj-muted); }
.system-facts dd { margin:0; overflow-wrap:anywhere; font-variant-numeric:tabular-nums; }
@media(max-width:900px) {
  .overview-body { grid-template-columns:1fr; gap:26px; }
  .overview-summary { padding:0; border-right:0; }
  .summary-row { min-height:44px; padding:8px 0; }
  .summary-row strong { font-size:23px; }
  .system-grid { grid-template-columns:1fr; }
  .system-facts { padding:20px 0; }
  .system-facts + .system-facts { padding:20px 0 0; border-left:0; border-top:1px solid var(--pj-border); }
}
@media(max-width:760px) {
  .overview-heading { align-items:flex-start; }
  .panel-heading { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px 12px; align-items:center; }
  .worker-summary { display:contents; }
  .panel-heading h2 { grid-column:1; grid-row:1; }
  .worker-count { grid-column:1/-1; grid-row:2; flex-wrap:wrap; }
  .panel-heading .el-tag { grid-column:2; grid-row:1; max-width:130px; }
  .system-facts dl { gap:10px 14px; }
}
.worker-status-label{display:block;font-size:11px;line-height:1.5;color:var(--pj-muted)}
</style>
