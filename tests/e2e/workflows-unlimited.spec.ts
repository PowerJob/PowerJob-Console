import { test, expect, enterSamples, fill, id, observation, ownedName } from './helpers';
import { WorkflowActions, workflowEdges, workflowNodes } from './workflow-actions';

test.describe('Server unlimited workflow DTO fidelity', () => {
  test.use({ actionTimeout: 15_000 }); test.setTimeout(90_000);
  test('a real existing zero-limit workflow stays unlimited when only its name is edited and saved', async ({ page, backend, credentials }, info) => {
    const actions = new WorkflowActions(page, backend, info);
    try {
      await enterSamples(page, credentials); const job = await actions.job('unlimited_job'), originalName = ownedName('unlimited_original'); await actions.create(originalName); await actions.importJob(job.id); const workflowId = await actions.save(originalName), prepared = await backend.workflow(workflowId);
      // Prepare an existing DTO using the locked Server save Long contract. The acceptance edit is entirely through the page.
      const seed = { ...prepared, maxWfInstanceNum: 0, dag: { nodes: workflowNodes(prepared).map(node => ({ nodeId: id(node.nodeId) })), edges: workflowEdges(prepared) } };
      const seededId = await backend.call<unknown>('/workflow/save', { method: 'POST', data: seed }); expect(id(seededId)).toBe(workflowId); const original = await backend.workflow(workflowId); expect(original.maxWfInstanceNum).toBe(0);
      const row = await actions.list(workflowId); await expect(row.locator('td').nth(2)).toHaveText('Unlimited'); await row.getByRole('button', { name: originalName, exact: true }).click(); await expect(page.getByRole('heading', { name: originalName, exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Workflow settings', exact: true }).click(); const limit = page.getByLabel('Maximum parallel instances', { exact: true }); await expect(limit).toHaveValue('0'); await expect(limit).toHaveAttribute('min', '0'); await expect(page.getByText('0 means unlimited', { exact: true })).toBeVisible();
      const renamed = ownedName('unlimited_renamed'); await fill(page, 'Workflow name', renamed); expect(await actions.save()).toBe(workflowId); const edited = await backend.workflow(workflowId); for (const field of ['maxWfInstanceNum', 'wfDescription', 'notifyUserIds', 'enable', 'timeExpressionType', 'timeExpression', 'lifeCycle', 'peworkflowDAG']) expect(edited[field]).toEqual(original[field]); expect(edited.wfName).toBe(renamed);
      await page.reload(); await expect(page.getByRole('heading', { name: renamed, exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Workflow settings', exact: true }).click(); await expect(limit).toHaveValue('0'); const reloadedRow = await actions.list(workflowId); await expect(reloadedRow.locator('td').nth(2)).toHaveText('Unlimited');
      await observation(info, 'UI-021', 'dag-workflow-unlimited-zero', { workflowId, original, edited, originalName, renamed, preparation: 'Real Server DTO seeded with maxWfInstanceNum=0 through the unchanged /workflow/save Long contract; only the name was edited via the native page.', retainedFields: ['maxWfInstanceNum', 'wfDescription', 'notifyUserIds', 'enable', 'timeExpressionType', 'timeExpression', 'lifeCycle', 'peworkflowDAG'] });
    } finally { await actions.cleanup(); }
  });
});
