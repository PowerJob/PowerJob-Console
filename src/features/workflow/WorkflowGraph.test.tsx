// @vitest-environment happy-dom
import React, { act, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Edge, Node, NodeChange } from '@xyflow/react';
import type { WorkflowNode } from './model';

const graph = vi.hoisted(() => ({ fitView: vi.fn(), mounted: vi.fn(), unmounted: vi.fn(), warning: vi.fn() }));
const locale = vi.hoisted(() => ({ language: 'cn' as 'cn' | 'en' }));
const translate = (zh: string, en: string) => locale.language === 'en' ? en : zh;
vi.mock('../../lib/console', () => ({ useConsole: () => ({ t: translate, language: locale.language }) }));
vi.mock('antd', () => ({
  App: { useApp: () => ({ message: { warning: graph.warning } }) },
  Button: ({ icon, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }) => <button {...props}>{icon}{children}</button>,
  Space: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tag: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
type TestNode = Node<{ model: WorkflowNode; view: boolean }>;
type TestFlowProps = {
  nodes: TestNode[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange<TestNode>[]) => void;
  onNodeClick: (event: React.MouseEvent, node: TestNode) => void;
  children?: React.ReactNode;
};
vi.mock('@xyflow/react', async () => {
  const original = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react');
  return {
    ...original,
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
    useReactFlow: () => ({ fitView: graph.fitView }),
    Background: () => null, Controls: () => null,
    ReactFlow: ({ nodes, edges, onNodesChange, onNodeClick, children }: TestFlowProps) => {
      const [draft, setDraft] = useState('local viewport draft');
      useEffect(() => { graph.mounted(); return () => { graph.unmounted(); }; }, []);
      return <div data-testid="flow">
        <input aria-label="flow local draft" value={draft} onChange={event => setDraft(event.target.value)}/>
        <button onClick={() => onNodesChange([{ type: 'position', id: 'A', position: { x: 93, y: 217 } }])}>Move first node</button>
        {nodes.map(node => <button key={node.id} data-node-id={node.id} data-position={JSON.stringify(node.position)} data-selected={String(node.selected)} onClick={event => onNodeClick(event, node)}>{node.data.model.nodeName}</button>)}
        {edges.map(edge => <span key={edge.id} data-edge-id={edge.id} data-source-handle={edge.sourceHandle || ''}>{edge.label}</span>)}
        {children}
      </div>;
    },
  };
});
import WorkflowGraph from './WorkflowGraph';

const nodes: WorkflowNode[] = [{ nodeId: 'A', nodeType: 1, jobId: '9', nodeName: '草稿节点', nodeParams: '中文 draft', enable: true }];
let container: HTMLDivElement; let root: Root; let nativeElement: Element | null;
let requestNative: ReturnType<typeof vi.fn>; let exitNative: ReturnType<typeof vi.fn>;
const originalRequest = Object.getOwnPropertyDescriptor(document.documentElement, 'requestFullscreen');
const originalExit = Object.getOwnPropertyDescriptor(document, 'exitFullscreen');
const originalElement = Object.getOwnPropertyDescriptor(document, 'fullscreenElement');
const button = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(element => element.getAttribute('aria-label') === name || element.textContent === name)!;
const host = () => document.querySelector<HTMLDivElement>('.workflow-graph')!;
const selected = () => document.querySelector<HTMLButtonElement>('[data-node-id="A"]')!;
const nativeChange = () => document.dispatchEvent(new Event('fullscreenchange'));
function deferred() { let resolve!: () => void; let reject!: (error: Error) => void; const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
async function mount(onSelect = vi.fn()) { await act(async () => root.render(<WorkflowGraph nodes={nodes} edges={[]} editable selectedId="A" onSelect={onSelect}/>)); return onSelect; }
async function click(name: string) { await act(async () => button(name).click()); }
function restore(object: object, key: string, descriptor?: PropertyDescriptor) { if (descriptor) Object.defineProperty(object, key, descriptor); else Reflect.deleteProperty(object, key); }

beforeEach(() => {
  vi.clearAllMocks(); locale.language = 'cn'; nativeElement = null;
  requestNative = vi.fn().mockRejectedValue(new TypeError('not granted'));
  exitNative = vi.fn().mockImplementation(async () => { nativeElement = null; nativeChange(); });
  Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: requestNative });
  Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exitNative });
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => nativeElement });
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  document.body.style.overflow = 'scroll';
  container = document.createElement('div'); container.style.transform = 'translateX(12px)'; document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); container.remove(); document.body.style.overflow = '';
  restore(document.documentElement, 'requestFullscreen', originalRequest); restore(document, 'exitFullscreen', originalExit); restore(document, 'fullscreenElement', originalElement);
});

describe('workflow fullscreen interactions', () => {
  it('updates decision branch labels with the display language while preserving handles, selection and draft positions', async () => {
    const decisionNodes: WorkflowNode[] = [{ ...nodes[0], nodeType: 2 }, { ...nodes[0], nodeId: 'B', nodeName: '成立节点' }, { ...nodes[0], nodeId: 'C', nodeName: '不成立节点' }];
    const decisionEdges = [{ from: 'A', to: 'B', property: 'true' }, { from: 'A', to: 'C', property: 'false' }];
    const onSelect = vi.fn();
    const render = () => root.render(<WorkflowGraph nodes={decisionNodes} edges={decisionEdges} editable selectedId="A" onSelect={onSelect}/>);
    await act(async () => render()); await click('Move first node');
    const originalNode = selected();
    expect([...document.querySelectorAll('[data-edge-id]')].map(edge => edge.textContent)).toEqual(['成立', '不成立']);
    expect([...document.querySelectorAll('[data-edge-id]')].map(edge => edge.getAttribute('data-source-handle'))).toEqual(['true', 'false']);
    locale.language = 'en'; await act(async () => render());
    expect([...document.querySelectorAll('[data-edge-id]')].map(edge => edge.textContent)).toEqual(['True', 'False']);
    expect([...document.querySelectorAll('[data-edge-id]')].map(edge => edge.getAttribute('data-source-handle'))).toEqual(['true', 'false']);
    expect(selected()).toBe(originalNode); expect(selected().dataset.position).toBe('{"x":93,"y":217}');
    expect(selected().dataset.selected).toBe('true'); expect(graph.mounted).toHaveBeenCalledOnce();
    expect(graph.fitView).not.toHaveBeenCalled();
  });

  it('handles browser rejection with a body-level canvas and restores the same graph on explicit exit', async () => {
    const onSelect = await mount(); await click('Move first node');
    const originalHost = host(); const originalNode = selected();
    await click('全屏');
    expect(requestNative).toHaveBeenCalledOnce();
    expect(host().parentElement).toBe(document.body); expect(host().getAttribute('role')).toBe('dialog');
    expect(host().classList.contains('is-fullscreen')).toBe(true); expect(document.body.style.overflow).toBe('hidden');
    expect(button('退出全屏')).toBeDefined(); expect(selected()).toBe(originalNode);
    expect(selected().dataset.position).toBe('{"x":93,"y":217}'); expect(selected().dataset.selected).toBe('true');
    await click('草稿节点'); expect(onSelect).toHaveBeenLastCalledWith(nodes[0]);
    await click('退出全屏');
    expect(host()).toBe(originalHost); expect(container.contains(host())).toBe(true); expect(document.body.style.overflow).toBe('scroll');
    expect(host().classList.contains('is-fullscreen')).toBe(false); expect(host().hasAttribute('role')).toBe(false);
    expect(selected()).toBe(originalNode); expect(selected().dataset.position).toBe('{"x":93,"y":217}'); expect(selected().dataset.selected).toBe('true');
    expect(graph.mounted).toHaveBeenCalledOnce(); expect(graph.unmounted).not.toHaveBeenCalled(); expect(exitNative).not.toHaveBeenCalled();
  });

  it('gives Escape priority over an outer dialog and restores scrolling and focus', async () => {
    await mount(); const enter = button('全屏'); enter.focus(); await click('全屏');
    const outerEscape = vi.fn(); document.addEventListener('keydown', outerEscape);
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    await act(async () => document.dispatchEvent(escape));
    expect(escape.defaultPrevented).toBe(true); expect(outerEscape).not.toHaveBeenCalled();
    expect(container.contains(host())).toBe(true); expect(document.activeElement).toBe(enter); expect(document.body.style.overflow).toBe('scroll');
    document.removeEventListener('keydown', outerEscape);
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(exitNative).not.toHaveBeenCalled();
  });

  it('keeps document-level native fullscreen compatible with portals and synchronizes browser Escape', async () => {
    requestNative.mockImplementation(async () => { nativeElement = document.documentElement; nativeChange(); });
    await mount(); await click('全屏');
    expect(nativeElement).toBe(document.documentElement); expect(host().parentElement).toBe(document.body);
    await click('退出全屏'); expect(exitNative).toHaveBeenCalledOnce(); expect(container.contains(host())).toBe(true);
    await click('全屏');
    await act(async () => { nativeElement = null; nativeChange(); });
    expect(container.contains(host())).toBe(true); expect(button('全屏')).toBeDefined(); expect(document.body.style.overflow).toBe('scroll');
  });

  it('cycles Tab within the expanded canvas while leaving an opened popup in control', async () => {
    await mount(); await click('全屏');
    const first = button('自动布局'); const last = button('草稿节点');
    last.focus(); const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    await act(async () => last.dispatchEvent(forward)); expect(forward.defaultPrevented).toBe(true); expect(document.activeElement).toBe(first);
    const backward = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    await act(async () => first.dispatchEvent(backward)); expect(backward.defaultPrevented).toBe(true); expect(document.activeElement).toBe(last);
    const popup = document.createElement('div'); popup.className = 'ant-dropdown'; const popupButton = document.createElement('button'); popup.appendChild(popupButton); document.body.appendChild(popup); popupButton.focus();
    const popupEscape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    await act(async () => popupButton.dispatchEvent(popupEscape));
    expect(popupEscape.defaultPrevented).toBe(false); expect(host().classList.contains('is-fullscreen')).toBe(true);
    const popupTab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    popupButton.dispatchEvent(popupTab); expect(popupTab.defaultPrevented).toBe(false);
    popup.remove(); await click('退出全屏');
  });

  it('can leave the CSS canvas before a pending native request rejects', async () => {
    const permission = deferred(); requestNative.mockReturnValue(permission.promise);
    await mount(); await click('全屏'); await click('退出全屏');
    expect(container.contains(host())).toBe(true); expect(document.body.style.overflow).toBe('scroll');
    expect(button('全屏').disabled).toBe(true);
    await act(async () => permission.reject(new TypeError('not granted')));
    expect(button('全屏').disabled).toBe(false); expect(container.contains(host())).toBe(true); expect(exitNative).not.toHaveBeenCalled();
  });

  it('cleans up an active native canvas on unmount without leaving a body overlay or scroll lock', async () => {
    requestNative.mockImplementation(async () => { nativeElement = document.documentElement; nativeChange(); });
    await mount(); await click('全屏'); const activeHost = host();
    await act(async () => root.render(null));
    expect(activeHost.isConnected).toBe(false); expect(document.querySelector('.workflow-graph')).toBeNull();
    expect(document.body.style.overflow).toBe('scroll'); expect(exitNative).toHaveBeenCalledOnce(); expect(graph.unmounted).toHaveBeenCalledOnce();
    const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }); document.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(false);
  });

  it('cleans up late native permission completion after the canvas has unmounted', async () => {
    const permission = deferred(); requestNative.mockReturnValue(permission.promise);
    await mount(); await click('全屏'); const activeHost = host();
    await act(async () => root.render(null));
    await act(async () => { nativeElement = document.documentElement; permission.resolve(); });
    expect(exitNative).toHaveBeenCalledOnce(); expect(nativeElement).toBeNull(); expect(activeHost.isConnected).toBe(false);
    expect(document.body.style.overflow).toBe('scroll'); expect(document.querySelector('.workflow-graph')).toBeNull();
  });

  it('catches native exit rejection and keeps the exit action available until the browser exits', async () => {
    requestNative.mockImplementation(async () => { nativeElement = document.documentElement; nativeChange(); });
    exitNative.mockRejectedValue(new TypeError('exit denied'));
    await mount(); await click('全屏'); await click('退出全屏');
    expect(host().classList.contains('is-fullscreen')).toBe(true); expect(button('退出全屏')).toBeDefined(); expect(graph.warning).toHaveBeenCalledOnce();
    await act(async () => { nativeElement = null; nativeChange(); });
    expect(container.contains(host())).toBe(true); expect(document.body.style.overflow).toBe('scroll');
  });
});
