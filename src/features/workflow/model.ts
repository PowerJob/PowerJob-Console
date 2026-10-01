import type { DataRecord } from '../../lib/api';

export interface WorkflowNode extends DataRecord { nodeId: string; nodeType: number; nodeName: string; jobId?: string; nodeParams?: string; enable?: boolean; skipWhenFailed?: boolean; instanceId?: string; status?: number }
export interface WorkflowEdge extends DataRecord { from: string; to: string; property?: string }
export interface WorkflowDag { nodes: WorkflowNode[]; edges: WorkflowEdge[] }
export function normalizeDag(value: DataRecord): WorkflowDag {
  const dag = value.peworkflowDAG || value.pEWorkflowDAG || value.PEWorkflowDAG || value.dag || value;
  return { nodes: (dag.nodes || []).map((node: DataRecord) => ({ ...node, nodeId: String(node.nodeId ?? node.id), nodeType: Number(node.nodeType ?? node.type ?? 1), jobId: node.jobId == null ? undefined : String(node.jobId), instanceId: node.instanceId == null ? undefined : String(node.instanceId) })), edges: (dag.edges || []).map((edge: DataRecord) => ({ ...edge, from: String(edge.from), to: String(edge.to) })) };
}
export function connectionError(nodes: WorkflowNode[], edges: WorkflowEdge[], source: string, target: string, property?: string): string | null {
  if (!source || !target || !nodes.some(n => n.nodeId === source) || !nodes.some(n => n.nodeId === target)) return 'missing';
  if (source === target) return 'cycle';
  if (edges.some(e => e.from === source && e.to === target)) return 'duplicate';
  const node = nodes.find(n => n.nodeId === source)!;
  if (node.nodeType === 2 && (!['true', 'false'].includes(property || '') || edges.some(e => e.from === source && e.property === property))) return 'branch';
  const successors = new Map<string, string[]>();
  edges.forEach(e => successors.set(e.from, [...(successors.get(e.from) || []), e.to]));
  const visited = new Set<string>(); const stack = [target];
  while (stack.length) { const current = stack.pop()!; if (current === source) return 'cycle'; if (!visited.has(current)) { visited.add(current); stack.push(...(successors.get(current) || [])); } }
  return null;
}
export function dagErrors(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
  if (!nodes.length) return ['empty'];
  const errors: string[] = [];
  for (const edge of edges) { const error = connectionError(nodes, edges.filter(e => e !== edge), edge.from, edge.to, edge.property); if (error) errors.push(error); }
  nodes.filter(n => n.nodeType === 2).forEach(n => { const branches = edges.filter(e => e.from === n.nodeId); if (branches.length !== 2 || !branches.some(e => e.property === 'true') || !branches.some(e => e.property === 'false')) errors.push('decision'); });
  return [...new Set(errors)];
}
