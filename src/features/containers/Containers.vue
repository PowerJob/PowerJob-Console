<script setup lang="ts">
import { ref,watch,onScopeDispose } from 'vue'
import { api,websocketUrl } from '../../core/api'
import { useLatestRequest } from '../../core/request'
import { session,type Entity } from '../../core/session'
import { t,clone,toast,confirmAction } from '../../core/ui'
import Field from '../../shared/Field.vue'
import Modal from '../../shared/Modal.vue'
import TableState from '../../shared/TableState.vue'
import Icon from '../../shared/Icon.vue'
import PasswordInput from '../auth/PasswordInput.vue'
import { containerDraft,deploymentState } from './model'
const rows=ref<Entity[]>([]),error=ref(''),edited=ref(false),draft=ref<Entity>({}),git=ref<Entity>({}),artifact=ref(''),fileName=ref(''),editError=ref(''),saving=ref(false)
const more=ref(false),target=ref<Entity>({}),consoleOpen=ref(false),consoleTitle=ref(''),logs=ref<string[]>([]),state=ref('idle')
const listRequest=useLatestRequest(),uploadRequest=useLatestRequest(),workerRequest=useLatestRequest()
const {loading}=listRequest,{loading:uploading}=uploadRequest
let socket:WebSocket|undefined,alive=true
function stopSocket(){if(socket){const previous=socket;socket=undefined;previous.onopen=previous.onmessage=previous.onerror=previous.onclose=null;previous.close()}}
function resetConsole(){stopSocket();workerRequest.invalidate();logs.value=[];state.value='idle'}
watch(consoleOpen,value=>{if(!value)resetConsole()})
watch(edited,value=>{if(!value)uploadRequest.invalidate()})
onScopeDispose(()=>{alive=false;stopSocket()})
async function load(){const current=listRequest.begin();try{const data=await api<Entity[]>('/container/list',{query:{appId:session.appId},signal:current.signal,quiet:true});if(current.current()){rows.value=data||[];error.value=''}}catch(e){if(current.current()&&!current.signal.aborted)error.value=(e as Error).message}finally{current.end()}}
function edit(item?:Entity){try{uploadRequest.invalidate();const data=containerDraft(item);draft.value=data.draft;git.value=data.git;artifact.value=data.artifact;fileName.value='';editError.value='';edited.value=true}catch(e){toast((e as Error).message,'error')}}
async function upload(event:Event){
 const input=event.target as HTMLInputElement,file=input.files?.[0]
 if(!file)return
 if(!file.name.toLowerCase().endsWith('.jar')){editError.value=t('请选择 .jar 文件。','Choose a .jar file.');input.value='';return}
 artifact.value='';fileName.value='';editError.value=''
 const current=uploadRequest.begin(),form=new FormData();form.append('file',file)
 try{const path=await api<string>('/container/jarUpload',{body:form,signal:current.signal,quiet:true,timeout:75000});if(current.current()&&edited.value){if(!path)throw new Error(t('上传未返回文件路径。','The upload returned no file path.'));artifact.value=path;fileName.value=file.name}}catch(e){if(current.current()&&!current.signal.aborted)editError.value=(e as Error).message}finally{current.end();input.value=''}
}
function removeArtifact(){uploadRequest.invalidate();artifact.value='';fileName.value=''}
async function save(){
 if(saving.value||uploading.value)return
 if(!draft.value.containerName?.trim()||(draft.value.sourceType==='Git'?!git.value.repo?.trim():!artifact.value)){editError.value=t('请填写名称与容器来源。','Enter a name and a container source.');return}
 saving.value=true;editError.value=''
 const revision=session.revision
 try{await api('/container/save',{body:{...clone(draft.value),appId:session.appId,sourceInfo:draft.value.sourceType==='Git'?JSON.stringify(git.value):artifact.value}});if(!alive||revision!==session.revision)return;toast(t('容器已保存','Container saved'),'success');edited.value=false;load()}catch(e){editError.value=(e as Error).message}finally{saving.value=false}
}
async function remove(item:Entity){const id=String(item.id),revision=session.revision;if(!await confirmAction(t('删除容器“'+item.containerName+'”？','Delete container “'+item.containerName+'”?')))return;if(!alive||revision!==session.revision)return;try{await api('/container/delete',{query:{containerId:id,appId:session.appId}});toast(t('容器已删除','Container deleted'),'success');load()}catch{/* Central feedback. */}}
function deploy(item:Entity){
 resetConsole();consoleTitle.value=t('部署容器','Deploy container')+' · '+item.containerName;consoleOpen.value=true;state.value='running'
 const current=new WebSocket(websocketUrl('/container/deploy/'+String(item.id)));socket=current
 current.onopen=()=>{if(socket===current)current.send(JSON.stringify({jwtToken:session.jwt}))}
 current.onmessage=event=>{if(socket!==current)return;const message=String(event.data);logs.value.push(message);state.value=deploymentState(state.value,message);if(state.value==='success')load()}
 current.onerror=()=>{if(socket===current){state.value='error';logs.value.push(t('部署连接发生错误，请重新部署。','The deployment connection failed. Retry deployment.'))}}
 current.onclose=()=>{if(socket===current&&state.value==='running'){state.value='error';logs.value.push(t('连接已关闭，未收到部署完成结果。','The connection closed before deployment completion.'))}}
}
async function workers(item:Entity){resetConsole();consoleTitle.value=t('已部署 Worker','Deployed Workers')+' · '+item.containerName;consoleOpen.value=true;const current=workerRequest.begin();state.value='loading';try{const data=await api<string>('/container/listDeployedWorker',{query:{containerId:String(item.id),appId:session.appId},signal:current.signal,quiet:true});if(current.current()&&consoleOpen.value){logs.value=String(data||'').split('\n');state.value='idle'}}catch(e){if(current.current()&&!current.signal.aborted){logs.value=[(e as Error).message];state.value='error'}}finally{current.end()}}
load()
</script>
<template><div class="page-head"><div><h1>{{t('容器管理','Containers')}}</h1><p>{{t('上传或构建处理器，将同一版本部署到 Worker。','Upload or build processors and deploy a shared version to Workers.')}}</p></div><div class="actions"><button class="btn" :disabled="loading" @click="load"><Icon name="refresh"/>{{t('刷新','Refresh')}}</button><button class="btn btn-primary" @click="edit()"><Icon name="plus"/>{{t('新建容器','New container')}}</button></div></div><section class="work-panel"><p v-if="error" class="error-banner" role="alert">{{error}}</p><TableState :loading="loading" :empty="!rows.length"><div class="table-scroll"><table class="data-table"><thead><tr><th>{{t('容器','Container')}}</th><th>{{t('来源','Source')}}</th><th>{{t('版本','Version')}}</th><th>{{t('最近部署','Last deployment')}}</th><th>{{t('状态','Status')}}</th><th>{{t('操作','Actions')}}</th></tr></thead><tbody><tr v-for="item in rows" :key="item.id"><td><span class="identity">{{item.containerName}}</span><span class="secondary">#{{item.id}}</span></td><td><span class="badge">{{item.sourceType}}</span></td><td class="code">{{item.version||'—'}}</td><td>{{item.lastDeployTime||'—'}}</td><td>{{item.status}}</td><td><div class="actions"><button class="btn btn-quiet" @click="deploy(item)">{{t('部署','Deploy')}}</button><button class="btn btn-quiet" @click="edit(item)">{{t('编辑','Edit')}}</button><button class="btn btn-quiet" @click="target=item;more=true">{{t('更多','More')}}</button></div></td></tr></tbody></table></div></TableState></section>
<Modal v-model="edited" :title="draft.id?t('编辑容器','Edit container'):t('新建容器','New container')"><form @submit.prevent="save"><div class="form-grid"><Field class="full" :label="t('容器名称','Container name')" required><input v-model="draft.containerName"/></Field><Field class="full" :label="t('容器类型','Container type')"><select v-model="draft.sourceType"><option value="Git">Git</option><option value="FatJar">FatJar</option></select></Field><template v-if="draft.sourceType==='Git'"><Field class="full" :label="t('Git 仓库地址','Git repository URL')" required><input v-model="git.repo"/></Field><Field class="full" :label="t('分支','Branch')"><input v-model="git.branch"/></Field><Field :label="t('用户名','Username')"><input v-model="git.username" autocomplete="off"/></Field><Field :label="t('密码','Password')" v-slot="{id}"><PasswordInput :id="id" v-model="git.password" :reset-key="edited" autocomplete="new-password"/></Field></template><div v-else class="full artifact-upload"><Field :label="t('上传 JAR','Upload JAR')"><input type="file" accept=".jar" :disabled="uploading" @change="upload"/></Field><p v-if="uploading">{{t('正在上传…','Uploading…')}}</p><div v-if="artifact" class="artifact-ready"><Icon name="check"/><span>{{fileName||t('已保留原有 JAR，可直接保存。','The existing JAR is retained and ready to save.')}}</span><button type="button" class="btn btn-quiet" @click="removeArtifact">{{t('移除','Remove')}}</button></div></div></div><p v-if="editError" class="error-banner" role="alert">{{editError}}</p><div class="form-actions"><button type="button" class="btn" @click="edited=false">{{t('取消','Cancel')}}</button><button class="btn btn-primary" :disabled="saving||uploading||(draft.sourceType==='FatJar'&&!artifact)">{{saving?t('正在保存…','Saving…'):t('保存容器','Save container')}}</button></div></form></Modal>
<Modal v-model="more" :title="target.containerName||t('容器操作','Container actions')"><div class="container-more"><button class="btn" @click="more=false;workers(target)">{{t('已部署 Worker','Deployed Workers')}}</button><button class="btn btn-danger" @click="more=false;remove(target)">{{t('删除容器','Delete container')}}</button></div></Modal><Modal v-model="consoleOpen" :title="consoleTitle" wide><div v-if="state!=='idle'" class="deploy-state" :class="state" :data-status="state">{{state==='error'?t('部署或查询失败，请检查下方日志。','Deployment or query failed. Inspect the logs below.'):state==='success'?t('部署请求已发送。请在已部署 Worker 中核对各节点。','Deployment was submitted. Verify each node in Deployed Workers.'):t('正在连接与处理…','Connecting and processing…')}}</div><pre class="deploy-log" aria-live="polite">{{logs.join('\n')||t('等待日志…','Waiting for logs…')}}</pre></Modal></template>
<style scoped>.form-actions{display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--line);padding-top:17px;margin-top:22px}.error-banner{margin:15px}.artifact-upload{padding:20px;border:1px dashed #c9d5ee;border-radius:10px;background:#fafbff}.artifact-ready{display:flex;gap:9px;align-items:center;margin-top:12px;color:var(--green);font-size:12px}.artifact-ready span{flex:1;overflow-wrap:anywhere}.container-more{display:flex;flex-direction:column;gap:12px}.deploy-log{background:#17233d;color:#d2def6;min-height:260px;max-height:55vh;overflow:auto;padding:20px;border-radius:8px;font:12px/1.8 ui-monospace,SFMono-Regular,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.deploy-state{margin-bottom:14px;background:var(--blue-soft);padding:12px;font-size:13px;border-radius:8px}.deploy-state.error{color:var(--red);background:#fcecef}.deploy-state.success{color:var(--green);background:#eaf8f2}</style>
