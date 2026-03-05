/** 实例状态枚举 */
export const InstanceStatus = {
  WAITING_DISPATCH: 1,
  WAITING_WORKER_RECEIVE: 2,
  RUNNING: 3,
  FAILED: 4,
  SUCCESS: 5,
  CANCELED: 9,
  STOPPED: 10,
} as const

/** 工作流实例状态枚举 */
export const WfInstanceStatus = {
  WAITING: 1,
  RUNNING: 2,
  FAILED: 3,
  SUCCESS: 4,
  STOPPED: 10,
} as const

/** 时间表达式类型 */
export const TimeExpressionType = {
  API: 'API',
  CRON: 'CRON',
  FIXED_RATE: 'FIXED_RATE',
  FIXED_DELAY: 'FIXED_DELAY',
  WORKFLOW: 'WORKFLOW',
  DAILY_TIME_INTERVAL: 'DAILY_TIME_INTERVAL',
} as const
