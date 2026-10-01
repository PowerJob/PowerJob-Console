import { describe, expect, it } from 'vitest';
import { connectionError, dagErrors, normalizeDag, type WorkflowNode } from './model';

const node = (id: string, type = 1): WorkflowNode => ({ nodeId: id, nodeType: type, nodeName: id, enable: true });
describe('workflow topology and identity', () => {
  it('preserves 64-bit IDs across API node shapes and edges', () => {
    const id = '9223372036854775806'; const target = '9223372036854775805';
    const dag = normalizeDag({ peworkflowDAG: { nodes: [{ nodeId: id, nodeType: 3, jobId: target, instanceId: '9223372036854775804' }], edges: [{ from: id, to: target, property: 'true' }] } });
    expect(dag.nodes[0].nodeId).toBe(id); expect(dag.nodes[0].jobId).toBe(target); expect(dag.nodes[0].instanceId).toBe('9223372036854775804'); expect(dag.edges[0].from).toBe(id);
    expect(normalizeDag({ nodes: [{ id, type: 2 }], edges: [] }).nodes[0]).toMatchObject({ nodeId: id, nodeType: 2 });
  });
  it('accepts parallel branches joining a downstream job', () => {
    const nodes = ['a', 'b', 'c', 'd'].map(id => node(id)); const edges = [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }, { from: 'b', to: 'd' }, { from: 'c', to: 'd' }];
    expect(dagErrors(nodes, edges)).toEqual([]); expect(connectionError(nodes, edges, 'd', 'a')).toBe('cycle'); expect(connectionError(nodes, edges, 'a', 'b')).toBe('duplicate');
  });
  it('rejects dangling references and cycles without discarding a draft', () => {
    const nodes = ['a', 'b', 'c'].map(id => node(id));
    expect(connectionError(nodes, [], 'a', 'a')).toBe('cycle'); expect(connectionError(nodes, [], 'a', 'missing')).toBe('missing');
    expect(dagErrors(nodes, [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'a' }])).toContain('cycle');
    expect(dagErrors([], [])).toEqual(['empty']);
  });
  it('requires exactly two distinct decision outcomes while allowing ordinary parallel edges', () => {
    const nodes = [node('decision', 2), node('yes'), node('no'), node('other')]; const yes = { from: 'decision', to: 'yes', property: 'true' };
    expect(dagErrors(nodes, [yes])).toContain('decision'); expect(connectionError(nodes, [yes], 'decision', 'other', 'true')).toBe('branch');
    expect(connectionError(nodes, [yes], 'decision', 'no', 'false')).toBeNull(); expect(dagErrors(nodes, [yes, { from: 'decision', to: 'no', property: 'false' }])).toEqual([]);
    expect(connectionError(nodes, [yes], 'yes', 'no')).toBeNull();
  });
});
