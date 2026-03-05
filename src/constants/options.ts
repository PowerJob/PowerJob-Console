import type { TimeExpressionType, ExecuteType, ProcessorType, DispatchStrategy } from '@/types/job'

/** 时间表达式类型选项 */
export const TIME_EXPRESSION_TYPE_OPTIONS: { key: TimeExpressionType; label: string }[] = [
  { key: 'API', label: 'API' },
  { key: 'CRON', label: 'CRON' },
  { key: 'FIXED_RATE', label: '固定频率（毫秒）' },
  { key: 'FIXED_DELAY', label: '固定延迟（毫秒）' },
  { key: 'WORKFLOW', label: '工作流' },
  { key: 'DAILY_TIME_INTERVAL', label: '每日固定间隔' },
]

/** 执行类型选项 */
export const EXECUTE_TYPE_OPTIONS: { key: ExecuteType; label: string }[] = [
  { key: 'STANDALONE', label: '单机执行' },
  { key: 'BROADCAST', label: '广播执行' },
  { key: 'MAP', label: 'Map执行' },
  { key: 'MAP_REDUCE', label: 'MapReduce执行' },
]

/** 处理器类型选项 */
export const PROCESSOR_TYPE_OPTIONS: { key: ProcessorType; label: string }[] = [
  { key: 'BUILT_IN', label: '内建' },
  { key: 'EXTERNAL', label: '外置（动态加载）' },
]

/** 分发策略选项 */
export const DISPATCH_STRATEGY_OPTIONS: { key: DispatchStrategy; label: string }[] = [
  { key: 'HEALTH_FIRST', label: 'HEALTH_FIRST' },
  { key: 'RANDOM', label: 'RANDOM' },
  { key: 'SPECIFY', label: 'SPECIFY' },
]

/** 日志级别选项 */
export const LOG_LEVEL_OPTIONS = [
  { key: 1, label: 'DEBUG' },
  { key: 2, label: 'INFO' },
  { key: 3, label: 'WARN' },
  { key: 4, label: 'ERROR' },
  { key: 99, label: 'OFF' },
]

/** 日志类型选项 */
export const LOG_TYPE_OPTIONS = [
  { key: 1, label: 'ONLINE' },
  { key: 2, label: 'LOCAL' },
  { key: 3, label: 'STDOUT' },
  { key: 4, label: 'LOCAL_AND_ONLINE' },
  { key: 999, label: 'NULL' },
]

/** TaskTracker 行为选项 */
export const TASK_TRACKER_BEHAVIOR_OPTIONS = [
  { key: 1, label: 'NORMAL' },
  { key: 11, label: 'PADDLING' },
]
