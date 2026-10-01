<script setup lang="ts">
import { computed, ref, watch, nextTick, onScopeDispose } from 'vue'
import { useRoute } from 'vue-router'
import { router } from './core/router'
import { session, signOut } from './core/session'
import { t, locale, setLocale, notices, confirmation, answerConfirmation } from './core/ui'
import Icon from './shared/Icon.vue'
import Modal from './shared/Modal.vue'
const route = useRoute()
const mobile = ref(false)
const expanded=ref(localStorage.getItem('Power_navExpanded')==='true')
watch(expanded,value=>localStorage.setItem('Power_navExpanded',String(value)))
const media=window.matchMedia('(max-width:640px)'),narrow=ref(media.matches),rail=ref<HTMLElement>(),menuButton=ref<HTMLButtonElement>()
const mediaChange=()=>{narrow.value=media.matches;if(!narrow.value)mobile.value=false}
media.addEventListener('change',mediaChange)
function keyboard(event:KeyboardEvent){
 if(!mobile.value||!narrow.value)return
 if(event.key==='Escape'){event.preventDefault();mobile.value=false;return}
 if(event.key!=='Tab')return
 const controls=Array.from(rail.value?.querySelectorAll<HTMLElement>('a,button')||[]),first=controls[0],last=controls.at(-1)
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
}
document.addEventListener('keydown',keyboard)
watch(mobile,async open=>{await nextTick();if(open)rail.value?.querySelector<HTMLElement>('a')?.focus();else if(narrow.value)menuButton.value?.focus()})
onScopeDispose(()=>{media.removeEventListener('change',mediaChange);document.removeEventListener('keydown',keyboard)})
const admin = computed(() => route.path.startsWith('/admin'))
const authentication = computed(() => route.path.startsWith('/login') || route.path==='/powerjobLogin')
const workspace = computed(() => admin.value ? t('管理中心','Administration') : session.appName)
const menu = computed(() => admin.value ? [
  {path:'/admin/app',icon:'app',label:t('应用','Apps')},{path:'/admin/namespace',icon:'grid',label:t('空间','Spaces')},{path:'/admin/user',icon:'users',label:t('用户','Users')},{path:'/admin/personal',icon:'users',label:t('个人','Profile')},{path:'/admin/settings',icon:'settings',label:t('设置','Settings')},
] : [
  {path:'/oms/home',icon:'home',label:t('概览','Overview')},{path:'/oms/job',icon:'job',label:t('任务','Jobs')},{path:'/oms/instance',icon:'instance',label:t('执行','Runs')},{path:'/oms/workflow',icon:'workflow',label:t('工作流','Flows')},{path:'/oms/wfinstance',icon:'instance',label:t('流程执行','Flow runs')},{path:'/oms/template',icon:'template',label:t('模板','Templates')},{path:'/oms/containermanage',icon:'container',label:t('容器','Containers')},
])
const title = computed(() => menu.value.find(item => item.path===route.path)?.label || t('工作流','Workflow'))
watch(() => route.fullPath, () => {mobile.value=false;answerConfirmation(false)})
watch(() => session.revision, () => {
  answerConfirmation(false)
  if (!session.jwt && !authentication.value) router.replace('/loginHomepage')
  else if (!session.appId && route.path.startsWith('/oms')) router.replace('/admin/app')
})
function logout() {signOut();router.replace('/loginHomepage')}
</script>
<template>
  <template v-if="authentication"><RouterView :key="session.jwt||''"/></template>
  <div v-else class="app-frame" :class="{'rail-expanded':expanded&&!narrow}">
    <a class="skip-link" href="#main-content">{{t('跳到主要内容','Skip to content')}}</a>
    <button v-if="mobile" class="rail-backdrop" :aria-label="t('关闭导航','Close navigation')" @click="mobile=false"/>
    <aside ref="rail" class="rail" :class="{'mobile-open':mobile}" :inert="narrow&&!mobile||undefined" :aria-label="t('功能导航','Navigation')">
      <RouterLink class="rail-brand" to="/admin/app" aria-label="PowerJob"><span class="brand-mark">P</span><span v-if="expanded&&!narrow">PowerJob</span></RouterLink>
      <nav><RouterLink v-for="item in menu" :key="item.path" :to="item.path" :aria-label="item.label"><Icon :name="item.icon"/><span>{{item.label}}</span></RouterLink></nav>
      <div class="rail-bottom"><RouterLink :to="admin?'/oms/home':'/admin/app'" :aria-label="admin?t('工作台','Workspace'):t('管理中心','Administration')" :title="admin?t('工作台','Workspace'):t('管理中心','Administration')"><Icon :name="admin?'home':'settings'"/><span v-if="expanded&&!narrow">{{admin?t('工作台','Workspace'):t('管理中心','Administration')}}</span></RouterLink><button v-if="!narrow" type="button" class="rail-toggle" :aria-label="expanded?t('收起导航','Collapse navigation'):t('展开导航','Expand navigation')" :aria-expanded="expanded" @click="expanded=!expanded"><Icon name="chevron" :class="{'flipped':expanded}"/></button></div>
    </aside>
    <header class="workspace-header" :inert="narrow&&mobile||undefined">
      <div class="workspace-ident"><button ref="menuButton" class="icon-button mobile-menu" :aria-label="t('展开导航','Open navigation')" :aria-expanded="mobile" @click="mobile=!mobile"><Icon name="menu"/></button><RouterLink class="workspace-app" to="/admin/app" :aria-label="t('切换应用','Switch application')"><Icon name="app"/><span>{{workspace}}</span><small>⌄</small></RouterLink><span class="workspace-title">{{title}}</span></div>
      <div class="workspace-tools"><select :value="locale" :aria-label="t('语言','Language')" @change="setLocale(($event.target as HTMLSelectElement).value as 'zh'|'en')"><option value="zh">简体中文</option><option value="en">English</option></select><details class="details-menu"><summary :aria-label="t('账户','Account')"><span class="avatar">{{String(session.user?.username||'P').slice(0,1).toUpperCase()}}</span></summary><div><RouterLink to="/admin/personal"><Icon name="users"/>{{t('个人中心','Profile')}}</RouterLink><RouterLink to="/admin/app"><Icon name="app"/>{{t('应用管理','Applications')}}</RouterLink><button @click="logout"><Icon name="logout"/>{{t('退出登录','Sign out')}}</button></div></details></div>
    </header>
    <main id="main-content" class="main-content" :inert="narrow&&mobile||undefined"><RouterView :key="String(route.path.startsWith('/oms') ? session.appId : '') + ':' + session.jwt+':'+session.revision"/></main>
  </div>
  <div class="notice-stack" aria-live="polite"><div v-for="notice in notices" :key="notice.id" class="notice" :class="notice.type" :role="notice.type==='error'?'alert':'status'"><span>{{notice.message}}</span><button class="icon-button" :aria-label="t('关闭','Close')" @click="notices.splice(notices.indexOf(notice),1)">×</button></div></div>
  <Modal v-model="confirmation.open" :title="t('确认操作','Confirm action')" @closed="answerConfirmation(false)"><p>{{confirmation.message}}</p><template #footer><button class="btn" @click="answerConfirmation(false)">{{t('取消','Cancel')}}</button><button class="btn btn-primary" @click="answerConfirmation(true)">{{t('确认','Confirm')}}</button></template></Modal>
</template>
