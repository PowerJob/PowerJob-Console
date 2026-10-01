import { useMemo, useState } from 'react';
import { Alert, App, Avatar, Button, Form, Input, Modal, Select, Space, Switch, Table, Tag } from 'antd';
import { Search, UsersRound } from 'lucide-react';
import { api, type DataRecord } from '../lib/api';
import { useConsole } from '../lib/console';
import { useQuery } from '../lib/hooks';
import { ErrorState, PageHeader, Panel, RefreshButton } from '../components/ui';
import './admin.css';

export default function Users() {
  const { t } = useConsole();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [query, setQuery] = useState<DataRecord>({});
  const [pending, setPending] = useState<string[]>([]);
  const [editing, setEditing] = useState<DataRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const users = useQuery(() => api.post<DataRecord[]>('/user/query', query), [query]);
  const providers = useQuery(() => api.get<DataRecord[]>('/auth/supportLoginTypes'));
  const accountTypes = useMemo(() => {
    const types = new Map<string, string>();
    for (const provider of providers.data || []) {
      if (provider.type) types.set(String(provider.type), provider.name ? `${provider.type} · ${provider.name}` : String(provider.type));
    }
    for (const user of users.data || []) {
      if (user.accountType && !types.has(String(user.accountType))) types.set(String(user.accountType), String(user.accountType));
    }
    if (query.accountTypeEq && !types.has(String(query.accountTypeEq))) types.set(String(query.accountTypeEq), String(query.accountTypeEq));
    return Array.from(types, ([value, label]) => ({ value, label }));
  }, [providers.data, users.data, query.accountTypeEq]);
  const edit = (user: DataRecord) => {
    editForm.resetFields();
    editForm.setFieldsValue({ id: String(user.id), username: user.username, nick: user.nick, phone: user.phone, email: user.email, webHook: user.webHook, extra: user.extra });
    setEditError(''); setEditing(user);
  };
  const save = async (values: DataRecord) => {
    if (saving || !editing) return;
    const id = editing.id;
    setSaving(true); setEditError('');
    try {
      await api.post('/user/modify', { id, nick: values.nick, phone: values.phone, email: values.email, webHook: values.webHook, extra: values.extra });
      void message.success(t('用户信息已保存', 'User details saved')); setEditing(null); await users.refresh();
    } catch (failure) { setEditError((failure as Error).message); }
    finally { setSaving(false); }
  };
  const changeStatus = async (user: DataRecord, enabled: boolean) => {
    const id = String(user.id); setPending(previous => [...previous, id]);
    try { await api.post(enabled ? '/user/enable' : '/user/disable', undefined, { params: { uid: id } }); void message.success(enabled ? t('用户已启用', 'User enabled') : t('用户已禁用', 'User disabled')); await users.refresh(); } catch { /* Controlled switches retain the last confirmed server state. */ } finally { setPending(previous => previous.filter(value => value !== id)); }
  };
  return <>
    <PageHeader title={t('用户管理', 'Users')} description={t('查看账号与联系方式，管理用户访问状态。', 'Review accounts and contact details, and manage user access.')} actions={<RefreshButton loading={users.loading} onClick={() => void users.refresh()}/>}/>
    <Panel><Form name="user-filter" form={form} className="admin-query-form" layout="inline" onFinish={values => setQuery({ ...values, accountTypeEq: values.accountTypeEq || undefined })}>
      <Form.Item name="accountTypeEq"><Select aria-label={t('账号类型', 'Account type')} placeholder={t('全部账号类型', 'All account types')} allowClear showSearch optionFilterProp="label" style={{ minWidth: 170 }} loading={providers.loading} options={accountTypes}/></Form.Item>
      <Form.Item name="nickLike"><Input aria-label={t('昵称', 'Nickname')} placeholder={t('搜索用户昵称', 'Search nickname')} prefix={<Search size={15}/>} allowClear /></Form.Item>
      <Form.Item name="userIdEq"><Input aria-label={t('用户 ID', 'User ID')} placeholder={t('用户 ID', 'User ID')} allowClear /></Form.Item>
      <Form.Item name="phoneLike"><Input aria-label={t('手机号', 'Phone number')} placeholder={t('手机号', 'Phone number')} allowClear /></Form.Item>
      <Space><Button htmlType="submit">{t('查询', 'Search')}</Button><Button type="text" onClick={() => { form.resetFields(); setQuery({}); }}>{t('重置', 'Reset')}</Button></Space>
    </Form><ErrorState error={users.error} retry={() => void users.refresh()}/><Table rowKey={row => String(row.id)} dataSource={users.data || []} loading={users.loading} scroll={{ x: 1150 }} pagination={{ pageSize: 20, showSizeChanger: true, showTotal: total => t(`共 ${total} 位用户`, `${total} users`) }} columns={[
      { title: t('用户', 'User'), key: 'user', width: 270, render: (_: unknown, row: DataRecord) => <div className="resource-cell"><Avatar icon={<UsersRound size={16}/>} className="user-avatar">{(row.nick || row.username || '?').slice(0, 1).toUpperCase()}</Avatar><div><strong>{row.nick || row.username}</strong><span>{row.username}</span></div></div> },
      { title: 'ID', dataIndex: 'id', width: 100 },
      { title: t('账号类型', 'Account type'), dataIndex: 'accountType', width: 120, render: (value: string) => <Tag>{value}</Tag> },
      { title: t('手机号', 'Phone'), dataIndex: 'phone', width: 170, render: (value: string) => value || '—' },
      { title: t('邮箱', 'Email'), dataIndex: 'email', width: 240, render: (value: string) => value || '—' },
      { title: t('访问状态', 'Access'), key: 'status', width: 140, render: (_: unknown, row: DataRecord) => <Switch aria-label={t(`启用用户 ${row.username}`, `Enable user ${row.username}`)} checked={Boolean(row.enable)} loading={pending.includes(String(row.id))} checkedChildren={t('启用', 'Enabled')} unCheckedChildren={t('禁用', 'Disabled')} onChange={enabled => void changeStatus(row, enabled)}/> },
      { title: t('操作', 'Actions'), key: 'actions', width: 100, render: (_: unknown, row: DataRecord) => <Button size="small" onClick={() => edit(row)}>{t('编辑', 'Edit')}</Button> },
    ]}/></Panel>
    <Modal title={t('编辑用户', 'Edit user')} open={editing !== null} onCancel={() => setEditing(null)} destroyOnHidden closable={!saving} mask={{ closable: !saving }} keyboard={!saving} footer={<Space><Button disabled={saving} onClick={() => setEditing(null)}>{t('取消', 'Cancel')}</Button><Button type="primary" loading={saving} onClick={() => editForm.submit()}>{t('保存用户', 'Save user')}</Button></Space>}>
      {editError && (
        <Alert type="error" showIcon title={editError} style={{ marginBottom: 16 }}/>
      )}
      <p className="form-section-note">{t('留空的字段将保留当前值。', 'Fields left blank keep their current values.')}</p>
      <Form name="users-edit" form={editForm} layout="vertical" onFinish={save}>
        <Form.Item name="id" label="ID"><Input readOnly /></Form.Item>
        <Form.Item name="username" label={t('用户名', 'Username')}><Input readOnly autoComplete="off" /></Form.Item>
        <Form.Item name="nick" label={t('昵称', 'Nickname')}><Input autoComplete="off" /></Form.Item>
        <Form.Item name="phone" label={t('手机号', 'Phone number')}><Input autoComplete="off" /></Form.Item>
        <Form.Item name="email" label={t('邮箱', 'Email')}><Input autoComplete="off" /></Form.Item>
        <Form.Item name="webHook" label={t('通知 Webhook', 'Notification webhook')} extra={t('填写新地址以更新通知配置；留空保留原值。', 'Enter a new URL to update notifications, or leave blank to keep the current value.')}><Input /></Form.Item>
        <Form.Item name="extra" label={t('扩展配置', 'Extra configuration')} extra={t('填写新配置以更新；留空保留原值。', 'Enter new configuration to update it, or leave blank to keep the current value.')}><Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }}/></Form.Item>
      </Form>
    </Modal>
  </>;
}
