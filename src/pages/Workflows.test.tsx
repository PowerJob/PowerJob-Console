// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { App } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkflowGraphProps } from '../features/workflow/WorkflowGraph';

const requests = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../lib/api', () => ({ api: requests, ApiError: class ApiError extends Error {}, stringifyJson: JSON.stringify }));
vi.mock('../lib/console', () => ({ useConsole: () => ({ appId: '1', t: (zh: string) => zh }) }));
vi.mock('../components/ui', () => ({
  PageHeader: ({ title, actions }: { title: string; actions: React.ReactNode }) => <header><h1>{title}</h1>{actions}</header>,
  Panel: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  QueryBar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RefreshButton: () => null,
  ErrorState: ({ error, retry }: { error?: Error; retry: () => void }) => error ? <button onClick={retry}>重试加载</button> : null,
}));
vi.mock('../features/workflow/WorkflowGraph', () => ({ default: ({ nodes, onSelect, editable, actions }: WorkflowGraphProps) => <div data-editable={String(editable)}>{actions}{nodes.map(node => <button key={node.nodeId} disabled={!editable} onClick={() => onSelect(node)}>{node.nodeName}</button>)}</div> }));
vi.mock('../features/workflow/CodeEditor', () => ({ default: ({ readOnly }: { readOnly: boolean }) => <textarea readOnly={readOnly}/> }));
import Workflows from './Workflows';

function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const workflow = (name = '复制的工作流') => ({ id: '8', wfName: name, enable: true, maxWfInstanceNum: 1, timeExpressionType: 'API', notifyUserIds: [], peworkflowDAG: { nodes: [{ nodeId: '23', nodeType: 1, jobId: '9', nodeName: '独立节点', nodeParams: '{}', enable: true, skipWhenFailed: false }], edges: [] } });
let container: HTMLDivElement; let root: Root;
const input = (id: string) => container.querySelector<HTMLInputElement>(`#${id}`)!;
const button = (label: string) => [...container.querySelectorAll<HTMLButtonElement>('button')].find(element => element.textContent?.replace(/\s+/g, '') === label)!;
async function fill(element: HTMLInputElement, value: string) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); }); }
async function mount() { await act(async () => root.render(<App><MemoryRouter initialEntries={['/oms/workflowEditor?workflowId=8']}><Workflows/></MemoryRouter></App>)); }

beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear(); localStorage.setItem('PowerJwt', 'fixture-session-a'); container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  requests.get.mockImplementation((path: string) => path === '/user/list' ? Promise.resolve([]) : Promise.reject(new Error(`Unexpected GET ${path}`)));
  requests.post.mockResolvedValue({ data: [], totalItems: 0 });
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); localStorage.clear(); });

describe('workflow editor asynchronous readback', () => {
  it('prevents editing the copy while initial readback is pending, then preserves the editable draft', async () => {
    const load = deferred<ReturnType<typeof workflow>>(); requests.get.mockImplementation((path: string) => path === '/workflow/fetch' ? load.promise : Promise.resolve([]));
    await mount();
    expect(input('workflowGlobal_wfName').disabled).toBe(true); expect(button('保存工作流').disabled).toBe(true); expect(button('添加任务').disabled).toBe(true);
    await act(async () => load.resolve(workflow()));
    expect(input('workflowGlobal_wfName').disabled).toBe(false); expect(button('添加任务').disabled).toBe(false);
    await fill(input('workflowGlobal_wfName'), '用户输入的副本名称');
    await act(async () => Promise.resolve());
    expect(input('workflowGlobal_wfName').value).toBe('用户输入的副本名称');
    await act(async () => button('独立节点').click()); expect(input('workflowNode_nodeName').disabled).toBe(false);
  });

  it('locks the form and graph through saving and the subsequent server readback', async () => {
    const saved = deferred<string>(); const readback = deferred<ReturnType<typeof workflow>>(); let fetchCount = 0;
    requests.get.mockImplementation((path: string) => path === '/workflow/fetch' ? ++fetchCount === 1 ? Promise.resolve(workflow()) : readback.promise : Promise.resolve([]));
    requests.post.mockImplementation((path: string) => path === '/workflow/save' ? saved.promise : Promise.resolve([]));
    await mount(); await act(async () => button('独立节点').click()); await fill(input('workflowGlobal_wfName'), '保存后的名称');
    await act(async () => button('保存工作流').click());
    expect(input('workflowGlobal_wfName').disabled).toBe(true); expect(input('workflowNode_nodeName').disabled).toBe(true); expect(button('独立节点').disabled).toBe(true);
    expect(requests.post.mock.calls.find(([path]) => path === '/workflow/save')?.[1].wfName).toBe('保存后的名称');
    await act(async () => saved.resolve('8'));
    expect(fetchCount).toBe(2); expect(input('workflowGlobal_wfName').disabled).toBe(true); expect(button('保存工作流').disabled).toBe(true);
    await act(async () => readback.resolve(workflow('保存后的名称')));
    expect(input('workflowGlobal_wfName').disabled).toBe(false); expect(input('workflowGlobal_wfName').value).toBe('保存后的名称');
    await fill(input('workflowGlobal_wfName'), '回读完成后的新草稿'); expect(input('workflowGlobal_wfName').value).toBe('回读完成后的新草稿');
  });

  it('keeps a failed initial readback locked while leaving retry available', async () => {
    const retry = deferred<ReturnType<typeof workflow>>(); let fetchCount = 0;
    requests.get.mockImplementation((path: string) => path === '/workflow/fetch' ? ++fetchCount === 1 ? Promise.reject(new Error('connection failed')) : retry.promise : Promise.resolve([]));
    await mount(); expect(input('workflowGlobal_wfName').disabled).toBe(true); expect(button('重试加载').disabled).toBe(false);
    await act(async () => button('重试加载').click()); expect(input('workflowGlobal_wfName').disabled).toBe(true);
    await act(async () => retry.resolve(workflow())); expect(input('workflowGlobal_wfName').disabled).toBe(false);
  });

  it('locks independent node saves and preserves the node draft after a failed save', async () => {
    const saveNode = deferred<unknown>();
    requests.get.mockImplementation((path: string) => path === '/workflow/fetch' ? Promise.resolve(workflow()) : Promise.resolve([]));
    requests.post.mockImplementation((path: string) => path === '/workflow/saveNode' ? saveNode.promise : Promise.resolve([]));
    await mount(); await act(async () => button('独立节点').click()); await fill(input('workflowNode_nodeName'), '节点名称草稿');
    await act(async () => button('保存节点').click());
    expect(input('workflowNode_nodeName').disabled).toBe(true); expect(input('workflowGlobal_wfName').disabled).toBe(true);
    expect(requests.post.mock.calls.find(([path]) => path === '/workflow/saveNode')?.[1][0].nodeName).toBe('节点名称草稿');
    await act(async () => saveNode.reject(new Error('node save failed')));
    expect(input('workflowNode_nodeName').disabled).toBe(false); expect(input('workflowNode_nodeName').value).toBe('节点名称草稿');
    expect(input('workflowGlobal_wfName').disabled).toBe(false);
  });
  it('cancels the old identity save before the graph write and reloads the new identity draft', async () => {
    const nodeSave = deferred<unknown>(); let fetchCount = 0;
    requests.get.mockImplementation((path: string) => path === '/workflow/fetch' ? Promise.resolve(workflow(++fetchCount === 1 ? '旧身份原名称' : '新身份回读名称')) : Promise.resolve([]));
    requests.post.mockImplementation((path: string) => path === '/workflow/saveNode' ? nodeSave.promise : Promise.resolve({ data: [], totalItems: 0 }));
    await mount(); await fill(input('workflowGlobal_wfName'), '旧身份未保存草稿'); await act(async () => button('保存工作流').click());
    const nodeRequest = requests.post.mock.calls.find(([path]) => path === '/workflow/saveNode')!;
    localStorage.setItem('PowerJwt', 'fixture-session-b'); await mount();
    expect(nodeRequest[2].signal.aborted).toBe(true); expect(input('workflowGlobal_wfName').value).toBe('新身份回读名称');
    await act(async () => nodeSave.resolve([]));
    expect(requests.post.mock.calls.some(([path]) => path === '/workflow/save')).toBe(false); expect(input('workflowGlobal_wfName').value).toBe('新身份回读名称'); expect(button('保存工作流').disabled).toBe(false);
  });
  it('does not hydrate the editor with a previous identity response after a same-app login change', async () => {
    const oldLoad = deferred<ReturnType<typeof workflow>>(); let fetchCount = 0;
    requests.get.mockImplementation((path: string) => path === '/workflow/fetch' ? ++fetchCount === 1 ? oldLoad.promise : Promise.resolve(workflow('新身份的工作流')) : Promise.resolve([]));
    await mount(); localStorage.setItem('PowerJwt', 'fixture-session-b'); await mount();
    expect(input('workflowGlobal_wfName').value).toBe('新身份的工作流');
    await act(async () => oldLoad.resolve(workflow('已失效身份的工作流')));
    expect(input('workflowGlobal_wfName').value).toBe('新身份的工作流');
  });
});
