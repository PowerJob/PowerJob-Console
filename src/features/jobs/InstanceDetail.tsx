import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Descriptions, Drawer, Input, Pagination, Space, Switch, Table } from 'antd';
import { Download, RefreshCw } from 'lucide-react';
import { api, downloadBlob, type DataRecord } from '../../lib/api';
import { useConsole } from '../../lib/console';
import { EnumTag } from '../../lib/enums';
import { useQuery } from '../../lib/hooks';
import { useSessionQuery, useSessionScope } from '../../lib/sessionScope';
import { ErrorState, formatTime, StatusTag } from '../../components/ui';
import { createAppRequestScope } from '../../lib/appRequestScope';
import { nextLogPage } from './logFollow';

export function InstanceDetailContent({ instanceId }: { instanceId: string | number }) {
  const { t, appId } = useConsole(); const [customQuery,setCustomQuery] = useState('status in (5, 6) order by last_modified_time desc'); const [sql,setSql]=useState(customQuery);
  const scope=useSessionScope();
  const detail=useSessionQuery(scope,()=>api.post<DataRecord>('/instance/detailPlus',{instanceId,customQuery:sql},{...scope.options,headers:{AppId:appId}}),[instanceId,sql,appId]);
  const value=detail.data; const display=(v:any)=>v===null||v===undefined||v===''?'—':typeof v==='object'?JSON.stringify(v,null,2):String(v);
  const fields:[string,string][]=[['runningTimes',t('执行次数','Execution count')],['taskTrackerAddress','TaskTracker'],['expectedTriggerTime',t('预计触发','Expected trigger')],['actualTriggerTime',t('开始时间','Started')],['finishedTime',t('完成时间','Finished')],['jobParams',t('任务参数','Job parameters')],['instanceParams',t('实例参数','Instance parameters')],['taskDetail',t('任务明细','Task summary')],['result',t('执行结果','Result')]];
  return <div className="instance-detail"><Space className="detail-actions"><Button icon={<RefreshCw size={14}/>} loading={detail.loading} onClick={detail.refresh}>{t('刷新详情','Refresh details')}</Button><StatusTag status={value?.status??'—'}/><code>{instanceId}</code></Space><ErrorState error={detail.error} retry={detail.refresh}/><Descriptions bordered column={{xs:1,sm:2}} size="small" items={fields.map(([key,label])=>({key,label,span:['finishedTime','result','taskDetail','jobParams','instanceParams'].includes(key)?'filled' as const:1,children:<pre className="value-block">{display(value?.[key])}</pre>}))}/>
    {value?.subInstanceDetails && <><h3>{t('秒级子实例','Frequent sub-instances')}</h3><Table<DataRecord> rowKey={r=>String(r.subInstanceId)} dataSource={value.subInstanceDetails} scroll={{x:700}} columns={[{title:t('子实例 ID','Sub-instance ID'),dataIndex:'subInstanceId'},{title:t('开始','Started'),dataIndex:'startTime',render:formatTime},{title:t('完成','Finished'),dataIndex:'finishedTime',render:formatTime},{title:t('状态','Status'),dataIndex:'status',render:s=><StatusTag status={s}/>},{title:t('结果','Result'),dataIndex:'result'}]}/></>}
    <h3>{t('分片与子任务','Shards and tasks')}</h3><div className="query-bar"><Input aria-label={t('分片查询条件','Task query condition')} className="code-input" prefix="WHERE" value={customQuery} onChange={e=>setCustomQuery(e.target.value)} onPressEnter={()=>setSql(customQuery)}/><Button type="primary" onClick={()=>{if(sql===customQuery)void detail.refresh();else setSql(customQuery);}}>{t('查询分片','Query tasks')}</Button></div><Table<DataRecord> rowKey={r=>String(r.taskId)} size="small" dataSource={value?.queriedTaskDetailInfoList||[]} scroll={{x:1400}} columns={[
      {title:t('子任务 ID','Task ID'),dataIndex:'taskId',width:150},{title:t('任务名称','Task name'),dataIndex:'taskName',width:160},{title:t('内容','Content'),dataIndex:'taskContent',width:200,ellipsis:true},{title:t('Worker','Worker'),dataIndex:'processorAddress',width:180},{title:t('失败次数','Failures'),dataIndex:'failedCnt',width:100},{title:t('状态','Status'),dataIndex:'statusStr',width:145,render:(status,r)=><EnumTag kind="taskStatus" value={r.status??status}/>} ,{title:t('创建','Created'),dataIndex:'createdTimeStr',width:170},{title:t('更新','Updated'),dataIndex:'lastModifiedTimeStr',width:170},{title:t('最后上报','Last report'),dataIndex:'lastReportTimeStr',width:170},{title:t('结果','Result'),dataIndex:'result',width:250,render:v=><pre className="value-block">{display(v)}</pre>}
    ]}/>
  </div>;
}
export function LogViewer({ instanceId,open,onClose }: { instanceId:string|number; open:boolean; onClose:()=>void }) {
  const { appId,t }=useConsole();
  const [index,setIndex]=useState(0);const [downloading,setDownloading]=useState(false);const [automatic,setAutomatic]=useState(true);const [following,setFollowing]=useState(true);
  const token=localStorage.getItem('PowerJwt');
  const scope=useMemo(()=>createAppRequestScope(appId,token),[appId,token,instanceId,open]);
  useEffect(()=>()=>scope.dispose(),[scope]);
  const viewport=useRef<HTMLPreElement>(null);const followTail=useRef(true);const pages=useRef<number|undefined>(undefined);const interaction=useRef(0);
  useEffect(()=>{setIndex(0);followTail.current=true;setFollowing(true);pages.current=undefined;++interaction.current;},[scope]);
  const log=useQuery(async()=>{
    const before=pages.current;const version=interaction.current;const follow=followTail.current;
    const page=open?await api.get<DataRecord>('/instance/log',{instanceId,index,appId},{...scope.options,quiet:true}):{};
    return {page,scope,index,before,version,follow};
  },[index,open,scope]);
  const current=log.data?.scope===scope&&log.data.index===index?log.data:undefined;
  const page=current?.page;
  const loading=useRef(log.loading);loading.current=log.loading;
  useEffect(()=>{
    if(!open||!current||!scope.current())return;
    const total=Number(current.page.totalPages||0);pages.current=total;
    const follow=current.follow&&followTail.current&&current.version===interaction.current;
    const next=nextLogPage(index,current.before,total,follow);
    if(next!==index)setIndex(next);
    else if(follow&&viewport.current)viewport.current.scrollTop=viewport.current.scrollHeight;
  },[current,index,open,scope]);
  useEffect(()=>{
    if(!open||!automatic)return;
    let active=true;let timer:number;
    const poll=async()=>{if(!loading.current&&scope.current())await log.refresh();if(active)timer=window.setTimeout(()=>void poll(),3000);};
    timer=window.setTimeout(()=>void poll(),3000);
    return()=>{active=false;window.clearTimeout(timer);};
  },[open,automatic,scope,index,log.refresh]);
  const latest=()=>{++interaction.current;followTail.current=true;setFollowing(true);const last=Math.max(0,(pages.current||0)-1);if(index===last)void log.refresh();else setIndex(last);};
  const selectPage=(selected:number)=>{++interaction.current;followTail.current=false;setFollowing(false);setIndex(selected-1);};
  const download=async()=>{if(downloading||!scope.current())return;setDownloading(true);try{const blob=await api.get<Blob>('/instance/downloadLog4Console',{instanceId},{...scope.options,responseType:'blob',timeout:75000});if(scope.current())downloadBlob(blob,`powerjob-instance-${instanceId}.log`);}catch{}finally{if(scope.current())setDownloading(false);}};
  return <Drawer title={t('运行日志','Execution log')+' #'+instanceId} open={open} onClose={onClose} size={1000} extra={<Space wrap><Space><Switch size="small" checked={automatic} aria-label={t('自动刷新日志','Automatically refresh logs')} onChange={setAutomatic}/><span>{t('自动刷新','Auto refresh')}</span></Space><Button type={following?'primary':'default'} aria-pressed={following} onClick={latest}>{following?t('实时跟随','Following live'):t('最新页','Latest page')}</Button><Button icon={<RefreshCw size={15}/>} loading={log.loading} onClick={log.refresh}>{t('刷新','Refresh')}</Button><Button icon={<Download size={15}/>} loading={downloading} onClick={download}>{t('下载日志','Download log')}</Button></Space>}><ErrorState error={log.error} retry={log.refresh}/><pre ref={viewport} className="log-viewer" onScroll={event=>{const el=event.currentTarget;if(followTail.current&&el.scrollHeight-el.scrollTop-el.clientHeight>=40){++interaction.current;followTail.current=false;setFollowing(false);}}}>{page?.data||t('暂无日志。运行中实例可刷新查看最新输出。','No logs yet. Refresh to see the latest output.')}</pre><Pagination current={index+1} pageSize={1} total={page?.totalPages||0} showSizeChanger={false} onChange={selectPage}/></Drawer>;
}
export default function InstanceDetail({instanceId,open=true,onClose=()=>{}}:{instanceId:string|number;open?:boolean;onClose?:()=>void}) {const {t}=useConsole();return <Drawer title={t('实例详情','Instance details')} open={open} onClose={onClose} size={1080}><InstanceDetailContent instanceId={instanceId}/></Drawer>;}
