import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Button, Drawer, Form, Input, Select, Space, Switch, Table, Tabs, Tag, Typography } from 'antd';
import { ArrowUpRight, Boxes, Plus, Search } from 'lucide-react';
import { api, type DataRecord, type PageResult } from '../lib/api';
import { useConsole } from '../lib/console';
import { useQuery } from '../lib/hooks';
import { ErrorState, PageHeader, Panel, RefreshButton } from '../components/ui';
import RoleEditor, { emptyRoles, normalizeRoles } from './RoleEditor';
import './admin.css';

const initialQuery = { appId: undefined, appNameLike: undefined, namespaceId: undefined, tagLike: undefined, showMyRelated: true, index: 0, pageSize: 10 };
export default function Applications() {
  const { t, setApp, appId } = useConsole();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [queryForm] = Form.useForm();
  const [form] = Form.useForm();
  const [query, setQuery] = useState<DataRecord>(initialQuery);
  const [editing, setEditing] = useState<DataRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const apps = useQuery(() => api.post<PageResult>('/appInfo/list', query), [query]);
  const namespaces = useQuery(() => api.post<DataRecord[]>('/namespace/listAll'));
  const users = useQuery(() => api.get<DataRecord[]>('/user/list'));
  const edit = (value?: DataRecord) => {
    const next = value ? { ...value, namespaceId: value.namespaceId == null ? undefined : String(value.namespaceId), componentUserRoleInfo: normalizeRoles(value.componentUserRoleInfo) } : { componentUserRoleInfo: emptyRoles() };
    form.resetFields(); form.setFieldsValue(next); setEditing(next);
  };
  const save = async (values: DataRecord) => {
    if (busy) return;
    setBusy(true);
    try {
      await api.post('/appInfo/save', { ...editing, ...values }, { headers: { AppId: editing?.id == null ? '' : String(editing.id) } });
      void message.success(t('应用已保存', 'Application saved')); setEditing(null); await apps.refresh();
    } catch { /* Keep the editable fields available for correction. */ } finally { setBusy(false); }
  };
  const remove = (value: DataRecord) => modal.confirm({
    title: t('删除应用', 'Delete application'), content: t(`确认删除应用「${value.appName}」？请先移除在线 Worker。`, `Delete “${value.appName}”? Disconnect its active workers first.`),
    okText: t('删除应用', 'Delete application'), okButtonProps: { danger: true }, cancelText: t('取消', 'Cancel'),
    onOk: async () => { await api.post('/appInfo/delete', {}, { params: { appId: value.id }, headers: { AppId: String(value.id) } }); if (String(value.id) === appId) setApp({ id: '', appName: '' }); setEditing(null); void message.success(t('应用已删除', 'Application deleted')); await apps.refresh(); },
  });
  const columns = [
    { title: t('应用', 'Application'), key: 'app', width: 260, render: (_: unknown, row: DataRecord) => <div className="resource-cell"><span className="resource-symbol"><Boxes size={18}/></span><div><strong>{row.title || row.appName}</strong><span>{row.appName} <Typography.Text type="secondary">#{row.id}</Typography.Text></span></div></div> },
    { title: t('命名空间', 'Namespace'), dataIndex: 'namespaceName', width: 170, render: (name: string) => name || '—' },
    { title: t('标签', 'Tags'), dataIndex: 'tags', width: 160, render: (tags?: string) => tags ? <Space size={[4, 4]} wrap>{tags.split(',').filter(Boolean).map(tag => <Tag key={tag}>{tag}</Tag>)}</Space> : '—' },
    { title: t('创建信息', 'Created'), key: 'created', width: 170, render: (_: unknown, row: DataRecord) => <div className="metadata-cell"><span>{row.gmtCreateStr || '—'}</span><small>{row.creatorShowName || '—'}</small></div> },
    { title: t('更新信息', 'Updated'), key: 'updated', width: 170, render: (_: unknown, row: DataRecord) => <div className="metadata-cell"><span>{row.gmtModifiedStr || '—'}</span><small>{row.modifierShowName || '—'}</small></div> },
    { title: t('操作', 'Actions'), key: 'actions', width: 170, render: (_: unknown, row: DataRecord) => <Space><Button size="small" onClick={() => edit(row)}>{t('编辑', 'Edit')}</Button><Button size="small" type="link" icon={<ArrowUpRight size={14}/>} onClick={() => { setApp(row); navigate('/oms/home'); }}>{t('进入', 'Open')}</Button></Space> },
  ];
  return <>
    <PageHeader title={t('应用管理', 'Applications')} description={t('连接团队、Worker 与任务，让每个应用独立运行。', 'Connect teams, workers and jobs in dedicated application workspaces.')} actions={<Space><RefreshButton loading={apps.loading} onClick={() => void apps.refresh()}/><Button type="primary" icon={<Plus size={16}/>} onClick={() => edit()}>{t('新建应用', 'New application')}</Button></Space>}/>
    <Panel><Form name="application-filter" form={queryForm} initialValues={initialQuery} className="admin-query-form" layout="inline" onFinish={values => setQuery({ ...query, ...values, index: 0 })} onValuesChange={changed => { if ('showMyRelated' in changed) setQuery({ ...query, ...queryForm.getFieldsValue(), index: 0 }); }}>
      <Form.Item name="appNameLike"><Input aria-label={t('应用名称', 'Application code')} placeholder={t('搜索应用名称', 'Search application code')} prefix={<Search size={15}/>} allowClear /></Form.Item>
      <Form.Item name="appId"><Input aria-label={t('应用 ID', 'Application ID')} placeholder={t('应用 ID', 'Application ID')} allowClear /></Form.Item>
      <Form.Item name="namespaceId"><Select aria-label={t('命名空间', 'Namespace')} placeholder={t('全部命名空间', 'All namespaces')} allowClear showSearch optionFilterProp="label" loading={namespaces.loading} options={(namespaces.data || []).map(ns => ({ value: String(ns.id), label: ns.showName || ns.name || ns.code }))}/></Form.Item>
      <Form.Item name="tagLike"><Input aria-label={t('标签', 'Tags')} placeholder={t('标签', 'Tags')} allowClear /></Form.Item>
      <Form.Item label={t('我的应用', 'My applications')} name="showMyRelated" valuePropName="checked"><Switch /></Form.Item>
      <Space><Button htmlType="submit">{t('查询', 'Search')}</Button><Button type="text" onClick={() => { queryForm.resetFields(); setQuery({ ...initialQuery }); }}>{t('重置', 'Reset')}</Button></Space>
    </Form><ErrorState error={apps.error} retry={() => void apps.refresh()}/>
      <Table rowKey={row => String(row.id)} columns={columns} dataSource={apps.data?.data || []} loading={apps.loading} scroll={{ x: 1110 }} pagination={{ current: Number(query.index) + 1, pageSize: Number(query.pageSize), total: apps.data?.totalItems || 0, showSizeChanger: true, showTotal: total => t(`共 ${total} 个应用`, `${total} applications`), onChange: (page, size) => setQuery({ ...query, index: page - 1, pageSize: size }) }}/>
    </Panel>
    <Drawer title={editing?.id ? t('编辑应用', 'Edit application') : t('新建应用', 'New application')} open={editing !== null} onClose={() => setEditing(null)} size={680} destroyOnHidden footer={<div className="drawer-footer"><div>{editing?.id && <Button danger onClick={() => remove(editing)}>{t('删除应用', 'Delete application')}</Button>}</div><Space><Button onClick={() => setEditing(null)}>{t('取消', 'Cancel')}</Button><Button type="primary" loading={busy} onClick={() => form.submit()}>{t('保存应用', 'Save application')}</Button></Space></div>}>
      <Form name={editing?.id == null ? 'applications-create' : 'applications-edit'} form={form} layout="vertical" onFinish={save} preserve><Tabs items={[
        { key: 'base', label: t('基本信息', 'General'), children: <>
          <Form.Item name="namespaceId" label={t('命名空间', 'Namespace')} rules={[{ required: true, message: t('请选择命名空间', 'Select a namespace') }]}><Select aria-label={editing?.id == null ? t('新建应用命名空间', 'New application namespace') : t('编辑应用命名空间', 'Edit application namespace')} showSearch optionFilterProp="label" placeholder={t('选择命名空间', 'Select a namespace')} options={(namespaces.data || []).map(ns => ({ value: String(ns.id), label: ns.showName || ns.name || ns.code }))}/></Form.Item>
          <Form.Item name="appName" label={t('应用编码', 'Application code')} extra={t('Worker 使用此名称接入应用，创建后不可修改。', 'Workers connect using this code. It cannot be changed after creation.')} rules={[{ required: true, message: t('请输入应用编码', 'Enter an application code') }, { pattern: /^\S+$/, message: t('应用编码不能包含空格', 'Application code cannot contain spaces') }]}><Input disabled={editing?.id != null}/></Form.Item>
          <Form.Item name="title" label={t('显示名称', 'Display name')}><Input /></Form.Item>
          <Form.Item name="password" label={t('应用密码', 'Application password')} rules={[{ required: true, message: t('请输入应用密码', 'Enter an application password') }]}><Input.Password autoComplete="new-password" /></Form.Item>
          <Form.Item name="tags" label={t('标签', 'Tags')} extra={t('多个标签用英文逗号分隔。', 'Separate multiple tags with commas.')}><Input /></Form.Item>
          <Form.Item name="extra" label={t('扩展配置', 'Extra configuration')}><Input.TextArea autoSize={{ minRows: 4, maxRows: 10 }}/></Form.Item>
        </> },
        { key: 'permissions', label: t('成员权限', 'Member permissions'), children: <><p className="form-section-note">{t('为团队成员分配与职责匹配的权限。', 'Assign permissions that match each member’s responsibilities.')}</p><ErrorState error={users.error} retry={() => void users.refresh()}/><Form.Item name="componentUserRoleInfo"><RoleEditor users={users.data || []}/></Form.Item></> },
      ]}/></Form>
    </Drawer>
  </>;
}
