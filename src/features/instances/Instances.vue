<script setup lang="ts">
import { computed,reactive,ref,watch,onScopeDispose } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../../core/api'
import { useLatestRequest } from '../../core/request'
import { session,type Entity } from '../../core/session'
import { t,formatTime,instanceStatus,confirmAction,toast } from '../../core/ui'
import Field from '../../shared/Field.vue'
import Modal from '../../shared/Modal.vue'
import TableState from '../../shared/TableState.vue'
import Pagination from '../../shared/Pagination.vue'
import Icon from '../../shared/Icon.vue'
import InstanceDetail from './InstanceDetail.vue'
import Logs from './Logs.vue'
const route=useRoute(),query=reactive({index:0,pageSize:10,type:'NORMAL',jobId:'',instanceId:'',wfInstanceId:'',status:''})
const rows=ref<Entity[]>([]),total=ref(0),error=ref(''),opened=ref(false),view=ref('details'),id=ref(''),busy=ref(new Set<string>())
const request=useLatestRequest(),{loading}=request
let alive=true;onScopeDispose(()=>alive=false)
const statuses=computed(()=>[{value:'',label:t('全部状态','All statuses')},...['WAITING_DISPATCH','WAITING_WORKER_RECEIVE','RUNNING','FAILED','SUCCEED','CANCELED','STOPPED'].map((value,index)=>({value,label:instanceStatus([1,2,3,4,5,9,10][index])}))])
async function load(){const current=request.begin();const body={...query,appId:session.appId,jobId:query.jobId||undefined,instanceId:query.instanceId||undefined,wfInstanceId:query.wfInstanceId||undefined};try{const data=await api<Entity>('/instance/list',{body,signal:current.signal,quiet:true});if(current.current()){rows.value=data?.data||[];total.value=data?.totalItems||0;error.value=''}}catch(e){if(current.current()&&!current.signal.aborted)error.value=(e as Error).message}finally{current.end()}}
function search(){query.index=0;load()}
function reset(){Object.assign(query,{jobId:'',instanceId:'',wfInstanceId:'',status:'',index:0});load()}
function show(item:Entity,kind:string){id.value=String(item.instanceId);view.value=kind;opened.value=true}
async function operate(item:Entity,action:string){
 const target=String(item.instanceId),revision=session.revision,key=target+':'+action
 if(busy.value.has(key))return
 if(action==='stop'&&!await confirmAction(t('停止实例 '+target+'？','Stop instance '+target+'?')))return
 if(!alive||revision!==session.revision)return
 busy.value.add(key)
 try{await api('/instance/'+action,{query:{instanceId:target,appId:session.appId}});if(!alive||revision!==session.revision)return;toast(action==='stop'?t('停止请求已发送','Stop requested'):t('重试请求已发送','Retry requested'),'success');load()}catch{/* Central request feedback. */}finally{busy.value.delete(key)}
}
watch(()=>route.query.jobId,value=>{query.jobId=typeof value==='string'?value:'';query.index=0;load()},{immediate:true})
</script>
<template><div class="page-head"><div><h1>{{t('任务实例','Job instances')}}</h1><p>{{t('查找每次执行，查看结果与在线日志。','Inspect each execution, its result and online logs.')}}</p></div><button class="btn" :disabled="loading" @click="load"><Icon name="refresh"/>{{t('刷新','Refresh')}}</button></div><section class="work-panel"><form class="filter-bar" @submit.prevent="search"><Field :label="t('任务 ID','Job ID')"><input v-model="query.jobId" inputmode="numeric"/></Field><Field :label="t('实例 ID','Instance ID')"><input v-model="query.instanceId" inputmode="numeric"/></Field><Field v-if="query.type==='WORKFLOW'" :label="t('工作流实例 ID','Workflow instance ID')"><input v-model="query.wfInstanceId" inputmode="numeric"/></Field><Field :label="t('状态','Status')"><select v-model="query.status"><option v-for="option in statuses" :key="option.value" :value="option.value">{{option.label}}</option></select></Field><div class="actions"><button class="btn btn-primary">{{t('查询','Search')}}</button><button type="button" class="btn btn-quiet" @click="reset">{{t('重置','Reset')}}</button></div></form><div class="instance-tabs tabs"><button type="button" :class="{active:query.type==='NORMAL'}" @click="query.type='NORMAL';search()">{{t('普通实例','Ordinary runs')}}</button><button type="button" :class="{active:query.type==='WORKFLOW'}" @click="query.type='WORKFLOW';search()">{{t('工作流内实例','Workflow job runs')}}</button></div><p v-if="error" class="error-banner" role="alert">{{error}}</p><TableState :loading="loading" :empty="!rows.length"><div class="table-scroll"><table class="data-table"><thead><tr><th>{{t('任务','Job')}}</th><th>{{t('实例 ID','Instance ID')}}</th><th v-if="query.type==='WORKFLOW'">{{t('工作流实例 ID','Workflow instance ID')}}</th><th>{{t('状态','Status')}}</th><th>{{t('触发时间','Started')}}</th><th>{{t('结束时间','Finished')}}</th><th>{{t('操作','Actions')}}</th></tr></thead><tbody><tr v-for="item in rows" :key="item.instanceId"><td><span class="identity">{{item.jobName}}</span><span class="secondary">#{{item.jobId}}</span></td><td class="code">{{item.instanceId}}</td><td v-if="query.type==='WORKFLOW'">{{item.wfInstanceId}}</td><td><span class="badge dot" :class="Number(item.status)===5?'success':Number(item.status)===4?'error':Number(item.status)===3?'running':'warning'">{{instanceStatus(item.status)}}</span></td><td>{{formatTime(item.actualTriggerTime)}}</td><td>{{formatTime(item.finishedTime)}}</td><td><div class="actions"><button class="btn btn-quiet" @click="show(item,'details')">{{t('详情','Details')}}</button><button class="btn btn-quiet" @click="show(item,'logs')">{{t('日志','Logs')}}</button><button class="btn btn-quiet" :disabled="busy.has(item.instanceId+':retry')" @click="operate(item,'retry')">{{t('重试','Retry')}}</button><button class="btn btn-quiet" :disabled="busy.has(item.instanceId+':stop')" @click="operate(item,'stop')">{{t('停止','Stop')}}</button></div></td></tr></tbody></table></div></TableState><Pagination :index="query.index" :size="query.pageSize" :total="total" @change="query.index=$event;load()"/></section><Modal v-model="opened" :title="(view==='details'?t('实例详情','Instance details'):t('实例日志','Instance logs'))+' #'+id" wide><template v-if="opened"><InstanceDetail v-if="view==='details'" :key="id" :instance-id="id"/><Logs v-else :key="id" :instance-id="id"/></template></Modal></template>
<style scoped>.instance-tabs{padding:10px 18px 0}.work-panel>.error-banner{margin:14px 18px}</style>
