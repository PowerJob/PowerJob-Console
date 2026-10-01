// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({ post: vi.fn(), appId: '1' }));
vi.mock('../../lib/api', () => ({ api: { post: fixture.post } }));
vi.mock('../../lib/console', () => ({ useConsole: () => ({ appId: fixture.appId, t: (zh: string) => zh, language: 'cn' }) }));
vi.mock('../../components/ui', () => ({ ErrorState: ({ error }: { error?: Error }) => error ? <p>{error.message}</p> : null, StatusTag: ({ status }: { status: unknown }) => <span>{String(status)}</span>, formatTime: String }));
vi.mock('../../lib/enums', () => ({ EnumTag: ({ value }: { value: unknown }) => <span>{String(value)}</span> }));
import { InstanceDetailContent } from './InstanceDetail';

let root: Root;
let container: HTMLDivElement;
const result = (text: string) => ({ status: 5, result: text, queriedTaskDetailInfoList: [] });
const pending = () => { let resolve!: (value: ReturnType<typeof result>) => void; const promise = new Promise<ReturnType<typeof result>>(done => { resolve = done; }); return { promise, resolve }; };
async function render() { await act(async () => root.render(<InstanceDetailContent instanceId="9223372036854775807"/>)); }
beforeEach(() => { vi.resetAllMocks(); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); localStorage.setItem('Power_appId', '1'); localStorage.setItem('PowerJwt', 'synthetic-session-a'); container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); localStorage.clear(); });

describe('instance detail reads across account changes in the same application', () => {
  it('aborts the former session request and ignores its late successful detail', async () => {
    const old = pending(); fixture.post.mockReturnValueOnce(old.promise).mockResolvedValueOnce(result('new-session-detail'));
    await render(); const oldSignal = fixture.post.mock.calls[0]![2].signal as AbortSignal;
    localStorage.setItem('PowerJwt', 'synthetic-session-b'); await render();
    expect(fixture.post).toHaveBeenCalledTimes(2);
    expect(oldSignal.aborted).toBe(true);
    expect(container.textContent).toContain('new-session-detail');
    await act(async () => old.resolve(result('former-session-sensitive-detail')));
    expect(container.textContent).not.toContain('former-session-sensitive-detail');
    expect(container.textContent).toContain('new-session-detail');
    expect(fixture.post.mock.calls[1]![1].instanceId).toBe('9223372036854775807');
  });

  it('hides already loaded former-session data while the replacement request is pending', async () => {
    const current = pending(); fixture.post.mockResolvedValueOnce(result('former-session-cached-detail')).mockReturnValueOnce(current.promise);
    await render(); expect(container.textContent).toContain('former-session-cached-detail');
    localStorage.setItem('PowerJwt', 'synthetic-session-b'); await render();
    expect(container.textContent).not.toContain('former-session-cached-detail');
    await act(async () => current.resolve(result('replacement-detail')));
    expect(container.textContent).toContain('replacement-detail');
  });
});
