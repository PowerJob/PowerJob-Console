// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus, { ElPopover } from 'element-plus'
import CronQuickStart from '../src/components/common/CronQuickStart.vue'
import { cronFromDraft, defaultCronDraft, draftFromCron } from '../src/services/cron-presets.js'

describe('Common PowerJob CRON rules', () => {
  it.each([
    [{ cadence:'minutes', interval:5 }, '0 0/5 * * * ?'],
    [{ cadence:'hours', interval:3, minute:15 }, '0 15 0/3 * * ?'],
    [{ cadence:'daily', hour:9, minute:30 }, '0 30 9 * * ?'],
    [{ cadence:'weekdays', hour:18, minute:0 }, '0 0 18 ? * 2-6'],
    [{ cadence:'weekly', weekday:1, hour:0, minute:0 }, '0 0 0 ? * 1'],
    [{ cadence:'monthly', day:31, hour:23, minute:59 }, '0 59 23 31 * ?'],
  ])('generates and restores rule %j without weekday ambiguity', (changes, expression) => {
    const draft = { ...defaultCronDraft(), ...changes }
    expect(cronFromDraft(draft)).toBe(expression)
    expect(cronFromDraft(draftFromCron(expression))).toBe(expression)
  })
  it.each([
    { interval:0 }, { interval:60 }, { interval:1.5 }, { interval:'' }, { interval:undefined },
    { cadence:'hours', interval:24 }, { cadence:'daily', hour:24 }, { cadence:'daily', minute:-1 },
    { cadence:'weekly', weekday:0 }, { cadence:'monthly', day:32 }, { cadence:'unknown' },
  ])('rejects incomplete/out of range draft %j', changes => {
    expect(cronFromDraft({ ...defaultCronDraft(), ...changes })).toBe('')
  })
  it.each(['0 15 10 L * ?', '0 0 9 ? * 2#2 2027', '0 0/60 * * * ?', '0 0 25 * * ?', ''])('keeps unsupported manual rule %s outside the quick builder', source => {
    expect(draftFromCron(source)).toEqual(defaultCronDraft())
  })
})

const mounted = []
afterEach(() => { mounted.splice(0).forEach(wrapper => wrapper.unmount()); document.body.innerHTML = '' })
async function open(source) {
  const wrapper = mount(CronQuickStart, { props:{ modelValue:source }, attachTo:document.body, global:{ plugins:[ElementPlus], mocks:{ $t:key=>key } } })
  mounted.push(wrapper)
  await wrapper.get('[data-testid="cron-quick-trigger"]').trigger('click')
  await flushPromises()
  await vi.waitFor(() => expect(document.querySelector('[data-testid="cron-builder"]')).not.toBeNull())
  return wrapper
}
describe('CRON draft confirmation', () => {
  it('a late entrance transition does not steal focus from an edited field', async () => {
    const wrapper = await open('0 0/5 * * * ?')
    const field = document.querySelector('[data-testid="cron-interval"] input')
    expect(field).not.toBeNull()
    field.focus()
    wrapper.findComponent(ElPopover).vm.$emit('after-enter')
    await flushPromises()
    expect(document.activeElement).toBe(field)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
  it('opening, cancelling and Escape preserve the advanced parent expression', async () => {
    const wrapper = await open('0 0 9 ? * 2#2 2027')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    document.querySelector('[data-testid="cron-builder"] .cron-actions button').click()
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await wrapper.get('[data-testid="cron-quick-trigger"]').trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(document.querySelector('[data-testid="cron-builder"]')).not.toBeNull())
    document.querySelector('[data-testid="cron-builder"]').dispatchEvent(new KeyboardEvent('keydown',{ key:'Escape',bubbles:true }))
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
  it('applies only the current generated draft, and reopens from the latest parent', async () => {
    const wrapper = await open('0 30 9 * * ?')
    expect(document.querySelector('[data-testid="cron-generated"]').textContent).toBe('0 30 9 * * ?')
    document.querySelector('[data-testid="cron-apply"]').click()
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toEqual([['0 30 9 * * ?']])
    await wrapper.setProps({modelValue:'0 59 23 31 * ?'})
    await wrapper.get('[data-testid="cron-quick-trigger"]').trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(document.querySelector('[data-testid="cron-generated"]')?.textContent).toBe('0 59 23 31 * ?'))
  })
})
