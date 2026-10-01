// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assessClock, formatClockTime, sampleServerClock } from './clock';

const hooks = vi.hoisted(() => ({ clock: vi.fn() }));
vi.mock('./useOverviewClock', () => ({ useOverviewClock: hooks.clock }));
vi.mock('../../lib/console', () => ({ useConsole: () => ({ t: (zh: string) => zh }) }));
import { OverviewClock } from './OverviewClock';

const epoch = Date.UTC(2026, 9, 2, 0, 0, 0);
let container: HTMLDivElement;
let root: Root;
let model: any;
const refresh = vi.fn().mockResolvedValue(undefined);
function setModel(offsetMs = 0, ageMs = 0, failed = false) {
  const sample = sampleServerClock({ serverTimeTs: epoch + 100 + offsetMs, serverTime: formatClockTime(epoch + 100 + offsetMs + 8 * 3_600_000, true), serverTimeZone: '中国标准时间', serverInfo: { ip: 'fixture-server' } },
    { epochMs: epoch, monotonicMs: 0 }, { epochMs: epoch + 200, monotonicMs: 200 })!;
  const now = { epochMs: epoch + 200 + ageMs, monotonicMs: 200 + ageMs };
  model = { sample, now, assessment: assessClock(sample, now, failed), refresh, loading: false, error: failed ? new Error('fixture offline') : undefined };
}
async function render(refreshKey = 0) { await act(async () => root.render(<OverviewClock appId="fixture-app" refreshKey={refreshKey}/>)); }
function expectBothClocks() {
  const pair = container.querySelector('.overview-time-pair')!;
  expect(pair.children).toHaveLength(2);
  expect(pair.children[0]!.textContent).toContain('服务器时间');
  expect(pair.children[1]!.textContent).toContain('本地时间');
  expect(pair.querySelectorAll('strong')[1]!.textContent).toBe(formatClockTime(model.now.epochMs));
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  hooks.clock.mockImplementation(() => model);
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  setModel();
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

describe('parallel Overview clocks and actionable feedback', () => {
  it('shows server civil timezone and live browser time together without a timezone-offset warning', async () => {
    await render(); expectBothClocks();
    expect(container.querySelectorAll('.overview-time-pair strong')[0]!.textContent).toBe('2026-10-02 08:00:00');
    expect(container.textContent).toContain('UTC+08:00');
    expect(container.querySelector('[role="status"]')!.textContent).toContain('时间差约 0.0 秒');
    expect(container.querySelector('.overview-time-warning')).toBeNull();
    model.now = { epochMs: epoch + 1_200, monotonicMs: 1_200 }; model.assessment = assessClock(model.sample, model.now);
    await render();
    expect(container.querySelectorAll('.overview-time-pair strong')[0]!.textContent).toBe('2026-10-02 08:00:01');
    expectBothClocks();
  });

  it.each([8_000, -8_000])('retains both clocks and gives synchronization guidance for a confirmed %i ms skew', async offsetMs => {
    setModel(offsetMs); await render(); expectBothClocks();
    expect(container.querySelector('.overview-time-warning')!.textContent).toContain(offsetMs > 0 ? '服务器比本地快约 8.0 秒' : '服务器比本地慢约 8.0 秒');
    expect(container.textContent).toContain('可能影响调度时间的设置与判断');
    expect(container.textContent).toContain('请检查设备和服务器时钟');
  });

  it('labels an expired server value as the last reading while local time remains current', async () => {
    setModel(0, 61_000); await render(); expectBothClocks();
    expect(container.textContent).toContain('上次读取');
    expect(container.querySelector('[role="status"]')!.textContent).toContain('服务器时间已过期');
    expect(container.querySelectorAll('.overview-time-pair strong')[0]!.textContent).toBe('2026-10-02 08:00:00');
    expect(container.querySelector('.overview-time-warning')).toBeNull();
  });

  it('keeps the last reading after request failure and never calls it a verified skew', async () => {
    setModel(8_000, 0, true); await render(); expectBothClocks();
    expect(container.querySelector('[role="status"]')!.textContent).toContain('校时失败，显示上次读取时间');
    expect(container.querySelector('.overview-time-warning')).toBeNull();
  });

  it('shows the local clock and an explicit unavailable status if the initial request fails', async () => {
    model.sample = undefined; model.assessment = assessClock(undefined, model.now, true); model.error = new Error('fixture offline');
    await render(); expectBothClocks();
    expect(container.querySelectorAll('.overview-time-pair strong')[0]!.textContent).toBe('—');
    expect(container.querySelector('[role="status"]')!.textContent).toContain('无法判断时间差');
  });

  it('resamples once for a page refresh without adding a duplicate initial measurement', async () => {
    await render(); expect(refresh).not.toHaveBeenCalled();
    await render(1); expect(refresh).toHaveBeenCalledOnce();
    await render(1); expect(refresh).toHaveBeenCalledOnce();
  });
});
