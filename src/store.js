import { defineStore } from 'pinia'

export const useAppStore = defineStore('application', {
  state: () => ({ appInfo: {}, sessionRevision: 0 }),
  actions: {
    restoreApplication() {
      const id = localStorage.getItem('Power_appId')
      const name = localStorage.getItem('Power_appName') || ''
      this.appInfo = id ? { id, title: name, appName: name } : {}
    },
    resetSessionView() {
      // Another tab owns the newly persisted session and application values.
      this.appInfo = {}
      this.sessionRevision++
    },
    selectApplication(appInfo) {
      this.appInfo = { ...appInfo }
      localStorage.setItem('Power_appId', String(appInfo.id))
      localStorage.setItem('Power_appName', appInfo.title || appInfo.appName || '')
    },
    clearApplication() {
      this.appInfo = {}
      localStorage.removeItem('Power_appId')
      localStorage.removeItem('Power_appName')
    },
  },
})
