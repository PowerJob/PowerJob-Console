export type Id = string;
export interface LifeCycle { start?: number | string | null; end?: number | string | null; [key: string]: unknown }
export interface WorkflowNode {
  nodeId: Id; nodeType: number; jobId?: Id | null; nodeName?: string | null;
  nodeParams?: string | null; enable?: boolean | null; skipWhenFailed?: boolean | null;
  instanceId?: Id | null; status?: number | null; result?: string | null;
  disableByControlNode?: boolean; startTime?: string | null; finishedTime?: string | null;
  [key: string]: unknown;
}
export interface WorkflowEdge { from: Id; to: Id; property?: string; enable?: boolean; [key: string]: unknown }
export interface Dag { nodes: WorkflowNode[]; edges: WorkflowEdge[] }
export interface Workflow {
  id?: Id; appId?: Id; wfName: string; wfDescription?: string | null; enable: boolean;
  timeExpressionType: string; timeExpression?: string | null; maxWfInstanceNum: number;
  notifyUserIds?: Id[] | null; lifeCycle?: LifeCycle | null; peworkflowDAG?: Dag;
  gmtCreate?: string | number; gmtModified?: string | number; [key: string]: unknown;
}
export interface WorkflowInstance {
  wfInstanceId: Id; workflowId: Id; workflowName?: string; status: number;
  wfInitParams?: string | null; wfContext?: string | null; result?: string | null;
  expectedTriggerTime?: string; actualTriggerTime?: string; finishedTime?: string; peworkflowDAG?: Dag;
  [key: string]: unknown;
}
export interface Page<T> { index: number; pageSize: number; totalPages: number; totalItems: number; data: T[] }
export interface WorkflowQuery { index: number; pageSize: number; workflowId?: Id; keyword?: string }
export interface WorkflowInstanceQuery { index: number; pageSize: number; workflowId?: Id; wfInstanceId?: Id; status?: string }
export interface NodeRequest { id?: Id; type: number; jobId?: Id | null; nodeName?: string | null; nodeParams?: string | null; enable?: boolean | null; skipWhenFailed?: boolean | null; [key: string]: unknown }
export interface SavedNode extends NodeRequest { id: Id; workflowId?: Id | null; appId?: Id; gmtCreate?: string; gmtModified?: string }
export interface JobOption { id: Id; jobName: string; jobDescription?: string; processorInfo?: string; [key: string]: unknown }
export interface PositionedNode extends WorkflowNode { x: number; y: number }
export interface Point { x: number; y: number }
