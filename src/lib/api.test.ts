import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {api,ApiError,endpoint,parseJson} from './api';

const values=new Map<string,string>();const events:Event[]=[];
beforeEach(()=>{values.clear();events.length=0;vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)||null});vi.stubGlobal('window',{location:{href:'http://localhost:24800/console/index.html#/oms/job'},setTimeout,dispatchEvent:(event:Event)=>{events.push(event);}});});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('existing Server HTTP contract',()=>{
  it('preserves 64-bit identifiers in nested DAG/import responses',()=>{const data=parseJson('{"id":9223372036854775807,"nodes":[{"nodeId":9007199254740993}],"count":5}');expect(data.id).toBe('9223372036854775807');expect(data.nodes[0].nodeId).toBe('9007199254740993');expect(data.count).toBe(5);});
  it('encodes parameters exactly once and retains zero and false',()=>{const url=endpoint('/job/run',{instanceParams:'中文 + & ? = %\n',delay:0,enable:false,empty:''});expect(url.searchParams.get('instanceParams')).toBe('中文 + & ? = %\n');expect(url.searchParams.get('delay')).toBe('0');expect(url.searchParams.get('enable')).toBe('false');expect(url.searchParams.has('empty')).toBe(false);});
  it('keeps callback query parameters attached to endpoint',()=>{const url=endpoint('/auth/thirdPartyLoginCallback?code=a%2Bb&state=%E4%B8%AD');expect(url.searchParams.get('code')).toBe('a+b');expect(url.searchParams.get('state')).toBe('中');});
  it('adds the established session and app headers without overriding explicit resource app',async()=>{values.set('PowerJwt','test-only-token');values.set('Power_appId','1');const fetch=vi.fn().mockResolvedValue(new Response('{"success":true,"data":{"id":9223372036854775807}}',{headers:{'content-type':'application/json'}}));vi.stubGlobal('fetch',fetch);expect((await api.post('/appInfo/save',{id:'2'},{headers:{AppId:'2'}})).id).toBe('9223372036854775807');expect(fetch.mock.calls[0][1].headers.AppId).toBe('2');expect(fetch.mock.calls[0][1].headers.PowerJwt).toBe('test-only-token');});
  it('unwraps ResultDTO consistently for containers and ordinary calls',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{"success":true,"data":[{"id":1}]}')));expect(await api.get('/container/list')).toEqual([{id:1}]);});
  it('rejects business failure even when HTTP status is 200',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{"success":false,"message":"invalid schedule"}')));await expect(api.post('/job/save',{})).rejects.toThrow('invalid schedule');expect(events.length).toBe(1);});
  it('expires authentication for both numeric and string legacy error codes',async()=>{for(const code of ['-100',-100]){vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({success:false,code}))));await expect(api.get('/user/detail')).rejects.toThrow('Please sign in again');}expect(events.filter(e=>e.type==='powerjob:unauthorized')).toHaveLength(2);});
  it('does not expire a new session when an old request returns unauthorized',async()=>{values.set('PowerJwt','old-session-test-only');let complete!:(response:Response)=>void;vi.stubGlobal('fetch',vi.fn().mockReturnValue(new Promise<Response>(resolve=>{complete=resolve;})));const pending=api.get('/user/detail');values.set('PowerJwt','new-session-test-only');complete(new Response('{"success":false,"code":-100}'));await expect(pending).rejects.toThrow('Please sign in again');expect(events).toHaveLength(0);expect(values.get('PowerJwt')).toBe('new-session-test-only');});
  it('still explains a current-session expiration after the logout listener removes its token',async()=>{values.set('PowerJwt','current-session-test-only');vi.stubGlobal('window',{location:{href:'http://localhost:24800/'},setTimeout,dispatchEvent:(event:Event)=>{events.push(event);if(event.type==='powerjob:unauthorized')values.delete('PowerJwt');}});vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{"success":false,"code":-100}')));await expect(api.get('/user/detail')).rejects.toThrow('Please sign in again');expect(events.map(event=>event.type)).toEqual(['powerjob:unauthorized','powerjob:error']);});
  it('does not send a request or show an error when its caller already canceled it',async()=>{const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const controller=new AbortController();controller.abort();await expect(api.get('/job/list',undefined,{signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});expect(fetch).not.toHaveBeenCalled();expect(events).toHaveLength(0);});
  it('rejects a pending fetch at the default deadline with a stable timeout error',async()=>{
    vi.useFakeTimers();
    window.setTimeout=setTimeout;
    values.set('PowerJwt','current-session-test-only');
    let requestSignal!:AbortSignal;
    vi.stubGlobal('fetch',vi.fn((_input:unknown,init:RequestInit)=>new Promise<Response>((_resolve,reject)=>{
      requestSignal=init.signal!;
      requestSignal.addEventListener('abort',()=>reject(requestSignal.reason),{once:true});
    })));
    const failure=api.get('/workflow/list').catch(error=>error);
    await vi.advanceTimersByTimeAsync(14999);
    expect(requestSignal.aborted).toBe(false);
    expect(events).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    const error=await failure;
    expect(requestSignal.aborted).toBe(true);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({code:'TIMEOUT',message:'请求超时，请重试 / Request timed out'});
    expect(events.map(event=>event.type)).toEqual(['powerjob:error']);
    expect((events[0] as CustomEvent).detail).toBe(error.message);
    expect(values.get('PowerJwt')).toBe('current-session-test-only');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('preserves a caller cancellation during a pending fetch without a timeout or toast',async()=>{
    vi.useFakeTimers();
    window.setTimeout=setTimeout;
    const caller=new AbortController();
    let requestSignal!:AbortSignal;
    vi.stubGlobal('fetch',vi.fn((_input:unknown,init:RequestInit)=>new Promise<Response>((_resolve,reject)=>{
      requestSignal=init.signal!;
      requestSignal.addEventListener('abort',()=>reject(requestSignal.reason),{once:true});
    })));
    const failure=api.get('/workflow/list',undefined,{signal:caller.signal}).catch(error=>error);
    await vi.advanceTimersByTimeAsync(1000);
    expect(requestSignal.aborted).toBe(false);
    caller.abort();
    const error=await failure;
    expect(requestSignal.aborted).toBe(true);
    expect(error).toMatchObject({name:'AbortError'});
    expect(error).not.toBeInstanceOf(ApiError);
    expect(events).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(15000);
    expect(events).toHaveLength(0);
  });
  it('does not download JSON failure responses as log files',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{"success":false,"message":"log not ready"}',{headers:{'content-type':'application/json'}})));await expect(api.get('/instance/downloadLog4Console',{instanceId:'1'},{responseType:'blob'})).rejects.toThrow('log not ready');});
  it('returns genuine binary downloads without DTO parsing',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('log contents',{headers:{'content-type':'application/octet-stream'}})));const blob=await api.get<Blob>('/instance/downloadLog4Console',{instanceId:'1'},{responseType:'blob'});expect(await blob.text()).toBe('log contents');});
  it('refuses HTML, mislabeled text and successful JSON DTOs instead of saving fake logs',async()=>{for(const [contentType,body] of [['text/html','<html>Sign in</html>'],['text/plain','log unavailable'],['application/json','{"success":true,"data":"Sign in"}']]){vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(body,{headers:{'content-type':contentType!}})));await expect(api.get('/instance/downloadLog4Console',{instanceId:'1'},{responseType:'blob'})).rejects.toThrow('valid log file');}});
  it('does not expose underlying HTML error pages as server data',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('<html>Bad gateway</html>',{status:502})));await expect(api.get('/system/overview')).rejects.toThrow('(502)');});
});
