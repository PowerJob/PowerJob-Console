import { describe, expect, it } from 'vitest';
import { connect, connectionError, curve, inputPoint, layout, lifeCyclePayload, nodeFromSaved, nodeRequest, outputPoint, readDag, removeNodes, validateDag, wireDag, workflowPayload } from '../../src/features/workflows/domain';
import type { Dag, Workflow } from '../../src/features/workflows/types';

const node = (nodeId: string, nodeType = 1) => ({ nodeId, nodeType, nodeParams: nodeType === 2 ? 'true' : 'exact unchanged parameters', enable: true, skipWhenFailed: false });
const basic = (): Dag => ({ nodes: [node('9007199254740993'), node('9007199254740994')], edges: [] });
const workflow = (): Workflow => ({ id: '9007199254740999', wfName: 'Workflow', wfDescription: null, enable: false, timeExpressionType: 'API', timeExpression: '', maxWfInstanceNum: 7, notifyUserIds: ['9007199254740997'], lifeCycle: null, futureDto: { retained: true } });

describe('workflow wire contract against Server d928', () => {
  it('retains Long IDs and returned node metadata across read/save adapters', () => {
    const dag = readDag({ nodes: [{ nodeId: '9007199254740993', nodeType: 3, jobId: '9007199254740994', instanceId: '9007199254740995', unknown: { present: true } }], edges: [] });
    expect(dag.nodes[0]).toMatchObject({ nodeId: '9007199254740993', jobId: '9007199254740994', instanceId: '9007199254740995', unknown: { present: true } });
    expect(nodeRequest(dag.nodes[0]!)).toMatchObject({ id: '9007199254740993', type: 3, jobId: '9007199254740994', unknown: { present: true } });
    expect(nodeFromSaved({ id: '9007199254740993', type: 2, nodeParams: 'wfContext.foo == "bar"', future: true })).toMatchObject({ nodeId: '9007199254740993', nodeType: 2, future: true });
  });
  it('serializes topology while keeping view geometry out of Server DTOs', () => {
    const dag = connect(basic(), '9007199254740993', '9007199254740994');
    const positioned = { ...dag, nodes: layout(dag) };
    expect(wireDag(positioned)).toEqual({ nodes: [{ nodeId: '9007199254740993' }, { nodeId: '9007199254740994' }], edges: [{ from: '9007199254740993', to: '9007199254740994' }] });
  });
  it('preserves untouched metadata, nulls and disabled state when editing only the name', () => {
    const draft = workflow(); draft.wfName = 'Renamed';
    const result = workflowPayload(draft, basic());
    expect(result).toMatchObject({ wfName: 'Renamed', wfDescription: null, enable: false, timeExpression: '', maxWfInstanceNum: 7, notifyUserIds: ['9007199254740997'], futureDto: { retained: true }, lifeCycle: { start: null, end: null } });
    expect(draft.lifeCycle).toBeNull();
  });
  it('preserves a returned zero parallel limit as the Server unlimited setting on a name-only save', () => {
    const draft = { ...workflow(), wfName: 'Renamed unlimited workflow', maxWfInstanceNum: 0 };
    expect(workflowPayload(draft, basic()).maxWfInstanceNum).toBe(0);
  });
  it.each([-1, 0.5, Number.POSITIVE_INFINITY, Number.NaN])('rejects an invalid parallel limit without producing a save payload: %s', maxWfInstanceNum => {
    expect(() => workflowPayload({ ...workflow(), maxWfInstanceNum }, basic())).toThrow('parallel');
  });
  it('clears an existing lifecycle with explicit null bounds and preserves either partial bound', () => {
    expect(lifeCyclePayload(null)).toEqual({ start: null, end: null });
    expect(lifeCyclePayload({ start: '1700000000000', end: null, future: 'keep' })).toEqual({ start: 1700000000000, end: null, future: 'keep' });
    expect(lifeCyclePayload({ start: null, end: 1800000000000 })).toEqual({ start: null, end: 1800000000000 });
    expect(lifeCyclePayload({ start: 0, end: null })).toEqual({ start: 0, end: null });
  });
  it.each([{ start: 'invalid', end: null }, { start: 4, end: 3 }, { start: Number.POSITIVE_INFINITY }, { end: Number.MAX_SAFE_INTEGER + 1 }])('rejects invalid lifecycle before producing any save payload: %j', value => { expect(() => lifeCyclePayload(value)).toThrow('lifecycle'); });
  it('does not confuse workflow/node status values or convert Groovy source into JSON', () => {
    const script = 'wfContext["done"] == "yes"';
    const draft = { ...basic(), nodes: [{ ...node('condition', 2), nodeParams: script }, node('yes'), node('no')], edges: [{ from: 'condition', to: 'yes', property: 'true' }, { from: 'condition', to: 'no', property: 'false' }] };
    expect(validateDag(draft)).toBeNull();
    expect(nodeRequest(draft.nodes[0]!)).toMatchObject({ type: 2, nodeParams: script });
  });
});

describe('DAG editing rules and geometry', () => {
  it('rejects missing nodes, self links, duplicate links and a cycle', () => {
    const initial = basic(); expect(connectionError(initial, 'missing', '9007199254740994')).toBe('missing');
    expect(connectionError(initial, '9007199254740993', '9007199254740993')).toBe('self');
    const connected = connect(initial, '9007199254740993', '9007199254740994');
    expect(connectionError(connected, '9007199254740993', '9007199254740994')).toBe('duplicate');
    expect(connectionError(connected, '9007199254740994', '9007199254740993')).toBe('cycle');
  });
  it('requires exactly two distinct condition branches and canonicalizes imported booleans', () => {
    const initial = { nodes: [node('c', 2), node('yes'), node('no'), node('extra')], edges: [] };
    const one = connect(initial, 'c', 'yes', 'Y'); expect(validateDag(one)).toBe('branches');
    expect(connectionError(one, 'c', 'no', 'Y')).toBe('branchDuplicate');
    const both = connect(one, 'c', 'no'); expect(both.edges.map(e => e.property)).toEqual(['true', 'false']);
    expect(validateDag(both)).toBeNull(); expect(connectionError(both, 'c', 'extra')).toBe('branches');
    expect(wireDag({ ...both, edges: [{ from: 'c', to: 'yes', property: ' TRUE ' }, { from: 'c', to: 'no', property: 'False' }] }).edges.map(e => e.property)).toEqual(['true', 'false']);
  });
  it('rejects empty, repeated nodes, missing endpoints and blank scripts', () => {
    expect(validateDag({ nodes: [], edges: [] })).toBe('empty');
    expect(validateDag({ nodes: [node('a'), node('a')], edges: [] })).toBe('duplicateNode');
    expect(validateDag({ nodes: [node('a')], edges: [{ from: 'a', to: 'b' }] })).toBe('missing');
    expect(validateDag({ nodes: [{ ...node('c', 2), nodeParams: '' }, node('y'), node('n')], edges: [{ from: 'c', to: 'y', property: 'true' }, { from: 'c', to: 'n', property: 'false' }] })).toBe('script');
  });
  it('batch delete removes incident edges but preserves unaffected topology', () => {
    const dag = { nodes: ['a', 'b', 'c', 'd'].map(n => node(n)), edges: [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }, { from: 'c', to: 'd' }] };
    expect(removeNodes(dag, new Set(['a', 'b']))).toEqual({ nodes: [node('c'), node('d')], edges: [{ from: 'c', to: 'd' }] });
  });
  it('lays out forks deterministically and draws edges at the matching branch ports', () => {
    const dag = { nodes: [node('c', 2), node('y'), node('n')], edges: [{ from: 'c', to: 'y', property: 'true' }, { from: 'c', to: 'n', property: 'false' }] };
    const placed = layout(dag); expect(layout(dag)).toEqual(placed);
    expect(placed[1]!.x).toBeGreaterThan(placed[0]!.x); expect(placed[2]!.x).toBe(placed[1]!.x); expect(placed[2]!.y).toBeGreaterThan(placed[1]!.y);
    const start = outputPoint(placed[0]!, 'Y'), end = inputPoint(placed[1]!);
    expect(start).toEqual({ x: placed[0]!.x + 66, y: placed[0]!.y - 20 });
    expect(curve(start, end)).toMatch(new RegExp(`^M ${start.x} ${start.y} C .* ${end.x} ${end.y}$`));
  });
});
