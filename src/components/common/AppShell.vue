<template>
  <div class="app-shell" :class="{ 'nav-open': mobileOpen, 'nav-collapsed': desktopCollapsed && !isMobile }" @keydown.esc="closeNavigation">
    <a class="skip-link" href="#main-content" @click.prevent="focusMain">{{ $t('message.skipToContent') }}</a>
    <aside id="workspace-navigation" ref="navigationElement" class="app-nav" :aria-label="$t('message.navigation')" :inert="isMobile && !mobileOpen" :role="isMobile && mobileOpen ? 'dialog' : undefined" :aria-modal="isMobile && mobileOpen ? true : undefined" @keydown="onNavigationKeydown">
      <div class="nav-brand-row">
        <router-link class="brand" to="/admin/app" aria-label="PowerJob Console" @click="closeNavigation"><PowerJobMark/><strong>PowerJob</strong></router-link>
        <button v-if="isMobile" class="nav-close" :aria-label="$t('message.closeNavigation')" @click="closeNavigation"><span aria-hidden="true">×</span></button>
      </div>
      <div class="nav-caption">{{ $t(admin ? 'message.workspaceAdmin' : 'message.workspace') }}</div>
      <nav>
        <router-link v-for="item in navigation" :key="item.path" :to="item.path" :class="{ active: activePath === item.path }" :aria-current="activePath === item.path ? 'page' : undefined" :aria-label="$t('message.' + item.title)" :title="desktopCollapsed && !isMobile ? $t('message.' + item.title) : undefined" @click="closeNavigation">
          <PjIcon :name="item.icon"/><span class="nav-label">{{ $t('message.' + item.title) }}</span>
        </router-link>
      </nav>
    </aside>
    <button v-if="mobileOpen" class="nav-scrim" :aria-label="$t('message.closeNavigation')" tabindex="-1" @click="closeNavigation"></button>
    <div class="app-body">
      <Navbar :navigation-expanded="isMobile ? mobileOpen : !desktopCollapsed" @toggle-nav="toggleNavigation"/>
      <main ref="mainElement" class="workspace-main" id="main-content" tabindex="-1"><router-view :key="admin ? undefined : store.appInfo.id"/></main>
    </div>
  </div>
</template>
<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '../../store.js'
import Navbar from '../bar/Navbar.vue'
import PjIcon from './PjIcon.vue'
import PowerJobMark from './PowerJobMark.vue'
const props = defineProps({ admin: Boolean })
const route = useRoute()
const store = useAppStore()
const mobileOpen = ref(false)
const desktopCollapsed = ref(false)
const isMobile = ref(false)
const navigationElement = ref(null)
const mainElement = ref(null)
let breakpoint, toggleElement
const updateViewport = () => {
  isMobile.value = breakpoint.matches
  if (!isMobile.value) mobileOpen.value = false
}
onMounted(() => {
  if (!window.matchMedia) { isMobile.value = window.innerWidth <= 760; return }
  breakpoint = window.matchMedia('(max-width: 760px)')
  updateViewport()
  if (breakpoint.addEventListener) breakpoint.addEventListener('change', updateViewport)
  else breakpoint.addListener?.(updateViewport)
})
onBeforeUnmount(() => {
  if (breakpoint?.removeEventListener) breakpoint.removeEventListener('change', updateViewport)
  else breakpoint?.removeListener?.(updateViewport)
})
async function toggleNavigation(event) {
  if (!isMobile.value) { desktopCollapsed.value = !desktopCollapsed.value; return }
  if (mobileOpen.value) { await closeNavigation(); return }
  toggleElement = event?.currentTarget
  mobileOpen.value = true
  await nextTick()
  const active = navigationElement.value?.querySelector('nav a[aria-current="page"]')
  const focusTarget = active || navigationElement.value?.querySelector('nav a')
  focusTarget?.focus()
}
async function closeNavigation() {
  if (!mobileOpen.value) return
  mobileOpen.value = false
  await nextTick()
  if (toggleElement?.isConnected) toggleElement.focus()
}
function onNavigationKeydown(event) {
  if (!isMobile.value || !mobileOpen.value || event.key !== 'Tab') return
  const items = navigationElement.value?.querySelectorAll('a[href], button:not([disabled])')
  if (!items?.length) return
  const first = items[0], last = items[items.length - 1]
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
function focusMain() { mainElement.value?.focus({ preventScroll: true }) }
watch(() => route.path, closeNavigation)
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
