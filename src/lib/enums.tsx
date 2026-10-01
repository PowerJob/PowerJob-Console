import { Tag, Tooltip, theme } from 'antd';
import { useConsole } from './console';

export type EnumValue = string | number | boolean;
export type EnumColor = 'blue' | 'geekblue' | 'purple' | 'cyan' | 'green' | 'orange' | 'red' | 'default';
type Entry = { value: EnumValue; zh: string; en: string; color: EnumColor; aliases?: readonly EnumValue[]; hidden?: boolean };
const item = (value: EnumValue, zh: string, en: string, color: EnumColor = 'default', aliases?: readonly EnumValue[], hidden = false): Entry => ({ value, zh, en, color, aliases, hidden });

// Values remain the published Server values. Aliases are only for displaying different VO shapes.
const definitions = {
  schedule: [item('API', '手动触发', 'On demand', 'blue', [1]), item('CRON', '定时调度', 'Cron schedule', 'purple', [2]), item('FIXED_RATE', '固定频率', 'Fixed rate', 'cyan', [3]), item('FIXED_DELAY', '固定延迟', 'Fixed delay', 'orange', [4]), item('WORKFLOW', '工作流触发', 'Workflow trigger', 'geekblue', [5]), item('DAILY_TIME_INTERVAL', '每日固定间隔', 'Daily interval', 'green', [11])],
  execution: [item('STANDALONE', '单机执行', 'Standalone', 'blue', [1]), item('BROADCAST', '广播执行', 'Broadcast', 'cyan', [2]), item('MAP', '分布式计算', 'Map', 'purple', [4]), item('MAP_REDUCE', '分布式计算与归约', 'MapReduce', 'geekblue', [3])],
  processor: [item('BUILT_IN', '内置 Java', 'Built-in Java', 'blue', [1]), item('EXTERNAL', '容器处理器', 'Container processor', 'purple', [4]), item('SHELL', 'Shell 脚本', 'Shell script', 'default', [2], true), item('PYTHON', 'Python 脚本', 'Python script', 'default', [3], true)],
  dispatch: [item('HEALTH_FIRST', '健康度优先', 'Health first', 'green', [1]), item('RANDOM', '随机派发', 'Random', 'blue', [2]), item('SPECIFY', '指定 Worker', 'Designated Worker', 'purple', [11])],
  instanceStatus: [item(1, '待派发', 'Waiting dispatch', 'orange', ['WAITING_DISPATCH']), item(2, '待 Worker 接收', 'Waiting for Worker', 'orange', ['WAITING_WORKER_RECEIVE']), item(3, '运行中', 'Running', 'blue', ['RUNNING']), item(4, '失败', 'Failed', 'red', ['FAILED']), item(5, '成功', 'Succeeded', 'green', ['SUCCEED', 'SUCCEEDED']), item(9, '已取消', 'Canceled', 'default', ['CANCELED', 'CANCELLED']), item(10, '已停止', 'Stopped', 'default', ['STOPPED'])],
  workflowStatus: [item(1, '等待调度', 'Waiting', 'orange', ['WAITING']), item(2, '运行中', 'Running', 'blue', ['RUNNING']), item(3, '失败', 'Failed', 'red', ['FAILED']), item(4, '成功', 'Succeeded', 'green', ['SUCCEED', 'SUCCEEDED']), item(10, '已停止', 'Stopped', 'default', ['STOPPED'])],
  taskStatus: [item(1, '待派发', 'Waiting dispatch', 'orange', ['WAITING_DISPATCH', 'dispatching', '等待调度器调度']), item(2, '已派发，待接收', 'Dispatched, waiting receipt', 'orange', ['DISPATCH_SUCCESS_WORKER_UNCHECK', 'unreceived', '调度成功（但不保证worker收到）']), item(3, '已接收，待执行', 'Received, waiting execution', 'orange', ['WORKER_RECEIVED', 'received', 'worker接收成功，但未开始执行']), item(4, '运行中', 'Running', 'blue', ['WORKER_PROCESSING', 'running', 'worker正在执行']), item(5, '失败', 'Failed', 'red', ['WORKER_PROCESS_FAILED', 'failed', 'worker执行失败']), item(6, '成功', 'Succeeded', 'green', ['WORKER_PROCESS_SUCCESS', 'succeed', 'worker执行成功'])],
  resourceStatus: [item(1, '启用', 'Enabled', 'green', ['ENABLE', 'NORMAL']), item(2, '停用', 'Disabled', 'default', ['DISABLE']), item(99, '已删除', 'Deleted', 'default', ['DELETED'])],
  containerStatus: [item('ENABLE', '启用', 'Enabled', 'green', [1]), item('DISABLE', '停用', 'Disabled', 'default', [2]), item('DELETED', '已删除', 'Deleted', 'default', [99])],
  access: [item(true, '启用', 'Enabled', 'green'), item(false, '禁用', 'Disabled', 'default')],
  role: [item('OBSERVER', '观察者', 'Observer', 'default', [10]), item('QA', '质量保障', 'QA', 'cyan', [20]), item('DEVELOPER', '开发者', 'Developer', 'blue', [30]), item('ADMIN', '管理员', 'Administrator', 'purple', [40])],
  accountType: [item('PWJB', '内置账号', 'PowerJob account', 'blue'), item('DING', '钉钉账号', 'DingTalk account', 'cyan', ['DINGTALK', 'DING_TALK']), item('QYWX', '企业微信账号', 'WeCom account', 'green')],
  logType: [item(1, '在线日志', 'Online', 'blue', ['ONLINE']), item(2, '本地文件', 'Local file', 'cyan', ['LOCAL']), item(3, '标准输出', 'Standard output', 'purple', ['STDOUT']), item(4, '本地与在线', 'Local and online', 'geekblue', ['LOCAL_AND_ONLINE']), item(999, '不记录日志', 'No logging', 'default', ['NULL'])],
  logLevel: [item(1, '调试', 'Debug', 'default', ['DEBUG']), item(2, '信息', 'Info', 'blue', ['INFO']), item(3, '警告', 'Warning', 'orange', ['WARN']), item(4, '错误', 'Error', 'red', ['ERROR']), item(99, '关闭', 'Off', 'default', ['OFF'])],
  taskTracker: [item(1, '参与计算', 'Participate in computation', 'blue', ['NORMAL']), item(11, '仅管理调度', 'Coordinate only', 'purple', ['PADDLING'])],
  containerType: [item('FatJar', 'JAR 制品', 'JAR artifact', 'blue', [1]), item('Git', '代码仓库', 'Git repository', 'purple', [2])],
  nodeType: [item(1, '任务节点', 'Job node', 'blue', ['JOB']), item(2, '条件判断', 'Decision', 'orange', ['DECISION']), item(3, '嵌套工作流', 'Nested workflow', 'purple', ['NESTED_WORKFLOW'])],
  decisionBranch: [item('true', '成立', 'True', 'green', [true]), item('false', '不成立', 'False', 'orange', [false])],
  nodeProgress: [item('upstream', '等待上游', 'Waiting for upstream'), item('skipped', '分支未执行', 'Branch not executed')],
  containerDeployment: [item('connecting', '正在连接', 'Connecting', 'orange'), item('running', '部署中', 'Deploying', 'blue'), item('finished', '部署结束', 'Deployment finished', 'default'), item('failed', '部署失败', 'Deployment failed', 'red'), item('closed', '连接已关闭', 'Connection closed')],
  timeUnit: [item('SECONDS', '秒', 'Seconds'), item('MINUTES', '分钟', 'Minutes'), item('HOURS', '小时', 'Hours')],
  weekday: [item(1, '周一', 'Mon'), item(2, '周二', 'Tue'), item(3, '周三', 'Wed'), item(4, '周四', 'Thu'), item(5, '周五', 'Fri'), item(6, '周六', 'Sat'), item(7, '周日', 'Sun')],
} satisfies Record<string, readonly Entry[]>;

export type EnumKind = keyof typeof definitions;
const key = (value: EnumValue) => String(value).toUpperCase();
export function enumMeta(kind: EnumKind, value: unknown, language = 'cn') {
  const raw = value == null || value === '' ? '—' : String(value);
  const entry = (definitions[kind] as readonly Entry[]).find(candidate => [candidate.value, ...(candidate.aliases || [])].some(alias => key(alias) === key(raw)));
  return { label: entry ? language === 'en' ? entry.en : entry.zh : raw, color: entry?.color || 'default' as EnumColor, technical: entry ? String(entry.value) : raw, known: !!entry };
}
export const enumLabel = (kind: EnumKind, value: unknown, language = 'cn') => enumMeta(kind, value, language).label;
export const enumColor = (kind: EnumKind, value: unknown) => enumMeta(kind, value).color;

/** Supplying values preserves their original types, order and exact request values. */
export function enumOptions<T extends string | number>(kind: EnumKind, language: string, values: readonly T[]): { value: T; label: string }[];
export function enumOptions(kind: EnumKind, language?: string): { value: string | number; label: string }[];
export function enumOptions(kind: EnumKind, language = 'cn', values?: readonly (string | number)[]) {
  const originals = values || (definitions[kind] as readonly Entry[]).filter(entry => !entry.hidden && typeof entry.value !== 'boolean').map(entry => entry.value as string | number);
  return originals.map(value => ({ value, label: enumLabel(kind, value, language) }));
}

export function EnumTag({ kind, value, language, className }: { kind: EnumKind; value: unknown; language?: string; className?: string }) {
  const context = useConsole();
  const { token } = theme.useToken();
  const meta = enumMeta(kind, value, language || context?.language || 'cn');
  return <Tooltip title={meta.technical}><Tag className={className} color={meta.color} variant="filled" title={meta.technical} style={{ marginInlineEnd: 0, color: token.colorText }}>{meta.label}</Tag></Tooltip>;
}
