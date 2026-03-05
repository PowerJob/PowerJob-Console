import { defineStore } from 'pinia'
import type { AppInfo } from '@/types/app'

interface AppState {
  appInfo: AppInfo | null
  sidebarCollapsed: boolean
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    appInfo: null,
    sidebarCollapsed: false,
  }),

  getters: {
    appId: (state) => state.appInfo?.id,
    appName: (state) => state.appInfo?.appName,
  },

  actions: {
    setAppInfo(info: AppInfo) {
      this.appInfo = info
    },

    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },

    clearAppInfo() {
      this.appInfo = null
    },
  },
})
