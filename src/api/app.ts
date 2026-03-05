import { request } from './request'
import type { AppInfo } from '@/types/app'

export const appApi = {
  /** 获取应用列表 */
  list(): Promise<AppInfo[]> {
    return request.get('/app/list')
  },

  /** 获取应用信息 */
  info(appId: number): Promise<AppInfo> {
    return request.get(`/app/info?appId=${appId}`)
  },

  /** 保存应用 */
  save(data: AppInfo): Promise<void> {
    return request.post('/app/save', data)
  },

  /** 验证应用密码 */
  assert(appName: string, password: string): Promise<string> {
    return request.post('/app/assert?appName=' + appName + '&password=' + password)
  },
}
