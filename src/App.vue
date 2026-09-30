<template>
  <el-config-provider :locale="elementLocale"><router-view :key="store.sessionRevision"/></el-config-provider>
</template>
<script setup>
import { computed, onMounted, onUnmounted, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAppStore } from './store.js'
import { installStorageSync } from './services/storage-sync.js'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
const { locale } = useI18n()
const store = useAppStore()
store.restoreApplication()
const router = useRouter()
let uninstall
onMounted(() => { uninstall = installStorageSync({ store, router }) })
onUnmounted(() => { uninstall?.() })
const elementLocale = computed(() => locale.value === 'en' ? en : zhCn)
watchEffect(() => { document.documentElement.lang = locale.value === 'en' ? 'en' : 'zh-CN' })
</script>
