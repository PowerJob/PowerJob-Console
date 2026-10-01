import { useState } from 'react';
import { App, Button, Drawer, Form, Input, Space, Table, Tabs, Tag } from 'antd';
import { FolderTree, Plus, Search } from 'lucide-react';
import { api, type DataRecord, type PageResult } from '../lib/api';
import { useConsole } from '../lib/console';
import { useQuery } from '../lib/hooks';
import { ErrorState, PageHeader, Panel, RefreshButton } from '../components/ui';
import RoleEditor, { emptyRoles, normalizeRoles } from './RoleEditor';
import './admin.css';

const initialQuery = { codeLike: undefined, nameLike: undefined, tagLike: undefined, index: 0, pageSize: 10 };
export default function Namespaces() {
  const { t } = useConsole();
  const { message, modal } = App.useApp();
  const [queryForm] = Form.useForm();
  const [form] = Form.useForm();
  const [query, setQuery] = useState<DataRecord>(initialQuery);
  const [editing, setEditing] = useState<DataRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const namespaces = useQuery(() => api.post<PageResult>('/namespace/list', query), [query]);
  const users = useQuery(() => api.get<DataRecord[]>('/user/list'));
  const edit = (value?: DataRecord) => {
    const next = value ? { ...value, componentUserRoleInfo: normalizeRoles(value.componentUserRoleInfo) } : { componentUserRoleInfo: emptyRoles() };
    form.resetFields(); form.setFieldsValue(next); setEditing(next);
  };
  const save = async (values: DataRecord) => {
    if (busy) return;
    setBusy(true);
    try { await api.post('/namespace/save', { ...editing, ...values }, { headers: { NamespaceId: editing?.id == null ? '' : String(editing.id) } }); void message.success(t('命名空间已保存', 'Namespace saved')); setEditing(null); await namespaces.refresh(); } catch { /* Retain the form after a rejected save. */ } finally { setBusy(false); }
  };
  const remove = (value: DataRecord) => modal.confirm({ title: t('删除命名空间', 'Delete namespace'), content: t(`确认删除命名空间「${value.name || value.code}」？包含应用的命名空间不能删除。`, `Delete “${value.name || value.code}”? A namespace containing applications cannot be deleted.`), okText: t('删除', 'Delete'), cancelText: t('取消', 'Cancel'), okButtonProps: { danger: true }, onOk: async () => { await api.delete('/namespace/delete', { id: value.id }, { headers: { NamespaceId: String(value.id) } }); void message.success(t('命名空间已删除', 'Namespace deleted')); await namespaces.refresh(); } });
  const columns = [
    { title: t('命名空间', 'Namespace'), key: 'namespace', width: 260, render: (_: unknown, row: DataRecord) => <div className="resource-cell"><span className="resource-symbol violet"><FolderTree size={18}/></span><div><strong>{row.name || row.code}</strong><span>{row.code} <span className="muted">#{row.id}</span></span></div></div> },
    { title: t('状态', 'Status'), key: 'status', width: 110, render: (_: unknown, row: DataRecord) => <Tag color={Number(row.status) === 1 ? 'success' : 'default'}>{row.statusStr || '—'}</Tag> },
    { title: t('标签', 'Tags'), dataIndex: 'tags', width: 170, render: (tags?: string) => tags ? <Space size={[4, 4]} wrap>{tags.split(',').filter(Boolean).map(tag => <Tag key={tag}>{tag}</Tag>)}</Space> : '—' },
    { title: t('创建信息', 'Created'), key: 'created', width: 180, render: (_: unknown, row: DataRecord) => <div className="metadata-cell"><span>{row.gmtCreateStr || '—'}</span><small>{row.creatorShowName || '—'}</small></div> },
    { title: t('更新信息', 'Updated'), key: 'updated', width: 180, render: (_: unknown, row: DataRecord) => <div className="metadata-cell"><span>{row.gmtModifiedStr || '—'}</span><small>{row.modifierShowName || '—'}</small></div> },
    { title: t('操作', 'Actions'), key: 'actions', width: 150, render: (_: unknown, row: DataRecord) => <Space><Button size="small" onClick={() => edit(row)}>{t('编辑', 'Edit')}</Button><Button type="text" danger size="small" onClick={() => remove(row)}>{t('删除', 'Delete')}</Button></Space> },
  ];
  return <>
    <PageHeader title={t('命名空间', 'Namespaces')} description={t('按照团队或业务组织应用，在同一空间管理成员权限。', 'Organize applications by team or business and manage shared member permissions.')} actions={<Space><RefreshButton loading={namespaces.loading} onClick={() => void namespaces.refresh()}/><Button type="primary" icon={<Plus size={16}/>} onClick={() => edit()}>{t('新建命名空间', 'New namespace')}</Button></Space>}/>
    <Panel><Form name="namespace-filter" form={queryForm} initialValues={initialQuery} className="admin-query-form" layout="inline" onFinish={values => setQuery({ ...query, ...values, index: 0 })}>
      <Form.Item name="codeLike"><Input aria-label={t('命名空间编码', 'Namespace code')} placeholder={t('搜索空间编码', 'Search namespace code')} prefix={<Search size={15}/>} allowClear /></Form.Item>
      <Form.Item name="nameLike"><Input aria-label={t('命名空间名称', 'Namespace name')} placeholder={t('空间名称', 'Namespace name')} allowClear /></Form.Item>
      <Form.Item name="tagLike"><Input aria-label={t('标签', 'Tags')} placeholder={t('标签', 'Tags')} allowClear /></Form.Item>
      <Space><Button htmlType="submit">{t('查询', 'Search')}</Button><Button type="text" onClick={() => { queryForm.resetFields(); setQuery({ ...initialQuery }); }}>{t('重置', 'Reset')}</Button></Space>
    </Form><ErrorState error={namespaces.error} retry={() => void namespaces.refresh()}/><Table rowKey={row => String(row.id)} columns={columns} dataSource={namespaces.data?.data || []} loading={namespaces.loading} scroll={{ x: 1050 }} pagination={{ current: Number(query.index) + 1, pageSize: Number(query.pageSize), total: namespaces.data?.totalItems || 0, showSizeChanger: true, showTotal: total => t(`共 ${total} 个命名空间`, `${total} namespaces`), onChange: (page, size) => setQuery({ ...query, index: page - 1, pageSize: size }) }}/></Panel>
    <Drawer title={editing?.id ? t('编辑命名空间', 'Edit namespace') : t('新建命名空间', 'New namespace')} open={editing !== null} onClose={() => setEditing(null)} size={680} destroyOnHidden footer={<div className="drawer-footer"><span/><Space><Button onClick={() => setEditing(null)}>{t('取消', 'Cancel')}</Button><Button type="primary" loading={busy} onClick={() => form.submit()}>{t('保存命名空间', 'Save namespace')}</Button></Space></div>}>
      <Form name={editing?.id == null ? 'namespaces-create' : 'namespaces-edit'} form={form} layout="vertical" preserve onFinish={save}><Tabs items={[
        { key: 'base', label: t('基本信息', 'General'), children: <>
          <Form.Item name="code" label={t('空间编码', 'Namespace code')} extra={t('创建后不可修改。', 'This code cannot be changed after creation.')} rules={[{ required: true, message: t('请输入空间编码', 'Enter a namespace code') }, { pattern: /^\S+$/, message: t('空间编码不能包含空格', 'Namespace code cannot contain spaces') }]}><Input disabled={editing?.id != null}/></Form.Item>
          <Form.Item name="name" label={t('显示名称', 'Display name')}><Input /></Form.Item>
          {editing?.id && <Form.Item name="token" label="Token"><Input.Password readOnly autoComplete="off" /></Form.Item>}
          <Form.Item name="tags" label={t('标签', 'Tags')} extra={t('多个标签用英文逗号分隔。', 'Separate multiple tags with commas.')}><Input /></Form.Item>
          <Form.Item name="extra" label={t('扩展配置', 'Extra configuration')}><Input.TextArea autoSize={{ minRows: 4, maxRows: 10 }}/></Form.Item>
        </> },
        { key: 'permissions', label: t('成员权限', 'Member permissions'), children: <><p className="form-section-note">{t('空间权限对下属应用生效。', 'Namespace permissions apply to applications in this namespace.')}</p><ErrorState error={users.error} retry={() => void users.refresh()}/><Form.Item name="componentUserRoleInfo"><RoleEditor users={users.data || []}/></Form.Item></> },
      ]}/></Form>
    </Drawer>
  </>;
}
