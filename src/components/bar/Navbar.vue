<template>
  <header class="workspace-header">
    <div class="header-context">
      <button class="nav-toggle" :aria-label="$t('message.navigation')" @click="$emit('toggle-nav')"><PjIcon name="menu"/></button>
      <span class="breadcrumb-root">{{ $t($route.path.startsWith('/admin') ? 'message.workspaceAdmin' : 'message.workspace') }}</span>
      <span class="breadcrumb-divider">/</span><strong>{{ pageTitle }}</strong>
      <el-tag v-if="appName && !$route.path.startsWith('/admin')" class="application-tag" effect="plain">{{ appName }}</el-tag>
    </div>
    <div class="header-actions">
      <el-dropdown @command="common.switchLanguage">
        <button class="header-button">{{ $i18n.locale === 'en' ? 'English' : '简体中文' }} <PjIcon name="arrow"/></button>
        <template #dropdown><el-dropdown-menu><el-dropdown-item command="cn">简体中文</el-dropdown-item><el-dropdown-item command="en">English</el-dropdown-item></el-dropdown-menu></template>
      </el-dropdown>
      <el-dropdown @command="handleSettings">
        <button class="header-button account-button"><span class="avatar"><PjIcon name="user"/></span><span>{{ $t('message.account') }}</span><PjIcon name="arrow"/></button>
        <template #dropdown><el-dropdown-menu><el-dropdown-item command="back2Home">{{ $t('message.back2Home') }}</el-dropdown-item><el-dropdown-item command="profile">{{ $t('message.tabPersonal') }}</el-dropdown-item><el-dropdown-item command="logout" divided>{{ $t('message.logout') }}</el-dropdown-item></el-dropdown-menu></template>
      </el-dropdown>
    </div>
  </header>
</template>
<script>
import PjIcon from '../common/PjIcon.vue'
import { useAppStore } from '../../store.js'
export default {
  name: 'Navbar',
  components: { PjIcon },
  emits: ['toggle-nav'],
  computed: {
    appName() { return useAppStore().appInfo.title || useAppStore().appInfo.appName || localStorage.getItem('Power_appName') },
    pageTitle() {
      const titles = { '/oms/home': 'tabHome', '/oms/job': 'tabJobManage', '/oms/instance': 'tabJobInstance', '/oms/workflow': 'tabWorkflowManage', '/oms/wfinstance': 'tabWfInstance', '/oms/template': 'tabTemplate', '/oms/containermanage': 'tabContainerManager', '/oms/workflowEditor': 'workflow', '/oms/wfInstanceDetail': 'wfInstanceDetail', '/admin/app': 'tabAppManage', '/admin/namespace': 'tabNamespace', '/admin/user': 'tabUserManager', '/admin/personal': 'tabPersonal', '/admin/settings': 'tabSettings' }
      return this.$t('message.' + (titles[this.$route.path] || 'workspace'))
    },
  },
  methods: {
    onClickBack2Home() { useAppStore().clearApplication(); this.$router.push('/admin/app') },
    onClickLogout() { useAppStore().clearApplication(); localStorage.removeItem('PowerJwt'); this.$router.push('/loginHomepage') },
    handleSettings(command) {
      if (command === 'logout') this.onClickLogout()
      else if (command === 'back2Home') this.onClickBack2Home()
      else if (command === 'profile') this.$router.push('/admin/personal')
    },
  },
}
</script>
