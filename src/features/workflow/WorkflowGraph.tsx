import { useEffect, useRef, useState } from 'react';
import { App, Button, Space, Tag } from 'antd';
import { Background, Controls, Handle, MarkerType, Position, ReactFlow, ReactFlowProvider, applyEdgeChanges, applyNodeChanges, useReactFlow, type Connection, type Edge, type Node, type NodeProps } from '@xyflow/react';
import { GitBranch, Maximize2, Network, Workflow } from 'lucide-react';
import { useConsole } from '../../lib/console';
import { StatusTag } from '../../components/ui';
import { connectionError, type WorkflowEdge, type WorkflowNode } from './model';
import '@xyflow/react/dist/style.css';
import './workflow.css';

type FlowNode = Node<{ model: WorkflowNode; view: boolean }, 'powerjob'>;
function PowerJobNode({ data, selected }: NodeProps<FlowNode>) {
  const { t } = useConsole(); const node = data.model; const decision = node.nodeType === 2;
  return <div className={`workflow-node ${selected ? 'is-selected' : ''} ${decision ? 'is-decision' : ''} ${node.enable === false || node.disableByControlNode ? 'is-disabled' : ''}`}>
    <Handle type="target" position={Position.Left}/>
    <div className="workflow-node-type">{decision ? <GitBranch size={14}/> : node.nodeType === 3 ? <Workflow size={14}/> : <Network size={14}/>}<span>{decision ? t('判断条件', 'Decision') : node.nodeType === 3 ? t('子工作流', 'Nested workflow') : t('任务', 'Job')}</span></div>
    <div className="workflow-node-name">{node.nodeName || t('未命名节点', 'Untitled node')}</div>
    {node.jobId && <div className="workflow-node-meta">ID {node.jobId}</div>}
    {data.view ? <div className="workflow-node-status">{node.status ? <StatusTag status={node.status}/> : <Tag>{node.disableByControlNode ? t('分支未执行', 'Branch skipped') : t('等待上游', 'Waiting upstream')}</Tag>}</div> : <div className="workflow-node-meta">{node.enable === false ? t('已停用', 'Disabled') : t('已启用', 'Enabled')}{node.skipWhenFailed && ` / ${t('失败跳过', 'Skip on failure')}`}</div>}
    {decision ? <><span className="workflow-handle-label true">True</span><Handle type="source" position={Position.Right} id="true" style={{ top: '34%' }}/><span className="workflow-handle-label false">False</span><Handle type="source" position={Position.Right} id="false" style={{ top: '76%' }}/></> : <Handle type="source" position={Position.Right}/>}
  </div>;
}
const nodeTypes = { powerjob: PowerJobNode };
function positions(nodes: WorkflowNode[], edges: WorkflowEdge[]): Map<string, { x: number; y: number }> {
  const levels = new Map<string, number>(); const degree = new Map(nodes.map(n => [n.nodeId, edges.filter(e => e.to === n.nodeId).length]));
  const queue = nodes.filter(n => !degree.get(n.nodeId)).map(n => n.nodeId); queue.forEach(id => levels.set(id, 0));
  for (let i = 0; i < queue.length; i++) { const id = queue[i]; edges.filter(e => e.from === id).forEach(e => { levels.set(e.to, Math.max(levels.get(e.to) || 0, (levels.get(id) || 0) + 1)); degree.set(e.to, (degree.get(e.to) || 0) - 1); if (degree.get(e.to) === 0) queue.push(e.to); }); }
  const rows = new Map<number, number>(); return new Map(nodes.map(n => { const level = levels.get(n.nodeId) || 0; const row = rows.get(level) || 0; rows.set(level, row + 1); return [n.nodeId, { x: level * 330 + 40, y: row * 178 + 48 }]; }));
}
export interface WorkflowGraphProps { nodes: WorkflowNode[]; edges: WorkflowEdge[]; editable?: boolean; selectedId?: string; onSelect: (node?: WorkflowNode) => void; onChange?: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void; actions?: React.ReactNode }
function Graph({ nodes, edges, editable = false, selectedId, onSelect, onChange, actions }: WorkflowGraphProps) {
  const { t } = useConsole(); const { message } = App.useApp(); const flow = useReactFlow(); const container = useRef<HTMLDivElement>(null); const [visualNodes, setVisualNodes] = useState<FlowNode[]>([]);
  const [visualEdges, setVisualEdges] = useState<Edge[]>([]);
  useEffect(() => { const layout = positions(nodes, edges); setVisualNodes(current => nodes.map(n => ({ id: n.nodeId, type: 'powerjob', position: current.find(x => x.id === n.nodeId)?.position || layout.get(n.nodeId)!, selected: selectedId === n.nodeId, ariaRole: 'button', ariaLabel: n.nodeName || `${t('节点', 'Node')} ${n.nodeId}`, focusable: true, data: { model: n, view: !editable } }))); }, [nodes, selectedId, editable]);
  useEffect(() => { setVisualEdges(edges.map((e, i) => ({ id: `${e.from}-${e.to}-${i}`, source: e.from, target: e.to, sourceHandle: e.property || undefined, label: e.property == null ? undefined : e.property === 'true' ? 'True' : 'False', markerEnd: { type: MarkerType.ArrowClosed }, animated: false, data: { model: e }, style: { stroke: e.enable === false ? 'var(--workflow-muted)' : 'var(--workflow-edge)' } }))); }, [edges]);
  const connect = (connection: Connection) => { const property = connection.sourceHandle || undefined; const error = connectionError(nodes, edges, connection.source, connection.target, property); if (error) { void message.warning(t('无法建立连接：请检查循环、重复连接或判断分支。', 'Cannot connect: check cycles, duplicate connections or decision branches.')); return; } onChange?.(nodes, [...edges, { from: connection.source, to: connection.target, ...(property ? { property } : {}) }]); };
  const arrange = () => { const layout = positions(nodes, edges); setVisualNodes(current => current.map(n => ({ ...n, position: layout.get(n.id)! }))); requestAnimationFrame(() => void flow.fitView({ padding: .18, duration: 200 })); };
  return <div className="workflow-graph" ref={container}>
    <div className="workflow-graph-toolbar"><Space wrap>{actions}<Button onClick={arrange}>{t('自动布局', 'Arrange')}</Button><Button onClick={() => void flow.fitView({ padding: .18, duration: 200 })}>{t('适应画布', 'Fit view')}</Button><Button aria-label={t('全屏', 'Fullscreen')} icon={<Maximize2 size={15}/>} onClick={() => document.fullscreenElement ? void document.exitFullscreen() : void container.current?.requestFullscreen()}/></Space><span>{nodes.length} {t('个节点', 'nodes')} / {edges.length} {t('条连接', 'connections')}</span></div>
    <ReactFlow nodes={visualNodes} edges={visualEdges} nodeTypes={nodeTypes} onNodesChange={changes => { setVisualNodes(current => applyNodeChanges(changes, current)); const selection = changes.find(change => change.type === 'select' && change.selected); if (selection && selection.type === 'select') onSelect(nodes.find(node => node.nodeId === selection.id)); else if (changes.some(change => change.type === 'select' && !change.selected && change.id === selectedId)) onSelect(undefined); }} onEdgesChange={changes => setVisualEdges(current => applyEdgeChanges(changes, current))} onDelete={({ nodes: deletedNodes, edges: deletedEdges }) => { if (!editable) return; const ids = new Set(deletedNodes.map(n => n.id)); const removedEdges = new Set(deletedEdges.map(e => e.id)); onChange?.(nodes.filter(n => !ids.has(n.nodeId)), edges.filter((e, index) => !ids.has(e.from) && !ids.has(e.to) && !removedEdges.has(`${e.from}-${e.to}-${index}`))); if (selectedId && ids.has(selectedId)) onSelect(undefined); }} onConnect={connect} onNodeClick={(_, node) => onSelect(node.data.model)} onPaneClick={() => onSelect(undefined)} nodesConnectable={editable} nodesDraggable={editable} edgesReconnectable={false} deleteKeyCode={editable ? ['Backspace', 'Delete'] : null} fitView fitViewOptions={{ padding: .18 }} minZoom={.25} maxZoom={1.8} proOptions={{ hideAttribution: true }}><Background gap={22} size={1}/><Controls showInteractive={false}/></ReactFlow>
  </div>;
}
export default function WorkflowGraph(props: WorkflowGraphProps) { return <ReactFlowProvider><Graph {...props}/></ReactFlowProvider>; }
