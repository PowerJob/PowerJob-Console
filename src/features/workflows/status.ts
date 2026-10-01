import { t } from '../../core/ui';
export function workflowStatus(status?: number) { return ({ 1: t('等待调度', 'Waiting'), 2: t('运行中', 'Running'), 3: t('失败', 'Failed'), 4: t('成功', 'Succeeded'), 10: t('已停止', 'Stopped') } as Record<number, string>)[status || 0] || t('未知状态', 'Unknown'); }
export function nodeStatus(status?: number | null) { return ({ 1: t('等待派发', 'Waiting dispatch'), 2: t('等待接收', 'Waiting Worker'), 3: t('运行中', 'Running'), 4: t('失败', 'Failed'), 5: t('成功', 'Succeeded'), 9: t('已取消', 'Canceled'), 10: t('已停止', 'Stopped') } as Record<number, string>)[status || 0] || t('等待上游', 'Waiting upstream'); }
export const workflowTone = (status: number) => ({ 3: 'danger', 4: 'success', 2: 'running', 10: 'muted' } as Record<number, string>)[status] || 'muted';
export const nodeTone = (status?: number | null) => ({ 3: 'running', 4: 'danger', 5: 'success', 9: 'muted', 10: 'muted' } as Record<number, string>)[status || 0] || '';
