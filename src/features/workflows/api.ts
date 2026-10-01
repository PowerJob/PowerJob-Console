import { api } from '../../core/api';
import { session } from '../../core/session';
import { nodeFromSaved, id } from './domain';
import type { Id, JobOption, NodeRequest, Page, SavedNode, Workflow, WorkflowInstance, WorkflowInstanceQuery, WorkflowNode, WorkflowQuery } from './types';

const query = (values: object) => ({ appId: session.appId, ...values });
export const listWorkflows = (body: WorkflowQuery, signal?: AbortSignal) => api<Page<Workflow>>('/workflow/list', { method: 'POST', body: query(body), signal });
export const fetchWorkflow = (workflowId: Id, signal?: AbortSignal) => api<Workflow>('/workflow/fetch', { query: query({ workflowId }), signal });
export const saveWorkflow = (body: object, signal?: AbortSignal) => api<Id>('/workflow/save', { method: 'POST', body: query(body), signal }).then(id);
export const copyWorkflow = (workflowId: Id, signal?: AbortSignal) => api<Id>('/workflow/copy', { method: 'POST', query: query({ workflowId }), signal }).then(id);
export const changeWorkflow = (action: 'enable' | 'disable' | 'delete', workflowId: Id, signal?: AbortSignal) => api<null>(`/workflow/${action}`, { query: query({ workflowId }), signal });
export const runWorkflow = (workflowId: Id, initParams?: string, signal?: AbortSignal) => api<Id>('/workflow/run', { query: query({ workflowId, ...(initParams !== undefined ? { initParams } : {}) }), signal }).then(id);
export const saveNodes = (nodes: NodeRequest[], signal?: AbortSignal): Promise<WorkflowNode[]> => api<SavedNode[]>('/workflow/saveNode', { method: 'POST', body: nodes.map(n => query(n)), signal }).then(nodes => nodes.map(nodeFromSaved));
export const listJobs = (body: { index: number; pageSize: number; keyword?: string; jobId?: Id }, signal?: AbortSignal) => api<Page<JobOption>>('/job/list', { method: 'POST', body: query(body), signal });
export const listWorkflowInstances = (body: WorkflowInstanceQuery, signal?: AbortSignal) => api<Page<WorkflowInstance>>('/wfInstance/list', { method: 'POST', body: query(body), signal });
export const fetchWorkflowInstance = (wfInstanceId: Id, signal?: AbortSignal) => api<WorkflowInstance>('/wfInstance/info', { query: query({ wfInstanceId }), signal });
export const actOnInstance = (action: 'stop' | 'retry' | 'markNodeAsSuccess', wfInstanceId: Id, nodeId?: Id, signal?: AbortSignal) => api<null>(`/wfInstance/${action}`, { query: query({ wfInstanceId, ...(nodeId ? { nodeId } : {}) }), signal });
