// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatClockTime } from './clock';

const requests = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../lib/api', () => ({ api: requests }));
import { useOverviewClock } from './useOverviewClock';

const epoch = Date.UTC(2026, 9, 2, 0, 0, 0);
const response = (serverEpoch = Date.now(), node = 'fixture-server') => ({ serverTimeTs: serverEpoch, serverTime: formatClockTime(serverEpoch + 8 * 3_600_000, true), serverTimeZone: '中国标准时间', serverInfo: { ip: node } });
const deferred = () => { let resolve!: (value: ReturnType<typeof response>) => void; const promise = new Promise<ReturnType<typeof response>>(done => { resolve = done; }); return { promise, resolve }; };
let container: HTMLDivElement;
let root: Root;
let latest: ReturnType<typeof useOverviewClock>;
let mounted: boolean;
function Probe({ appId }: { appId: string }) { latest = useOverviewClock(appId); return <div>{latest.assessment.status} · {latest.sample?.serverNode ?? 'no sample'}</div>; }
async function render(appId = 'app-1') { await act(async () => root.render(<Probe appId={appId}/>)); }
async function advance(ms: number) { await act(async () => vi.advanceTimersByTimeAsync(ms)); }

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(epoch);
  vi.resetAllMocks();
  requests.get.mockImplementation(() => Promise.resolve(response()));
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); mounted = true;
});
afterEach(async () => {
  if (mounted) await act(async () => root.unmount());
  container.remove();
  delete (document as any).visibilityState;
  vi.useRealTimers();
});

describe('Overview clock sampling lifecycle', () => {
  it('ticks both displayed estimates without a request per tick and resamples every thirty seconds', async () => {
    await render();
    expect(latest.assessment.status).toBe('aligned');
    expect(requests.get).toHaveBeenCalledExactlyOnceWith('/server/hello', undefined, { quiet: true, headers: { 'Cache-Control': 'no-cache', AppId: 'app-1' } });
    await advance(1_000);
    expect(latest.now.epochMs).toBe(epoch + 1_000);
    expect(latest.assessment.serverEpochMs).toBe(epoch + 1_000);
    expect(requests.get).toHaveBeenCalledOnce();
    await advance(29_000);
    expect(requests.get).toHaveBeenCalledTimes(2);
    expect(latest.assessment.status).toBe('aligned');
  });

  it('discards a late clock result from the previously selected application', async () => {
    const previous = deferred();
    requests.get.mockReturnValueOnce(previous.promise).mockResolvedValueOnce(response(epoch, 'app-2-server'));
    await render('app-1');
    expect(latest.sample).toBeUndefined();
    await render('app-2');
    expect(latest.sample?.serverNode).toBe('app-2-server');
    await act(async () => previous.resolve(response(epoch + 60_000, 'app-1-server')));
    expect(latest.sample?.serverNode).toBe('app-2-server');
    expect(latest.assessment.status).toBe('aligned');
  });

  it('keeps a newer manual sample when an older overlapping request returns last', async () => {
    await render();
    const older = deferred();
    requests.get.mockReturnValueOnce(older.promise).mockResolvedValueOnce(response(epoch + 8_000, 'newer-server'));
    await act(async () => { void latest.refresh(); await latest.refresh(); });
    expect(latest.sample?.serverNode).toBe('newer-server');
    expect(latest.assessment.status).toBe('warning');
    await act(async () => older.resolve(response(epoch, 'older-server')));
    expect(latest.sample?.serverNode).toBe('newer-server');
    expect(latest.assessment.status).toBe('warning');
  });

  it('marks a failed resample as stale and recovers on the next successful refresh', async () => {
    await render();
    const original = latest.sample;
    requests.get.mockRejectedValueOnce(new Error('fixture network unavailable'));
    await advance(30_000);
    expect(latest.sample).toBe(original);
    expect(latest.assessment).toMatchObject({ status: 'stale', reason: 'request-failed' });
    await act(async () => { await latest.refresh(); });
    expect(latest.assessment.status).toBe('aligned');
    expect(latest.error).toBeUndefined();
  });

  it('pauses sampling in a hidden tab and refreshes an expired sample when the tab becomes visible', async () => {
    await render();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    await advance(61_000);
    expect(requests.get).toHaveBeenCalledOnce();
    expect(latest.assessment).toMatchObject({ status: 'stale', reason: 'expired' });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(requests.get).toHaveBeenCalledTimes(2);
    expect(latest.assessment.status).toBe('aligned');
  });

  it('removes interval polling when the Overview clock unmounts', async () => {
    await render();
    expect(vi.getTimerCount()).toBe(2);
    await act(async () => root.unmount()); mounted = false;
    expect(vi.getTimerCount()).toBe(0);
    await advance(61_000);
    expect(requests.get).toHaveBeenCalledOnce();
  });
});
