<template>
  <div class="app-shell" :class="{ 'nav-open': mobileOpen }">
    <aside class="app-nav" :aria-label="$t('message.navigation')">
      <router-link class="brand" to="/admin/app"><span class="brand-symbol">P<span>↗</span></span><strong>PowerJob<span>CONSOLE</span></strong></router-link>
      <div class="nav-caption">{{ $t(admin ? 'message.workspaceAdmin' : 'message.workspace') }}</div>
      <nav>
        <router-link v-for="item in navigation" :key="item.path" :to="item.path" :class="{ active: activePath === item.path }" @click="mobileOpen = false">
          <PjIcon :name="item.icon"/><span>{{ $t('message.' + item.title) }}</span>
        </router-link>
      </nav>
      <div class="nav-footer"><span class="status-dot"></span><div><span>Vue 3</span><span class="console-version">{{ consoleRelease }}</span></div></div>
    </aside>
    <button v-if="mobileOpen" class="nav-scrim" aria-label="Close navigation" @click="mobileOpen = false"></button>
    <div class="app-body">
      <Navbar @toggle-nav="mobileOpen = !mobileOpen"/>
      <main class="workspace-main" id="main-content"><router-view :key="admin ? undefined : store.appInfo.id"/></main>
    </div>
  </div>
</template>
<script setup>
import { consoleRelease } from '../../../package.json'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '../../store.js'
import Navbar from '../bar/Navbar.vue'
import PjIcon from './PjIcon.vue'
const props = defineProps({ admin: Boolean })
const route = useRoute()
const store = useAppStore()
const mobileOpen = ref(false)
const activePath = computed(() => route.path === '/oms/workflowEditor' ? '/oms/workflow' : route.path === '/oms/wfInstanceDetail' ? '/oms/wfinstance' : route.path)
const navigation = computed(() => props.admin ? [
  { path: '/admin/app', icon: 'grid', title: 'tabAppManage' },
  { path: '/admin/namespace', icon: 'namespace', title: 'tabNamespace' },
  { path: '/admin/user', icon: 'user', title: 'tabUserManager' },
  { path: '/admin/personal', icon: 'user', title: 'tabPersonal' },
  { path: '/admin/settings', icon: 'settings', title: 'tabSettings' },
] : [
  { path: '/oms/home', icon: 'home', title: 'tabHome' },
  { path: '/oms/job', icon: 'job', title: 'tabJobManage' },
  { path: '/oms/instance', icon: 'instance', title: 'tabJobInstance' },
  { path: '/oms/workflow', icon: 'workflow', title: 'tabWorkflowManage' },
  { path: '/oms/wfinstance', icon: 'workflow', title: 'tabWfInstance' },
  { path: '/oms/template', icon: 'container', title: 'tabTemplate' },
  { path: '/oms/containermanage', icon: 'container', title: 'tabContainerManager' },
])
</script>

<style scoped>.console-version{display:block;font-size:10px;line-height:1.8;color:#a0abba}</style>
