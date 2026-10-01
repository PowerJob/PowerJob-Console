import { useEffect, useRef, useState, type ReactNode } from 'react';
import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { api, endpoint, type DataRecord } from './api';

import { Context, type ConsoleContext } from './context';
export {useConsole} from './context';
function Feedback({ children }: { children: ReactNode }) {
  const { message } = App.useApp();
  useEffect(() => { const handler = (e: Event) => { void message.error((e as CustomEvent).detail); }; window.addEventListener('powerjob:error', handler); return () => window.removeEventListener('powerjob:error', handler); }, [message]);
  return children;
}
export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [language, changeLanguage] = useState(localStorage.getItem('oms_lang') || 'cn');
  const [app, changeApp] = useState({ id: localStorage.getItem('Power_appId') || '', appName: localStorage.getItem('Power_appName') || '' });
  const [user, setUser] = useState<DataRecord | null>(null);
  const sessionSequence = useRef(0);
  const refreshSession = async () => { const sequence = ++sessionSequence.current; const token = localStorage.getItem('PowerJwt'); const value = await api.get('/auth/ifLogin'); if(sequence === sessionSequence.current && token === localStorage.getItem('PowerJwt')) setUser(value); };
  const logout = () => { ++sessionSequence.current; localStorage.removeItem('PowerJwt'); localStorage.removeItem('Power_appId'); localStorage.removeItem('Power_appName'); const authPath = endpoint('/auth/thirdPartyLoginDirect').pathname.split('/'); const paths = new Set(['/','/auth','/api/auth']); for(let i=1;i<authPath.length;i++) paths.add(authPath.slice(0,i).join('/')||'/'); for(const path of paths) document.cookie = 'PowerJwt=; Max-Age=0; path='+path; changeApp({ id: '', appName: '' }); setUser(null); location.hash = '/loginHomepage'; };
  useEffect(() => { window.addEventListener('powerjob:unauthorized', logout); return () => window.removeEventListener('powerjob:unauthorized', logout); }, []);
  useEffect(() => { const synchronize = (event: StorageEvent) => { if(event.key === 'Power_appId' || event.key === 'Power_appName') changeApp({id:localStorage.getItem('Power_appId')||'',appName:localStorage.getItem('Power_appName')||''}); if(event.key === 'oms_lang') changeLanguage(localStorage.getItem('oms_lang')||'cn'); if(event.key === 'PowerJwt') { ++sessionSequence.current; setUser(null); if(event.newValue) void refreshSession().catch(()=>{}); else logout(); } }; window.addEventListener('storage',synchronize); return()=>window.removeEventListener('storage',synchronize); }, []);
  const value: ConsoleContext = { appId: app.id, appName: app.appName, user, refreshSession, logout, language, t: (zh, en) => language === 'en' ? en || zh : zh, setLanguage: lang => { localStorage.setItem('oms_lang', lang); changeLanguage(lang); }, setApp: selected => { const id = String(selected.id); localStorage.setItem('Power_appId', id); localStorage.setItem('Power_appName', selected.appName || ''); changeApp({ id, appName: selected.appName || '' }); } };
  return <Context.Provider value={value}><ConfigProvider locale={language === 'en' ? enUS : zhCN} theme={{ token: { colorPrimary: '#315ae8', colorText: '#263445', colorTextSecondary: '#617084', colorBgLayout: '#f4f6f9', colorBorder: '#dce2e9', borderRadius: 7, fontSize: 14, controlHeight: 36, fontFamily: '"Inter Variable", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif' }, components: { Table: { headerBg: '#f7f9fb', headerColor: '#647286', cellPaddingBlock: 12 }, Button: { primaryShadow: 'none' }, Menu: { itemBorderRadius: 6 } } }}><App><Feedback>{children}</Feedback></App></ConfigProvider></Context.Provider>;
}
