import { request } from './request'
import type { PageParams, PageResult } from './types'
import type { InstanceInfo, TaskDetailInfo } from '@/types/instance'

export const instanceApi = {
  /** 获取实例列表 */
  list(
    params: PageParams & { jobId?: number; instanceId?: number; wfInstanceId?: number }
  ): Promise<PageResult<InstanceInfo>> {
    return request.post('/instance/list', params)
  },

  /** 获取实例详情 */
  detail(instanceId: number): Promise<InstanceInfo> {
    return request.get('/instance/detail', { instanceId })
  },

  /** 停止实例 */
  stop(instanceId: number): Promise<void> {
    return request.get('/instance/stop', { instanceId })
  },

  /** 重试实例 */
  retry(instanceId: number): Promise<void> {
    return request.get('/instance/retry', { instanceId })
  },

  /** 获取任务详情列表 */
  taskList(instanceId: number): Promise<TaskDetailInfo[]> {
    return request.get('/instance/taskList', { instanceId })
  },

  /** 获取运行日志 */
  log(instanceId: number): Promise<string> {
    return request.get('/instance/log', { instanceId })
  },

  /** 获取运行状态 */
  status(instanceId: number): Promise<number> {
    return request.get('/instance/status', { instanceId })
  }
}
