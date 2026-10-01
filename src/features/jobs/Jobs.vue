<script setup lang="ts">
import { onMounted, ref, reactive, onBeforeUnmount, useId } from 'vue'
import { useRouter } from 'vue-router'
import { api,parseJSON } from '../../core/api'
import { session,type Entity } from '../../core/session'
import { t,toast,confirmAction,downloadText } from '../../core/ui'
import { useLatestRequest } from '../../core/request'
import Field from '../../shared/Field.vue'
import Modal from '../../shared/Modal.vue'
import Icon from '../../shared/Icon.vue'
import Pagination from '../../shared/Pagination.vue'
import TableState from '../../shared/TableState.vue'
import JobEditor from './JobEditor.vue'
import { createJob,editJob,jobPayload } from './model'
const router=useRouter(),request=useLatestRequest()
const jobFormId=useId(),jobEditor=ref<InstanceType<typeof JobEditor>|null>(null)
const query=reactive({jobId:'',keyword:'',index:0,pageSize:10})
const page=ref<Entity>({data:[],totalItems:0,pageSize:10})
const editOpen=ref(false),job=ref<Entity>(createJob(session.appId)),more=ref<Entity|null>(null),runTarget=ref<Entity|null>(null),runParams=ref(''),running=ref(false)
const jsonOpen=ref(false),jsonMode=ref('import'),jsonContent=ref(''),jsonError=ref(''),jsonBusy=ref(false)
const jsonRequest=useLatestRequest(),toggling=ref(new Set<string>())
let alive=true
onBeforeUnmount(()=>{alive=false})
async function load(){const run=request.begin();const body={...query,appId:session.appId,jobId:query.jobId||undefined,keyword:query.keyword||undefined};try{const data=await api('/job/list',{body,signal:run.signal});if(run.current())page.value=data}catch{/* Preserve current results. */}finally{run.end()}}
function search(){query.index=0;load()}
function reset(){Object.assign(query,{jobId:'',keyword:'',index:0});load()}
function edit(item?:Entity){job.value=item?editJob(item):createJob(session.appId);editOpen.value=true}
async function toggle(item:Entity,event:Event){const prior=item.enable,input=event.target as HTMLInputElement,key=String(item.id);if(toggling.value.has(key)){input.checked=prior;return};toggling.value.add(key);try{if(prior)await api('/job/disable',{query:{jobId:item.id}});else await api('/job/save',{body:jobPayload(editJob({...item,enable:true}))});if(alive){item.enable=!prior;await load()}}catch{input.checked=prior}finally{toggling.value.delete(key)}}
async function run(item:Entity,params?:string){if(running.value)return;running.value=true;try{await api('/job/run',{query:{jobId:String(item.id),appId:session.appId,...(params===undefined?{}:{instanceParams:params})}});toast(t('任务已提交执行','Job execution submitted'),'success');runTarget.value=null;load()}catch{/* Keep parameter draft. */}finally{running.value=false}}
async function action(type:string){const item=more.value;if(!item)return;more.value=null
 if(type==='params'){runParams.value='';runTarget.value=item}
 if(type==='history')router.push({path:'/oms/instance',query:{jobId:String(item.id)}})
 if(type==='copy'){try{const copied=await api('/job/copy',{method:'POST',query:{jobId:String(item.id)}});if(alive)edit(copied)}catch{/* Central feedback. */}}
 if(type==='delete'){const revision=session.revision;if(await confirmAction(t('删除任务“','Delete job “')+item.jobName+'”？')){if(!alive||revision!==session.revision)return;try{await api('/job/delete',{query:{jobId:String(item.id)}});toast(t('任务已删除','Job deleted'),'success');load()}catch{/* Retry from the row. */}}}
 if(type==='export'){jsonMode.value='export';jsonContent.value='';jsonError.value='';jsonOpen.value=true;jsonBusy.value=true;const request=jsonRequest.begin();try{const value=await api('/job/export',{query:{jobId:String(item.id)},signal:request.signal,quiet:true});if(request.current()&&jsonOpen.value)jsonContent.value=JSON.stringify(value,null,2)}catch(error){if(request.current()&&!request.signal.aborted)jsonError.value=(error as Error).message}finally{if(request.current())jsonBusy.value=false;request.end()}}
}
function importJob(){jsonRequest.invalidate();jsonBusy.value=false;jsonMode.value='import';jsonContent.value='';jsonError.value='';jsonOpen.value=true}
async function saveImport(){if(jsonBusy.value)return;jsonError.value='';let value:Entity;try{value=parseJSON(jsonContent.value);if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Enter a JSON object')}catch(error){jsonError.value=(error as Error).message;return};jsonBusy.value=true
 try{await api('/job/save',{body:{...value,appId:session.appId}});jsonOpen.value=false;toast(t('任务已导入','Job imported'),'success');load()}catch(error){jsonError.value=(error as Error).message}finally{jsonBusy.value=false}
}
onMounted(load)
</script>
<template><div class="page-head"><div><h1>{{t('任务','Jobs')}}</h1><p>{{t('管理调度计划、处理器与执行策略。','Manage schedules, processors and execution strategies.')}}</p></div><div class="actions"><button type="button" class="btn" @click="importJob">{{t('导入任务','Import job')}}</button><button type="button" class="btn btn-primary" @click="edit()"><Icon name="plus"/>{{t('新建任务','New job')}}</button></div></div>
<section class="work-panel"><form class="filter-bar" @submit.prevent="search"><Field :label="t('任务 ID','Job ID')"><input v-model="query.jobId" inputmode="numeric" placeholder="ID"/></Field><Field :label="t('关键字','Keyword')"><input v-model="query.keyword" :placeholder="t('搜索任务名称','Search job names')"/></Field><button class="btn btn-primary" :disabled="request.loading.value"><Icon name="search"/>{{t('查询','Search')}}</button><button type="button" class="btn btn-quiet" @click="reset">{{t('重置','Reset')}}</button></form><TableState :loading="request.loading.value" :empty="!page.data.length"><div class="table-scroll"><table class="data-table"><thead><tr><th>{{t('任务','Job')}}</th><th>{{t('调度计划','Schedule')}}</th><th>{{t('执行模式','Execution')}}</th><th>{{t('处理器','Processor')}}</th><th>{{t('状态','Status')}}</th><th>{{t('操作','Actions')}}</th></tr></thead><tbody><tr v-for="item in page.data" :key="item.id"><td><span class="identity">{{item.jobName}}</span><span class="secondary">#{{item.id}} {{item.jobDescription}}</span></td><td><span class="badge">{{item.timeExpressionType}}</span><span class="secondary code">{{item.timeExpression||'—'}}</span></td><td>{{item.executeType}}</td><td><span class="badge">{{item.processorType}}</span><span class="secondary" :title="item.processorInfo">{{item.processorInfo}}</span></td><td><input type="checkbox" role="switch" :checked="item.enable" :aria-label="t('启用任务 ','Enable job ')+item.jobName" :disabled="toggling.has(String(item.id))" @change="toggle(item,$event)"/></td><td><div class="row-actions"><button type="button" class="btn btn-quiet btn-small" @click="edit(item)">{{t('编辑','Edit')}}</button><button type="button" class="btn btn-quiet btn-small" :disabled="running" @click="run(item)">{{t('运行','Run')}}</button><button type="button" class="btn btn-quiet btn-small" @click="more=item">{{t('更多','More')}}</button></div></td></tr></tbody></table></div></TableState><Pagination :index="query.index" :size="query.pageSize" :total="Number(page.totalItems)" @change="query.index=$event;load()"/></section>
<Modal v-model="editOpen" :title="job.id?t('编辑任务','Edit job'):t('新建任务','New job')" wide><JobEditor v-if="editOpen" ref="jobEditor" :job="job" :form-id="jobFormId" @saved="editOpen=false;load()"/><template #footer><button type="button" class="btn" @click="editOpen=false">{{t('取消','Cancel')}}</button><button type="submit" :form="jobFormId" class="btn btn-primary" :disabled="jobEditor?.saving">{{jobEditor?.saving?t('正在保存…','Saving…'):t('保存任务','Save job')}}</button></template></Modal>
<Modal :model-value="!!more" :title="more?.jobName||t('任务操作','Job actions')" @update:model-value="!$event && (more=null)"><div class="task-actions"><button v-for="item in [{key:'params',label:t('参数运行','Run with parameters')},{key:'history',label:t('执行历史','Execution history')},{key:'copy',label:t('复制任务','Copy job')},{key:'export',label:t('导出任务','Export job')},{key:'delete',label:t('删除任务','Delete job')}]" :key="item.key" type="button" class="btn" :class="{'btn-danger':item.key==='delete'}" @click="action(item.key)">{{item.label}}</button></div></Modal>
<Modal :model-value="!!runTarget" :title="t('参数运行','Run with parameters')" @update:model-value="!$event && (runTarget=null)"><Field :label="t('实例参数','Instance parameters')"><textarea v-model="runParams" rows="6" class="code"/></Field><template #footer><button type="button" class="btn" @click="runTarget=null">{{t('取消','Cancel')}}</button><button type="button" class="btn btn-primary" :disabled="running" @click="run(runTarget!,runParams)">{{t('运行任务','Run job')}}</button></template></Modal>
<Modal v-model="jsonOpen" :title="jsonMode==='import'?t('导入任务','Import job'):t('导出任务','Export job')" wide><Field :label="t('任务 JSON','Job JSON')"><textarea v-model="jsonContent" :readonly="jsonMode==='export'" rows="15" class="code"/></Field><div v-if="jsonError" class="error-banner" role="alert">{{jsonError}}</div><template #footer><button type="button" class="btn" @click="jsonOpen=false">{{t('取消','Cancel')}}</button><button v-if="jsonMode==='import'" type="button" class="btn btn-primary" :disabled="jsonBusy" @click="saveImport">{{t('导入任务','Import job')}}</button><button v-else type="button" class="btn btn-primary" :disabled="jsonBusy" @click="downloadText(jsonContent,'powerjob-job.json')">{{t('下载 JSON','Download JSON')}}</button></template></Modal>
</template>
<style scoped>.task-actions{display:flex;flex-direction:column;gap:10px}.task-actions .btn{justify-content:flex-start;padding:12px 16px}.error-banner{margin-top:16px}</style>
