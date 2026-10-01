// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { App, ConfigProvider } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requests = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
const session = vi.hoisted(() => ({ logout: vi.fn(), refreshSession: vi.fn() }));
vi.mock('../lib/api', () => ({ api: requests }));
vi.mock('../lib/console', () => ({ useConsole: () => ({ ...session, t: (zh: string) => zh }) }));
vi.mock('../components/ui', () => ({
  PageHeader: ({ title, actions }: { title: string; actions: React.ReactNode }) => <header><h1>{title}</h1>{actions}</header>,
  Panel: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  RefreshButton: () => null,
  ErrorState: ({ error }: { error?: Error }) => error ? <p>{error.message}</p> : null,
}));
import Profile from './Profile';

let container: HTMLDivElement;
let root: Root;
let storedProfile: Record<string, unknown>;
const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(element => element.textContent?.replace(/\s+/g, '') === label)!;
async function fill(element: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function mount() { await act(async () => root.render(<ConfigProvider theme={{ token: { motion: false } }}><App><Profile/></App></ConfigProvider>)); }

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem('PowerJwt', 'fixture-profile-session');
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  storedProfile = { id: '9', username: 'PWJB_fixture-profile', originUsername: 'fixture-profile', accountType: 'PWJB', nick: '原昵称', phone: 'extension-109', email: 'legacy-internal-alias', webHook: 'https://example.invalid/profile', globalRoles: [] };
  requests.get.mockImplementation((path: string) => path === '/user/detail' ? Promise.resolve({ ...storedProfile }) : Promise.reject(new Error(`Unexpected GET ${path}`)));
  requests.post.mockRejectedValue(new Error('Backend rejected the submitted request'));
  session.refreshSession.mockResolvedValue(undefined);
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

describe('legacy personal profile and credential request values', () => {
  it('saves a nickname change while retaining a pre-existing nonstandard email, then reads the successful profile back', async () => {
    requests.post.mockImplementation((path: string, body: Record<string, unknown>) => {
      if (path !== '/user/modify') return Promise.reject(new Error(`Unexpected POST ${path}`));
      storedProfile = { ...storedProfile, ...body };
      return Promise.resolve(null);
    });
    await mount();
    expect(input('profile-details_email').value).toBe('legacy-internal-alias');
    await fill(input('profile-details_nick'), '只修改昵称');
    await act(async () => {
      input('profile-details_nick').form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await vi.waitFor(() => expect(requests.post).toHaveBeenCalledWith('/user/modify', { id: '9', nick: '只修改昵称', phone: 'extension-109', email: 'legacy-internal-alias', webHook: 'https://example.invalid/profile' }, expect.objectContaining({ signal: expect.any(AbortSignal) })));
    });
    await act(async () => Promise.resolve());
    expect(requests.get.mock.calls.filter(([path]) => path === '/user/detail')).toHaveLength(2);
    expect(session.refreshSession).toHaveBeenCalledOnce();
    expect(input('profile-details_nick').value).toBe('只修改昵称');
    expect(input('profile-details_email').value).toBe('legacy-internal-alias');
  });

  it('ignores an old identity response and submits only the newly loaded account ID', async () => {
    let release!: (profile: Record<string, unknown>) => void;
    const old = { ...storedProfile };
    requests.get.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    await mount();
    localStorage.setItem('PowerJwt', 'fixture-profile-session-b');
    storedProfile = { ...storedProfile, id: '20', nick: '新会话用户', username: 'PWJB_fixture-next', originUsername: 'fixture-next' };
    await mount();
    await act(async () => { release(old); await Promise.resolve(); });
    expect(input('profile-details_nick').value).toBe('新会话用户');
    await fill(input('profile-details_nick'), '新会话修改');
    await act(async () => {
      input('profile-details_nick').form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await vi.waitFor(() => expect(requests.post).toHaveBeenCalledOnce());
    });
    expect(requests.post.mock.calls[0]![1]).toMatchObject({ id: '20', nick: '新会话修改' });
  });

  it.each(['untouched', 'empty', 'mismatched'] as const)('leaves %s password values to the existing server contract and retains the form after server rejection', async kind => {
    await mount();
    await act(async () => button('修改密码').click());
    if (kind === 'empty') {
      for (const field of ['oldPassword', 'newPassword', 'newPassword2']) {
        await fill(input(`profile-password_${field}`), 'fixture-placeholder');
        await fill(input(`profile-password_${field}`), '');
      }
    } else if (kind === 'mismatched') {
      await fill(input('profile-password_oldPassword'), 'fixture-current');
      await fill(input('profile-password_newPassword'), 'fixture-next-a');
      await fill(input('profile-password_newPassword2'), 'fixture-next-b');
    }
    await act(async () => {
      button('确认修改').click();
      await vi.waitFor(() => expect(requests.post).toHaveBeenCalledOnce());
    });
    const [path, payload] = requests.post.mock.calls[0]!;
    expect(path).toBe('/pwjbUser/changePassword');
    expect(payload.username).toBe('fixture-profile');
    const values = kind === 'untouched' ? [undefined, undefined, undefined] : kind === 'empty' ? ['', '', ''] : ['fixture-current', 'fixture-next-a', 'fixture-next-b'];
    expect([payload.oldPassword, payload.newPassword, payload.newPassword2]).toEqual(values);
    expect(session.logout).not.toHaveBeenCalled();
    expect(input('profile-password_newPassword').value).toBe(values[1] || '');
    expect(input('profile-password_newPassword2').value).toBe(values[2] || '');
    expect(button('确认修改')).toBeDefined();
  });
});
