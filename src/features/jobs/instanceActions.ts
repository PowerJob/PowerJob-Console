import type { DataRecord } from '../../lib/api';

const statusCodes: Record<string, number> = { WAITING_DISPATCH: 1, WAITING_WORKER_RECEIVE: 2, RUNNING: 3, FAILED: 4, SUCCEED: 5, CANCELED: 9, STOPPED: 10 };
export function instanceActions(instance: DataRecord, listType?: string) {
  const status = statusCodes[String(instance.status)] ?? Number(instance.status);
  const running = [1, 2, 3].includes(status);
  const finished = [4, 5, 9, 10].includes(status);
  // InstanceInfoVO uses N/A for a normal instance's missing workflow identifier.
  const workflow = listType === 'WORKFLOW' || instance.type === 'WORKFLOW' || Number(instance.type) === 2 || (instance.wfInstanceId != null && instance.wfInstanceId !== '' && instance.wfInstanceId !== 'N/A');
  return {
    canRetry: finished && !workflow,
    canStop: running,
    retryReason: workflow ? 'workflow' : running ? 'unfinished' : finished ? undefined : 'unknown',
    stopReason: finished ? 'finished' : running ? undefined : 'unknown',
  };
}
