import { useEffect, useRef, useState } from 'react';
import { Avatar, Button, Drawer, Dropdown, Input, Modal, Select, Tooltip } from 'antd';
import { ArrowLeftRight, ChevronDown, Command, Globe, Layers, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, Shield, User, Zap } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api, type PageResult } from '../lib/api';
import { useConsole } from '../lib/console';
import { useQuery } from '../lib/hooks';
import { activeNavigation, managementNavigation, navigationScope, workspaceNavigation, type NavigationScope } from '../lib/navigation';

const SIDEBAR_KEY = 'Power_consoleSidebarCollapsed';
function readCollapsed() { try { return localStorage.getItem(SIDEBAR_KEY) === 'true'; } catch { return false; } }

export default function Shell() {
  const { appId, appName, user, refreshSession, setApp, language, setLanguage, t, logout } = useConsole();
  const navigate = useNavigate(); const location = useLocation();
  const [mobile, setMobile] = useState(false); const [command, setCommand] = useState(false); const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const lastScope = useRef<NavigationScope>(appId ? 'workspace' : 'organization');
  const lastRoute = useRef({ workspace: '/oms/home', organization: '/admin/app' });
  const previousApp = useRef(appId);
  const scope = navigationScope(location.pathname, lastScope.current);
  const active = activeNavigation(location.pathname);
  const apps = useQuery(() => api.post<PageResult>('/appInfo/list', { showMyRelated: true, index: 0, pageSize: 1000 }), [appId, location.pathname]);

  useEffect(() => { void refreshSession().catch(() => {}); }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearch(''); setCommand(value => !value); } };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    setMobile(false);
    const appChanged = previousApp.current !== appId;
    previousApp.current = appId;
    if (appChanged) lastRoute.current.workspace = '/oms/home';
    if (location.pathname !== '/admin/personal') {
      lastScope.current = scope;
      if (!appChanged || scope === 'organization') lastRoute.current[scope] = location.pathname + location.search;
      if (appChanged && appId && scope === 'workspace' && (location.pathname !== '/oms/home' || location.search)) navigate('/oms/home', { replace: true });
    }
  }, [appId, location.pathname, location.search, scope, navigate]);
  useEffect(() => { try { localStorage.setItem(SIDEBAR_KEY, String(collapsed)); } catch { /* Navigation remains usable when persistence is unavailable. */ } }, [collapsed]);

  const availableApps = [...(apps.data?.data || [])];
  if (appId && !availableApps.some(app => String(app.id) === appId)) availableApps.unshift({ id: appId, appName: appName || appId });
  const all = [...workspaceNavigation, ...managementNavigation, { path: '/admin/personal', zh: '个人设置', en: 'My profile', icon: User }];
  const openCommands = () => { setSearch(''); setCommand(true); };
  const changeScope = (next: NavigationScope) => { if (next !== scope && (next === 'organization' || appId)) navigate(lastRoute.current[next]); };
  const renderNavigation = (compact: boolean) => <>
    <Link className="brand" to={appId ? '/oms/home' : '/admin/app'} aria-label="PowerJob" onClick={() => setMobile(false)}>
      <div className="brand-mark"><Zap size={22} fill="currentColor" aria-hidden="true"/></div><span>PowerJob</span>
    </Link>
    <div className="scope-switcher" aria-label={t('导航范围', 'Navigation scope')}>
      {([{ key: 'workspace', zh: '工作区', en: 'Workspace', icon: Layers }, { key: 'organization', zh: '组织管理', en: 'Organization', icon: Shield }] as const).map(item => <Tooltip key={item.key} title={item.key === 'workspace' && !appId ? t('先在应用管理中选择一个应用', 'Select an application in Applications first') : compact ? t(item.zh, item.en) : undefined} placement="right">
        <button type="button" aria-label={t(item.zh, item.en)} aria-pressed={scope === item.key} disabled={item.key === 'workspace' && !appId} className={scope === item.key ? 'selected' : ''} onClick={() => changeScope(item.key)}><item.icon size={16} aria-hidden="true"/><span>{t(item.zh, item.en)}</span></button>
      </Tooltip>)}
    </div>
    <div className="nav-scroll"><nav aria-label={scope === 'workspace' ? t('工作区功能', 'Workspace navigation') : t('组织管理功能', 'Organization navigation')}>
      {(scope === 'workspace' ? workspaceNavigation : managementNavigation).map(item => <Tooltip key={item.path} title={compact ? t(item.zh, item.en) : undefined} placement="right"><Link aria-label={t(item.zh, item.en)} aria-current={active?.path === item.path ? 'page' : undefined} className={`nav-item ${active?.path === item.path ? 'active' : ''}`} to={item.path} onClick={() => setMobile(false)}><item.icon size={18} aria-hidden="true"/><span>{t(item.zh, item.en)}</span></Link></Tooltip>)}
    </nav></div>
    <div className="nav-footer"><Tooltip title={compact ? t('快捷导航', 'Quick navigation') : undefined} placement="right"><button type="button" aria-label={t('快捷导航', 'Quick navigation')} onClick={openCommands}><Command size={16} aria-hidden="true"/><span>{t('快捷导航', 'Quick navigation')}</span><kbd>⌘ K</kbd></button></Tooltip>
      {!compact && <span className="nav-version">PowerJob Console</span>}
    </div>
  </>;

  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); const main = document.getElementById('main-content'); main?.focus({ preventScroll: true }); main?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{t('跳到主内容', 'Skip to content')}</a>
    <aside id="desktop-navigation" className="sidebar">{renderNavigation(collapsed)}</aside>
    <Drawer title={t('导航', 'Navigation')} placement="left" size={250} open={mobile} onClose={() => setMobile(false)} styles={{ body: { padding: 0 } }} className="mobile-nav">{renderNavigation(false)}</Drawer>
    <div className="workspace"><header className="topbar">
      <div className="topbar-location">
        <Tooltip title={collapsed ? t('展开导航', 'Expand navigation') : t('收起导航', 'Collapse navigation')}><Button className="desktop-menu" type="text" aria-label={collapsed ? t('展开导航', 'Expand navigation') : t('收起导航', 'Collapse navigation')} aria-controls="desktop-navigation" aria-expanded={!collapsed} icon={collapsed ? <PanelLeftOpen size={19}/> : <PanelLeftClose size={19}/>} onClick={() => setCollapsed(value => !value)}/></Tooltip>
        <Button className="mobile-menu" type="text" aria-label={t('打开导航', 'Open navigation')} icon={<Menu size={20}/>} onClick={() => setMobile(true)}/>
        <div className="breadcrumb"><span className="breadcrumb-scope">{location.pathname === '/admin/personal' ? t('账户', 'Account') : scope === 'organization' ? t('组织管理', 'Organization') : t('工作区', 'Workspace')}</span><span>/</span><strong>{active ? t(active.zh, active.en) : t('个人设置', 'My profile')}</strong></div>
      </div>
      <div className="topbar-controls">
        {scope === 'workspace' && location.pathname !== '/admin/personal' && <div className="app-switcher"><Layers size={16} aria-hidden="true"/><Select aria-label={t('当前应用', 'Current application')} value={appId || undefined} placeholder={t('选择应用', 'Select application')} variant="borderless" popupMatchSelectWidth={300} showSearch optionFilterProp="label" options={availableApps.map(app => ({ value: String(app.id), label: app.appName }))} onChange={id => { const selected = availableApps.find(app => String(app.id) === id); if (selected) { setApp(selected); navigate('/oms/home'); } }}/></div>}
        <Tooltip title={t('切换语言', 'Change language')}><Button type="text" aria-label={t('切换语言', 'Change language')} icon={<Globe size={18}/>} onClick={() => setLanguage(language === 'en' ? 'cn' : 'en')}/></Tooltip>
        <Dropdown trigger={['click']} menu={{ items: [{ key: 'profile', label: t('个人设置', 'My profile'), icon: <User size={15}/> }, { type: 'divider' }, { key: 'logout', label: t('退出登录', 'Sign out'), icon: <LogOut size={15}/> }], onClick: ({ key }) => key === 'logout' ? logout() : navigate('/admin/personal') }}><button className="user-menu" type="button" aria-label={t('账户菜单', 'Account menu')}><Avatar size={30} style={{ background: '#e9edfb', color: '#315ae8' }}>{(user?.nick || user?.username || 'P').slice(0, 1)}</Avatar><span>{user?.nick || user?.username || t('我的账户', 'Account')}</span><ChevronDown size={13} aria-hidden="true"/></button></Dropdown>
      </div>
    </header><main id="main-content" tabIndex={-1} className="main-content" style={{ scrollMarginTop: 76 }}><Outlet key={appId}/></main></div>
    <Modal title={t('快捷导航', 'Quick navigation')} open={command} onCancel={() => setCommand(false)} footer={null}><Input autoFocus prefix={<Search size={17}/>} aria-label={t('搜索页面', 'Search pages')} placeholder={t('输入页面名称…', 'Type a page name…')} value={search} onChange={event => setSearch(event.target.value)}/><div className="command-list">{all.filter(item => (item.zh + item.en).toLowerCase().includes(search.toLowerCase())).map(item => <button key={item.path} type="button" onClick={() => { navigate(item.path); setCommand(false); }}><item.icon size={18} aria-hidden="true"/>{t(item.zh, item.en)}<span className="command-scope">{item.path === '/admin/personal' ? t('账户', 'Account') : item.path.startsWith('/oms') ? t('工作区', 'Workspace') : t('组织', 'Organization')}</span><ArrowLeftRight size={14} aria-hidden="true"/></button>)}</div></Modal>
  </div>;
}
