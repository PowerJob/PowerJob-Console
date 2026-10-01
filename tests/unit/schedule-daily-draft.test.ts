import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ScheduleFields from '../../src/features/schedule/ScheduleFields.vue';
import { setLocale } from '../../src/core/ui';

const mocks = vi.hoisted(() => ({ api: vi.fn(), toast: vi.fn() }));
vi.mock('../../src/core/api', () => ({ api: mocks.api }));
vi.mock('../../src/core/ui', async importOriginal => ({ ...await importOriginal<object>(), toast: mocks.toast }));
const rule = { interval: 7, intervalUnit: 'MINUTES', startTimeOfDay: '09:05:07', endTimeOfDay: '18:23:45', future: { zero: 0, absent: null, disabled: false } };
const dialog = () => document.querySelector('dialog[open]') as HTMLDialogElement | null;
async function click(name: string) { const button = [...document.querySelectorAll('button')].find(item => item.textContent?.trim() === name); if (!button) throw new Error('Missing actual native button: ' + name); button.click(); await flushPromises(); }
function editor(expression: string, type = 'DAILY_TIME_INTERVAL') { return mount(ScheduleFields, { props: { type, expression, lifeCycle: null }, attachTo: document.body }); }

beforeEach(() => { setLocale('en'); document.body.innerHTML = ''; mocks.api.mockReset(); mocks.toast.mockReset(); });
describe('actual native Daily builder opening and explicit Apply', () => {
  it.each([undefined, null, []])('keeps historic daysOfWeek=%j as Server ALL_DAY with no expression change until Apply', async daysOfWeek => {
    const source = JSON.stringify({ ...rule, ...(daysOfWeek !== undefined ? { daysOfWeek } : {}) }), wrapper = editor(source); await click('Set daily interval'); expect(dialog()).not.toBeNull(); expect([...dialog()!.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].filter(control => control.checked)).toHaveLength(0); expect(wrapper.emitted('update:expression')).toBeUndefined();
    await click('Apply configuration'); const payload = JSON.parse(String(wrapper.emitted('update:expression')?.[0]?.[0])); expect(payload).toEqual({ ...rule, daysOfWeek: [] }); expect(mocks.api).not.toHaveBeenCalled(); wrapper.unmount();
  });
  it('opens valid staged defaults after a complex CRON switches to Daily, preserving the raw rule on Cancel until explicit Apply', async () => {
    const cron = '0 13 9 ? * MON#2 *', wrapper = editor(cron, 'CRON'); await wrapper.setProps({ type: 'DAILY_TIME_INTERVAL' }); await click('Set daily interval'); expect(dialog()).not.toBeNull(); const interval = dialog()!.querySelector<HTMLInputElement>('input[type="number"]')!; expect(interval.value).toBe('60'); interval.value = '11'; interval.dispatchEvent(new Event('input', { bubbles: true })); await click('Cancel'); expect(dialog()).toBeNull(); expect(wrapper.emitted('update:expression')).toBeUndefined(); expect(wrapper.get('.schedule-expression input').element).toHaveProperty('value', cron);
    await click('Set daily interval'); expect(dialog()!.querySelector<HTMLInputElement>('input[type="number"]')!.value).toBe('60'); await click('Apply configuration'); expect(JSON.parse(String(wrapper.emitted('update:expression')?.[0]?.[0]))).toMatchObject({ interval: 60, intervalUnit: 'SECONDS', daysOfWeek: [1, 2, 3, 4, 5] }); expect(mocks.api).not.toHaveBeenCalled(); wrapper.unmount();
  });
  it.each(['{broken', '[]', JSON.stringify({ ...rule, daysOfWeek: 'invalid' })])('rejects malformed structured rule %s without overwriting the raw draft', async source => {
    const wrapper = editor(source); await click('Set daily interval'); expect(dialog()).toBeNull(); expect(mocks.toast).toHaveBeenCalledWith(expect.stringMatching(/invalid JSON/), 'error'); expect(wrapper.emitted('update:expression')).toBeUndefined(); expect(wrapper.get('.schedule-expression input').element).toHaveProperty('value', source); wrapper.unmount();
  });
  it('rejects root JSON null without opening defaults, replacing the raw draft or sending a request', async () => {
    const wrapper = editor('  null  '); await click('Set daily interval'); expect(dialog()).toBeNull(); expect(mocks.toast).toHaveBeenCalledWith(expect.stringMatching(/invalid JSON/), 'error'); expect(wrapper.emitted('update:expression')).toBeUndefined(); expect(wrapper.get('.schedule-expression input').element).toHaveProperty('value', '  null  '); expect(mocks.api).not.toHaveBeenCalled(); wrapper.unmount();
  });
  it('retains a numeric fixed interval on Daily Cancel and only changes it after explicit Apply', async () => {
    const wrapper = editor('3000', 'FIXED_RATE'); await wrapper.setProps({ type: 'DAILY_TIME_INTERVAL' }); await click('Set daily interval'); expect(dialog()).not.toBeNull(); expect(dialog()!.querySelector<HTMLInputElement>('input[type="number"]')!.value).toBe('60'); await click('Cancel'); expect(wrapper.emitted('update:expression')).toBeUndefined(); expect(wrapper.get('.schedule-expression input').element).toHaveProperty('value', '3000'); await click('Set daily interval'); await click('Apply configuration'); expect(JSON.parse(String(wrapper.emitted('update:expression')?.[0]?.[0]))).toMatchObject({ interval: 60, intervalUnit: 'SECONDS', daysOfWeek: [1, 2, 3, 4, 5] }); expect(mocks.api).not.toHaveBeenCalled(); wrapper.unmount();
  });
  it('reads the latest prop on each opening and resets canceled staging without leaking the previous historic rule', async () => {
    const wrapper = editor(JSON.stringify({ ...rule, daysOfWeek: [1] })); await click('Set daily interval'); await click('Cancel'); await wrapper.setProps({ expression: JSON.stringify({ ...rule, interval: 9, daysOfWeek: [7] }) }); await click('Set daily interval'); expect(dialog()!.querySelector<HTMLInputElement>('input[type="number"]')!.value).toBe('9'); const weekdays = [...dialog()!.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]; expect(weekdays.map(control => control.checked)).toEqual([false, false, false, false, false, false, true]); await click('Apply configuration'); expect(JSON.parse(String(wrapper.emitted('update:expression')?.[0]?.[0]))).toEqual({ ...rule, interval: 9, daysOfWeek: [7] }); wrapper.unmount();
  });
});
