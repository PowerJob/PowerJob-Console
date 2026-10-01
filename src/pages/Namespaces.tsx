import { useEffect, useRef, useState } from 'react';
import { App, Button, Drawer, Form, Input, Space, Table, Tabs, Tag } from 'antd';
import { FolderTree, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, type DataRecord, type PageResult } from '../lib/api';
import { useConsole } from '../lib/console';
import { EnumTag } from '../lib/enums';
import { useSessionQuery, useSessionScope } from '../lib/sessionScope';
import { ErrorState, PageHeader, Panel, RefreshButton } from '../components/ui';
import RoleEditor, { emptyRoles, normalizeRoles } from './RoleEditor';
import './admin.css';

const initialQuery = { codeLike: undefined, nameLike: undefined, tagLike: undefined, index: 0, pageSize: 10 };
export default function Namespaces() {
  const { t } = useConsole();
  const { message, modal } = App.useApp();
  const scope = useSessionScope();
  const editVersion = useRef(0);
  const confirmations = useRef(new Set<{ destroy: () => void }>());
  const [queryForm] = Form.useForm();
  const [form] = Form.useForm();
  const [query, setQuery] = useState<DataRecord>(initialQuery);
  const [editing, setEditing] = useState<DataRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const namespaces = useSessionQuery(scope, () => api.post<PageResult>('/namespace/list', query, scope.options), [query]);
  const users = useSessionQuery(scope, () => api.get<DataRecord[]>('/user/list', undefined, scope.options));
  useEffect(() => { ++editVersion.current; setEditing(null); setBusy(false); form.resetFields(); return () => { ++editVersion.current; confirmations.current.forEach(item => item.destroy()); confirmations.current.clear(); }; }, [scope, form]);
  const edit = (value?: DataRecord) => {
    if (busy || !scope.current()) return;
    ++editVersion.current;
    const next = value ? { ...value, componentUserRoleInfo: normalizeRoles(value.componentUserRoleInfo) } : { componentUserRoleInfo: emptyRoles() };
    form.resetFields(); form.setFieldsValue(next); setEditing(next);
  };
  const save = async (values: DataRecord) => {
    if (busy || !scope.current() || !editing) return;
    const version = editVersion.current;
    setBusy(true);
    try { await api.post('/namespace/save', { ...editing, ...values }, { ...scope.options, headers: { NamespaceId: editing.id == null ? '' : String(editing.id) } }); if (scope.current() && version === editVersion.current) { void message.success(t('命名空间已保存', 'Namespace saved')); setEditing(null); await namespaces.refresh(); } } catch { /* Retain the form after a rejected save. */ } finally { if (scope.current() && version === editVersion.current) setBusy(false); }
  };
  const remove = (value: DataRecord) => {
    if (busy || !scope.current()) return;
    const confirmation = modal.confirm({ title: t('删除命名空间', 'Delete namespace'), content: t(`确认删除命名空间「${value.name || value.code}」？包含应用的命名空间不能删除。`, `Delete “${value.name || value.code}”? A namespace containing applications cannot be deleted.`), okText: t('删除', 'Delete'), cancelText: t('取消', 'Cancel'), okButtonProps: { danger: true }, afterClose: () => confirmations.current.delete(confirmation), onOk: async () => { if (!scope.current()) return; await api.delete('/namespace/delete', { id: value.id }, { ...scope.options, headers: { NamespaceId: String(value.id) } }); if (scope.current()) { void message.success(t('命名空间已删除', 'Namespace deleted')); await namespaces.refresh(); } } });
    confirmations.current.add(confirmation);
  };
  const columns = [
    { title: t('命名空间', 'Namespace'), key: 'namespace', width: 260, render: (_: unknown, row: DataRecord) => <div className="resource-cell"><span className="resource-symbol violet"><FolderTree size={18}/></span><div><strong>{row.name || row.code}</strong><span>{row.code} <span className="muted">#{row.id}</span></span></div></div> },
    { title: t('状态', 'Status'), key: 'status', width: 110, render: (_: unknown, row: DataRecord) => <EnumTag kind="resourceStatus" value={row.status ?? row.statusStr}/> },
    { title: t('标签', 'Tags'), dataIndex: 'tags', width: 170, render: (tags?: string) => tags ? <Space size={[4, 4]} wrap>{tags.split(',').filter(Boolean).map(tag => <Tag key={tag}>{tag}</Tag>)}</Space> : '—' },
    { title: t('创建信息', 'Created'), key: 'created', width: 180, render: (_: unknown, row: DataRecord) => <div className="metadata-cell"><span>{row.gmtCreateStr || '—'}</span><small>{row.creatorShowName || '—'}</small></div> },
    { title: t('更新信息', 'Updated'), key: 'updated', width: 180, render: (_: unknown, row: DataRecord) => <div className="metadata-cell"><span>{row.gmtModifiedStr || '—'}</span><small>{row.modifierShowName || '—'}</small></div> },
    { title: t('操作', 'Actions'), key: 'actions', width: 180, render: (_: unknown, row: DataRecord) => <Space><Button size="small" icon={<Pencil size={14}/>} onClick={() => edit(row)}>{t('编辑', 'Edit')}</Button><Button type="text" danger size="small" icon={<Trash2 size={14}/>} onClick={() => remove(row)}>{t('删除', 'Delete')}</Button></Space> },
  ];
  return <>
    <PageHeader title={t('命名空间', 'Namespaces')} description={t('按照团队或业务组织应用，在同一空间管理成员权限。', 'Organize applications by team or business and manage shared member permissions.')} actions={<Space><RefreshButton loading={namespaces.loading} onClick={() => void namespaces.refresh()}/><Button type="primary" icon={<Plus size={16}/>} onClick={() => edit()}>{t('新建命名空间', 'New namespace')}</Button></Space>}/>
    <Panel><Form name="namespace-filter" form={queryForm} initialValues={initialQuery} className="admin-query-form" layout="inline" onFinish={values => setQuery({ ...query, ...values, index: 0 })}>
      <Form.Item name="codeLike"><Input aria-label={t('命名空间编码', 'Namespace code')} placeholder={t('搜索空间编码', 'Search namespace code')} prefix={<Search size={15}/>} allowClear /></Form.Item>
      <Form.Item name="nameLike"><Input aria-label={t('命名空间名称', 'Namespace name')} placeholder={t('空间名称', 'Namespace name')} allowClear /></Form.Item>
      <Form.Item name="tagLike"><Input aria-label={t('标签', 'Tags')} placeholder={t('标签', 'Tags')} allowClear /></Form.Item>
      <Space><Button htmlType="submit">{t('查询', 'Search')}</Button><Button type="text" onClick={() => { queryForm.resetFields(); setQuery({ ...initialQuery }); }}>{t('重置', 'Reset')}</Button></Space>
    </Form><ErrorState error={namespaces.error} retry={() => void namespaces.refresh()}/><Table rowKey={row => String(row.id)} columns={columns} dataSource={namespaces.data?.data || []} loading={namespaces.loading} scroll={{ x: 1050 }} pagination={{ current: Number(query.index) + 1, pageSize: Number(query.pageSize), total: namespaces.data?.totalItems || 0, showSizeChanger: true, showTotal: total => t(`共 ${total} 个命名空间`, `${total} namespaces`), onChange: (page, size) => setQuery({ ...query, index: page - 1, pageSize: size }) }}/></Panel>
    <Drawer title={editing?.id ? t('编辑命名空间', 'Edit namespace') : t('新建命名空间', 'New namespace')} open={editing !== null} onClose={() => { if (!busy) { ++editVersion.current; setEditing(null); } }} closable={!busy} mask={{ closable: !busy }} keyboard={!busy} size={680} destroyOnHidden footer={<div className="drawer-footer"><span/><Space><Button disabled={busy} onClick={() => { ++editVersion.current; setEditing(null); }}>{t('取消', 'Cancel')}</Button><Button type="primary" loading={busy} onClick={() => form.submit()}>{t('保存命名空间', 'Save namespace')}</Button></Space></div>}>
      <Form name={editing?.id == null ? 'namespaces-create' : 'namespaces-edit'} form={form} layout="vertical" preserve onFinish={save} disabled={busy}><Tabs items={[
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
