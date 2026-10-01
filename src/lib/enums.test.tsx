import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EnumTag, enumColor, enumLabel, enumMeta, enumOptions } from './enums';

describe('localized Server enum presentation', () => {
  it('distinguishes instance, workflow and task states with different numeric contracts', () => {
    expect(enumLabel('instanceStatus', 5)).toBe('成功');
    expect(enumLabel('workflowStatus', 3)).toBe('失败');
    expect(enumLabel('taskStatus', 5)).toBe('失败');
    expect(enumLabel('taskStatus', 6)).toBe('成功');
    expect(enumLabel('taskStatus', 'worker接收成功，但未开始执行')).toBe('已接收，待执行');
    expect(enumLabel('taskStatus', 'failed', 'en')).toBe('Failed');
  });

  it('uses the same semantic state colors for numeric and named VO values', () => {
    for (const [kind, values] of [
      ['instanceStatus', [5, 'SUCCEED', 4, 'FAILED', 3, 'RUNNING', 10, 'STOPPED', 1, 'WAITING_DISPATCH']],
      ['workflowStatus', [4, 'SUCCEED', 3, 'FAILED', 2, 'RUNNING', 10, 'STOPPED', 1, 'WAITING']],
    ] as const) {
      expect(values.map(value => enumColor(kind, value))).toEqual(['green', 'green', 'red', 'red', 'blue', 'blue', 'default', 'default', 'orange', 'orange']);
    }
    expect(enumColor('containerDeployment', 'finished')).toBe('default');
  });

  it('translates option labels without changing the supplied request types, values or order', () => {
    const values = [1, 2, 3, 4, 999, 777, 'custom-log'] as const;
    const options = enumOptions('logType', 'cn', values);
    expect(options.map(option => option.value)).toEqual(values);
    expect(options.map(option => option.label)).toEqual(['在线日志', '本地文件', '标准输出', '本地与在线', '不记录日志', '777', 'custom-log']);
    const filters = ['WAITING', 'RUNNING', 'FAILED', 'SUCCEED', 'STOPPED'] as const;
    expect(enumOptions('workflowStatus', 'en', filters).map(option => option.value)).toEqual(filters);
    expect(enumOptions('decisionBranch', 'cn', ['true', 'false']).map(option => option.value)).toEqual(['true', 'false']);
  });

  it('preserves deprecated and unknown processing values while keeping normal new-job choices', () => {
    expect(enumOptions('processor').map(option => option.value)).toEqual(['BUILT_IN', 'EXTERNAL']);
    expect(enumOptions('processor', 'cn', ['SHELL', 'PYTHON', 'custom-processor']).map(option => option.label)).toEqual(['Shell 脚本', 'Python 脚本', 'custom-processor']);
    expect(enumMeta('processor', 'custom-processor')).toMatchObject({ label: 'custom-processor', technical: 'custom-processor', color: 'default', known: false });
    expect(enumLabel('schedule', undefined)).toBe('—');
  });

  it('keeps Chinese and English roles, schedules and time options consistent', () => {
    expect(enumLabel('role', 'admin', 'cn')).toBe('管理员');
    expect(enumLabel('role', 'ADMIN', 'en')).toBe('Administrator');
    expect(enumLabel('schedule', 'CRON', 'zh')).toBe('定时调度');
    expect(enumLabel('schedule', 'API', 'en')).toBe('On demand');
    expect(enumOptions('accountType', 'cn', ['PWJB', 'DING', 'QYWX']).map(option => option.label)).toEqual(['内置账号', '钉钉账号', '企业微信账号']);
    expect(enumLabel('accountType', 'DING', 'en')).toBe('DingTalk account');
    expect(enumOptions('weekday', 'cn').map(option => option.label)).toEqual(['周一', '周二', '周三', '周四', '周五', '周六', '周日']);
    expect(enumOptions('timeUnit', 'en').map(option => option.value)).toEqual(['SECONDS', 'MINUTES', 'HOURS']);
  });

  it('renders visible status text with color and retains raw unknown text safely', () => {
    const success = renderToStaticMarkup(<EnumTag kind="instanceStatus" value={5}/>);
    expect(success).toContain('成功');
    expect(success).toContain('ant-tag-green');
    const unknown = renderToStaticMarkup(<EnumTag kind="schedule" value="<script>future</script>"/>);
    expect(unknown).toContain('&lt;script&gt;future&lt;/script&gt;');
    expect(unknown).not.toContain('<script>future</script>');
    expect(renderToStaticMarkup(<EnumTag kind="role" value="ADMIN" language="en"/>)).toContain('Administrator');
  });
});
