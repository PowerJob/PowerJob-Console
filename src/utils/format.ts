import i18n from '@/i18n/i18n.js'
import { InstanceStatus, WfInstanceStatus } from '@/constants/status'

// 获取翻译函数（使用类型断言解决 vue-i18n 类型问题）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = (key: string) => (i18n.global as any).t(key)

/** 翻译实例状态 */
export function translateInstanceStatus(status: number): string {
  switch (status) {
    case InstanceStatus.WAITING_DISPATCH:
      return t('message.waitingDispatch')
    case InstanceStatus.WAITING_WORKER_RECEIVE:
      return t('message.waitingWorkerReceive')
    case InstanceStatus.RUNNING:
      return t('message.running')
    case InstanceStatus.FAILED:
      return t('message.failed')
    case InstanceStatus.SUCCESS:
      return t('message.success')
    case InstanceStatus.CANCELED:
      return t('message.canceled')
    case InstanceStatus.STOPPED:
      return t('message.stopped')
    default:
      return 'unknown'
  }
}

/** 翻译工作流实例状态 */
export function translateWfInstanceStatus(status: number): string {
  switch (status) {
    case WfInstanceStatus.WAITING:
      return t('message.wfWaiting')
    case WfInstanceStatus.RUNNING:
      return t('message.running')
    case WfInstanceStatus.FAILED:
      return t('message.failed')
    case WfInstanceStatus.SUCCESS:
      return t('message.success')
    case WfInstanceStatus.STOPPED:
      return t('message.stopped')
    default:
      return 'unknown'
  }
}

/** 翻译执行类型 */
export function translateExecuteType(type: string): string {
  switch (type) {
    case 'STANDALONE':
      return t('message.standalone')
    case 'BROADCAST':
      return t('message.broadcast')
    case 'MAP':
      return t('message.map')
    case 'MAP_REDUCE':
      return t('message.mapReduce')
    default:
      return type
  }
}

/** 翻译处理器类型 */
export function translateProcessorType(type: string): string {
  if (type === 'EXTERNAL') {
    return t('message.external')
  }
  return t('message.builtIn')
}

/** 翻译时间表达式类型 */
export function translateTimeExpressionType(type: string): string {
  switch (type) {
    case 'API':
      return 'API'
    case 'CRON':
      return 'CRON'
    case 'FIXED_RATE':
      return t('message.fixRate')
    case 'FIXED_DELAY':
      return t('message.fixDelay')
    case 'WORKFLOW':
      return t('message.workflow')
    case 'DAILY_TIME_INTERVAL':
      return t('message.dailyTimeInterval')
    default:
      return type
  }
}
