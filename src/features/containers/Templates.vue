<script setup lang="ts">
import { reactive,ref } from 'vue'
import { api,saveBlob } from '../../core/api'
import { useLatestRequest } from '../../core/request'
import { t } from '../../core/ui'
import Field from '../../shared/Field.vue'
import Icon from '../../shared/Icon.vue'
import { validPackage } from './model'
const form=reactive({group:'',artifact:'',name:'',packageName:'',javaVersion:'8'}),error=ref('')
const request=useLatestRequest(),{loading}=request
async function generate(){
 if(loading.value)return
 error.value=''
 if(Object.values(form).some(value=>!value.trim())){error.value=t('请填写所有必填字段。','Complete all required fields.');return}
 if(!validPackage(form.packageName,form.javaVersion)){error.value=t('请输入符合所选 Java 版本的包名。','Enter a valid package name for the selected Java version.');return}
 const current=request.begin()
 try{const blob=await api<Blob>('/container/downloadContainerTemplate',{body:{...form},blob:true,signal:current.signal,quiet:true,timeout:75000});if(current.current())saveBlob(blob,'template.zip')}catch(e){if(current.current()&&!current.signal.aborted)error.value=(e as Error).message}finally{current.end()}
}
</script>
<template><div class="page-head"><div><h1>{{t('处理器模板','Processor templates')}}</h1><p>{{t('生成 Maven 工程，编写并打包自己的任务处理器。','Generate a Maven project for your own job processors.')}}</p></div></div><div class="template-layout"><section class="work-panel pad"><form @submit.prevent="generate"><div class="form-grid"><Field label="Group" required hint="com.example"><input v-model="form.group"/></Field><Field label="Artifact" required hint="my-processors"><input v-model="form.artifact"/></Field><Field label="Name" required><input v-model="form.name"/></Field><Field label="Package name" required hint="com.example.processors"><input v-model="form.packageName" class="code"/></Field><Field label="Java Version"><select v-model="form.javaVersion"><option value="8">Java 8</option><option value="11">Java 11</option></select></Field></div><p v-if="error" class="error-banner" role="alert">{{error}}</p><div class="template-actions"><button class="btn btn-primary" :disabled="loading"><Icon name="template"/>{{loading?t('正在生成…','Generating…'):t('生成并下载','Generate & download')}}</button></div></form></section><aside class="template-guide"><Icon name="template"/><h2>{{t('从模板开始','Start with a template')}}</h2><p>{{t('下载的工程包含 Maven 配置、容器描述和 Spring 扫描路径。','The project includes Maven configuration, a container descriptor and Spring package scanning.')}}</p><ol><li>{{t('在指定包下实现任务处理器。','Implement processors in the chosen package.')}}</li><li>{{t('构建 JAR，并在容器管理中上传部署。','Build a JAR and deploy it from Containers.')}}</li><li>{{t('创建外置处理器任务，关联容器与处理器类。','Create an external processor job with its container and class.')}}</li></ol></aside></div></template>
<style scoped>.template-layout{display:grid;grid-template-columns:minmax(0,800px) minmax(230px,330px);gap:36px;align-items:start}.template-actions{display:flex;justify-content:flex-end;margin-top:26px;padding-top:18px;border-top:1px solid var(--line)}.template-guide{padding:23px 0;color:var(--muted);font-size:13px;line-height:1.9}.template-guide>.icon{width:32px;height:32px;color:var(--blue);margin-bottom:16px}.template-guide h2{font-size:17px;color:var(--ink);margin-bottom:12px}.template-guide ol{padding-left:18px;margin-top:20px}.template-guide li{padding:5px 0}.error-banner{margin-top:18px}@media(max-width:1024px){.template-layout{grid-template-columns:1fr}.template-guide{max-width:600px;padding-top:0}}</style>
