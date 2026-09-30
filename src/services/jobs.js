export function newJob(appId) {
  return {
    appId, jobName: '', jobDescription: '', jobParams: '',
    timeExpressionType: 'API', timeExpression: '', executeType: 'STANDALONE',
    processorType: 'BUILT_IN', processorInfo: '', maxInstanceNum: 0,
    concurrency: 5, instanceTimeLimit: 0, instanceRetryNum: 0, taskRetryNum: 1,
    dispatchStrategy: 'HEALTH_FIRST', dispatchStrategyConfig: '',
    minCpuCores: 0, minMemorySpace: 0, minDiskSpace: 0, enable: true,
    designatedWorkers: '', maxWorkerCount: 0, notifyUserIds: [], lifeCycle: null,
    alarmConfig: { alertThreshold: 0, statisticWindowLen: 0, silenceWindowLen: 0 },
    logConfig: { type: 1, level: 2, loggerName: '' },
    advancedRuntimeConfig: { taskTrackerBehavior: 1 },
  }
}

function configWithDefaults(defaults, value) {
  const result = { ...defaults, ...value }
  // Older Server VOs can contain explicit nulls for an unconfigured section.
  // Known editable fields need their established defaults for a valid save;
  // unknown fields and valid zero/false values remain untouched.
  for (const key of Object.keys(defaults)) if (result[key] == null) result[key] = defaults[key]
  return result
}

export function jobForEditor(job, appId = job.appId) {
  const defaults = newJob(appId)
  const copy = JSON.parse(JSON.stringify(job))
  return {
    ...defaults, ...copy,
    alarmConfig: configWithDefaults(defaults.alarmConfig, copy.alarmConfig),
    logConfig: configWithDefaults(defaults.logConfig, copy.logConfig),
    advancedRuntimeConfig: configWithDefaults(defaults.advancedRuntimeConfig, copy.advancedRuntimeConfig),
    notifyUserIds: (copy.notifyUserIds || []).map(String),
    lifeCycle: Array.isArray(copy.lifeCycle) ? { start: copy.lifeCycle[0], end: copy.lifeCycle[1] } : copy.lifeCycle ?? null,
  }
}

export function jobForSave(form) {
  const payload = JSON.parse(JSON.stringify(form))
  payload.lifeCycle = payload.lifeCycle == null ? { start: null, end: null } : lifeCycleForSave(payload.lifeCycle)
  return payload
}

export function lifeCycleForSave(value) {
  if (value == null) return null
  const result = Array.isArray(value) ? { start: value[0], end: value[1] } : { ...value }
  for (const key of ['start', 'end']) {
    if (result[key] == null) continue
    if (result[key] === '') { result[key] = null; continue }
    result[key] = Number(result[key])
    if (!Number.isFinite(result[key])) throw new Error('Invalid lifecycle timestamp')
  }
  if (result.start != null && result.end != null && result.start > result.end) throw new Error('Invalid lifecycle range')
  return result
}

export function validJob(form) {
  return !!(form.jobName?.trim() && form.processorInfo?.trim() && form.timeExpressionType && form.processorType && form.executeType && (!['CRON', 'FIXED_DELAY', 'FIXED_RATE', 'DAILY_TIME_INTERVAL'].includes(form.timeExpressionType) || form.timeExpression?.trim()))
}
