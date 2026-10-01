import dayjs, { type Dayjs } from 'dayjs';
import type { DataRecord } from '../../lib/api';
export const newJob = (appId: string): DataRecord => ({ appId, jobName: '', jobDescription: '', jobParams: '', timeExpressionType: 'API', timeExpression: '', executeType: 'STANDALONE', processorType: 'BUILT_IN', processorInfo: '', maxInstanceNum: 0, concurrency: 5, instanceTimeLimit: 0, instanceRetryNum: 0, taskRetryNum: 1, dispatchStrategy: 'HEALTH_FIRST', dispatchStrategyConfig: '', minCpuCores: 0, minMemorySpace: 0, minDiskSpace: 0, enable: true, designatedWorkers: '', maxWorkerCount: 0, notifyUserIds: [], lifeCycle: null, alarmConfig: {alertThreshold:0,statisticWindowLen:0,silenceWindowLen:0}, logConfig:{type:1,level:2,loggerName:''}, advancedRuntimeConfig:{taskTrackerBehavior:1} });
export function jobToForm(job: DataRecord) {
  const result = structuredClone(job);
  result.notifyUserIds = (result.notifyUserIds || []).map(String);
  const lifecycle = result.lifeCycle;
  result.dateRange = lifecycle && (lifecycle.start != null || lifecycle.end != null)
    ? [lifecycle.start == null ? null : dayjs(Number(lifecycle.start)), lifecycle.end == null ? null : dayjs(Number(lifecycle.end))]
    : null;
  return result;
}
export function jobPayload(original: DataRecord, values: DataRecord, appId: string) {
  const result: DataRecord = { ...structuredClone(original), ...values, appId };
  if (Object.prototype.hasOwnProperty.call(values, 'dateRange')) {
    const range = values.dateRange as [Dayjs | null, Dayjs | null] | null;
    result.lifeCycle = range ? { start: range[0]?.valueOf() ?? null, end: range[1]?.valueOf() ?? null } : null;
  }
  delete result.dateRange;
  result.alarmConfig = { alertThreshold: 0, statisticWindowLen: 0, silenceWindowLen: 0, ...original.alarmConfig, ...values.alarmConfig };
  for (const key of ['alertThreshold', 'statisticWindowLen', 'silenceWindowLen']) if (result.alarmConfig[key] == null || result.alarmConfig[key] === '') result.alarmConfig[key] = 0;
  for (const key of ['logConfig', 'advancedRuntimeConfig']) if (original[key] || values[key]) result[key] = { ...original[key], ...values[key] };
  return result;
}
export function dailyRule(expression?: string) { if (!expression || !/^[\[{]/.test(expression.trim())) return {interval:60,intervalUnit:'SECONDS',startTimeOfDay:'09:00:00',endTimeOfDay:'18:00:00',daysOfWeek:[1,2,3,4,5]}; const result = JSON.parse(expression); if (!result || Array.isArray(result) || typeof result !== 'object' || (result.daysOfWeek != null && !Array.isArray(result.daysOfWeek))) throw new Error('每日间隔配置格式无效 / Invalid daily interval'); return result; }
