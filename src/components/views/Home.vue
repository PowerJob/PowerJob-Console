<template>
  <div class="overview-page">
    <div class="page-heading overview-heading"><div><h1>{{ $t('message.tabHome') }}</h1><p>{{ $t('message.overviewDescription') }}</p></div><el-button :loading="loading" @click="refresh">{{ $t('message.refresh') }}</el-button></div>
    <div class="metric-grid">
      <article v-for="metric in metrics" :key="metric.title" class="metric-card"><div class="metric-top"><span>{{ $t('message.' + metric.title) }}</span><PjIcon :name="metric.icon"/></div><strong>{{ metric.value ?? '—' }}</strong><span class="metric-caption">{{ systemInfo.appName }}</span></article>
    </div>
    <section class="workers-panel">
      <div class="panel-heading"><div><h2>{{ $t('message.workerNum') }}</h2><p><span class="status-dot"></span>{{ activeWorkerCount }} {{ $t('message.activeWorkers') }} / {{ workerList.length }} {{ $t('message.totalWorkers') }}</p></div><el-tag effect="plain">{{ systemInfo.appName }}</el-tag></div>
      <el-table :data="workerList" :row-class-name="workerTableRowClassName" height="380px" v-loading="loading">
        <el-table-column prop="address" :label="$t('message.workerAddress')" min-width="200"/>
        <el-table-column prop="cpuLoad" :label="$t('message.cpuLoad')" min-width="130"/>
        <el-table-column prop="memoryLoad" :label="$t('message.memoryLoad')" min-width="130"/>
        <el-table-column prop="diskLoad" :label="$t('message.diskLoad')" min-width="130"/>
        <el-table-column prop="tag" label="Tag" min-width="100"/>
        <el-table-column prop="lastActiveTime" :label="$t('message.lastActiveTime')" min-width="180"/>
      </el-table>
    </section>
    <div class="system-grid">
      <section class="system-card"><h2>{{ $t('message.omsServerIP') }}</h2><dl><dt>{{ $t('message.omsServerIP') }}</dt><dd>{{ systemInfo.scheduleServerInfo?.ip || '—' }}</dd><dt>{{ $t('message.omsServerBornTime') }}</dt><dd>{{ common.timestamp2Str(systemInfo.scheduleServerInfo?.bornTime) }}</dd><dt>{{ $t('message.omsServerTimezone') }}</dt><dd>{{ systemInfo.timezone || '—' }}</dd><dt>{{ $t('message.omsServerTime') }}</dt><dd>{{ systemInfo.serverTime || '—' }}</dd></dl></section>
      <section class="system-card"><h2>{{ $t('message.localBrowserTimezone') }}</h2><dl><dt>{{ $t('message.localBrowserTimezone') }}</dt><dd>{{ browserTimezone }}</dd><dt>{{ $t('message.localBrowserTime') }}</dt><dd>{{ common.timestamp2Str(updatedAt) }}</dd><dt>{{ $t('message.appName') }}</dt><dd>{{ systemInfo.appName || '—' }}</dd><dt>{{ $t('message.refreshTime') }}</dt><dd>{{ common.timestamp2Str(updatedAt) }}</dd></dl></section>
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
.overview-heading{display:flex;justify-content:space-between;align-items:center}.metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;margin-bottom:24px}.metric-card{padding:23px;background:var(--pj-surface);border:1px solid var(--pj-border);border-radius:10px}.metric-top{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--pj-muted)}.metric-top .pj-icon{color:var(--pj-primary);width:19px}.metric-card strong{display:block;font-size:34px;letter-spacing:-1px;font-weight:600;margin:16px 0 10px}.metric-caption{font-size:11px;color:var(--pj-muted)}.workers-panel{background:#fff;border:1px solid var(--pj-border);border-radius:10px;overflow:hidden;margin-bottom:24px}.panel-heading{padding:23px;display:flex;justify-content:space-between;align-items:center}.panel-heading h2,.system-card h2{font-size:15px;font-weight:600;margin:0}.panel-heading p{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--pj-muted);margin:8px 0 0}.workers-panel :deep(.el-table){border:0;border-radius:0}.system-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.system-card{padding:24px;border:1px solid var(--pj-border);background:#fff;border-radius:10px}.system-card dl{display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12px;margin:22px 0 0}.system-card dt{color:var(--pj-muted)}.system-card dd{margin:0;word-break:break-word}@media(max-width:1100px){.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.system-grid{grid-template-columns:1fr}.metric-card{padding:18px}.metric-card strong{font-size:28px}.system-card dl{grid-template-columns:1fr 1fr}}
</style>
