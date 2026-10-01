import type { Dag, Id, LifeCycle, NodeRequest, Point, PositionedNode, SavedNode, Workflow, WorkflowNode } from './types';

export const emptyDag = (): Dag => ({ nodes: [], edges: [] });
export const initialWorkflow = (appId: Id): Workflow => ({ appId, wfName: '', wfDescription: '', enable: true, timeExpressionType: 'API', timeExpression: '', maxWfInstanceNum: 1, notifyUserIds: [], lifeCycle: null });
export const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export const id = (value: unknown): Id => value == null ? '' : String(value);
export function readDag(value: unknown): Dag {
  if (!value || typeof value !== 'object') return emptyDag();
  const source = value as Partial<Dag>;
  return { nodes: (source.nodes || []).map(n => ({ ...copy(n), nodeId: id(n.nodeId ?? n.id), nodeType: Number(n.nodeType ?? n.type ?? 1), jobId: n.jobId == null ? n.jobId : id(n.jobId), instanceId: n.instanceId == null ? n.instanceId : id(n.instanceId) })), edges: (source.edges || []).map(e => ({ ...copy(e), from: id(e.from), to: id(e.to) })) };
}
export function nodeFromSaved(node: SavedNode): WorkflowNode { return { ...copy(node), nodeId: id(node.id), nodeType: Number(node.type), jobId: node.jobId == null ? node.jobId : id(node.jobId) }; }
export function nodeRequest(node: WorkflowNode): NodeRequest {
  return { ...copy(node), id: node.nodeId, type: node.nodeType, jobId: node.jobId, nodeName: node.nodeName, nodeParams: node.nodeParams, enable: node.enable, skipWhenFailed: node.skipWhenFailed };
}
export const edgeBranch = (property?: string): '' | 'Y' | 'N' => property?.trim().toLowerCase() === 'true' ? 'Y' : property?.trim().toLowerCase() === 'false' ? 'N' : '';
export function connectionError(dag: Dag, from: Id, to: Id, branch?: 'Y' | 'N'): string | null {
  const source = dag.nodes.find(n => n.nodeId === from);
  if (!source || !dag.nodes.some(n => n.nodeId === to)) return 'missing';
  if (from === to) return 'self';
  if (dag.edges.some(e => e.from === from && e.to === to)) return 'duplicate';
  const visited = new Set<Id>(), pending = [to];
  while (pending.length) { const current = pending.pop()!; if (current === from) return 'cycle'; if (visited.has(current)) continue; visited.add(current); for (const edge of dag.edges) if (edge.from === current) pending.push(edge.to); }
  if (source.nodeType === 2) { const outgoing = dag.edges.filter(e => e.from === from); if (outgoing.length >= 2) return 'branches'; if (branch && outgoing.some(e => edgeBranch(e.property) === branch)) return 'branchDuplicate'; }
  return null;
}
export function connect(dag: Dag, from: Id, to: Id, branch?: 'Y' | 'N'): Dag {
  const error = connectionError(dag, from, to, branch); if (error) throw new Error(error);
  const source = dag.nodes.find(n => n.nodeId === from)!;
  const selected = branch || (dag.edges.some(e => e.from === from && edgeBranch(e.property) === 'Y') ? 'N' : 'Y');
  return { ...dag, edges: [...dag.edges, { from, to, ...(source.nodeType === 2 ? { property: selected === 'Y' ? 'true' : 'false' } : {}) }] };
}
export function validateDag(dag: Dag): string | null {
  if (!dag.nodes.length) return 'empty';
  const seen = new Set<Id>(); for (const node of dag.nodes) { if (!node.nodeId || seen.has(node.nodeId)) return 'duplicateNode'; seen.add(node.nodeId); }
  const partial: Dag = { nodes: dag.nodes, edges: [] };
  for (const edge of dag.edges) { const error = connectionError(partial, edge.from, edge.to, edgeBranch(edge.property) || undefined); if (error) return error; if (dag.nodes.find(n => n.nodeId === edge.from)?.nodeType === 2 && !edgeBranch(edge.property)) return 'branches'; partial.edges.push(edge); }
  for (const node of dag.nodes.filter(n => n.nodeType === 2)) { const outgoing = dag.edges.filter(e => e.from === node.nodeId); if (outgoing.length !== 2 || !outgoing.some(e => edgeBranch(e.property) === 'Y') || !outgoing.some(e => edgeBranch(e.property) === 'N')) return 'branches'; if (!node.nodeParams?.trim()) return 'script'; }
  return null;
}
export function wireDag(dag: Dag) { return { nodes: dag.nodes.map(n => ({ nodeId: n.nodeId })), edges: dag.edges.map(e => ({ from: e.from, to: e.to, ...(e.property != null ? { property: edgeBranch(e.property) ? edgeBranch(e.property) === 'Y' ? 'true' : 'false' : e.property } : {}) })) }; }
export function lifeCyclePayload(value: LifeCycle | null | undefined): LifeCycle {
  const output: LifeCycle = value ? { ...value } : {};
  for (const bound of ['start', 'end'] as const) { const raw = output[bound]; if (raw == null || raw === '') output[bound] = null; else { const n = Number(raw); if (!Number.isFinite(n) || !Number.isSafeInteger(n)) throw new Error('lifecycle'); output[bound] = n; } }
  if (output.start != null && output.end != null && Number(output.start) > Number(output.end)) throw new Error('lifecycle');
  return output;
}
export function workflowPayload(workflow: Workflow, dag: Dag) {
  const invalid = validateDag(dag); if (invalid) throw new Error(invalid);
  if (!workflow.wfName.trim() || workflow.wfName.length > 255) throw new Error('name');
  if (!Number.isInteger(workflow.maxWfInstanceNum) || workflow.maxWfInstanceNum < 0) throw new Error('parallel');
  return { ...copy(workflow), id: workflow.id || undefined, lifeCycle: lifeCyclePayload(workflow.lifeCycle), dag: wireDag(dag) };
}
export function removeNodes(dag: Dag, removed: Set<Id>): Dag { return { nodes: dag.nodes.filter(n => !removed.has(n.nodeId)), edges: dag.edges.filter(e => !removed.has(e.from) && !removed.has(e.to)) }; }
export function layout(dag: Dag): PositionedNode[] {
  const incoming = new Map(dag.nodes.map(n => [n.nodeId, 0])), rank = new Map<Id, number>();
  for (const edge of dag.edges) if (incoming.has(edge.to) && incoming.has(edge.from)) incoming.set(edge.to, incoming.get(edge.to)! + 1);
  const queue = dag.nodes.filter(n => incoming.get(n.nodeId) === 0).map(n => n.nodeId);
  for (const current of queue) { for (const edge of dag.edges.filter(e => e.from === current)) { rank.set(edge.to, Math.max(rank.get(edge.to) || 0, (rank.get(current) || 0) + 1)); incoming.set(edge.to, incoming.get(edge.to)! - 1); if (incoming.get(edge.to) === 0) queue.push(edge.to); } }
  const rows = new Map<number, number>();
  return dag.nodes.map(node => { const column = rank.get(node.nodeId) || 0, row = rows.get(column) || 0; rows.set(column, row + 1); return { ...node, x: 160 + column * 330, y: 110 + row * 150 }; });
}
export function outputPoint(node: PositionedNode, branch?: 'Y' | 'N'): Point { return { x: node.x + (node.nodeType === 2 ? branch ? 66 : 102 : 120), y: node.y + (node.nodeType === 2 && branch ? branch === 'Y' ? -20 : 20 : 0) }; }
export function inputPoint(node: PositionedNode): Point { return { x: node.x - (node.nodeType === 2 ? 102 : 120), y: node.y }; }
export function curve(from: Point, to: Point): string { const offset = Math.max(54, Math.abs(to.x - from.x) / 2); return `M ${from.x} ${from.y} C ${from.x + offset} ${from.y}, ${to.x - offset} ${to.y}, ${to.x} ${to.y}`; }
export function displayContext(value: unknown): string { if (value == null) return ''; if (typeof value !== 'string') return JSON.stringify(value, null, 2); try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; } }
