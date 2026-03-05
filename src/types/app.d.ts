export interface AppInfo {
  id: number
  appName: string
  title?: string
  password?: string
}

export interface AppInfoQuery {
  appId: number
}
