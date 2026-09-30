/** The Server's DAG contract uses decimal IDs. Keep them as strings throughout. */
export function normalizeDag(nodes = [], edges = []) {
  nodes = Array.isArray(nodes) ? nodes : [];
  edges = Array.isArray(edges) ? edges : [];
  return {
    nodes: nodes.map(node => ({ ...node, id: String(node.nodeId ?? node.id), nodeId: String(node.nodeId ?? node.id), nodeType: Number(node.nodeType ?? node.type ?? 1) })),
    edges: edges.map((edge, index) => ({
      ...edge,
      id: edge.id || `edge-${String(edge.from ?? edge.source)}-${String(edge.to ?? edge.target)}-${index}`,
      source: String(edge.from ?? edge.source), target: String(edge.to ?? edge.target),
      label: edge.label || (String(edge.property).trim().toLowerCase() === 'true' ? 'Y' : String(edge.property).trim().toLowerCase() === 'false' ? 'N' : ''),
    })),
  };
}

export function canConnect(nodes, edges, source, target, label) {
  source = String(source); target = String(target);
  const origin = nodes.find(node => node.id === source);
  if (!origin || !nodes.some(node => node.id === target) || source === target || edges.some(edge => edge.source === source && edge.target === target)) return { valid: false, reason: 'workflowInvalidEdge' };
  const pending = [target], visited = new Set();
  while (pending.length) {
    const next = pending.pop();
    if (next === source) return { valid: false, reason: 'workflowInvalidEdge' };
    if (visited.has(next)) continue;
    visited.add(next);
    edges.filter(edge => edge.source === next).forEach(edge => pending.push(edge.target));
  }
  if (Number(origin.nodeType) === 2) {
    const outgoing = edges.filter(edge => edge.source === source);
    const branch = label || (outgoing.some(edge => edge.label === 'Y') ? 'N' : 'Y');
    if (outgoing.length >= 2 || outgoing.some(edge => edge.label === branch) || !['Y', 'N'].includes(branch)) return { valid: false, reason: 'workflowConditionLimit' };
    return { valid: true, label: branch };
  }
  return { valid: true, label: '' };
}

export function removeNode(dag, id) {
  id = String(id);
  return { nodes: dag.nodes.filter(node => node.id !== id), edges: dag.edges.filter(edge => edge.source !== id && edge.target !== id) };
}

/** Mirror the established Server rules before persisting any edited node forms. */
export function validateDag(dag) {
  if (!dag.nodes.length) return { valid: false, reason: 'workflowEmpty' };
  if (new Set(dag.nodes.map(node => node.id)).size !== dag.nodes.length) return { valid: false, reason: 'workflowInvalidEdge' };
  const accepted = [];
  for (const edge of dag.edges) {
    const result = canConnect(dag.nodes, accepted, edge.source, edge.target, edge.label);
    if (!result.valid) return result;
    accepted.push(edge);
  }
  for (const node of dag.nodes.filter(node => Number(node.nodeType) === 2)) {
    const outgoing = dag.edges.filter(edge => edge.source === node.id);
    if (outgoing.length !== 2 || !outgoing.some(edge => edge.label === 'Y') || !outgoing.some(edge => edge.label === 'N')) return { valid: false, reason: 'workflowIncompleteCondition' };
  }
  return { valid: true };
}

/** Stable left-to-right ranks without a dependency on a graph renderer. */
export function layoutDag(nodes, edges) {
  const ids = new Set(nodes.map(node => node.id)), incoming = new Map(nodes.map(node => [node.id, 0])), rank = new Map(nodes.map(node => [node.id, 0]));
  edges.forEach(edge => { if (ids.has(edge.source) && ids.has(edge.target)) incoming.set(edge.target, incoming.get(edge.target) + 1); });
  const queue = nodes.filter(node => incoming.get(node.id) === 0).map(node => node.id);
  while (queue.length) {
    const source = queue.shift();
    edges.filter(edge => edge.source === source && ids.has(edge.target)).forEach(edge => {
      rank.set(edge.target, Math.max(rank.get(edge.target), rank.get(source) + 1));
      incoming.set(edge.target, incoming.get(edge.target) - 1);
      if (incoming.get(edge.target) === 0) queue.push(edge.target);
    });
  }
  const rows = new Map();
  return nodes.map(node => {
    const column = rank.get(node.id), row = rows.get(column) || 0;
    rows.set(column, row + 1);
    return { ...node, x: 150 + column * 330, y: 90 + row * 135 };
  });
}

export function serializeDag(dag) {
  return {
    nodes: dag.nodes.map(node => ({ nodeId: String(node.id) })),
    edges: dag.edges.map(edge => ({ from: String(edge.source), to: String(edge.target), ...(edge.label ? { property: edge.label === 'Y' ? 'true' : 'false' } : {}) })),
  };
}

export function formatContext(value) {
  if (value === null || value === undefined) return '';
  try { return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value, null, 2); } catch { return String(value); }
}

export function instanceRequest(instanceId, customQuery) {
  return instanceId === undefined || instanceId === null || instanceId === '' ? null : { instanceId: String(instanceId), customQuery };
}
