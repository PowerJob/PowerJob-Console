import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest'
import { session,establishSession,selectApp,signOut } from '../../src/core/session'
import { api,endpoint,websocketUrl,parseJSON,saveBlob } from '../../src/core/api'

function response(body:string,type='application/json',ok=true){return new Response(body,{status:ok?200:500,headers:{'Content-Type':type}})}
beforeEach(()=>{localStorage.clear();signOut();establishSession('synthetic-current-jwt');selectApp({id:'9223372036854775806',appName:'synthetic-app'});vi.stubGlobal('fetch',vi.fn())})
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();vi.useRealTimers()})
describe('request wire contract',()=>{
 it('preserves Long IDs, arrays, strings, nulls and normal numbers in ResultDTO',async()=>{
  vi.mocked(fetch).mockResolvedValue(response('{"success":true,"data":{"id":9223372036854775806,"decimal":2.5,"count":42,"flag":false,"other":null}}') as Response)
  expect(await api('/resource')).toEqual({id:'9223372036854775806',decimal:2.5,count:42,flag:false,other:null})
  expect(parseJSON('{"id":9223372036854775806}').id).toBe('9223372036854775806')
 })
 it('uses legacy automatic headers; explicit AppId/PowerJwt/NamespaceId have authority',async()=>{
  vi.mocked(fetch).mockImplementation(async()=>response('{"success":true,"data":null}'))
  await api('/resource',{body:{id:'9223372036854775806'}})
  let options=vi.mocked(fetch).mock.calls[0][1]!
  expect(options.method).toBe('POST');expect((options.headers as Headers).get('PowerJwt')).toBe('synthetic-current-jwt');expect((options.headers as Headers).get('AppId')).toBe('9223372036854775806');expect(JSON.parse(options.body as string).id).toBe('9223372036854775806')
  await api('/resource',{headers:{PowerJwt:'synthetic-temporary',AppId:'12',NamespaceId:'34'}})
  options=vi.mocked(fetch).mock.calls[1][1]!
  expect((options.headers as Headers).get('PowerJwt')).toBe('synthetic-temporary');expect((options.headers as Headers).get('AppId')).toBe('12');expect((options.headers as Headers).get('NamespaceId')).toBe('34')
 })
 it('does not force JSON Content-Type onto multipart uploads',async()=>{
  vi.mocked(fetch).mockResolvedValue(response('{"success":true,"data":"path"}') as Response)
  const form=new FormData();form.append('file',new Blob(['jar']),'fixture.jar');await api('/container/jarUpload',{body:form})
  const options=vi.mocked(fetch).mock.calls[0][1]!
  expect(options.body).toBe(form);expect((options.headers as Headers).has('Content-Type')).toBe(false)
 })
 it.each([-100,'-100'])('rejects expired session code %s and clears only the current session',async(code)=>{
  vi.mocked(fetch).mockResolvedValue(response(JSON.stringify({success:false,code,message:'expired synthetic session'})) as Response)
  await expect(api('/resource',{quiet:true})).rejects.toThrow('expired synthetic session');expect(session.jwt).toBeNull();expect(session.appId).toBe('')
 })
 it('keeps a new account/app when an old expired response arrives',async()=>{
  let resolve!:(value:Response)=>void
  vi.mocked(fetch).mockImplementation(()=>new Promise(value=>resolve=value))
  const pending=api('/resource',{quiet:true});establishSession('synthetic-new-jwt');selectApp({id:'100',appName:'new'})
  resolve(response('{"success":false,"code":-100,"message":"old expired"}') as Response)
  await expect(pending).rejects.toThrow('old expired');expect(session.jwt).toBe('synthetic-new-jwt');expect(session.appId).toBe('100')
 })
 it('keeps current credentials when a temporary registration token is rejected',async()=>{
  vi.mocked(fetch).mockResolvedValue(response('{"success":false,"code":-100}') as Response)
  await expect(api('/user/detail',{headers:{PowerJwt:'synthetic-registration-token'},quiet:true})).rejects.toThrow();expect(session.jwt).toBe('synthetic-current-jwt')
 })
 it.each([{success:false,message:'business error'},{success:false,msg:'legacy message'}])('rejects business failure without retrying a write',async(value)=>{
  vi.mocked(fetch).mockResolvedValue(response(JSON.stringify(value)) as Response)
  await expect(api('/job/save',{body:{},quiet:true})).rejects.toThrow(value.message||value.msg);expect(fetch).toHaveBeenCalledTimes(1)
 })
 it('encodes reserved characters and repeated query values without changing lossless IDs',()=>{
  const url=new URL(endpoint('/job/run',{jobId:'9223372036854775806',instanceParams:'中文😀 &=+?#/%\n',tag:['x','y']}))
  expect(url.searchParams.get('jobId')).toBe('9223372036854775806');expect(url.searchParams.get('instanceParams')).toBe('中文😀 &=+?#/%\n');expect(url.searchParams.getAll('tag')).toEqual(['x','y']);expect(new URL(websocketUrl('/container/deploy/9')).protocol).toMatch(/^wss?:$/)
 })
 it.each(['application/json','text/html'])('refuses a %s error document as a download',async(type)=>{
  vi.mocked(fetch).mockResolvedValue(response(type==='text/html'?'<html>error</html>':'{"success":false,"message":"download denied"}',type) as Response)
  await expect(api('/download',{blob:true,quiet:true})).rejects.toThrow()
 })
 it.each(['application/octet-stream','application/zip','text/plain'])('preserves real %s download bytes',async(type)=>{
  const content='\0synthetic bytes 中文\n';vi.mocked(fetch).mockResolvedValue(response(content,type) as Response)
  expect(await (await api<Blob>('/download',{blob:true})).text()).toBe(content)
 })
 it('propagates cancellation, has a bounded default timeout and releases event listeners',async()=>{
  vi.useFakeTimers();vi.mocked(fetch).mockImplementation((_url,options)=>new Promise((_resolve,reject)=>options?.signal?.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')))))
  const controller=new AbortController(),remove=vi.spyOn(controller.signal,'removeEventListener')
  const pending=api('/resource',{signal:controller.signal,quiet:true});const rejected=expect(pending).rejects.toMatchObject({name:'AbortError'})
  await vi.advanceTimersByTimeAsync(10000);await rejected;expect(remove).toHaveBeenCalledWith('abort',expect.any(Function));expect(fetch).toHaveBeenCalledTimes(1)
 })
 it('creates a real download anchor and releases its URL',()=>{
  vi.useFakeTimers();const create=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:synthetic'),revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{}),click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(){expect(this.download).toBe('fixture.zip');expect(this.isConnected).toBe(true)})
  saveBlob(new Blob(['zip']),'fixture.zip');expect(click).toHaveBeenCalledOnce();expect(document.querySelector('a[download]')).toBeNull();vi.advanceTimersByTime(1000);expect(create).toHaveBeenCalledOnce();expect(revoke).toHaveBeenCalledWith('blob:synthetic')
 })
})
