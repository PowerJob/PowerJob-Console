import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
// @ts-expect-error router.js 暂未迁移到 TypeScript
import router from './router'
import i18n from './i18n/i18n'
import { axiosInstance } from './api'

import './styles.scss'
import './iconfont.css'
import './tailwind.css'
import '@powerjob/power-workflow-next/style.css'

const app = createApp(App)
const pinia = createPinia()

// Register Element Plus icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus)
app.use(pinia)
app.use(router)
app.use(i18n)

// 获取 i18n 的翻译函数 - 使用类型断言解决 vue-i18n 类型问题
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = (key: string) => (i18n.global as any).t(key)

// 全局属性（兼容旧代码）
app.config.globalProperties.axios = axiosInstance
app.config.globalProperties.common = {
  timestamp2Str: (ts: number) => {
    if (ts < 10000) return 'N/A'
    try {
      const time = new Date(ts)
      const addZero = (n: number) => n < 10 ? `0${n}` : String(n)
      return `${time.getFullYear()}-${addZero(time.getMonth() + 1)}-${addZero(time.getDate())} ${addZero(time.getHours())}:${addZero(time.getMinutes())}:${addZero(time.getSeconds())}`
    } catch {
      return 'N/A'
    }
  },
  translateInstanceStatus: (status: number) => {
    switch (status) {
      case 1: return t('message.waitingDispatch')
      case 2: return t('message.waitingWorkerReceive')
      case 3: return t('message.running')
      case 4: return t('message.failed')
      case 5: return t('message.success')
      case 9: return t('message.canceled')
      case 10: return t('message.stopped')
      default: return 'unknown'
    }
  },
  translateWfInstanceStatus: (status: number) => {
    switch (status) {
      case 1: return t('message.wfWaiting')
      case 2: return t('message.running')
      case 3: return t('message.failed')
      case 4: return t('message.success')
      case 10: return t('message.stopped')
      default: return 'unknown'
    }
  },
  switchLanguage: (cmd: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(i18n.global as any).locale.value = cmd
    localStorage.setItem('oms_lang', cmd)
  },
}

app.mount('#app')

export default axiosInstance
