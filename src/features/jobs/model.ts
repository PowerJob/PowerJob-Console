import { clone } from '../../core/ui'
import type { Entity } from '../../core/session'
import { lifecycle } from '../schedule/model'

export function createJob(appId:string):Entity {
  return {appId,jobName:'',jobDescription:'',jobParams:'',timeExpressionType:'API',timeExpression:'',executeType:'STANDALONE',processorType:'BUILT_IN',processorInfo:'',enable:true,maxInstanceNum:0,concurrency:5,instanceTimeLimit:0,instanceRetryNum:0,taskRetryNum:1,dispatchStrategy:'HEALTH_FIRST',dispatchStrategyConfig:'',designatedWorkers:'',maxWorkerCount:0,minCpuCores:0,minMemorySpace:0,minDiskSpace:0,notifyUserIds:[],lifeCycle:null,alarmConfig:{alertThreshold:0,statisticWindowLen:0,silenceWindowLen:0},logConfig:{type:1,level:2,loggerName:''},advancedRuntimeConfig:{taskTrackerBehavior:1}}
}
export function editJob(source:Entity,appId=String(source.appId)):Entity {
  const defaults=createJob(appId),copy=clone(source),result={...defaults,...copy}
  for(const key of ['alarmConfig','logConfig','advancedRuntimeConfig']) {
    result[key]={...defaults[key],...(copy[key]||{})}
    for(const field of Object.keys(defaults[key]))if(result[key][field]==null)result[key][field]=defaults[key][field]
  }
  result.notifyUserIds=(copy.notifyUserIds||[]).map(String)
  if(Array.isArray(copy.lifeCycle))result.lifeCycle={start:copy.lifeCycle[0],end:copy.lifeCycle[1]}
  return result
}
export function jobPayload(source:Entity):Entity {
  if(!source.jobName?.trim()||!source.processorInfo?.trim())throw new Error('Job name and processor are required')
  if(['CRON','FIXED_RATE','FIXED_DELAY','DAILY_TIME_INTERVAL'].includes(source.timeExpressionType)&&!String(source.timeExpression||'').trim())throw new Error('Schedule expression is required')
  const result=clone(source);result.lifeCycle=lifecycle(result.lifeCycle)
  for(const key of ['maxInstanceNum','concurrency','instanceTimeLimit','instanceRetryNum','taskRetryNum','maxWorkerCount','minCpuCores','minMemorySpace','minDiskSpace']) {
    const value=Number(source[key]);if(source[key]===''||!Number.isFinite(value)||value<0||(!['minCpuCores','minMemorySpace','minDiskSpace'].includes(key)&&!Number.isInteger(value)))throw new Error('Runtime values must be nonnegative numbers; counts must be whole numbers');result[key]=value
  }
  for(const key of ['alertThreshold','statisticWindowLen','silenceWindowLen']){const value=Number(source.alarmConfig[key]);if(source.alarmConfig[key]===''||!Number.isInteger(value)||value<0)throw new Error('Alert values must be nonnegative whole numbers');result.alarmConfig[key]=value}
  return result
}
