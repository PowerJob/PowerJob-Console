import { useEffect, useState } from 'react';
import { App, Avatar, Button, Form, Select } from 'antd';
import { ShieldCheck } from 'lucide-react';
import { api, type DataRecord } from '../lib/api';
import { useConsole } from '../lib/console';
import { EnumTag } from '../lib/enums';
import { useSessionQuery, useSessionScope } from '../lib/sessionScope';
import { ErrorState, PageHeader, Panel, RefreshButton } from '../components/ui';
import './admin.css';

export default function System() {
  const { t } = useConsole();
  const { message } = App.useApp();
  const scope = useSessionScope();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const admins = useSessionQuery(scope, () => api.get<(string | number)[]>('/auth/listGlobalAdmin', undefined, scope.options));
  const users = useSessionQuery(scope, () => api.get<DataRecord[]>('/user/list', undefined, scope.options));
  useEffect(() => { form.resetFields(); setSaving(false); }, [scope, form]);
  useEffect(() => { if (admins.data) form.setFieldsValue({ admin: admins.data.map(String) }); }, [admins.data, form]);
  const save = async ({ admin }: { admin: string[] }) => {
    if (saving || !scope.current() || !admins.data) return;
    setSaving(true);
    try { await api.post('/auth/saveGlobalAdmin', { admin }, scope.options); if (scope.current()) { void message.success(t('全局管理员已更新', 'Global administrators updated')); await admins.refresh(); } } catch { /* Keep the chosen list for correction after rejection. */ } finally { if (scope.current()) setSaving(false); }
  };
  return <>
    <PageHeader title={t('系统设置', 'System settings')} description={t('管理全局管理员，统一维护所有空间与应用。', 'Manage administrators with access to all namespaces and applications.')} actions={<RefreshButton loading={admins.loading || users.loading} onClick={() => { void admins.refresh(); void users.refresh(); }}/>}/>
    <Panel title={t('全局管理员', 'Global administrators')} className="system-panel">
      <div className="system-access-note"><span className="resource-symbol"><ShieldCheck size={22}/></span><div><h3>{t('全局管理权限', 'Global administrator access')}</h3><p>{t('全局管理员可以管理所有应用、命名空间、用户和权限。请至少保留一位管理员。', 'Global administrators manage all applications, namespaces, users and permissions. Keep at least one administrator.')}</p></div></div>
      <ErrorState error={admins.error || users.error} retry={() => { void admins.refresh(); void users.refresh(); }}/>
      <Form name="system-global-admin" form={form} layout="vertical" onFinish={save} className="global-admin-form" disabled={saving || admins.loading}>
        <Form.Item name="admin" label={t('管理员成员', 'Administrator members')} rules={[{ required: true, type: 'array', min: 1, message: t('至少保留一位全局管理员', 'Keep at least one global administrator') }]}><Select mode="multiple" aria-label={t('全局管理员', 'Global administrators')} showSearch optionFilterProp="label" loading={users.loading || admins.loading} placeholder={t('选择管理员成员', 'Select administrator members')} options={(users.data || []).map(user => ({ value: String(user.id), label: user.showName || user.username || String(user.id) }))}/></Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>{t('保存管理员', 'Save administrators')}</Button>
      </Form>
      <div className="current-admins">{(admins.data || []).map(id => { const user = (users.data || []).find(value => String(value.id) === String(id)); return <div className="current-admin" key={String(id)}><Avatar size={34}>{(user?.nick || user?.username || '?').slice(0, 1).toUpperCase()}</Avatar><div><strong>{user?.showName || user?.username || `#${id}`}</strong><span>{t('全局管理员', 'Global administrator')}</span></div><EnumTag kind="role" value="ADMIN"/></div>; })}</div>
    </Panel>
  </>;
}
