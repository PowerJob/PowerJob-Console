import { useState } from 'react';
import { App, Avatar, Button, Form, Input, Space, Switch, Table, Tag } from 'antd';
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
  const [query, setQuery] = useState<DataRecord>({});
  const [pending, setPending] = useState<string[]>([]);
  const users = useQuery(() => api.post<DataRecord[]>('/user/query', query), [query]);
  const changeStatus = async (user: DataRecord, enabled: boolean) => {
    const id = String(user.id); setPending(previous => [...previous, id]);
    try { await api.post(enabled ? '/user/enable' : '/user/disable', undefined, { params: { uid: id } }); void message.success(enabled ? t('用户已启用', 'User enabled') : t('用户已禁用', 'User disabled')); await users.refresh(); } catch { /* Controlled switches retain the last confirmed server state. */ } finally { setPending(previous => previous.filter(value => value !== id)); }
  };
  return <>
    <PageHeader title={t('用户管理', 'Users')} description={t('查看账号与联系方式，管理用户访问状态。', 'Review accounts and contact details, and manage user access.')} actions={<RefreshButton loading={users.loading} onClick={() => void users.refresh()}/>}/>
    <Panel><Form name="user-filter" form={form} className="admin-query-form" layout="inline" onFinish={setQuery}>
      <Form.Item name="nickLike"><Input aria-label={t('昵称', 'Nickname')} placeholder={t('搜索用户昵称', 'Search nickname')} prefix={<Search size={15}/>} allowClear /></Form.Item>
      <Form.Item name="userIdEq"><Input aria-label={t('用户 ID', 'User ID')} placeholder={t('用户 ID', 'User ID')} allowClear /></Form.Item>
      <Form.Item name="phoneLike"><Input aria-label={t('手机号', 'Phone number')} placeholder={t('手机号', 'Phone number')} allowClear /></Form.Item>
      <Space><Button htmlType="submit">{t('查询', 'Search')}</Button><Button type="text" onClick={() => { form.resetFields(); setQuery({}); }}>{t('重置', 'Reset')}</Button></Space>
    </Form><ErrorState error={users.error} retry={() => void users.refresh()}/><Table rowKey={row => String(row.id)} dataSource={users.data || []} loading={users.loading} scroll={{ x: 870 }} pagination={{ pageSize: 20, showSizeChanger: true, showTotal: total => t(`共 ${total} 位用户`, `${total} users`) }} columns={[
      { title: t('用户', 'User'), key: 'user', width: 270, render: (_: unknown, row: DataRecord) => <div className="resource-cell"><Avatar icon={<UsersRound size={16}/>} className="user-avatar">{(row.nick || row.username || '?').slice(0, 1).toUpperCase()}</Avatar><div><strong>{row.nick || row.username}</strong><span>{row.username}</span></div></div> },
      { title: 'ID', dataIndex: 'id', width: 100 },
      { title: t('账号类型', 'Account type'), dataIndex: 'accountType', width: 120, render: (value: string) => <Tag>{value}</Tag> },
      { title: t('手机号', 'Phone'), dataIndex: 'phone', width: 170, render: (value: string) => value || '—' },
      { title: t('邮箱', 'Email'), dataIndex: 'email', width: 240, render: (value: string) => value || '—' },
      { title: t('访问状态', 'Access'), key: 'status', width: 140, render: (_: unknown, row: DataRecord) => <Switch aria-label={t(`启用用户 ${row.username}`, `Enable user ${row.username}`)} checked={Boolean(row.enable)} loading={pending.includes(String(row.id))} checkedChildren={t('启用', 'Enabled')} unCheckedChildren={t('禁用', 'Disabled')} onChange={enabled => void changeStatus(row, enabled)}/> },
    ]}/></Panel>
  </>;
}
