// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const context = vi.hoisted(() => ({ appId: '1', appName: 'Scheduling', user: { nick: 'Test user' }, language: 'cn', refreshSession: vi.fn(async () => {}), setApp: vi.fn(), setLanguage: vi.fn(), logout: vi.fn(), t: (zh: string) => zh }));
vi.mock('../lib/console', () => ({ useConsole: () => context }));
vi.mock('../lib/api', () => ({ api: { post: vi.fn() } }));
import { api } from '../lib/api';
import Shell from './Shell';

let container: HTMLDivElement; let root: Root;
function Place() { const location = useLocation(); return <output data-testid="route">{location.pathname + location.search}</output>; }
async function mount(path = '/oms/job') { await act(async () => root.render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<Shell/>}><Route path="*" element={<Place/>}/></Route></Routes></MemoryRouter>)); }
function button(label: string) { return container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!; }
async function click(element: HTMLElement) { await act(async () => element.click()); }
const route = () => container.querySelector('[data-testid="route"]')?.textContent;

beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.post).mockResolvedValue({ data: [{ id: '1', appName: 'Scheduling' }], totalItems: 1 }); localStorage.clear(); context.appId = '1'; container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

describe('Console navigation scopes', () => {
  it('separates organization navigation from the selected application, and returns to the last workspace route', async () => {
    await mount('/oms/job?jobId=123');
    expect(container.querySelector('nav[aria-label="工作区功能"]')).not.toBeNull();
    expect(container.querySelector('a[href="/admin/user"]')).toBeNull();
    expect(container.querySelector('.app-switcher')).not.toBeNull();
    await click(button('组织管理'));
    expect(route()).toBe('/admin/app');
    expect(container.querySelector('nav[aria-label="组织管理功能"]')).not.toBeNull();
    expect(container.querySelector('a[href="/oms/job"]')).toBeNull();
    expect(container.querySelector('.app-switcher')).toBeNull();
    await click(button('工作区'));
    expect(route()).toBe('/oms/job?jobId=123');
    expect(context.setApp).not.toHaveBeenCalled();
  });
  it('collapses without changing the current route or application, and persists the choice', async () => {
    await mount(); await click(button('收起导航'));
    expect(container.querySelector('.app-shell')?.classList.contains('sidebar-collapsed')).toBe(true);
    expect(button('展开导航').getAttribute('aria-expanded')).toBe('false');
    expect(localStorage.getItem('Power_consoleSidebarCollapsed')).toBe('true');
    expect(route()).toBe('/oms/job'); expect(context.setApp).not.toHaveBeenCalled();
    expect(container.querySelector('a[aria-label="任务管理"]')?.getAttribute('aria-current')).toBe('page');
    await click(button('展开导航')); expect(localStorage.getItem('Power_consoleSidebarCollapsed')).toBe('false');
  });
  it('restores a collapsed sidebar on a direct history link', async () => {
    localStorage.setItem('Power_consoleSidebarCollapsed', 'true');
    await mount('/oms/wfInstanceDetail?wfInstanceId=987654321098765432');
    expect(button('展开导航')).not.toBeNull();
    expect(container.querySelector('a[aria-label="工作流实例"]')?.getAttribute('aria-current')).toBe('page');
    expect(route()).toBe('/oms/wfInstanceDetail?wfInstanceId=987654321098765432');
  });
  it('keeps personal settings in the current scope rather than making it an organization operation', async () => {
    await mount('/oms/workflowEditor?workflowId=9');
    expect(container.querySelector('a[aria-label="工作流"]')?.getAttribute('aria-current')).toBe('page');
    const keyboard = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
    await act(async () => window.dispatchEvent(keyboard));
    const profile = [...document.querySelectorAll<HTMLButtonElement>('.command-list button')].find(element => element.textContent?.startsWith('个人设置'))!;
    await click(profile);
    expect(route()).toBe('/admin/personal');
    expect(button('工作区').getAttribute('aria-pressed')).toBe('true');
  });
  it('explains that a workspace requires selecting an application', async () => {
    context.appId = ''; await mount('/admin/app');
    expect(button('工作区').disabled).toBe(true); expect(button('组织管理').getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('nav[aria-label="组织管理功能"]')).not.toBeNull();
  });
  it('drops the previous application query when another tab changes the selected application', async () => {
    await mount('/oms/instance?instanceId=987654321098765432');
    await click(button('组织管理'));
    context.appId = '2'; await mount();
    await click(button('工作区'));
    expect(route()).toBe('/oms/home');
    expect(context.setApp).not.toHaveBeenCalled();
  });
  it('returns an active workspace to Overview when its application changes externally', async () => {
    await mount('/oms/wfInstanceDetail?wfInstanceId=987654321098765432');
    context.appId = '2'; await mount();
    expect(route()).toBe('/oms/home');
    expect(container.querySelector('a[aria-label="运行概览"]')?.getAttribute('aria-current')).toBe('page');
  });
  it('reloads applications after a session change and ignores the old account response', async () => {
    let resolveOld!: (value: any) => void;
    vi.mocked(api.post).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    localStorage.setItem('PowerJwt', 'unit-old-session');
    await mount();
    expect(api.post).toHaveBeenCalledTimes(1);
    vi.mocked(api.post).mockResolvedValue({ data: [{ id: '1', appName: 'New session application' }], totalItems: 1 });
    localStorage.setItem('PowerJwt', 'unit-new-session');
    await mount();
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('New session application');
    await act(async () => resolveOld({ data: [{ id: '1', appName: 'Old session application' }], totalItems: 1 }));
    expect(container.textContent).toContain('New session application');
    expect(container.textContent).not.toContain('Old session application');
  });
});
