import { clone } from '../../core/ui'
import type { Entity } from '../../core/session'

export const schedules = ['API','CRON','FIXED_RATE','FIXED_DELAY','WORKFLOW','DAILY_TIME_INTERVAL']
export function lifecycle(value:Entity | null) {
  const result = value == null ? {start:null,end:null} : clone(value)
  for (const key of ['start','end']) {
    if (result[key] == null || result[key] === '') {result[key]=null;continue}
    result[key]=Number(value?.[key])
    if (!Number.isFinite(result[key])) throw new Error('Invalid lifecycle timestamp')
  }
  if (result.start!=null && result.end!=null && result.start>result.end) throw new Error('Lifecycle start must not be after end')
  return result
}
export interface CronPreset {kind:string;step:number;hour:number;minute:number;weekday:number;day:number}
export function draftFromCron(expression:string):CronPreset {
  const draft={kind:'minutes',step:5,hour:9,minute:0,weekday:2,day:1}
  const parts=expression.trim().split(/\s+/)
  if(parts.length!==6||parts[0]!=='0')return draft
  const [,minute,hour,day,month,week]=parts
  if(month!=='*')return draft
  if(/^0\/\d+$/.test(minute)&&hour==='*'&&day==='*'&&week==='?')Object.assign(draft,{kind:'minutes',step:Number(minute.slice(2))})
  else if(/^\d+$/.test(minute)&&/^0\/\d+$/.test(hour)&&day==='*'&&week==='?')Object.assign(draft,{kind:'hours',step:Number(hour.slice(2)),minute:Number(minute)})
  else if(/^\d+$/.test(minute)&&/^\d+$/.test(hour)){
    if(day==='*'&&week==='?')Object.assign(draft,{kind:'daily',hour:Number(hour),minute:Number(minute)})
    else if(day==='?'&&week==='2-6')Object.assign(draft,{kind:'weekdays',hour:Number(hour),minute:Number(minute)})
    else if(day==='?'&&/^[1-7]$/.test(week))Object.assign(draft,{kind:'weekly',hour:Number(hour),minute:Number(minute),weekday:Number(week)})
    else if(/^\d+$/.test(day)&&week==='?')Object.assign(draft,{kind:'monthly',hour:Number(hour),minute:Number(minute),day:Number(day)})
  }
  try{return cronExpression(draft)===expression.trim().replace(/\s+/g,' ')?draft:{kind:'minutes',step:5,hour:9,minute:0,weekday:2,day:1}}catch{return {kind:'minutes',step:5,hour:9,minute:0,weekday:2,day:1}}
}
export function cronExpression(value:CronPreset) {
  const integer = (n:number,min:number,max:number) => Number.isInteger(n)&&n>=min&&n<=max
  if (!integer(value.hour,0,23)||!integer(value.minute,0,59)) throw new Error('Hour must be 0–23; minute must be 0–59')
  if (value.kind==='minutes') {if(!integer(value.step,1,59))throw new Error('Minute interval must be 1–59');return '0 0/'+value.step+' * * * ?'}
  if (value.kind==='hours') {if(!integer(value.step,1,23))throw new Error('Hour interval must be 1–23');return '0 '+value.minute+' 0/'+value.step+' * * ?'}
  if (value.kind==='daily') return '0 '+value.minute+' '+value.hour+' * * ?'
  if (value.kind==='weekdays') return '0 '+value.minute+' '+value.hour+' ? * 2-6'
  if (value.kind==='weekly') {if(!integer(value.weekday,1,7))throw new Error('Weekday must be 1–7');return '0 '+value.minute+' '+value.hour+' ? * '+value.weekday}
  if (value.kind==='monthly') {if(!integer(value.day,1,31))throw new Error('Day must be 1–31');return '0 '+value.minute+' '+value.hour+' '+value.day+' * ?'}
  throw new Error('Choose a schedule')
}
export function dailyExpression(value:Entity) {
  if (!Number.isInteger(Number(value.interval)) || Number(value.interval)<1 || !['SECONDS','MINUTES','HOURS'].includes(value.intervalUnit)) throw new Error('Enter a positive whole interval')
  const pattern=/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/
  if (![value.startTimeOfDay,value.endTimeOfDay].every(time=>pattern.test(time)) || value.startTimeOfDay>value.endTimeOfDay) throw new Error('Enter a valid daily time range')
  if (!Array.isArray(value.daysOfWeek) || value.daysOfWeek.some((day:unknown)=>!Number.isInteger(Number(day)) || Number(day)<1 || Number(day)>7)) throw new Error('Choose valid weekdays')
  return JSON.stringify({...value,interval:Number(value.interval),daysOfWeek:value.daysOfWeek.map(Number)})
}
