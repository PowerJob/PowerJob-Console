<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '../../core/api'
import { session, type Entity } from '../../core/session'
import { t, formatTime } from '../../core/ui'
import { useLatestRequest } from '../../core/request'
import Icon from '../../shared/Icon.vue'
const data = ref<Entity>({})
const workers = ref<Entity[]>([])
const updated = ref<number>()
const request = useLatestRequest()
const online = computed(() => workers.value.filter(item=>Number(item.status)!==9999).length)
const metrics = computed(() => [
  {label:t('调度任务','Scheduled jobs'),value:data.value.jobCount,icon:'job',caption:t('当前应用的任务总数','Jobs in this application')},
  {label:t('正在执行','Running now'),value:data.value.runningInstanceCount,icon:'play',caption:t('正在运行的任务实例','Active job executions')},
  {label:t('近期失败','Recent failures'),value:data.value.failedInstanceCount,icon:'instance',caption:t('需要关注的执行结果','Executions to investigate')},
  {label:t('在线 Worker','Online Workers'),value:online.value,icon:'server',caption:String(workers.value.length)+' '+t('个已注册 Worker','registered Workers')},
])
function health(status: unknown) { return ({1:t('运行正常','Healthy'),2:t('资源需关注','Resource warning'),3:t('资源紧张','Resource pressure'),4:t('资源紧张','Resource pressure'),9999:t('离线','Offline')} as Record<string,string>)[String(status)]||t('未知','Unknown') }
function utilization(value:unknown) {const text=String(value||'');const ratio=text.match(/([\d.]+)\s*\/\s*([\d.]+)/);const n=text.includes('%')?Number(text.split('%')[0]):ratio&&Number(ratio[2])>0?Number(ratio[1])/Number(ratio[2])*100:NaN;return Number.isFinite(n)?Math.max(0,Math.min(100,n)):0}
async function refresh() {
  const run = request.begin()
  try {
    const results = await Promise.allSettled([api<Entity>('/system/overview',{query:{appId:session.appId},signal:run.signal}),api<Entity[]>('/system/listWorker',{query:{appId:session.appId},signal:run.signal})])
    if (!run.current()) return
    if (results[0].status==='fulfilled') data.value=results[0].value
    if (results[1].status==='fulfilled') workers.value=[...results[1].value].sort((a,b)=>a.status-b.status)
    updated.value=Date.now()
  } finally {run.end()}
}
onMounted(refresh)
</script>
<template><div class="page-head"><div><h1>{{t('运行概览','Operations overview')}}</h1><p>{{t('任务执行与 Worker 资源','Job executions and Worker resources')}}</p></div><button class="btn" :disabled="request.loading.value" @click="refresh"><Icon name="refresh"/>{{t('刷新','Refresh')}}</button></div>
<div class="overview-metrics"><section v-for="metric in metrics" :key="metric.label"><div class="metric-label"><Icon :name="metric.icon"/>{{metric.label}}</div><strong>{{metric.value??'—'}}</strong><p>{{metric.caption}}</p></section></div>
<section class="work-panel overview-workers"><header><div><h2>{{t('Worker 集群','Worker cluster')}}</h2><p>{{t('资源状态来自服务端当前观测','Resource status from the latest server observation')}}</p></div><span class="badge success dot">{{online}} {{t('在线','online')}}</span></header><div class="table-scroll"><table class="data-table"><thead><tr><th>{{t('机器与状态','Worker & status')}}</th><th>CPU</th><th>{{t('内存','Memory')}}</th><th>{{t('磁盘','Disk')}}</th><th>Tag</th><th>{{t('上次活跃','Last active')}}</th></tr></thead><tbody><tr v-for="worker in workers" :key="worker.address"><td><strong class="identity">{{worker.address}}</strong><span class="badge dot" :class="Number(worker.status)===1?'success':Number(worker.status)===9999?'':'warning'">{{health(worker.status)}}</span></td><td>{{worker.cpuLoad}}<div class="resource-track"><span :style="{width:utilization(worker.cpuLoad)+'%'}"/></div></td><td>{{worker.memoryLoad}}<div class="resource-track"><span :style="{width:utilization(worker.memoryLoad)+'%'}"/></div></td><td>{{worker.diskLoad}}<div class="resource-track" :class="{warning:utilization(worker.diskLoad)>80}"><span :style="{width:utilization(worker.diskLoad)+'%'}"/></div></td><td>{{worker.tag||'—'}}</td><td>{{worker.lastActiveTime}}</td></tr></tbody></table></div><div v-if="!workers.length" class="empty-state"><strong>{{t('尚未发现 Worker','No Workers connected')}}</strong><p>{{t('启动 Worker 并确认它配置了当前应用名称。','Start a Worker configured for this application.')}}</p></div></section>
<div class="overview-facts"><section class="work-panel pad"><h2>{{t('Server 信息','Server information')}}</h2><dl class="facts"><dt>Master IP</dt><dd>{{data.scheduleServerInfo?.ip||'—'}}</dd><dt>{{t('启动时间','Started')}}</dt><dd>{{formatTime(data.scheduleServerInfo?.bornTime)}}</dd><dt>{{t('服务器时区','Server timezone')}}</dt><dd>{{data.timezone||'—'}}</dd><dt>{{t('服务器时间','Server time')}}</dt><dd>{{data.serverTime||'—'}}</dd></dl></section><section class="work-panel pad"><h2>{{t('浏览器信息','Browser information')}}</h2><dl class="facts"><dt>{{t('本地时区','Local timezone')}}</dt><dd>{{Intl.DateTimeFormat().resolvedOptions().timeZone}}</dd><dt>{{t('本地时间','Local time')}}</dt><dd>{{formatTime(updated)}}</dd><dt>{{t('当前应用','Application')}}</dt><dd>{{session.appName}}</dd><dt>{{t('更新时间','Updated')}}</dt><dd>{{formatTime(updated)}}</dd></dl></section></div>
</template>
<style scoped>.overview-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:#fff;border:1px solid var(--line);border-radius:10px;margin-bottom:24px;padding:21px 0}.overview-metrics section{padding:0 25px;min-width:0;border-right:1px solid var(--line)}.overview-metrics section:last-child{border:0}.metric-label{display:flex;gap:9px;align-items:center;font-size:12px;color:var(--muted);font-weight:650}.metric-label .icon{color:var(--blue)}.overview-metrics strong{display:block;font-size:29px;letter-spacing:-1px;font-weight:800;line-height:1.3;margin:8px 0 4px}.overview-metrics p{font-size:11px;color:var(--muted)}.overview-workers header{display:flex;align-items:center;justify-content:space-between;padding:21px 23px}.overview-workers header p{font-size:12px;color:var(--muted);margin-top:5px}.overview-workers .identity{margin-bottom:5px}.resource-track{height:4px;background:#eef1f7;border-radius:4px;margin-top:7px;max-width:100px}.resource-track span{display:block;height:100%;background:#7599ef;border-radius:4px}.resource-track.warning span{background:#d4a950}.overview-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));background:#fff;border:1px solid var(--line);border-radius:10px;margin-top:22px}.overview-facts .work-panel{border:0;border-radius:0;background:transparent}.overview-facts .work-panel+section{border-left:1px solid var(--line)}.overview-facts h2{margin-bottom:20px}@media(max-width:1100px){.overview-metrics section{padding:0 17px}}@media(max-width:760px){.overview-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.overview-metrics section:nth-child(2){border:0}.overview-metrics section:nth-child(n+3){margin-top:20px}.overview-facts{grid-template-columns:1fr}.overview-facts .work-panel+section{border-left:0;border-top:1px solid var(--line)}.overview-workers header{padding:17px}.overview-metrics strong{font-size:29px}}</style>
