/** 任务信息 */
export interface JobInfo {
  id: number
  jobName: string
  jobDescription: string
  appId: number
  jobParams: string
  timeExpressionType: TimeExpressionType
  timeExpression: string
  executeType: ExecuteType
  processorType: ProcessorType
  processorInfo: string
  maxInstanceNum: number
  concurrency: number
  instanceTimeLimit: number
  instanceRetryNum: number
  taskRetryNum: number
  dispatchStrategy?: DispatchStrategy
  dispatchStrategyConfig?: string
  minCpuCores: number
  minMemorySpace: number
  minDiskSpace: number
  enable: boolean
  designatedWorkers: string
  maxWorkerCount: number
  notifyUserIds: number[]
  lifeCycle: LifeCycle | null
  alarmConfig: AlarmConfig
  logConfig: LogConfig
  advancedRuntimeConfig?: AdvancedRuntimeConfig
}

/** 时间表达式类型 */
export type TimeExpressionType = 'API' | 'CRON' | 'FIXED_RATE' | 'FIXED_DELAY' | 'WORKFLOW' | 'DAILY_TIME_INTERVAL'

/** 执行类型 */
export type ExecuteType = 'STANDALONE' | 'BROADCAST' | 'MAP' | 'MAP_REDUCE'

/** 处理器类型 */
export type ProcessorType = 'BUILT_IN' | 'EXTERNAL'

/** 分发策略 */
export type DispatchStrategy = 'HEALTH_FIRST' | 'RANDOM' | 'SPECIFY'

/** 生命周期 */
export interface LifeCycle {
  start: number
  end: number
}

/** 告警配置 */
export interface AlarmConfig {
  alertThreshold?: number
  statisticWindowLen?: number
  silenceWindowLen?: number
}

/** 日志配置 */
export interface LogConfig {
  type: number
  level?: number
  loggerName?: string
}

/** 高级运行时配置 */
export interface AdvancedRuntimeConfig {
  taskTrackerBehavior?: number
}

/** 任务表单（新增/编辑） */
export type JobForm = Omit<JobInfo, 'id'> & { id?: number }

/** 运行参数 */
export interface RunParams {
  jobId: number
  instanceParams?: string
  delay?: number
  outerKey?: string
  extendValue?: string
  runtimeConfig?: {
    designatedWorkers?: string
  }
}
