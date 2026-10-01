// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { App, ConfigProvider } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requests = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
const session = vi.hoisted(() => ({ refreshSession: vi.fn(), navigate: vi.fn() }));
vi.mock('../lib/api', () => ({ api: requests }));
vi.mock('../lib/console', () => ({ useConsole: () => ({ ...session, language: 'cn', setLanguage: vi.fn(), t: (zh: string) => zh }) }));
vi.mock('react-router-dom', () => ({ useNavigate: () => session.navigate, useLocation: () => ({ pathname: '/powerjobLogin' }) }));
import Login from './Login';

let container: HTMLDivElement;
let root: Root;
const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(element => element.textContent?.replace(/\s+/g, '') === label)!;
async function fill(element: HTMLInputElement, value: string) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); }); }
async function render() { await act(async () => root.render(<ConfigProvider theme={{ token: { motion: false } }}><App><Login/></App></ConfigProvider>)); }

beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear(); window.history.replaceState(null, '', '/');
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  requests.get.mockImplementation((path: string) => Promise.resolve(path === '/auth/supportLoginTypes' ? [{ type: 'PWJB', name: 'PowerJob Account' }] : null));
  requests.post.mockResolvedValue({ id: '19', jwtToken: 'fixture-login-session' });
  session.refreshSession.mockResolvedValue(undefined);
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

describe('login and registration retain the legacy request contract', () => {
  it('registers a nonstandard legacy email without a new client format restriction', async () => {
    await render(); await act(async () => button('创建账号').click());
    for (const [field, value] of [['username', 'fixture-register-user'], ['email', 'legacy-internal-alias'], ['password', 'fixture-placeholder'], ['password2', 'fixture-placeholder']]) await fill(input(`powerjob-register_${field}`), value);
    await act(async () => {
      input('powerjob-register_email').form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await vi.waitFor(() => expect(requests.post.mock.calls.some(([path]) => path === '/pwjbUser/create')).toBe(true));
    });
    expect(requests.post.mock.calls.find(([path]) => path === '/pwjbUser/create')![1]).toMatchObject({ username: 'fixture-register-user', email: 'legacy-internal-alias' });
    expect(requests.post.mock.calls.filter(([path]) => path === '/pwjbUser/create')).toHaveLength(1);
    expect(localStorage.getItem('PowerJwt')).toBeNull();
  });

  it('does not replace a newer session with a late response and releases the new session login controls', async () => {
    let release!: (value: unknown) => void;
    requests.post.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    await render();
    await fill(input('powerjob-login_username'), 'fixture-login-user');
    await fill(input('powerjob-login_password'), 'fixture-placeholder');
    await act(async () => { button('登录工作空间').click(); await vi.waitFor(() => expect(release).toBeTypeOf('function')); });
    localStorage.setItem('PowerJwt', 'fixture-newer-session');
    await render();
    expect(button('登录工作空间').disabled).toBe(false);
    await act(async () => { release({ jwtToken: 'fixture-previous-session' }); await Promise.resolve(); });
    expect(localStorage.getItem('PowerJwt')).toBe('fixture-newer-session');
    expect(session.refreshSession).not.toHaveBeenCalled();
    expect(session.navigate).not.toHaveBeenCalled();
    await act(async () => { button('登录工作空间').click(); await vi.waitFor(() => expect(session.refreshSession).toHaveBeenCalledOnce()); });
    expect(localStorage.getItem('PowerJwt')).toBe('fixture-login-session');
    expect(session.navigate).toHaveBeenCalledOnce();
  });

  it('keeps a session-read failure visible and allows retry after its own successful direct login', async () => {
    session.refreshSession.mockRejectedValueOnce(new Error('fixture session read unavailable'));
    await render();
    await fill(input('powerjob-login_username'), 'fixture-login-user');
    await fill(input('powerjob-login_password'), 'fixture-placeholder');
    await act(async () => { button('登录工作空间').click(); await vi.waitFor(() => expect(session.refreshSession).toHaveBeenCalledOnce()); });
    expect(container.textContent).toContain('fixture session read unavailable');
    expect(button('登录工作空间').disabled).toBe(false);
    expect(session.navigate).not.toHaveBeenCalled();
    expect(localStorage.getItem('PowerJwt')).toBe('fixture-login-session');
  });

  it('rechecks an externally replaced session without leaving the initial checking screen stuck', async () => {
    let release!: (value: unknown) => void;
    let checks = 0;
    requests.get.mockImplementation((path: string) => {
      if (path === '/auth/supportLoginTypes') return Promise.resolve([{ type: 'PWJB', name: 'PowerJob Account' }]);
      if (++checks === 1) return new Promise(resolve => { release = resolve; });
      return Promise.resolve(null);
    });
    await render();
    expect(container.textContent).toContain('正在检查登录状态');
    localStorage.setItem('PowerJwt', 'fixture-external-session');
    await render();
    expect(input('powerjob-login_username')).not.toBeNull();
    expect(container.textContent).not.toContain('正在检查登录状态');
    await act(async () => { release({ id: '19' }); await Promise.resolve(); });
    expect(session.navigate).not.toHaveBeenCalled();
    expect(input('powerjob-login_username')).not.toBeNull();
  });
});
