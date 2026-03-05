import { request } from './request'
import type { PageParams, PageResult } from './types'
import type { JobInfo, JobForm, RunParams } from '@/types/job'

export const jobApi = {
  /** 获取任务列表 */
  list(params: PageParams & { jobId?: string; keyword?: string }): Promise<PageResult<JobInfo>> {
    return request.post('/job/list', params)
  },

  /** 保存任务（新增/编辑） */
  save(data: JobForm): Promise<void> {
    return request.post('/job/save', data)
  },

  /** 删除任务 */
  delete(jobId: number): Promise<void> {
    return request.get('/job/delete', { jobId })
  },

  /** 立即运行 */
  run(jobId: number, appId: string, params?: string): Promise<void> {
    return request.get('/job/run', {
      jobId,
      appId,
      instanceParams: params
    })
  },

  /** 高级运行 */
  runPlus(params: RunParams): Promise<void> {
    return request.post('/job/runPlus', params)
  },

  /** 复制任务 */
  copy(jobId: number): Promise<JobForm> {
    return request.post('/job/copy', { jobId })
  },

  /** 禁用任务 */
  disable(jobId: number): Promise<void> {
    return request.get('/job/disable', { jobId })
  },

  /** 启用任务 */
  enable(jobId: number): Promise<void> {
    return request.get('/job/enable', { jobId })
  }
}
