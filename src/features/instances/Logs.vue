<script setup lang="ts">
import { ref,watch,onScopeDispose } from 'vue'
import { api,saveBlob } from '../../core/api'
import { useLatestRequest } from '../../core/request'
import { session } from '../../core/session'
import { t } from '../../core/ui'
import Icon from '../../shared/Icon.vue'
const props=defineProps<{instanceId:string}>()
const page=ref(0),pages=ref(0),content=ref(''),automatic=ref(false),error=ref('')
const request=useLatestRequest(),downloadRequest=useLatestRequest()
const {loading}=request,{loading:downloading}=downloadRequest
let timer:ReturnType<typeof setInterval>|undefined
async function load(){
 if(!props.instanceId)return
 const current=request.begin(),id=props.instanceId,index=page.value
 try{const data=await api<{data:string;totalPages:number}>('/instance/log',{query:{instanceId:id,index,appId:session.appId},signal:current.signal,quiet:true});if(!current.current())return;content.value=data?.data||'';pages.value=data?.totalPages||0;error.value=''}catch(e){if(current.current()&&!current.signal.aborted)error.value=(e as Error).message}finally{current.end()}
}
async function download(){
 if(downloading.value||!props.instanceId)return
 const current=downloadRequest.begin()
 try{const blob=await api<Blob>('/instance/downloadLog4Console',{query:{instanceId:props.instanceId},blob:true,timeout:75000,signal:current.signal,quiet:true});if(current.current())saveBlob(blob,'powerjob-instance-'+props.instanceId+'.log')}catch(e){if(current.current()&&!current.signal.aborted)error.value=(e as Error).message}finally{current.end()}
}
watch(()=>props.instanceId,()=>{page.value=0;content.value='';pages.value=0;error.value='';downloadRequest.invalidate();load()},{immediate:true})
watch(automatic,value=>{clearInterval(timer);if(value)timer=setInterval(()=>{if(!loading.value)load()},5000)})
onScopeDispose(()=>clearInterval(timer))
</script>
<template><section class="logs-view" :aria-label="t('在线日志','Online logs')"><div class="logs-toolbar"><label class="check-label"><input v-model="automatic" type="checkbox"/>{{t('自动刷新','Auto refresh')}}</label><div class="actions"><button type="button" class="btn" :disabled="loading" @click="load"><Icon name="refresh"/>{{t('刷新日志','Refresh logs')}}</button><button type="button" class="btn" :disabled="downloading" @click="download">{{downloading?t('正在下载…','Downloading…'):t('下载日志','Download logs')}}</button></div></div><p v-if="error" class="error-banner" role="alert">{{error}}</p><pre class="log-output" :aria-busy="loading">{{content||t('此页暂无日志，任务运行后可刷新查看。','No logs on this page. Refresh after the job runs.')}}</pre><div class="log-pages"><span>{{t('第','Page')}} {{page+1}} / {{Math.max(1,pages)}}</span><div class="actions"><button type="button" class="btn" :disabled="page===0||loading" @click="page--;load()">{{t('上一页','Previous')}}</button><button type="button" class="btn" :disabled="page+1>=pages||loading" @click="page++;load()">{{t('下一页','Next')}}</button></div></div></section></template>
<style scoped>.logs-toolbar,.log-pages{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.log-output{margin:15px 0;min-height:260px;max-height:50vh;background:#17233d;color:#d2def6;padding:20px;border-radius:8px;font:12px/1.85 ui-monospace,SFMono-Regular,monospace;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}.log-pages{font-size:12px;color:var(--muted)}</style>
