import { describe,it,expect } from 'vitest'
import { createJob,editJob,jobPayload } from '../../src/features/jobs/model'
import { cronExpression,draftFromCron,dailyExpression,lifecycle } from '../../src/features/schedule/model'
describe('persisted job contract',()=>{
 it('creates independent drafts and keeps unedited nested fields/Long IDs',()=>{
  const first=createJob('9'),second=createJob('9');first.logConfig.level=4;expect(second.logConfig.level).toBe(2)
  const original={...first,id:'9223372036854775806',tag:'中文',unknown:{flag:false,count:0,empty:null},alarmConfig:{future:null},advancedRuntimeConfig:{future:false},lifeCycle:{start:null,end:2000000000000,zone:'unchanged'}}
  const draft=editJob(original);draft.jobName='synthetic';draft.processorInfo='synthetic.Processor';const saved=jobPayload(draft)
  expect(saved.id).toBe(original.id);expect(saved.unknown).toEqual(original.unknown);expect(saved.alarmConfig.future).toBeNull();expect(saved.advancedRuntimeConfig.future).toBe(false);expect(saved.lifeCycle).toEqual(original.lifeCycle);expect(original.alarmConfig).toEqual({future:null})
 })
 it('normalizes known null sections and preserves an explicitly empty lifecycle',()=>{
  const draft=editJob({...createJob('9'),jobName:'s',processorInfo:'p',alarmConfig:null,logConfig:{type:null,level:null,other:null},advancedRuntimeConfig:{taskTrackerBehavior:null},lifeCycle:{start:null,end:null},notifyUserIds:['9223372036854775806']})
  const saved=jobPayload(draft);expect(saved.logConfig).toEqual({type:1,level:2,loggerName:'',other:null});expect(saved.notifyUserIds).toEqual(['9223372036854775806']);expect(saved.lifeCycle).toEqual({start:null,end:null})
 })
 it.each(['maxInstanceNum','concurrency','instanceTimeLimit','instanceRetryNum','taskRetryNum','maxWorkerCount','minCpuCores','minMemorySpace','minDiskSpace'])('rejects invalid %s before constructing a write',key=>{
  const source={...createJob('9'),jobName:'s',processorInfo:'p'};source[key]=-1;expect(()=>jobPayload(source)).toThrow();source[key]='';expect(()=>jobPayload(source)).toThrow();source[key]=Infinity;expect(()=>jobPayload(source)).toThrow();expect(source[key]).toBe(Infinity)
 })
 it.each(['alertThreshold','statisticWindowLen','silenceWindowLen'])('rejects invalid alert %s before a write',key=>{
  const source={...createJob('9'),jobName:'s',processorInfo:'p'};source.alarmConfig[key]=-1;expect(()=>jobPayload(source)).toThrow();source.alarmConfig[key]=1.5;expect(()=>jobPayload(source)).toThrow()
 })
})
describe('schedules and nullable lifecycle',()=>{
 const base={kind:'minutes',step:5,hour:9,minute:30,weekday:2,day:31}
 it.each([{...base},{...base,kind:'hours',step:2},{...base,kind:'daily'},{...base,kind:'weekdays'},{...base,kind:'weekly',weekday:1},{...base,kind:'monthly'}])('recognizes its generated $kind rule without applying draft changes',preset=>{
  const expression=cronExpression(preset),draft=draftFromCron(expression);expect(cronExpression(draft)).toBe(expression);draft.hour=22;expect(expression).toBe(cronExpression(preset))
 })
 it('keeps manual complex rules intact until Apply and rejects invalid quick values',()=>{
  const expression='0 0 9 ? * MON-FRI 2027';const draft=draftFromCron(expression);expect(draft.kind).toBe('minutes');expect(expression).toBe('0 0 9 ? * MON-FRI 2027');expect(()=>cronExpression({...base,step:0})).toThrow();expect(()=>cronExpression({...base,kind:'weekly',weekday:8})).toThrow();expect(()=>cronExpression({...base,kind:'monthly',day:32})).toThrow()
 })
 it('retains daily interval unknown fields, empty weekdays and second precision',()=>{
  expect(JSON.parse(dailyExpression({interval:5,intervalUnit:'MINUTES',startTimeOfDay:'09:12:31',endTimeOfDay:'18:42:59',daysOfWeek:[],unknown:null}))).toEqual({interval:5,intervalUnit:'MINUTES',startTimeOfDay:'09:12:31',endTimeOfDay:'18:42:59',daysOfWeek:[],unknown:null})
  expect(()=>dailyExpression({interval:0,intervalUnit:'MINUTES',startTimeOfDay:'09:00:00',endTimeOfDay:'18:00:00',daysOfWeek:[]})).toThrow()
 })
 it('keeps individual lifecycle bounds and rejects reversed/invalid dates',()=>{
  expect(lifecycle({start:1000,end:null,unknown:0})).toEqual({start:1000,end:null,unknown:0});expect(lifecycle({start:null,end:1000})).toEqual({start:null,end:1000});expect(lifecycle(null)).toEqual({start:null,end:null});expect(()=>lifecycle({start:2000,end:1000})).toThrow();expect(()=>lifecycle({start:'broken',end:null})).toThrow()
 })
})
