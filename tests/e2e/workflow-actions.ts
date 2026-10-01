import type { Locator, Page, TestInfo } from '@playwright/test';
import fs from 'node:fs/promises';
import { Backend, clickAndResponse, expect, fill, id, ownedName, parseResult, processors, selectors, type RecordDTO } from './helpers';
import { OwnedResources } from './owned';

export const workflowNodes = (value: RecordDTO) => (value.peworkflowDAG as { nodes: RecordDTO[] }).nodes;
export const workflowEdges = (value: RecordDTO) => (value.peworkflowDAG as { edges: RecordDTO[] }).edges;
const trackedChildren = new WeakMap<OwnedResources, Set<string>>();
export function trackChildren(owned: OwnedResources, value: RecordDTO) { const recorded = trackedChildren.get(owned) || new Set<string>(); trackedChildren.set(owned, recorded); for (const node of workflowNodes(value)) if (node.instanceId && Number(node.nodeType) === 1) { const childId = id(node.instanceId); if (!recorded.has(childId)) { owned.trackInstance(childId, id(node.jobId), 'WORKFLOW'); recorded.add(childId); } } }

/** Fixture preparation uses the locked Void/Long/array contracts; acceptance actions use the real page. */
export class WorkflowActions {
  readonly owned: OwnedResources;
  readonly attemptedJobs: { name: string; jobId?: string; writeOutcome: string }[] = [];
  readonly nodeResponses: RecordDTO[] = [];
  private responseReads: Promise<void>[] = [];
  constructor(readonly page: Page, readonly backend: Backend, readonly info: TestInfo) {
    this.owned = new OwnedResources(backend);
    page.on('response', response => { if (!new URL(response.url()).pathname.endsWith('/workflow/saveNode')) return; this.responseReads.push(response.text().then(body => { const result = parseResult<RecordDTO[]>(body); if (result.success && Array.isArray(result.data)) this.nodeResponses.push(...result.data); }).catch(() => {})); });
  }
  async job(suffix: string, params = 'success', processor: string = processors.standalone) {
    const name = ownedName(suffix), attempt: { name: string; jobId?: string; writeOutcome: string } = { name, writeOutcome: 'ATTEMPTED' }; this.attemptedJobs.push(attempt);
    const recover = async () => {
      const rows = (await this.backend.listJobs(name)).data.filter(row => row.jobName === name);
      if (rows.length !== 1 || rows[0]!.jobDescription !== 'Synthetic workflow parity fixture' || rows[0]!.processorInfo !== processor || rows[0]!.appId != null && id(rows[0]!.appId) !== id(this.backend.appId)) throw new Error('Exact owned fixture identity was not recovered');
      attempt.jobId = id(rows[0]!.id); this.owned.track('job', attempt.jobId, name); return { id: attempt.jobId, name };
    };
    try { await this.backend.call<null>('/job/save', { method: 'POST', data: { appId: this.backend.appId, jobName: name, jobDescription: 'Synthetic workflow parity fixture', jobParams: params, timeExpressionType: 'API', timeExpression: '', executeType: 'STANDALONE', processorType: 'BUILT_IN', processorInfo: processor, enable: true, maxInstanceNum: 0, concurrency: 5, instanceRetryNum: 0, taskRetryNum: 0, notifyUserIds: [], lifeCycle: { start: null, end: null } } }); attempt.writeOutcome = 'VOID_RESPONSE'; const record = await recover(); attempt.writeOutcome = 'ID_TRACKED'; return record; }
    catch (failure) { for (let i = 0; i < 3 && !attempt.jobId; i++) { try { await recover(); attempt.writeOutcome = 'EXACT_ID_RECOVERED_AFTER_FAILURE'; } catch { /* Keep the unresolved attempted write in the immutable receipt. */ } } throw failure; }
  }
  async create(name: string) { await this.page.goto('/#/oms/workflow'); await this.page.getByRole('button', { name: '+ New workflow', exact: true }).click(); await fill(this.page, 'Workflow name', name); }
  async importJob(jobId: string) {
    await this.page.locator('.flow-tools').getByRole('button', { name: '+ Jobs', exact: true }).click(); const dialog = selectors.dialog(this.page, 'Import jobs'); await fill(dialog, 'Job ID', jobId);
    const listed = await clickAndResponse<{ data: RecordDTO[] }>(this.page, '/job/list', () => dialog.getByRole('button', { name: 'Search', exact: true }).click(), response => response.request().postDataJSON()?.jobId === jobId); expect(listed.success).toBe(true); expect(listed.data.data.map(row => id(row.id))).toEqual([jobId]);
    await dialog.getByRole('row').filter({ has: this.page.getByRole('cell', { name: jobId, exact: true }) }).getByRole('checkbox').check(); const saved = await clickAndResponse<RecordDTO[]>(this.page, '/workflow/saveNode', () => dialog.getByRole('button', { name: 'Import selected (1)', exact: true }).click()); expect(saved.success).toBe(true); await expect(dialog).not.toBeVisible(); expect(id(saved.data[0]!.jobId)).toBe(jobId); return id(saved.data[0]!.id);
  }
  async condition() { const result = await clickAndResponse<RecordDTO[]>(this.page, '/workflow/saveNode', () => this.page.locator('.flow-tools').getByRole('button', { name: 'Condition', exact: true }).click()); expect(result.success).toBe(true); return id(result.data[0]!.id); }
  async select(nodeId: string) { await this.page.locator(`[data-node-id="${nodeId}"]`).press('Enter'); return this.page.locator('.node-inspector'); }
  async connect(from: string, to: string) { await this.select(from); await this.page.locator('.flow-tools').getByRole('button', { name: 'Connect', exact: true }).click(); await this.page.locator(`[data-node-id="${to}"]`).press('Enter'); }
  async nodeSave(inspector: Locator) { const result = await clickAndResponse<RecordDTO[]>(this.page, '/workflow/saveNode', () => inspector.getByRole('button', { name: 'Save node', exact: true }).click()); expect(result.success).toBe(true); return result.data[0]!; }
  async code(inspector: Locator, value: string) { const editor = inspector.locator('.monaco-editor'); await expect(editor).toBeVisible(); await editor.click(); await this.page.keyboard.press('ControlOrMeta+A'); if (value) await this.page.keyboard.insertText(value); else await this.page.keyboard.press('Backspace'); }
  async save(name?: string) { try { const result = await clickAndResponse(this.page, '/workflow/save', () => this.page.getByRole('button', { name: 'Save workflow', exact: true }).click()); expect(result.success).toBe(true); const workflowId = id(result.data); if (name) this.owned.track('workflow', workflowId, name); await expect(this.page).toHaveURL(new RegExp(`workflowId=${workflowId}(?:&|$)`)); return workflowId; } catch (failure) { if (name) { const exact = (await this.backend.listWorkflows(name)).data.filter(row => row.wfName === name); if (exact.length === 1 && (exact[0]!.appId == null || id(exact[0]!.appId) === id(this.backend.appId))) this.owned.track('workflow', id(exact[0]!.id), name); } throw failure; } }
  async edit(workflowId: string) { await this.page.goto(`/#/oms/workflowEditor?workflowId=${workflowId}`); const meta = await this.backend.workflow(workflowId); await expect(this.page.getByRole('heading', { name: String(meta.wfName), exact: true })).toBeVisible(); return meta; }
  async list(workflowId: string) { await this.page.goto('/#/oms/workflow'); await fill(this.page, 'Workflow ID', workflowId); const result = await clickAndResponse<{ data: RecordDTO[] }>(this.page, '/workflow/list', () => this.page.getByRole('button', { name: 'Search', exact: true }).click(), response => response.request().postDataJSON()?.workflowId === workflowId); expect(result.success).toBe(true); expect(result.data.data.map(row => id(row.id))).toEqual([workflowId]); return this.page.locator('.workflow-table tbody tr'); }
  async run(workflowId: string, params?: string) {
    const row = await this.list(workflowId); let result;
    if (params === undefined) result = await clickAndResponse(this.page, '/workflow/run', () => row.getByRole('button', { name: 'Run', exact: true }).click());
    else { await row.getByRole('button', { name: 'Run with parameters', exact: true }).click(); const dialog = selectors.dialog(this.page, 'Run with parameters'); await fill(dialog, 'Initial parameters', params); result = await clickAndResponse(this.page, '/workflow/run', () => dialog.getByRole('button', { name: 'Run workflow', exact: true }).click()); }
    expect(result.success).toBe(true); const instanceId = id(result.data); this.owned.trackInstance(instanceId, workflowId, 'WF_INSTANCE'); return instanceId;
  }
  async cleanup() {
    try { await this.owned.cleanup(this.info); }
    finally { await Promise.all(this.responseReads); const filename = this.info.outputPath('workflow-write-ledger.json'); await fs.writeFile(filename, JSON.stringify({ status: 'ACTUAL_WRITES_NOT_AN_ORPHAN_SQL_AUDIT', testTitle: this.info.title, attemptedJobs: this.attemptedJobs, actualSaveNodeResponses: this.nodeResponses }, null, 2) + '\n'); await this.info.attach('workflow-write-ledger', { path: filename, contentType: 'application/json' }); }
  }
}
