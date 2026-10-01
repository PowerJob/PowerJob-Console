import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Spin } from 'antd';
import Shell from './components/Shell';
import { useConsole } from './lib/console';
const Login=lazy(()=>import('./pages/Login'));const Applications=lazy(()=>import('./pages/Applications'));const Namespaces=lazy(()=>import('./pages/Namespaces'));const Users=lazy(()=>import('./pages/Users'));const Profile=lazy(()=>import('./pages/Profile'));const System=lazy(()=>import('./pages/System'));const Overview=lazy(()=>import('./pages/Overview'));const Jobs=lazy(()=>import('./pages/Jobs'));const Instances=lazy(()=>import('./pages/Instances'));const Workflows=lazy(()=>import('./pages/Workflows'));const WorkflowInstances=lazy(()=>import('./pages/WorkflowInstances'));const Containers=lazy(()=>import('./pages/Containers'));
export const routeManifest = [
  {path:'/',label:'入口',area:'public',page:'Redirect'},
  {path:'/loginHomepage',label:'登录',area:'public',page:'Login'},
  {path:'/powerjobLogin',label:'内置登录',area:'public',page:'Login'},
  {path:'/oms',label:'工作区',area:'app',page:'Redirect'},
  {path:'/oms/home',label:'运行概览',area:'app',page:'Overview'},
  {path:'/oms/job',label:'任务管理',area:'app',page:'Jobs'},
  {path:'/oms/instance',label:'任务实例',area:'app',page:'Instances'},
  {path:'/oms/workflow',label:'工作流',area:'app',page:'Workflows'},
  {path:'/oms/wfinstance',label:'工作流实例',area:'app',page:'WorkflowInstances'},
  {path:'/oms/template',label:'项目模板',area:'app',page:'Containers'},
  {path:'/oms/containermanage',label:'容器管理',area:'app',page:'Containers'},
  {path:'/oms/wfInstanceDetail',label:'工作流实例详情',area:'app',page:'WorkflowInstances'},
  {path:'/oms/workflowEditor',label:'工作流编辑器',area:'app',page:'Workflows'},
  {path:'/admin',label:'管理',area:'admin',page:'Redirect'},
  {path:'/admin/app',label:'应用管理',area:'admin',page:'Applications'},
  {path:'/admin/namespace',label:'命名空间',area:'admin',page:'Namespaces'},
  {path:'/admin/personal',label:'个人设置',area:'admin',page:'Profile'},
  {path:'/admin/settings',label:'系统设置',area:'admin',page:'System'},
  {path:'/admin/user',label:'用户管理',area:'admin',page:'Users'},
  {path:'/sidebar',label:'导航',area:'admin',page:'Applications'},
  {path:'/navbar',label:'导航栏',area:'admin',page:'Applications'},
] as const;
function Protected({children,scope=false}:{children:ReactNode;scope?:boolean}) {const {appId}=useConsole();if(!localStorage.getItem('PowerJwt'))return <Navigate to="/loginHomepage" replace/>;if(scope&&!appId)return <Navigate to="/admin/app" replace/>;return children;}
export default function AppRoutes(){return <Suspense fallback={<div className="page-loading"><Spin size="large"/></div>}><Routes><Route path="/" element={<Navigate to="/loginHomepage" replace/>}/><Route path="/loginHomepage" element={<Login/>}/><Route path="/powerjobLogin" element={<Login/>}/><Route element={<Protected><Shell/></Protected>}><Route path="/admin" element={<Navigate to="/admin/app" replace/>}/><Route path="/admin/app" element={<Applications/>}/><Route path="/admin/namespace" element={<Namespaces/>}/><Route path="/admin/user" element={<Users/>}/><Route path="/admin/personal" element={<Profile/>}/><Route path="/admin/settings" element={<System/>}/><Route path="/sidebar" element={<Applications/>}/><Route path="/navbar" element={<Applications/>}/><Route path="/oms" element={<Navigate to="/oms/home" replace/>}/><Route path="/oms/home" element={<Protected scope><Overview/></Protected>}/><Route path="/oms/job" element={<Protected scope><Jobs/></Protected>}/><Route path="/oms/instance" element={<Protected scope><Instances/></Protected>}/><Route path="/oms/workflow" element={<Protected scope><Workflows/></Protected>}/><Route path="/oms/workflowEditor" element={<Protected scope><Workflows/></Protected>}/><Route path="/oms/wfinstance" element={<Protected scope><WorkflowInstances/></Protected>}/><Route path="/oms/wfInstanceDetail" element={<Protected scope><WorkflowInstances/></Protected>}/><Route path="/oms/containermanage" element={<Protected scope><Containers/></Protected>}/><Route path="/oms/template" element={<Protected scope><Containers/></Protected>}/></Route><Route path="*" element={<Navigate to="/admin/app" replace/>}/></Routes></Suspense>;}
