import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import WorkflowGraph from '../../src/features/workflows/WorkflowGraph.vue';
import type { Dag } from '../../src/features/workflows/types';

const disconnect = vi.fn();
beforeEach(() => { vi.stubGlobal('ResizeObserver', class { observe() {} disconnect = disconnect; }); vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 900, 590)); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); disconnect.mockClear(); });
const dag = (): Dag => ({ nodes: [{ nodeId: 'c', nodeType: 2, nodeName: 'Decision', nodeParams: 'true' }, { nodeId: 'yes', nodeType: 1, nodeName: 'Yes job' }, { nodeId: 'no', nodeType: 1, nodeName: 'No job' }], edges: [] });

describe('native workflow graph interactions', () => {
  it('connects a condition using keyboard-selected nodes and emits the Server branch property', async () => {
    const wrapper = mount(WorkflowGraph, { props: { modelValue: dag() } });
    await wrapper.get('[data-node-id="c"]').trigger('keydown', { key: 'Enter' });
    await wrapper.findAll('button').find(button => button.text() === '连接' || button.text() === 'Connect')!.trigger('click');
    await wrapper.get('[data-node-id="yes"]').trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toMatchObject({ edges: [{ from: 'c', to: 'yes', property: 'true' }] }); wrapper.unmount();
  });
  it('supports keyboard multiselect and batch deletion without leaving dangling edges', async () => {
    const initial = dag(); initial.edges = [{ from: 'c', to: 'yes', property: 'true' }, { from: 'c', to: 'no', property: 'false' }];
    const wrapper = mount(WorkflowGraph, { props: { modelValue: initial } }); await wrapper.get('[data-node-id="c"]').trigger('keydown', { key: 'Enter' }); await wrapper.get('[data-node-id="yes"]').trigger('keydown', { key: 'Enter', shiftKey: true }); await wrapper.get('.flow-studio').trigger('keydown', { key: 'Delete' });
    expect(wrapper.emitted('remove')?.[0]?.[0]).toEqual(['c', 'yes']); expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual({ nodes: [initial.nodes[2]], edges: [] }); wrapper.unmount();
  });
  it('never exposes graph editing in instance view mode', async () => {
    const wrapper = mount(WorkflowGraph, { props: { modelValue: dag(), readonly: true } }); expect(wrapper.find('.port-output').exists()).toBe(false); await wrapper.get('[data-node-id="yes"]').trigger('keydown', { key: 'Enter' }); await wrapper.get('.flow-studio').trigger('keydown', { key: 'Delete' }); expect(wrapper.emitted('select')?.at(-1)?.[0]).toBe('yes'); expect(wrapper.emitted('update:modelValue')).toBeUndefined(); wrapper.unmount();
  });
  it('does not interpret a text-control Delete key as a graph deletion', async () => {
    const wrapper = mount(WorkflowGraph, { props: { modelValue: dag() }, slots: { tools: '<input aria-label="Inspector input" />' } }); await wrapper.get('[data-node-id="yes"]').trigger('keydown', { key: 'Enter' }); await wrapper.get('input').trigger('keydown', { key: 'Delete' }); expect(wrapper.emitted('update:modelValue')).toBeUndefined(); wrapper.unmount();
  });
  it('cleans up resize/fullscreen observers when leaving the editor', () => {
    const remove = vi.spyOn(document, 'removeEventListener'), wrapper = mount(WorkflowGraph, { props: { modelValue: dag() } }); wrapper.unmount(); expect(disconnect).toHaveBeenCalledOnce(); expect(remove).toHaveBeenCalledWith('fullscreenchange', expect.any(Function));
  });
});
