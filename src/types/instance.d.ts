/** 实例状态枚举值 */
export type InstanceStatusValue = 1 | 2 | 3 | 4 | 5 | 9 | 10

/** 实例状态 */
export const InstanceStatus = {
  WAITING_DISPATCH: 1,
  WAITING_WORKER_RECEIVE: 2,
  RUNNING: 3,
  FAILED: 4,
  SUCCESS: 5,
  CANCELED: 9,
  STOPPED: 10,
} as const

/** 实例信息 */
export interface InstanceInfo {
  instanceId: number
  jobId: number
  jobName: string
  instanceParams?: string
  instanceStatus: InstanceStatusValue
  result?: string
  expectedTriggerTime: number
  actualTriggerTime: number
  finishedTime?: number
  taskTrackerAddress?: string
  runningTimes: number
  type?: number
  wfInstanceId?: number
}

/** 运行任务详情 */
export interface TaskDetailInfo {
  taskId: number
  taskName: string
  address: string
  status: number
  result?: string
  failedCnt: number
  lastModifiedTime: number
  createdTime: number
  lastReportTime: number
}
