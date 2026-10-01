// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { App, ConfigProvider } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requests = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
const session = vi.hoisted(() => ({ appId: '1', setApp: vi.fn() }));
vi.mock('../lib/api', () => ({ api: requests }));
vi.mock('../lib/console', () => ({ useConsole: () => ({ ...session, language: 'cn', t: (zh: string) => zh }) }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../components/ui', () => ({
  PageHeader: ({ title, actions }: { title: string; actions: React.ReactNode }) => <header><h1>{title}</h1>{actions}</header>,
  Panel: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  RefreshButton: () => null,
  ErrorState: ({ error }: { error?: Error }) => error ? <p>{error.message}</p> : null,
}));
import Applications from './Applications';
import Namespaces from './Namespaces';

let container: HTMLDivElement;
let root: Root;
const emptyRoles = { observer: [], qa: [], developer: [], admin: [] };
const namespaces = [1, 2].map(id => ({ id: String(id), code: `fixture-ns-${id}`, name: `空间 ${id}`, componentUserRoleInfo: emptyRoles }));
const applications = [1, 2].map(id => ({ id: String(id), appName: `fixture-app-${id}`, title: `应用 ${id}`, namespaceId: '1', password: 'fixture-app-key', componentUserRoleInfo: emptyRoles }));
const button = (label: string, scope: ParentNode = document) => [...scope.querySelectorAll<HTMLButtonElement>('button')].find(element => element.textContent?.replace(/\s+/g, '') === label)!;
const drawer = () => document.querySelector('[role="dialog"]')!;
async function fill(element: HTMLInputElement, value: string) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); }); }
async function render(page: React.ReactNode) { await act(async () => root.render(<ConfigProvider theme={{ token: { motion: false } }}><App>{page}</App></ConfigProvider>)); }
async function editRow(text: string) { const row = [...container.querySelectorAll('tbody tr')].find(element => element.textContent?.includes(text))!; await act(async () => button('编辑', row).click()); }

beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.setItem('PowerJwt', 'fixture-session-a'); localStorage.setItem('Power_appId', '1'); session.appId = '1';
  requests.get.mockResolvedValue([]);
  requests.post.mockImplementation((path: string) => {
    if (path === '/appInfo/list') return Promise.resolve({ data: applications, totalItems: 2 });
    if (path === '/namespace/list') return Promise.resolve({ data: namespaces, totalItems: 2 });
    if (path === '/namespace/listAll') return Promise.resolve(namespaces);
    return Promise.resolve(null);
  });
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

describe('management mutations retain their original UI ownership', () => {
  it.each([
    ['application', Applications, '/appInfo/save', 'fixture-app-', 'applications-edit_title', '保存应用'],
    ['namespace', Namespaces, '/namespace/save', 'fixture-ns-', 'namespaces-edit_name', '保存命名空间'],
  ] as const)('does not close a new %s draft when an old-session save resolves', async (_, Page, savePath, rowText, fieldId, saveLabel) => {
    let release!: () => void;
    requests.post.mockImplementation((path: string) => {
      if (path === savePath) return new Promise<void>(resolve => { release = resolve; });
      if (path === '/appInfo/list') return Promise.resolve({ data: applications, totalItems: 2 });
      if (path === '/namespace/list') return Promise.resolve({ data: namespaces, totalItems: 2 });
      if (path === '/namespace/listAll') return Promise.resolve(namespaces);
      return Promise.resolve(null);
    });
    await render(<Page/>); await editRow(`${rowText}1`);
    await act(async () => { button(saveLabel, drawer()).click(); await vi.waitFor(() => expect(release).toBeTypeOf('function')); });
    expect(button('取消', drawer()).disabled).toBe(true);
    const requestOptions = requests.post.mock.calls.find(([path]) => path === savePath)![2];
    localStorage.setItem('PowerJwt', 'fixture-session-b');
    await render(<Page/>);
    expect(requestOptions.signal.aborted).toBe(true);
    await editRow(`${rowText}2`);
    await fill(document.getElementById(fieldId) as HTMLInputElement, '新身份未保存草稿');
    await act(async () => { release(); await Promise.resolve(); });
    expect((document.getElementById(fieldId) as HTMLInputElement).value).toBe('新身份未保存草稿');
    expect(button(saveLabel, drawer()).disabled).toBe(false);
  });

  it('does not clear application B when a previously confirmed deletion of A returns', async () => {
    let release!: () => void;
    const originalPost = requests.post.getMockImplementation()!;
    requests.post.mockImplementation((...args) => args[0] === '/appInfo/delete' ? new Promise<void>(resolve => { release = resolve; }) : originalPost(...args));
    await render(<Applications/>); await editRow('fixture-app-1');
    await act(async () => button('删除应用', drawer()).click());
    await act(async () => { button('删除应用', document.querySelector('.ant-modal-confirm')!).click(); await vi.waitFor(() => expect(release).toBeTypeOf('function')); });
    expect(requests.post.mock.calls.find(([path]) => path === '/appInfo/delete')![2].headers.AppId).toBe('1');
    localStorage.setItem('Power_appId', '2'); session.appId = '2';
    await render(<Applications/>);
    await act(async () => { release(); await Promise.resolve(); });
    expect(session.setApp).not.toHaveBeenCalled();
  });

  it('destroys a page-owned confirmation on navigation before it can send a request', async () => {
    await render(<Applications/>); await editRow('fixture-app-1');
    await act(async () => button('删除应用', drawer()).click());
    expect(document.querySelector('.ant-modal-confirm')).not.toBeNull();
    await render(<div>另一个页面</div>);
    await act(async () => Promise.resolve());
    expect(document.querySelector('.ant-modal-confirm')).toBeNull();
    expect(requests.post.mock.calls.some(([path]) => path === '/appInfo/delete')).toBe(false);
  });
});
