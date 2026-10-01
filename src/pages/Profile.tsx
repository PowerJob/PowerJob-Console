import { useEffect, useState } from 'react';
import { App, Avatar, Button, Descriptions, Form, Input, Modal, Space, Spin, Tag } from 'antd';
import { KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { api, type DataRecord } from '../lib/api';
import { useConsole } from '../lib/console';
import { useQuery } from '../lib/hooks';
import { ErrorState, PageHeader, Panel, RefreshButton } from '../components/ui';
import './admin.css';

export default function Profile() {
  const { t, logout, refreshSession } = useConsole();
  const { message } = App.useApp();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [grantForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [granting, setGranting] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const profile = useQuery(() => api.get<DataRecord>('/user/detail'));
  const user = profile.data;
  useEffect(() => { if (user) profileForm.setFieldsValue(user); }, [user, profileForm]);
  const saveProfile = async (values: DataRecord) => {
    if (saving) return;
    setSaving(true);
    try { await api.post('/user/modify', { id: user?.id, ...values }); void message.success(t('个人信息已保存', 'Profile saved')); await profile.refresh(); await refreshSession(); } catch { /* Leave the submitted values in the form. */ } finally { setSaving(false); }
  };
  const changePassword = async (values: DataRecord) => {
    if (changingPassword) return;
    setChangingPassword(true);
    try { await api.post('/pwjbUser/changePassword', { username: user?.originUsername, ...values }); void message.success(t('密码已修改，请重新登录', 'Password changed. Please sign in again.')); setPasswordOpen(false); logout(); } catch { /* Keep the password form open on validation or authentication failure. */ } finally { setChangingPassword(false); }
  };
  const grantAdmin = async (values: DataRecord) => {
    if (granting) return;
    setGranting(true);
    try { await api.post('/appInfo/becomeAdmin', values); void message.success(t('已获得应用管理权限', 'Application administrator access granted')); grantForm.resetFields(); await profile.refresh(); } catch { /* The server owns the grant decision. */ } finally { setGranting(false); }
  };
  const roleLabel = (role: string) => ({ OBSERVER: t('观察者', 'Observer'), QA: t('质量保障', 'QA'), DEVELOPER: t('开发者', 'Developer'), ADMIN: t('管理员', 'Administrator') }[role] || role);
  return <>
    <PageHeader title={t('个人设置', 'Profile')} description={t('维护个人资料、通知方式与访问权限。', 'Manage your profile, notification preferences and access.')} actions={<RefreshButton loading={profile.loading} onClick={() => void profile.refresh()}/>}/>
    <ErrorState error={profile.error} retry={() => void profile.refresh()}/>
    {profile.loading && !user ? <div className="admin-loading"><Spin /></div> : user && <div className="profile-grid">
      <Panel title={t('个人信息', 'Personal information')}>
        <div className="profile-summary"><Avatar size={58} icon={<UserRound size={25}/>} /><div><h2>{user.nick || user.username}</h2><p>{user.username}</p></div><Tag>{user.accountType}</Tag></div>
        <Descriptions size="small" column={1} className="profile-identifiers" items={[
          { key: 'id', label: 'ID', children: String(user.id) },
          { key: 'origin', label: t('原始账号', 'Original account'), children: user.originUsername || '—' },
          { key: 'roles', label: t('全局角色', 'Global roles'), children: (user.globalRoles || []).length ? <Space wrap>{user.globalRoles.map((role: string) => <Tag key={role} color="blue">{roleLabel(role)}</Tag>)}</Space> : t('普通用户', 'Member') },
        ]}/>
        <Form name="profile-details" form={profileForm} layout="vertical" className="profile-form" onFinish={saveProfile}>
          <Form.Item name="nick" label={t('昵称', 'Nickname')}><Input autoComplete="nickname" /></Form.Item>
          <Form.Item name="phone" label={t('手机号', 'Phone number')}><Input autoComplete="tel" /></Form.Item>
          <Form.Item name="email" label={t('邮箱', 'Email')} rules={[{ type: 'email', message: t('请输入正确的邮箱地址', 'Enter a valid email address') }]}><Input autoComplete="email" /></Form.Item>
          <Form.Item name="webHook" label={t('通知 Webhook', 'Notification webhook')}><Input placeholder="https://…" /></Form.Item>
          <Space wrap><Button type="primary" htmlType="submit" loading={saving}>{t('保存个人信息', 'Save profile')}</Button>{user.accountType === 'PWJB' && <Button icon={<KeyRound size={15}/>} onClick={() => { passwordForm.resetFields(); setPasswordOpen(true); }}>{t('修改密码', 'Change password')}</Button>}</Space>
        </Form>
      </Panel>
      <div className="profile-secondary">
        <Panel title={t('访问权限', 'Access permissions')}>
          <div className="permission-summary"><ShieldCheck size={20}/><p>{t('以下权限由管理员授予，或通过应用密码验证获取。', 'Access is granted by administrators or by verifying an application password.')}</p></div>
          {['role2NamespaceList', 'role2AppList'].map(key => <section className="permission-list" key={key}><h3>{key === 'role2NamespaceList' ? t('命名空间', 'Namespaces') : t('应用', 'Applications')}</h3>
            {Object.entries(user[key] || {}).some(([, items]) => Array.isArray(items) && items.length) ? Object.entries(user[key] || {}).flatMap(([role, items]) => (items as DataRecord[]).map(item => <div className="permission-item" key={`${role}-${item.id}`}><span>{item.name || item.title || item.appName || item.code}<small>#{item.id}</small></span><Tag>{roleLabel(role)}</Tag></div>)) : <span className="muted">{t('暂无直接授权', 'No direct grants')}</span>}
          </section>)}
        </Panel>
        <Panel title={t('获取应用管理权', 'Claim application access')}>
          <p className="form-section-note">{t('使用应用名称与应用密码，验证后成为该应用管理员。', 'Verify the application code and password to become its administrator.')}</p>
          <Form name="profile-application-access" form={grantForm} layout="vertical" onFinish={grantAdmin}>
            <Form.Item name="appName" label={t('应用名称', 'Application code')} rules={[{ required: true, message: t('请输入应用名称', 'Enter an application code') }]}><Input /></Form.Item>
            <Form.Item name="password" label={t('应用密码', 'Application password')} rules={[{ required: true, message: t('请输入应用密码', 'Enter an application password') }]}><Input.Password autoComplete="off" /></Form.Item>
            <Button loading={granting} htmlType="submit" icon={<ShieldCheck size={15}/>} block>{t('验证并获取权限', 'Verify and claim access')}</Button>
          </Form>
        </Panel>
      </div>
    </div>}
    <Modal title={t('修改密码', 'Change password')} open={passwordOpen} onCancel={() => setPasswordOpen(false)} destroyOnHidden footer={<Space><Button onClick={() => setPasswordOpen(false)}>{t('取消', 'Cancel')}</Button><Button type="primary" loading={changingPassword} onClick={() => passwordForm.submit()}>{t('确认修改', 'Change password')}</Button></Space>}>
      <p className="form-section-note">{t('修改成功后需要重新登录。', 'You will sign in again after changing your password.')}</p>
      <Form name="profile-password" form={passwordForm} layout="vertical" onFinish={changePassword}>
        <Form.Item label={t('账号', 'Account')}><Input value={user?.originUsername} readOnly /></Form.Item>
        <Form.Item name="oldPassword" label={t('当前密码', 'Current password')} rules={[{ required: true, message: t('请输入当前密码', 'Enter your current password') }]}><Input.Password autoComplete="current-password" /></Form.Item>
        <Form.Item name="newPassword" label={t('新密码', 'New password')} rules={[{ required: true, message: t('请输入新密码', 'Enter a new password') }]}><Input.Password autoComplete="new-password" /></Form.Item>
        <Form.Item name="newPassword2" label={t('确认新密码', 'Confirm new password')} dependencies={['newPassword']} rules={[{ required: true, message: t('请再次输入新密码', 'Confirm your new password') }, ({ getFieldValue }) => ({ validator: (_, value) => !value || getFieldValue('newPassword') === value ? Promise.resolve() : Promise.reject(new Error(t('两次输入的密码不一致', 'The passwords do not match'))) })]}><Input.Password autoComplete="new-password" /></Form.Item>
      </Form>
    </Modal>
  </>;
}
