// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../lib/api', () => ({ api: { get: fixture.get } }));
vi.mock('../lib/console', () => ({ useConsole: () => ({ appId: '1', appName: 'fixture-app', t: (zh: string) => zh }) }));
vi.mock('../features/overview/OverviewClock', () => ({ OverviewClock: () => <span>clock fixture</span> }));
vi.mock('../components/ui', () => ({ ErrorState: ({ error }: { error?: Error }) => error ? <p>{error.message}</p> : null, Panel: ({ children }: { children: React.ReactNode }) => <section>{children}</section>, PageHeader: () => null, RefreshButton: () => null, formatTime: String }));
import Overview from './Overview';

let root: Root;
let container: HTMLDivElement;
const pending = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
async function render() { await act(async () => root.render(<MemoryRouter><Overview/></MemoryRouter>)); }
beforeEach(() => { vi.resetAllMocks(); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); localStorage.setItem('Power_appId', '1'); localStorage.setItem('PowerJwt', 'synthetic-session-a'); container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); localStorage.clear(); });

describe('Overview data isolation across session changes', () => {
  it('cancels old requests and never shows their late statistics or worker addresses to the replacement account', async () => {
    const oldOverview = pending<Record<string, unknown>>(); const oldWorkers = pending<Record<string, unknown>[]>();
    fixture.get.mockImplementation((path: string) => localStorage.getItem('PowerJwt') === 'synthetic-session-a' ? path === '/system/overview' ? oldOverview.promise : oldWorkers.promise : Promise.resolve(path === '/system/overview' ? { appName: 'new-session-app', jobCount: 17 } : [{ address: 'new-session-worker', status: 1 }]));
    await render(); const oldSignals = fixture.get.mock.calls.map(call => call[2]?.signal as AbortSignal);
    localStorage.setItem('PowerJwt', 'synthetic-session-b'); await render();
    expect(fixture.get).toHaveBeenCalledTimes(4);
    expect(oldSignals.every(signal => signal.aborted)).toBe(true);
    expect(container.textContent).toContain('new-session-app');
    await act(async () => { oldOverview.resolve({ appName: 'former-session-app', jobCount: 999 }); oldWorkers.resolve([{ address: 'former-session-worker', status: 1 }]); });
    expect(container.textContent).not.toContain('former-session-app');
    expect(container.textContent).not.toContain('former-session-worker');
    expect(container.textContent).toContain('new-session-worker');
  });
});
