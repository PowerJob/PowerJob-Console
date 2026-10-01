import { beforeEach, describe, expect, it, vi } from 'vitest';
const transport = vi.hoisted(() => vi.fn());
vi.mock('../../src/core/api', () => ({ api: transport }));
import { session } from '../../src/core/session';
import { actOnInstance, copyWorkflow, fetchWorkflow, fetchWorkflowInstance, listJobs, listWorkflowInstances, listWorkflows, runWorkflow, saveNodes, saveWorkflow } from '../../src/features/workflows/api';

beforeEach(() => { transport.mockReset(); session.appId = '9007199254740993'; });
describe('locked Server workflow HTTP actions', () => {
  it('sends zero-based workflow filters and preserves IDs without numeric coercion', async () => {
    transport.mockResolvedValue({ index: 1, pageSize: 10, totalPages: 2, totalItems: 11, data: [] });
    await listWorkflows({ index: 1, pageSize: 10, workflowId: '9007199254740994', keyword: '中文 & +' });
    expect(transport).toHaveBeenCalledWith('/workflow/list', expect.objectContaining({ method: 'POST', body: { appId: '9007199254740993', index: 1, pageSize: 10, workflowId: '9007199254740994', keyword: '中文 & +' } }));
  });
  it('uses definition read and copy endpoints with their distinct HTTP methods', async () => {
    transport.mockResolvedValue('9007199254740994'); await fetchWorkflow('9007199254740994'); await copyWorkflow('9007199254740994');
    expect(transport.mock.calls[0]).toEqual(['/workflow/fetch', { query: { appId: '9007199254740993', workflowId: '9007199254740994' }, signal: undefined }]);
    expect(transport.mock.calls[1]).toEqual(['/workflow/copy', { method: 'POST', query: { appId: '9007199254740993', workflowId: '9007199254740994' }, signal: undefined }]);
  });
  it('sends node arrays, keeps editable metadata and adapts response id/type separately from DAG node fields', async () => {
    transport.mockResolvedValue([{ id: '9007199254740994', type: 3, jobId: '9007199254740995', nodeName: 'Child', nodeParams: null, enable: false, skipWhenFailed: true, future: { keep: true } }]);
    const result = await saveNodes([{ id: '9007199254740994', type: 3, jobId: '9007199254740995', nodeName: 'Child', nodeParams: null, enable: false, skipWhenFailed: true, future: { keep: true } }]);
    expect(transport).toHaveBeenCalledWith('/workflow/saveNode', expect.objectContaining({ method: 'POST', body: [{ appId: '9007199254740993', id: '9007199254740994', type: 3, jobId: '9007199254740995', nodeName: 'Child', nodeParams: null, enable: false, skipWhenFailed: true, future: { keep: true } }] }));
    expect(result[0]).toMatchObject({ nodeId: '9007199254740994', nodeType: 3, nodeParams: null, enable: false, skipWhenFailed: true, future: { keep: true } });
  });
  it('does not discard parameters or empty-string intent from manual execution', async () => {
    transport.mockResolvedValue('9007199254740998'); await runWorkflow('9007199254740994', '中文 & + ?'); await runWorkflow('9007199254740994', '');
    expect(transport.mock.calls[0]![1].query.initParams).toBe('中文 & + ?'); expect(transport.mock.calls[1]![1].query.initParams).toBe('');
  });
  it('uses workflow status enums for history, and exact nodeId for mark-success', async () => {
    transport.mockResolvedValue(null); await listWorkflowInstances({ index: 0, pageSize: 10, status: 'FAILED', wfInstanceId: '9007199254740998' }); await fetchWorkflowInstance('9007199254740998'); await actOnInstance('markNodeAsSuccess', '9007199254740998', '9007199254740994');
    expect(transport.mock.calls[0]![1].body.status).toBe('FAILED'); expect(transport.mock.calls[1]![0]).toBe('/wfInstance/info'); expect(transport.mock.calls[2]).toEqual(['/wfInstance/markNodeAsSuccess', { query: { appId: '9007199254740993', wfInstanceId: '9007199254740998', nodeId: '9007199254740994' }, signal: undefined }]);
  });
  it('propagates cancellation into import and metadata writes', async () => {
    transport.mockResolvedValue('9007199254740994'); const controller = new AbortController(); await listJobs({ index: 0, pageSize: 8 }, controller.signal); await saveWorkflow({ id: '9007199254740994', lifeCycle: { start: null, end: null }, future: true }, controller.signal);
    expect(transport.mock.calls[0]![1].signal).toBe(controller.signal); expect(transport.mock.calls[1]![1]).toMatchObject({ signal: controller.signal, method: 'POST', body: { future: true, lifeCycle: { start: null, end: null } } });
  });
});
