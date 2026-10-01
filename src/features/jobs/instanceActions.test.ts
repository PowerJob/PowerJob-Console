import { describe, expect, it } from 'vitest';
import { instanceActions } from './instanceActions';

describe('InstanceService action eligibility', () => {
  it.each([1, 2, 3, 'WAITING_DISPATCH', 'WAITING_WORKER_RECEIVE', 'RUNNING'])('allows stop but not retry while instance %s is active', status => {
    expect(instanceActions({ status, wfInstanceId: 'N/A' })).toMatchObject({ canRetry: false, canStop: true, retryReason: 'unfinished' });
  });
  it.each([4, 5, 9, 10, 'FAILED', 'SUCCEED', 'CANCELED', 'STOPPED'])('allows retry but not stop for terminal normal instance %s', status => {
    expect(instanceActions({ status, wfInstanceId: 'N/A' })).toMatchObject({ canRetry: true, canStop: false, stopReason: 'finished' });
  });
  it('does not offer a retry for a workflow job even when its status is terminal', () => {
    for (const instance of [{ status: 4, wfInstanceId: '9223372036854775807' }, { status: 5, type: 2 }, { status: 10 }]) expect(instanceActions(instance, 'WORKFLOW')).toMatchObject({ canRetry: false, canStop: false, retryReason: 'workflow' });
    expect(instanceActions({ status: 3, wfInstanceId: '123' })).toMatchObject({ canRetry: false, canStop: true });
  });
  it('keeps unknown statuses inactive until refreshed instead of guessing their behavior', () => {
    for (const status of [undefined, 0, 99, 'NEW_SERVER_STATE']) expect(instanceActions({ status })).toMatchObject({ canRetry: false, canStop: false, retryReason: 'unknown', stopReason: 'unknown' });
  });
});
