import { api, parseJson, stringifyJson, type DataRecord, type Id } from '../../lib/api';
import type { WorkflowEdge, WorkflowNode } from './model';

export type DeployState = 'connecting' | 'running' | 'finished' | 'failed' | 'closed';
export function deploymentStateFromLine(current: DeployState, line: string): DeployState {
  if (/deploy failed|prepare jar file failed|acquire deploy lock failed|can't find container|no worker available/i.test(line)) return 'failed';
  if (current !== 'failed' && /deploy finished, congratulations/i.test(line)) return 'finished';
  return current;
}
export function deploymentStateOnClose(current: DeployState): DeployState { return current === 'finished' || current === 'failed' ? current : 'closed'; }
export function parseContainerSource(row?: DataRecord): DataRecord { try { return row?.sourceType === 'Git' ? parseJson(row.sourceInfo || '{}') : {}; } catch { return {}; } }
export function maskDeploymentLog(line: string, source: DataRecord) { let result = line.replace(/("password"\s*:\s*)"(?:\\.|[^"\\])*"/g, '$1"••••••"'); if (source.password) result = result.split(String(source.password)).join('••••••'); return result; }
export function containerPayload(values: DataRecord, appId: Id, jarSource: string, id?: Id) {
  if (values.sourceType === 'FatJar' && !jarSource) throw new Error('请先上传 JAR 文件 / Upload a JAR file first');
  return { id, appId, containerName: values.containerName, sourceType: values.sourceType, status: values.status, sourceInfo: values.sourceType === 'Git' ? stringifyJson({ repo: values.repo, branch: values.branch || '', username: values.username || '', password: values.password || '' }) : jarSource };
}
export async function uploadJarFile(file: File, appId: Id, signal?: AbortSignal): Promise<string> {
  if (!file.size) throw new Error('不能上传空文件 / Cannot upload an empty file');
  const body = new FormData(); body.append('file', file);
  const source = await api.post<unknown>('/container/jarUpload', body, { timeout: 120000, headers: { AppId: String(appId) }, signal });
  if (typeof source !== 'string' || !source.trim()) throw new Error('服务未返回有效的 JAR 制品 / The server did not return a valid JAR artifact');
  return source;
}
export function responseId(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number' || typeof value === 'number' && !Number.isSafeInteger(value) || !/^\d+$/.test(String(value))) throw new Error('服务未返回有效的对象 ID / The server did not return a valid ID');
  return String(value);
}
export function nodePayload(node: WorkflowNode, appId: Id) { return { id: node.nodeId, appId, type: node.nodeType, jobId: node.nodeType === 2 ? undefined : node.jobId, nodeName: node.nodeName, nodeParams: node.nodeParams, enable: node.enable ?? true, skipWhenFailed: node.skipWhenFailed ?? false }; }
export class WorkflowSaveError extends Error { readonly nodesSaved = true; constructor(cause: unknown) { super(cause instanceof Error ? cause.message : String(cause), { cause }); } }
export function workflowPayload(values: DataRecord, nodes: WorkflowNode[], edges: WorkflowEdge[], workflowId: string, appId: Id) {
  return { id: workflowId || undefined, appId, ...values, lifeCycle: values.lifeCycle ? { start: values.lifeCycle[0]?.valueOf() ?? null, end: values.lifeCycle[1]?.valueOf() ?? null } : { start: null, end: null }, dag: { nodes: nodes.map(n => ({ nodeId: n.nodeId })), edges: edges.map(e => ({ from: e.from, to: e.to, ...(e.property ? { property: e.property } : {}) })) } };
}
export async function persistWorkflow(values: DataRecord, nodes: WorkflowNode[], edges: WorkflowEdge[], workflowId: string, appId: Id, operation?: { signal?: AbortSignal; current: () => boolean }) {
  const assertCurrent = () => { if (operation?.signal?.aborted || operation && !operation.current()) throw new DOMException('Workflow save was cancelled', 'AbortError'); };
  const options = { headers: { AppId: String(appId) }, ...(operation ? { signal: operation.signal } : {}) };
  assertCurrent();
  await api.post('/workflow/saveNode', nodes.map(node => nodePayload(node, appId)), options);
  assertCurrent();
  try { const id = await api.post('/workflow/save', workflowPayload(values, nodes, edges, workflowId, appId), options); assertCurrent(); return responseId(id); } catch (error) { if ((error as Error).name === 'AbortError') throw error; throw new WorkflowSaveError(error); }
}
export function formatWorkflowContext(context?: string) { if (!context) return '—'; try { return stringifyJson(parseJson(context), 2); } catch { return context; } }
export function workflowNodeStartTime(node?: WorkflowNode, execution?: DataRecord): string {
  const present = (value: unknown) => value != null && value !== '' && value !== 'N/A';
  if (present(node?.startTime)) return String(node!.startTime);
  if (node?.nodeType === 1 && node.instanceId && String(execution?.instanceId) === node.instanceId && present(execution?.actualTriggerTime)) return String(execution!.actualTriggerTime);
  return '—';
}
export function scheduleResultType(result: string): 'success' | 'info' | 'error' { return /^\d{4}-\d{2}-\d{2}/.test(result) ? 'success' : result === 'It is valid, but has not trigger time list!' ? 'info' : 'error'; }
export async function assertZipDownload(value: unknown): Promise<Blob> {
  if (!(value instanceof Blob)) throw new Error('下载未返回有效的 ZIP 文件 / The download did not return a valid ZIP file');
  const bytes = new Uint8Array(await value.slice(0, 4).arrayBuffer());
  if (bytes.length === 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 3 && bytes[3] === 4 || bytes[2] === 5 && bytes[3] === 6 || bytes[2] === 7 && bytes[3] === 8)) return value;
  let message = ''; if (value.size < 1024 * 1024) { try { const result = parseJson(await value.text()); message = result?.message || result?.msg || ''; } catch {} }
  throw new Error(message || '下载未返回有效的 ZIP 文件 / The download did not return a valid ZIP file');
}
