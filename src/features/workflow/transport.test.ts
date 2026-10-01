import { beforeEach, describe, expect, it, vi } from 'vitest';
import dayjs from 'dayjs';
import { api, parseJson } from '../../lib/api';
import { assertZipDownload, containerPayload, deploymentStateFromLine, deploymentStateOnClose, formatWorkflowContext, maskDeploymentLog, nodePayload, parseContainerSource, persistWorkflow, responseId, scheduleResultType, uploadJarFile, workflowNodeStartTime, workflowPayload } from './transport';
import { normalizeDag } from './model';

vi.mock('../../lib/api', async importOriginal => { const actual = await importOriginal<typeof import('../../lib/api')>(); return { ...actual, api: { post: vi.fn() } }; });
const nodes = normalizeDag({ nodes: [{ id: '9223372036854775801', type: 2, nodeName: 'Decision', nodeParams: 'true' }, { id: '9223372036854775802', type: 3, jobId: '9223372036854775803', nodeName: 'Nested', nodeParams: '中文', enable: false, skipWhenFailed: true }], edges: [] }).nodes;
describe('workflow saves and instance inspection', () => {
  beforeEach(() => vi.mocked(api.post).mockReset());
  it('persists nodes before the graph and returns only the confirmed new ID', async () => {
    vi.mocked(api.post).mockResolvedValueOnce([{ id: nodes[0].nodeId }]).mockResolvedValueOnce('9223372036854775804');
    const id = await persistWorkflow({ wfName: 'new', timeExpressionType: 'API', enable: true, maxWfInstanceNum: 0 }, nodes, [{ from: nodes[0].nodeId, to: nodes[1].nodeId, property: 'true' }], '', '1');
    expect(id).toBe('9223372036854775804'); expect(vi.mocked(api.post).mock.calls.map(call => call[0])).toEqual(['/workflow/saveNode', '/workflow/save']);
    expect(vi.mocked(api.post).mock.calls.map(call => call[2]?.headers?.AppId)).toEqual(['1', '1']);
    expect(vi.mocked(api.post).mock.calls[1][1]).toMatchObject({ id: undefined, maxWfInstanceNum: 0, dag: { nodes: [{ nodeId: nodes[0].nodeId }, { nodeId: nodes[1].nodeId }], edges: [{ from: nodes[0].nodeId, to: nodes[1].nodeId, property: 'true' }] } });
  });
  it('keeps the caller draft untouched and does not report a new ID on save failure', async () => {
    const snapshot = JSON.stringify(nodes); vi.mocked(api.post).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('illegal DAG'));
    await expect(persistWorkflow({ wfName: 'draft' }, nodes, [], '7', '1')).rejects.toMatchObject({ message: 'illegal DAG', nodesSaved: true }); expect(JSON.stringify(nodes)).toBe(snapshot);
    vi.mocked(api.post).mockReset().mockRejectedValueOnce(new Error('invalid node')); await expect(persistWorkflow({ wfName: 'draft' }, nodes, [], '7', '1')).rejects.toThrow('invalid node'); expect(api.post).toHaveBeenCalledTimes(1);
  });
  it('does not issue the graph write after the identity changes during the node write', async () => {
    let session = 'original'; let finish!: (value: unknown) => void; const controller = new AbortController();
    vi.mocked(api.post).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const save = persistWorkflow({ wfName: 'old identity draft' }, nodes, [], '7', '1', { signal: controller.signal, current: () => session === 'original' });
    expect(vi.mocked(api.post).mock.calls[0][2]?.signal).toBe(controller.signal);
    session = 'replacement'; finish([]);
    await expect(save).rejects.toMatchObject({ name: 'AbortError' }); expect(api.post).toHaveBeenCalledTimes(1);
  });
  it('does not start or continue a save after its owner is aborted or navigates away', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(persistWorkflow({}, nodes, [], '7', '1', { signal: controller.signal, current: () => true })).rejects.toMatchObject({ name: 'AbortError' }); expect(api.post).not.toHaveBeenCalled();
    let current = true; let finish!: (value: unknown) => void;
    vi.mocked(api.post).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const save = persistWorkflow({}, nodes, [], '7', '1', { current: () => current }); current = false; finish([]);
    await expect(save).rejects.toMatchObject({ name: 'AbortError' }); expect(api.post).toHaveBeenCalledTimes(1);
  });
  it('keeps decision code, nested workflow references and independently saved node flags', () => {
    expect(nodePayload(nodes[0], '1')).toMatchObject({ type: 2, jobId: undefined, nodeParams: 'true', enable: true, skipWhenFailed: false });
    expect(nodePayload(nodes[1], '1')).toMatchObject({ type: 3, jobId: '9223372036854775803', nodeParams: '中文', enable: false, skipWhenFailed: true });
    const payload = workflowPayload({ lifeCycle: [dayjs(1780000000000), dayjs(1790000000000)], notifyUserIds: ['9223372036854775799'] }, nodes, [], '7', '1');
    expect(payload.lifeCycle).toEqual({ start: 1780000000000, end: 1790000000000 }); expect(payload).toMatchObject({ notifyUserIds: ['9223372036854775799'] }); expect(workflowPayload({}, nodes, [], '7', '1').lifeCycle).toEqual({ start: null, end: null });
  });
  it('reads actual DAG execution fields and tolerates non-JSON workflow context', () => {
    const dag = normalizeDag({ peworkflowDAG: { nodes: [{ nodeId: '9', nodeType: 1, instanceId: '9223372036854775804', status: 4, result: 'failed', startTime: '2026-10-02 00:10:00', finishedTime: '2026-10-02 00:10:01', disableByControlNode: true }], edges: [] } });
    expect(dag.nodes[0]).toMatchObject({ instanceId: '9223372036854775804', status: 4, result: 'failed', startTime: '2026-10-02 00:10:00', finishedTime: '2026-10-02 00:10:01', disableByControlNode: true });
    expect(formatWorkflowContext('{"text":"中文","id":9223372036854775804}')).toContain('9223372036854775804'); expect(formatWorkflowContext('plain context')).toBe('plain context');
  });
  it('rejects invalid and already-rounded IDs rather than creating a broken deep link', () => { expect(responseId(7)).toBe('7'); expect(responseId('9223372036854775804')).toBe('9223372036854775804'); expect(() => responseId(undefined)).toThrow(); expect(() => responseId(9223372036854775804)).toThrow(); });
  it('uses the real job trigger time when the server leaves the DAG start time empty, without leaking a previous selection', () => {
    const job = normalizeDag({ nodes: [{ nodeId: '9', nodeType: 1, instanceId: '9223372036854775804', startTime: null }], edges: [] }).nodes[0];
    const execution = { instanceId: job.instanceId, actualTriggerTime: '2026-10-02 00:10:00' };
    expect(workflowNodeStartTime(job, execution)).toBe(execution.actualTriggerTime);
    expect(workflowNodeStartTime(job, { ...execution, instanceId: 'another-selection' })).toBe('—');
    expect(workflowNodeStartTime(job, { ...execution, actualTriggerTime: 'N/A' })).toBe('—');
    expect(workflowNodeStartTime({ ...job, startTime: '2026-10-02 00:09:00' }, execution)).toBe('2026-10-02 00:09:00');
    expect(workflowNodeStartTime({ ...job, nodeType: 3 }, execution)).toBe('—');
  });
  it('distinguishes valid manual schedules from invalid expressions wrapped in a success DTO', () => { expect(scheduleResultType('2026-10-02 00:30:00')).toBe('success'); expect(scheduleResultType('It is valid, but has not trigger time list!')).toBe('info'); expect(scheduleResultType('ParseException: illegal CRON')).toBe('error'); });
});
describe('container sources, deployment and binary downloads', () => {
  beforeEach(() => vi.mocked(api.post).mockReset());
  it('keeps the real Git branch field and FatJar source on an ordinary edit', () => {
    const value = { containerName: 'Git', sourceType: 'Git', repo: 'https://git.example.invalid/test.git', branch: 'feature/中文', username: 'fixture', password: 'synthetic-test-only', status: 'ENABLE' };
    const source = parseJson(containerPayload(value, '1', '', '2').sourceInfo); expect(source).toEqual({ repo: value.repo, branch: value.branch, username: value.username, password: value.password });
    const jar = containerPayload({ containerName: 'updated', sourceType: 'FatJar', status: 'DISABLE' }, '1', 'original-jar-hash', '3'); expect(jar.sourceInfo).toBe('original-jar-hash'); expect(jar.status).toBe('DISABLE'); expect(() => containerPayload({ sourceType: 'FatJar' }, '1', '')).toThrow('Upload');
    expect(parseContainerSource({ sourceType: 'Git', sourceInfo: 'invalid' })).toEqual({});
  });
  it('never treats WebSocket closure or a prior Git build failure as successful deployment', () => {
    expect(deploymentStateOnClose('running')).toBe('closed'); const failed = deploymentStateFromLine('running', 'SYSTEM: [ERROR] prepare jar file failed: invalid branch'); expect(failed).toBe('failed'); expect(deploymentStateOnClose(failed)).toBe('failed'); expect(deploymentStateFromLine(failed, 'SYSTEM: deploy finished, congratulations!')).toBe('failed');
    expect(deploymentStateFromLine('running', 'SYSTEM: acquire deploy lock failed, maybe other user is deploying')).toBe('failed'); expect(deploymentStateFromLine('running', 'SYSTEM: deploy finished, congratulations!')).toBe('finished');
  });
  it('masks Git passwords in deployment config and diagnostic lines', () => { const masked = maskDeploymentLog('config {"password":"synthetic-test-only"} failure synthetic-test-only', { password: 'synthetic-test-only' }); expect(masked).not.toContain('synthetic-test-only'); expect(masked).toContain('••••••'); });
  it('validates ZIP bytes independently of MIME and rejects error bodies masquerading as downloads', async () => {
    const archive = new Blob([new Uint8Array([0x50, 0x4b, 3, 4, 0, 0])], { type: 'application/octet-stream' }); expect(await assertZipDownload(archive)).toBe(archive);
    const error = new Blob(['{"success":false,"message":"invalid package name"}'], { type: 'application/zip' }); await expect(assertZipDownload(error)).rejects.toThrow('invalid package name');
    await expect(assertZipDownload(new Blob(['<html>Error</html>'], { type: 'application/zip' }))).rejects.toThrow('valid ZIP'); await expect(assertZipDownload({ success: true, data: 'oops' })).rejects.toThrow('valid ZIP');
  });
  it('uploads multipart JAR bytes with the captured application and reports invalid upload responses', async () => {
    const file = new File([new Uint8Array([0x50, 0x4b, 3, 4, 0, 255, 128])], 'fixture.jar'); const signal = new AbortController().signal;
    vi.mocked(api.post).mockResolvedValueOnce('artifact-hash'); expect(await uploadJarFile(file, '9223372036854775800', signal)).toBe('artifact-hash');
    const call = vi.mocked(api.post).mock.calls[0]; expect(call[0]).toBe('/container/jarUpload'); const body = call[1] as FormData; expect(Array.from(new Uint8Array(await (body.get('file') as File).arrayBuffer()))).toEqual([0x50, 0x4b, 3, 4, 0, 255, 128]); expect(call[2]).toMatchObject({ headers: { AppId: '9223372036854775800' }, signal });
    vi.mocked(api.post).mockResolvedValueOnce(undefined); await expect(uploadJarFile(file, '1')).rejects.toThrow('valid JAR'); const count = vi.mocked(api.post).mock.calls.length; await expect(uploadJarFile(new File([], 'empty.jar'), '1')).rejects.toThrow('empty file'); expect(api.post).toHaveBeenCalledTimes(count);
    vi.mocked(api.post).mockRejectedValueOnce(new Error('upload failed')); await expect(uploadJarFile(file, '1')).rejects.toThrow('upload failed');
  });
});
