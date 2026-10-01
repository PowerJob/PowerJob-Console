import { Activity, BellRing, Boxes, Code2, GitBranch, Layers, ListChecks, Settings, Shield, User, Users } from 'lucide-react';

export type NavigationScope = 'workspace' | 'organization';
export const workspaceNavigation = [
  { path: '/oms/home', zh: '运行概览', en: 'Overview', icon: Activity },
  { path: '/oms/job', zh: '任务管理', en: 'Jobs', icon: ListChecks },
  { path: '/oms/instance', zh: '任务实例', en: 'Job instances', icon: Layers },
  { path: '/oms/workflow', zh: '工作流', en: 'Workflows', icon: GitBranch },
  { path: '/oms/wfinstance', zh: '工作流实例', en: 'Workflow instances', icon: BellRing },
  { path: '/oms/containermanage', zh: '容器管理', en: 'Containers', icon: Boxes },
  { path: '/oms/template', zh: '开发模板', en: 'Starter project', icon: Code2 },
];
export const managementNavigation = [
  { path: '/admin/app', zh: '应用管理', en: 'Applications', icon: Boxes },
  { path: '/admin/namespace', zh: '命名空间', en: 'Namespaces', icon: Shield },
  { path: '/admin/user', zh: '用户管理', en: 'Users', icon: Users },
  { path: '/admin/settings', zh: '系统设置', en: 'System settings', icon: Settings },
];
export function navigationScope(path: string, previous: NavigationScope): NavigationScope {
  if (path === '/admin/personal') return previous;
  return path.startsWith('/oms') ? 'workspace' : 'organization';
}
export function activeNavigation(path: string) {
  const aliases: Record<string, string> = { '/oms/workflowEditor': '/oms/workflow', '/oms/wfInstanceDetail': '/oms/wfinstance', '/sidebar': '/admin/app', '/navbar': '/admin/app' };
  return [...workspaceNavigation, ...managementNavigation, { path: '/admin/personal', zh: '个人设置', en: 'My profile', icon: User }].find(item => item.path === (aliases[path] || path));
}
