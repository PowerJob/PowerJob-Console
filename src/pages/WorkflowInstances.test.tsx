// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { App } from 'antd';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { WorkflowGraphProps } from '../features/workflow/WorkflowGraph';

const requests = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../lib/api', () => ({ api: requests, stringifyJson: JSON.stringify }));
vi.mock('../lib/console', () => ({ useConsole: () => ({ appId: '1', t: (zh: string) => zh }) }));
vi.mock('../components/ui', () => ({
  PageHeader: ({ title, actions }: { title: string; actions: React.ReactNode }) => <header><h1>{title}</h1>{actions}</header>,
  Panel: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  QueryBar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, RefreshButton: () => null, ErrorState: () => null,
}));
vi.mock('../features/workflow/WorkflowGraph', () => ({ default: ({ nodes, onSelect }: WorkflowGraphProps) => <div>{nodes.map(node => <button key={node.nodeId} onClick={() => onSelect(node)}>{node.nodeName}</button>)}</div> }));
vi.mock('../features/workflow/CodeEditor', () => ({ default: () => null }));
vi.mock('../features/jobs/InstanceDetail', () => ({ default: () => null, LogViewer: () => null }));
import WorkflowInstances from './WorkflowInstances';

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
const parentId = '9223372036854775801'; const childId = '9223372036854775802';
const detail = (id: string, name: string) => ({ wfInstanceId: id, workflowId: '8', workflowName: name, status: 3, peworkflowDAG: { nodes: id === parentId ? [{ nodeId: '23', nodeType: 3, nodeName: '子工作流节点', instanceId: childId, status: 5, enable: true }] : [], edges: [] } });
let container: HTMLDivElement; let root: Root;
const button = (label: string) => [...container.querySelectorAll<HTMLButtonElement>('button')].find(element => element.textContent?.replace(/\s+/g, '') === label)!;
async function mount() { await act(async () => root.render(<App><MemoryRouter initialEntries={[`/oms/wfInstanceDetail?wfInstanceId=${parentId}`]}><WorkflowInstances/></MemoryRouter></App>)); }
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear(); localStorage.setItem('PowerJwt', 'fixture-session-a');
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  requests.post.mockResolvedValue({ data: [], totalItems: 0 });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); localStorage.clear(); });

it('clears the previous operation on nested navigation and does not clear a new operation when the old one completes', async () => {
  const oldRetry = deferred<unknown>(); const newRetry = deferred<unknown>();
  requests.get.mockImplementation((path: string, params: { wfInstanceId: string }) => path === '/wfInstance/info' ? Promise.resolve(detail(params.wfInstanceId, params.wfInstanceId === parentId ? '父工作流实例' : '子工作流实例')) : path === '/wfInstance/retry' ? params.wfInstanceId === parentId ? oldRetry.promise : newRetry.promise : Promise.resolve({}));
  await mount(); await act(async () => button('子工作流节点').click()); await act(async () => button('重新运行').click());
  expect(button('重新运行').classList.contains('ant-btn-loading')).toBe(true);
  await act(async () => button('查看子工作流实例').click());
  expect(container.textContent).toContain('子工作流实例'); expect(button('重新运行').classList.contains('ant-btn-loading')).toBe(false);
  await act(async () => button('重新运行').click());
  expect(requests.get.mock.calls.filter(([path]) => path === '/wfInstance/retry').map(([, params]) => params.wfInstanceId)).toEqual([parentId, childId]);
  await act(async () => oldRetry.resolve(true)); expect(button('重新运行').classList.contains('ant-btn-loading')).toBe(true);
  await act(async () => newRetry.resolve(true)); expect(button('重新运行').classList.contains('ant-btn-loading')).toBe(false);
});

it('aborts pending instance reads on same-app identity replacement and ignores late old detail data', async () => {
  const oldRead = deferred<ReturnType<typeof detail>>(); let reads = 0;
  requests.get.mockImplementation((path: string) => path === '/wfInstance/info' ? ++reads === 1 ? oldRead.promise : Promise.resolve(detail(parentId, '新身份实例详情')) : Promise.resolve({}));
  await mount(); const oldOptions = requests.get.mock.calls.find(([path]) => path === '/wfInstance/info')![2];
  localStorage.setItem('PowerJwt', 'fixture-session-b'); await mount();
  expect(oldOptions.signal.aborted).toBe(true); expect(container.textContent).toContain('新身份实例详情');
  await act(async () => oldRead.resolve(detail(parentId, '旧身份实例详情')));
  expect(container.textContent).not.toContain('旧身份实例详情'); expect(container.textContent).toContain('新身份实例详情');
});
