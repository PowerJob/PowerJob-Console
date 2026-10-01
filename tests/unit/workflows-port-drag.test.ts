import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import WorkflowGraph from '../../src/features/workflows/WorkflowGraph.vue';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 900, 590));
  vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 900, 590));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('connections dropped on the rendered input port', () => {
  it.each([1, 2])('connects to a type-%i node at its input-port center', async nodeType => {
    const wrapper = mount(WorkflowGraph, { props: { modelValue: { nodes: [{ nodeId: 'from', nodeType: 1, nodeName: 'Source' }, { nodeId: 'to', nodeType, nodeName: 'Destination', nodeParams: 'true' }], edges: [] } } });
    await nextTick(); await nextTick();
    const svg = wrapper.get('svg');
    Object.assign(svg.element, { setPointerCapture: vi.fn(), hasPointerCapture: () => false, releasePointerCapture: vi.fn() });
    const transform = wrapper.get('svg > g').attributes('transform');
    const camera = /translate\(([^,]+),([^)]+)\) scale\(([^)]+)\)/.exec(transform)!;
    const panX = Number(camera[1]), panY = Number(camera[2]), zoom = Number(camera[3]);
    function portPoint(nodeId: string, selector: string) {
      const node = wrapper.get(`[data-node-id="${nodeId}"]`), port = node.get(selector);
      const position = /translate\(([^,]+),([^)]+)\)/.exec(node.attributes('transform'))!;
      return { clientX: panX + (Number(position[1]) + Number(port.attributes('cx'))) * zoom, clientY: panY + (Number(position[2]) + Number(port.attributes('cy'))) * zoom };
    }
    const from = portPoint('from', '.port-output'), to = portPoint('to', '.port-input');
    await wrapper.get('[data-node-id="from"] .port-output').trigger('pointerdown', { button: 0, pointerId: 1, ...from });
    await svg.trigger('pointermove', { pointerId: 1, ...to });
    await svg.trigger('pointerup', { pointerId: 1, ...to });
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toMatchObject({ edges: [{ from: 'from', to: 'to' }] });
    wrapper.unmount();
  });
});
