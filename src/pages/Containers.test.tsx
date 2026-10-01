// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { App } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requests = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), download: vi.fn(), uploadSuccess: vi.fn(), uploadError: vi.fn() }));
vi.mock('../lib/api', () => ({ api: requests, ApiError: class ApiError extends Error {}, parseJson: JSON.parse, stringifyJson: JSON.stringify, downloadBlob: requests.download, websocketUrl: (path: string) => `ws://localhost${path}` }));
vi.mock('../lib/console', () => ({ useConsole: () => ({ appId: '1', t: (zh: string) => zh }) }));
vi.mock('../components/ui', () => ({
  PageHeader: ({ title, actions }: { title: string; actions: React.ReactNode }) => <header><h1>{title}</h1>{actions}</header>,
  Panel: ({ children }: { children: React.ReactNode }) => <section>{children}</section>, RefreshButton: () => null, ErrorState: () => null, formatTime: () => '—',
}));
vi.mock('antd', async importOriginal => {
  const actual = await importOriginal<typeof import('antd')>();
  return { ...actual, Upload: { Dragger: ({ customRequest, disabled }: { customRequest: (options: unknown) => void; disabled?: boolean }) => <button disabled={disabled} onClick={() => customRequest({ file: new File(['fixture-bytes'], 'fixture.jar'), onSuccess: requests.uploadSuccess, onError: requests.uploadError })}>上传回归 JAR</button> } };
});
import Containers, { ContainerTemplate } from './Containers';

function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const row = { id: '9', containerName: '隔离容器', sourceType: 'FatJar', sourceInfo: 'original-hash', status: 'ENABLE' };
class FakeSocket {
  static connections: FakeSocket[] = [];
  onopen?: () => void; onmessage?: (event: { data: string }) => void; onerror?: () => void; onclose?: () => void;
  close = vi.fn(); constructor(public url: string) { FakeSocket.connections.push(this); }
}
let container: HTMLDivElement; let root: Root;
const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(element => element.textContent?.replace(/\s+/g, '') === label)!;
const input = (id: string) => document.querySelector<HTMLInputElement>(`#${id}`)!;
async function fill(element: HTMLInputElement, value: string) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); }); }
async function mount(template = false) { await act(async () => root.render(<App><MemoryRouter initialEntries={['/oms/containermanage']}>{template ? <ContainerTemplate/> : <Containers/>}</MemoryRouter></App>)); }
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear(); localStorage.setItem('PowerJwt', 'fixture-session-a'); FakeSocket.connections = []; vi.stubGlobal('WebSocket', FakeSocket);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  requests.get.mockResolvedValue([row]); requests.post.mockResolvedValue(true);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); localStorage.clear(); vi.unstubAllGlobals(); });

describe('container session isolation', () => {
  it('locks editing and uploads while saving, then restores the same draft after failure', async () => {
    const save = deferred<unknown>(); requests.post.mockReturnValueOnce(save.promise).mockResolvedValueOnce(true);
    await mount(); await act(async () => button('编辑').click()); await fill(input('containerEditor_containerName'), '需要保留的容器草稿'); await act(async () => button('保存容器').click());
    expect(input('containerEditor_containerName').disabled).toBe(true); expect(button('上传回归JAR').disabled).toBe(true);
    const sources = [...document.querySelectorAll<HTMLInputElement>('#containerEditor_sourceType input')]; expect(sources).toHaveLength(2); expect(sources.every(element => element.disabled)).toBe(true);
    expect(requests.post.mock.calls[0][1]).toMatchObject({ containerName: '需要保留的容器草稿', sourceInfo: 'original-hash' });
    await act(async () => save.reject(new Error('save rejected')));
    expect(input('containerEditor_containerName').disabled).toBe(false); expect(input('containerEditor_containerName').value).toBe('需要保留的容器草稿'); expect(button('上传回归JAR').disabled).toBe(false);
    await fill(input('containerEditor_containerName'), '拒绝后继续编辑的草稿'); await act(async () => button('保存容器').click());
    expect(requests.post.mock.calls[1][1]).toMatchObject({ containerName: '拒绝后继续编辑的草稿', sourceInfo: 'original-hash' });
  });
  it('aborts a pending upload and ignores its late artifact after identity replacement', async () => {
    const upload = deferred<string>(); requests.post.mockImplementation((path: string) => path === '/container/jarUpload' ? upload.promise : Promise.resolve(true));
    await mount(); await act(async () => button('编辑').click()); await act(async () => button('上传回归JAR').click());
    const uploadOptions = requests.post.mock.calls.find(([path]) => path === '/container/jarUpload')![2];
    localStorage.setItem('PowerJwt', 'fixture-session-b'); await mount(); expect(uploadOptions.signal.aborted).toBe(true);
    await act(async () => button('编辑').click()); await act(async () => upload.resolve('old-session-artifact'));
    expect(requests.uploadSuccess).not.toHaveBeenCalled(); expect(document.body.textContent).not.toContain('old-session-artifact'); expect(document.body.textContent).toContain('original-hash');
  });
  it('closes the previous deployment connection and ignores its callbacks even before the identity rerender', async () => {
    await mount(); await act(async () => button('部署').click()); const previous = FakeSocket.connections[0];
    await act(async () => { previous.onopen?.(); previous.onmessage?.({ data: 'original-deployment-line' }); }); expect(document.body.textContent).toContain('original-deployment-line');
    localStorage.setItem('PowerJwt', 'fixture-session-b'); await act(async () => previous.onmessage?.({ data: 'forbidden-pre-rerender-line' }));
    expect(document.body.textContent).not.toContain('forbidden-pre-rerender-line');
    await mount(); expect(previous.close).toHaveBeenCalled(); await act(async () => button('部署').click());
    const replacement = FakeSocket.connections[1]; await act(async () => { replacement.onopen?.(); replacement.onmessage?.({ data: 'replacement-deployment-line' }); previous.onmessage?.({ data: 'forbidden-late-deployment-line' }); previous.onclose?.(); });
    expect(document.body.textContent).toContain('replacement-deployment-line'); expect(document.body.textContent).not.toContain('forbidden-late-deployment-line');
  });
  it('does not let an old save completion close the new identity editor or refresh its list', async () => {
    const save = deferred<unknown>(); requests.post.mockReturnValue(save.promise);
    await mount(); await act(async () => button('编辑').click()); await fill(input('containerEditor_containerName'), '旧身份名称'); await act(async () => button('保存容器').click());
    const options = requests.post.mock.calls.find(([path]) => path === '/container/save')![2];
    localStorage.setItem('PowerJwt', 'fixture-session-b'); await mount(); await act(async () => button('编辑').click()); await fill(input('containerEditor_containerName'), '新身份草稿');
    const reads = requests.get.mock.calls.length; expect(options.signal.aborted).toBe(true);
    await act(async () => save.resolve(true)); expect(input('containerEditor_containerName').value).toBe('新身份草稿'); expect(requests.get).toHaveBeenCalledTimes(reads);
  });
});

describe('container template compatibility', () => {
  async function enterTemplate(artifact: string) { await fill(input('containerTemplate_group'), 'commons-net'); await fill(input('containerTemplate_artifact'), artifact); await fill(input('containerTemplate_name'), '回归项目'); await fill(input('containerTemplate_packageName'), 'com.示例.$tasks'); }
  it.each(['_tasks', '-tasks'])('submits Maven artifact %s and valid Java 8 Unicode/dollar packages unchanged', async artifact => {
    requests.post.mockResolvedValue(new Blob([new Uint8Array([0x50, 0x4b, 3, 4])], { type: 'application/octet-stream' }));
    await mount(true); await enterTemplate(artifact); await act(async () => button('生成并下载ZIP').click());
    expect(requests.post).toHaveBeenCalledWith('/container/downloadContainerTemplate', { group: 'commons-net', artifact, name: '回归项目', packageName: 'com.示例.$tasks', javaVersion: 8 }, expect.objectContaining({ responseType: 'blob' }));
    expect(requests.download).toHaveBeenCalledWith(expect.any(Blob), `${artifact}.zip`);
  });
  it('does not download an archive requested by a previous login identity', async () => {
    const archive = deferred<Blob>(); requests.post.mockReturnValue(archive.promise);
    await mount(true); await enterTemplate('tasks'); await act(async () => button('生成并下载ZIP').click());
    const options = requests.post.mock.calls[0][2]; localStorage.setItem('PowerJwt', 'fixture-session-b'); await mount(true); expect(options.signal.aborted).toBe(true);
    await act(async () => archive.resolve(new Blob([new Uint8Array([0x50, 0x4b, 3, 4])]))); expect(requests.download).not.toHaveBeenCalled(); expect(input('containerTemplate_group').value).toBe('');
  });
});
