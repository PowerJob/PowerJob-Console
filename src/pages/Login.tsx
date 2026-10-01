import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, App, Button, Form, Input, Modal, Segmented, Space, Spin } from 'antd';
import { ArrowLeft, ArrowRight, Boxes, CircleCheck, Globe2, Workflow } from 'lucide-react';
import { api, type DataRecord } from '../lib/api';
import { useConsole } from '../lib/console';
import { useQuery } from '../lib/hooks';
import './admin.css';

export default function Login() {
  const { t, language, setLanguage, refreshSession } = useConsole();
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [providerBusy, setProviderBusy] = useState('');
  const [registering, setRegistering] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const internal = location.pathname === '/powerjobLogin';
  const providers = useQuery(() => api.get<DataRecord[]>('/auth/supportLoginTypes'));
  const finishLogin = async (result: DataRecord) => {
    if (!result?.jwtToken) throw new Error(t('登录响应缺少有效凭证，请重试', 'The sign-in response did not include a session. Please retry.'));
    localStorage.setItem('PowerJwt', result.jwtToken);
    await refreshSession(); navigate('/admin/app', { replace: true });
  };
  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const callback = window.location.search;
        if (callback) {
          const result = await api.get<DataRecord>(`/auth/thirdPartyLoginCallback${callback}`);
          if (!active) return;
          window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
          await finishLogin(result);
        } else {
          const result = await api.get<DataRecord | null>('/auth/ifLogin', undefined, { quiet: true });
          if (result && active) { await refreshSession(); navigate('/admin/app', { replace: true }); }
        }
      } catch (failure) { if (active) setError((failure as Error).message); }
      finally { if (active) setChecking(false); }
    };
    void initialize();
    return () => { active = false; };
  }, []);
  const directLogin = (username: string, password: string) => api.post<DataRecord>('/auth/thirdPartyLoginDirect', { loginType: 'PWJB', originParams: JSON.stringify({ username, password, encryption: 'none' }) });
  const login = async ({ username, password }: { username: string; password: string }) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await finishLogin(await directLogin(username, password)); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  };
  const openProvider = async (provider: DataRecord) => {
    if (providerBusy) return;
    setProviderBusy(provider.type); setError('');
    try {
      const result = String(await api.get('/auth/thirdPartyLoginUrl', { type: provider.type }));
      if (result.startsWith('FE-REDIRECT:')) { navigate(`/${result.slice('FE-REDIRECT:'.length).replace(/^\/+/, '')}`); return; }
      window.location.assign(result);
    } catch (failure) { setError((failure as Error).message); }
    finally { setProviderBusy(''); }
  };
  const register = async (values: DataRecord) => {
    if (registering) return;
    setRegistering(true);
    try {
      await api.post('/pwjbUser/create', values);
      // The first direct login creates the framework User for the built-in account.
      await directLogin(values.username, values.password);
      setRegisterOpen(false); registerForm.resetFields(); loginForm.setFieldsValue({ username: values.username, password: '' });
      void message.success(t('账号已创建，请登录', 'Account created. You can sign in now.'));
    } catch { /* Registration errors retain the fields and stay visible. */ } finally { setRegistering(false); }
  };
  return <main className="login-page">
    <section className="login-brand-panel" aria-label="PowerJob">
      <a className="login-logo" href="#/loginHomepage"><span className="login-logo-symbol"><Workflow size={24}/></span><strong>PowerJob</strong></a>
      <div className="login-brand-content"><h1>{t('让任务协同，\n让计算发生。', 'Orchestrate work.\nMake things happen.')}</h1><p>{t('从一次调度到复杂工作流，为团队提供可靠的分布式任务引擎。', 'A reliable distributed engine for every scheduled job and complex workflow.')}</p>
        <div className="login-flow" aria-hidden="true"><div className="login-flow-node source"><Boxes size={19}/><span>Schedule</span></div><div className="login-flow-connection"/><div className="login-flow-stack"><div className="login-flow-node"><CircleCheck size={17}/><span>Worker 01</span></div><div className="login-flow-node"><CircleCheck size={17}/><span>Worker 02</span></div><div className="login-flow-node"><CircleCheck size={17}/><span>Worker 03</span></div></div></div>
      </div><div className="login-brand-footer"><span>{t('分布式调度与计算', 'Distributed scheduling & computing')}</span><span>PowerJob Console</span></div>
    </section>
    <section className="login-form-panel">
      <div className="login-language"><Globe2 size={16}/><Segmented size="small" value={language} onChange={value => setLanguage(String(value))} options={[{ label: '中文', value: 'cn' }, { label: 'English', value: 'en' }]}/></div>
      <div className="login-form-content">
        {internal && <Button className="login-back" type="text" icon={<ArrowLeft size={15}/>} onClick={() => navigate('/loginHomepage')}>{t('所有登录方式', 'All sign-in methods')}</Button>}
        <h2>{t('欢迎回来', 'Welcome back')}</h2><p className="login-subtitle">{internal ? t('使用 PowerJob 账号登录您的工作空间。', 'Sign in to your workspace with your PowerJob account.') : t('选择登录方式，开始管理您的任务。', 'Choose a sign-in method to manage your jobs.')}</p>
        {error && <Alert className="login-error" type="error" showIcon title={error} closable onClose={() => setError('')}/>}
        {checking ? <div className="login-checking"><Spin/><p>{t('正在检查登录状态', 'Checking your session')}</p></div> : internal ? <>
          <Form name="powerjob-login" form={loginForm} layout="vertical" onFinish={login} requiredMark={false}>
            <Form.Item name="username" label={t('账号', 'Username')} rules={[{ required: true, message: t('请输入账号', 'Enter your username') }]}><Input autoComplete="username" placeholder={t('您的 PowerJob 账号', 'Your PowerJob username')} size="large" autoFocus /></Form.Item>
            <Form.Item name="password" label={t('密码', 'Password')} rules={[{ required: true, message: t('请输入密码', 'Enter your password') }]}><Input.Password autoComplete="current-password" placeholder={t('输入账号密码', 'Enter your password')} size="large" /></Form.Item>
            <Button htmlType="submit" type="primary" size="large" loading={busy} block icon={<ArrowRight size={17}/>} iconPlacement="end">{t('登录工作空间', 'Sign in')}</Button>
          </Form>
          <div className="login-register-prompt">{t('还没有账号？', 'New to PowerJob?')}<Button type="link" onClick={() => { registerForm.resetFields(); setRegisterOpen(true); }}>{t('创建账号', 'Create an account')}</Button></div>
        </> : <div className="login-providers">{providers.loading ? <Spin/> : providers.error ? <><Alert type="error" title={providers.error.message}/><Button onClick={() => void providers.refresh()}>{t('重新加载', 'Retry')}</Button></> : (providers.data || []).length ? (providers.data || []).map(provider => <Button size="large" key={provider.type} block type={provider.type === 'PWJB' ? 'primary' : 'default'} loading={providerBusy === provider.type} icon={<ArrowRight size={17}/>} iconPlacement="end" onClick={() => void openProvider(provider)}>{provider.name}</Button>) : <Alert type="warning" showIcon title={t('当前服务未配置登录方式，请联系管理员。', 'No sign-in methods are configured. Contact your administrator.')}/>}</div>}
        <div className="login-footer-copy">{t('任务、工作流与团队，在同一个工作空间。', 'Your jobs, workflows and team in one workspace.')}</div>
      </div>
    </section>
    <Modal title={t('创建 PowerJob 账号', 'Create a PowerJob account')} open={registerOpen} onCancel={() => setRegisterOpen(false)} destroyOnHidden width={520} footer={<Space><Button onClick={() => setRegisterOpen(false)}>{t('取消', 'Cancel')}</Button><Button type="primary" loading={registering} onClick={() => registerForm.submit()}>{t('创建账号', 'Create account')}</Button></Space>}>
      <Form name="powerjob-register" form={registerForm} layout="vertical" onFinish={register}>
        <Form.Item name="username" label={t('账号', 'Username')} extra={t('账号是您的唯一标识。', 'Your username uniquely identifies your account.')} rules={[{ required: true, message: t('请输入账号', 'Enter a username') }]}><Input autoComplete="username" /></Form.Item>
        <Form.Item name="nick" label={t('昵称', 'Nickname')}><Input autoComplete="nickname" /></Form.Item>
        <div className="register-contact-grid"><Form.Item name="phone" label={t('手机号', 'Phone number')}><Input autoComplete="tel" /></Form.Item><Form.Item name="email" label={t('邮箱', 'Email')} rules={[{ type: 'email', message: t('请输入正确的邮箱地址', 'Enter a valid email address') }]}><Input autoComplete="email" /></Form.Item></div>
        <Form.Item name="webHook" label={t('通知 Webhook', 'Notification webhook')}><Input /></Form.Item>
        <Form.Item name="password" label={t('密码', 'Password')} rules={[{ required: true, message: t('请输入密码', 'Enter a password') }]}><Input.Password autoComplete="new-password" /></Form.Item>
        <Form.Item name="password2" label={t('确认密码', 'Confirm password')} dependencies={['password']} rules={[{ required: true, message: t('请再次输入密码', 'Confirm your password') }, ({ getFieldValue }) => ({ validator: (_, value) => !value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error(t('两次输入的密码不一致', 'The passwords do not match'))) })]}><Input.Password autoComplete="new-password" /></Form.Item>
      </Form>
    </Modal>
  </main>;
}
