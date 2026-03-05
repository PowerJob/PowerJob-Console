import { request } from './request'
import type { UserInfo } from '@/types/user'

export const userApi = {
  /** 获取用户列表 */
  list(): Promise<UserInfo[]> {
    return request.get('/user/list')
  },

  /** 获取当前用户信息 */
  current(): Promise<UserInfo> {
    return request.get('/user/current')
  },

  /** 修改密码 */
  changePassword(oldPassword: string, newPassword: string): Promise<void> {
    return request.post('/user/changePassword', { oldPassword, newPassword })
  },
}
