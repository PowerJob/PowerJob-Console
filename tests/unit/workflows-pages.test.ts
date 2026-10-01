import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
const transport = vi.hoisted(() => vi.fn());
vi.mock('../../src/core/api', () => ({ api: transport }));
import Workflows from '../../src/features/workflows/Workflows.vue';
import { session } from '../../src/core/session';
import WorkflowEditor from '../../src/features/workflows/WorkflowEditor.vue';

const graphStub = { name: 'WorkflowGraph', props: ['modelValue', 'readonly'], emits: ['select'], template: '<div><slot name="tools" /></div>', methods: { arrange() {}, clear() {} } };
const scheduleStub = { name: 'ScheduleFields', props: ['type', 'expression', 'lifeCycle'], emits: ['update:type', 'update:expression', 'update:lifeCycle'], template: '<div class="schedule-stub" />' };
const inspectorStub = { name: 'NodeInspector', props: ['node'], emits: ['preview', 'saved'], template: '<div class="inspector-stub" />' };
function fixture(name = 'Original') { return { id: '91', wfName: name, wfDescription: null, enable: false, timeExpressionType: 'API', timeExpression: null, maxWfInstanceNum: 3, notifyUserIds: null, lifeCycle: { start: 123, end: null, futureBoundary: 'unchanged' }, futureDTO: { keep: true }, peworkflowDAG: { nodes: [{ nodeId: '11', nodeType: 1, jobId: '12', nodeName: 'Node', nodeParams: null, enable: false, skipWhenFailed: true }], edges: [] } }; }
async function editorRouter() { const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/oms/workflowEditor', component: WorkflowEditor }] }); await router.push('/oms/workflowEditor?workflowId=91'); await router.isReady(); return router; }
function editorMount(router: ReturnType<typeof createRouter>) { return mount(WorkflowEditor, { global: { plugins: [router], stubs: { WorkflowGraph: graphStub, ScheduleFields: scheduleStub, NodeInspector: inspectorStub, ImportNodes: true } } }); }
function saveButton(wrapper: ReturnType<typeof editorMount>) { return wrapper.findAll('button').find(button => /Save workflow|保存工作流/.test(button.text()))!; }

beforeEach(() => { transport.mockReset(); session.appId = '1'; });
describe('workflow list mutation feedback', () => {
  it('shows a persisted zero parallel limit as unlimited rather than disabled or missing', async () => {
    transport.mockResolvedValue({ index: 0, pageSize: 10, totalPages: 1, totalItems: 1, data: [{ ...fixture(), maxWfInstanceNum: 0 }] });
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/oms/workflow', component: Workflows }] }); await router.push('/oms/workflow'); await router.isReady();
    const wrapper = mount(Workflows, { global: { plugins: [router] } }); await flushPromises(); expect(wrapper.get('tbody tr td:nth-child(3)').text()).toMatch(/Unlimited|不限/); wrapper.unmount();
  });
  it('restores a controlled enabled switch after a real mutation rejection', async () => {
    const row = { id: '91', wfName: 'Workflow', enable: true, timeExpressionType: 'API', maxWfInstanceNum: 1 };
    transport.mockImplementation((path: string) => path === '/workflow/list' ? Promise.resolve({ index: 0, pageSize: 10, totalPages: 1, totalItems: 1, data: [row] }) : Promise.reject(new Error('Permission denied')));
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/oms/workflow', component: Workflows }] }); await router.push('/oms/workflow'); await router.isReady();
    const wrapper = mount(Workflows, { global: { plugins: [router] } }); await flushPromises(); const control = wrapper.get('input[role="switch"]'); expect((control.element as HTMLInputElement).checked).toBe(true); await control.setValue(false); await flushPromises(); expect((control.element as HTMLInputElement).checked).toBe(true); expect(wrapper.get('[role="alert"]').text()).toBe('Permission denied'); expect(transport).toHaveBeenCalledWith('/workflow/disable', expect.objectContaining({ query: { appId: '1', workflowId: '91' } })); wrapper.unmount();
  });
});

describe('workflow editor metadata and stale route protection', () => {
  it('accepts native zero input and keeps returned unlimited metadata on a name-only save', async () => {
    const original = { ...fixture(), maxWfInstanceNum: 0 }; transport.mockImplementation((path: string) => Promise.resolve(path === '/workflow/fetch' ? original : path === '/workflow/save' ? '91' : []));
    const router = await editorRouter(), wrapper = editorMount(router); await flushPromises(); const limit = wrapper.get('input[type="number"]'); expect(limit.attributes('min')).toBe('0'); expect(limit.element).toHaveProperty('value', '0'); expect(wrapper.text()).toMatch(/0 means unlimited|0 表示不限/);
    await wrapper.get('.settings-identity input').setValue('Renamed unlimited'); await saveButton(wrapper).trigger('click'); await flushPromises(); expect(transport.mock.calls.find(call => call[0] === '/workflow/save')?.[1].body).toMatchObject({ id: '91', wfName: 'Renamed unlimited', maxWfInstanceNum: 0, notifyUserIds: null, enable: false, futureDTO: { keep: true }, lifeCycle: { start: 123, end: null, futureBoundary: 'unchanged' } }); wrapper.unmount();
  });
  it('keeps returned null alarms/description/expression, future fields and partial lifecycle on a name-only save', async () => {
    transport.mockImplementation((path: string) => Promise.resolve(path === '/workflow/fetch' ? fixture() : path === '/workflow/save' ? '91' : [])); const router = await editorRouter(), wrapper = editorMount(router); await flushPromises(); await wrapper.get('.settings-identity input').setValue('Renamed'); await saveButton(wrapper).trigger('click'); await flushPromises();
    const body = transport.mock.calls.find(call => call[0] === '/workflow/save')![1].body; expect(body).toMatchObject({ wfName: 'Renamed', wfDescription: null, timeExpression: null, notifyUserIds: null, enable: false, maxWfInstanceNum: 3, futureDTO: { keep: true }, lifeCycle: { start: 123, end: null, futureBoundary: 'unchanged' }, dag: { nodes: [{ nodeId: '11' }], edges: [] } }); wrapper.unmount();
  });
  it('rejects an inverted lifecycle before either pending node or workflow writes', async () => {
    transport.mockImplementation((path: string) => Promise.resolve(path === '/workflow/fetch' ? fixture() : [])); const router = await editorRouter(), wrapper = editorMount(router); await flushPromises(); wrapper.findComponent({ name: 'WorkflowGraph' }).vm.$emit('select', '11'); await flushPromises(); wrapper.findComponent({ name: 'NodeInspector' }).vm.$emit('preview', { ...fixture().peworkflowDAG.nodes[0], nodeName: 'Unsaved change' }); wrapper.findComponent({ name: 'ScheduleFields' }).vm.$emit('update:lifeCycle', { start: 20, end: 10 }); await flushPromises(); await saveButton(wrapper).trigger('click'); await flushPromises(); expect(transport.mock.calls.some(call => ['/workflow/save', '/workflow/saveNode'].includes(call[0]))).toBe(false); expect(wrapper.find('[role="alert"]').exists()).toBe(true); wrapper.unmount();
  });
  it('clears the old metadata and graph when opening a new no-ID workflow route', async () => {
    transport.mockImplementation((path: string) => Promise.resolve(path === '/workflow/fetch' ? fixture() : [])); const router = await editorRouter(), wrapper = editorMount(router); await flushPromises(); expect(wrapper.get('.settings-identity input').element).toHaveProperty('value', 'Original'); await router.push('/oms/workflowEditor'); await flushPromises(); expect(wrapper.get('.settings-identity input').element).toHaveProperty('value', ''); expect(wrapper.findComponent({ name: 'WorkflowGraph' }).props('modelValue')).toEqual({ nodes: [], edges: [] }); wrapper.unmount();
  });
  it('ignores an old rejected restore after a new workflow has loaded', async () => {
    let rejectOld!: (reason: Error) => void; const held = new Promise((_resolve, reject) => { rejectOld = reject; }); transport.mockImplementation((path: string, options: {query?:{workflowId?:string}}) => path === '/workflow/fetch' ? options.query?.workflowId === '91' ? held : Promise.resolve({ ...fixture('New workflow'), id: '92' }) : Promise.resolve([])); const router = await editorRouter(), wrapper = editorMount(router); await router.push('/oms/workflowEditor?workflowId=92'); await flushPromises(); rejectOld(new Error('Old workflow request failed')); await flushPromises(); expect(wrapper.get('.page-title').text()).toBe('New workflow'); expect(router.currentRoute.value.query.workflowId).toBe('92'); expect(wrapper.find('[role="alert"]').exists()).toBe(false); wrapper.unmount();
  });
});
