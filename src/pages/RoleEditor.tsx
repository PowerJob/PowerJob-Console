import { Select } from 'antd';
import { type DataRecord } from '../lib/api';
import { useConsole } from '../lib/console';
import { EnumTag, enumLabel } from '../lib/enums';

export const emptyRoles = () => ({ observer: [], qa: [], developer: [], admin: [] });
export function normalizeRoles(value?: DataRecord) {
  return Object.fromEntries(['observer', 'qa', 'developer', 'admin'].map(role => [role, (value?.[role] || []).map(String)]));
}
export default function RoleEditor({ value, onChange, users = [] }: { value?: DataRecord; onChange?: (value: DataRecord) => void; users?: DataRecord[] }) {
  const { t, language } = useConsole();
  const roles = normalizeRoles(value);
  const descriptions = [
    ['observer', enumLabel('role', 'OBSERVER', language), t('查看配置、实例与日志', 'View configuration, instances and logs')],
    ['qa', enumLabel('role', 'QA', language), t('查看和执行任务', 'View and operate jobs')],
    ['developer', enumLabel('role', 'DEVELOPER', language), t('编辑配置与执行任务', 'Edit configuration and operate jobs')],
    ['admin', enumLabel('role', 'ADMIN', language), t('管理应用与成员权限', 'Manage resources and member permissions')],
  ];
  const options = users.map(user => ({ value: String(user.id), label: user.showName || user.nick || user.username || String(user.id) }));
  return <div className="role-editor">{descriptions.map(([key, label, description]) => <div className="role-row" key={key}>
    <div className="role-label"><strong><EnumTag kind="role" value={key}/></strong><span>{description}</span></div>
    <Select aria-label={label} mode="multiple" showSearch optionFilterProp="label" value={roles[key]} options={options} onChange={ids => onChange?.({ ...roles, [key]: ids })} placeholder={t('选择成员', 'Select members')} maxTagCount="responsive" />
  </div>)}</div>;
}
