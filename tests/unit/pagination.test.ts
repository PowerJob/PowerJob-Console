import { mount } from '@vue/test-utils'
import { beforeEach, expect, it } from 'vitest'
import Pagination from '../../src/shared/Pagination.vue'
import { setLocale } from '../../src/core/ui'

beforeEach(() => setLocale('en'))

it('hides opted-in management paging for zero or one page and restores real multi-page boundary actions after filtering', async () => {
  const wrapper = mount(Pagination, { props: { index: 0, size: 10, total: 0, hideOnSinglePage: true } })
  try {
    for (const total of [0, 1, 10]) {
      await wrapper.setProps({ total })
      expect(wrapper.find('nav[aria-label="Pagination"]').exists()).toBe(false)
      expect(wrapper.findAll('button')).toHaveLength(0)
    }
    await wrapper.setProps({ total: 11 })
    expect(wrapper.get('nav').text()).toContain('1 / 2')
    expect(wrapper.get('button:first-of-type').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button:last-of-type').attributes('disabled')).toBeUndefined()
    await wrapper.get('button:last-of-type').trigger('click')
    expect(wrapper.emitted('change')).toEqual([[1]])
    await wrapper.setProps({ index: 1 })
    expect(wrapper.get('nav').text()).toContain('2 / 2')
    expect(wrapper.get('button:first-of-type').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('button:last-of-type').attributes('disabled')).toBeDefined()
    await wrapper.setProps({ index: 0, total: 1 })
    expect(wrapper.find('nav').exists()).toBe(false)
    expect(wrapper.emitted('change')).toEqual([[1]])
    await wrapper.setProps({ total: 11 })
    expect(wrapper.get('nav').text()).toContain('1 / 2')
  } finally { wrapper.unmount() }
})

it('keeps instance paging visible by default for empty and single pages without losing zero-based multi-page navigation', async () => {
  const wrapper = mount(Pagination, { props: { index: 0, size: 10, total: 0 } })
  try {
    for (const total of [0, 1, 10]) {
      await wrapper.setProps({ total })
      expect(wrapper.get('nav[aria-label="Pagination"]').text()).toContain('1 / 1')
      expect(wrapper.get('button:first-of-type').attributes('disabled')).toBeDefined()
      expect(wrapper.get('button:last-of-type').attributes('disabled')).toBeDefined()
    }
    await wrapper.setProps({ total: 11, index: 1 })
    expect(wrapper.get('nav').text()).toContain('2 / 2')
    expect(wrapper.get('button:first-of-type').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('button:last-of-type').attributes('disabled')).toBeDefined()
    await wrapper.get('button:first-of-type').trigger('click')
    expect(wrapper.emitted('change')).toEqual([[0]])
    await wrapper.setProps({ total: 1, index: 0, hideOnSinglePage: false })
    expect(wrapper.get('nav').text()).toContain('1 / 1')
  } finally { wrapper.unmount() }
})
