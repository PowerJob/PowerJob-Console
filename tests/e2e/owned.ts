import fs from 'node:fs/promises'
import type { TestInfo } from '@playwright/test'
import { Backend, id, runId, redact, type ID, type RecordDTO, type PageDTO } from './helpers'

type ResourceKind = 'job' | 'workflow' | 'container'
interface Definition { kind: ResourceKind; id: string; originalName: string }
interface Instance { id: string; definitionId: string; type: 'NORMAL' | 'WORKFLOW' | 'WF_INSTANCE' }
interface CleanupAction { kind: string; id: string; action: string; result: string }

// Only explicitly recorded IDs can be cleaned. Name, application and definition ownership are reread before every write.
export class OwnedResources {
  private definitions: Definition[] = []
  private instances: Instance[] = []
  constructor(readonly backend: Backend, readonly prefix = runId) {
    if (prefix !== runId && !prefix.startsWith(runId + '_')) throw new Error('The resource ledger must use this run prefix')
  }
  track(kind: ResourceKind, resourceId: ID, originalName: string) {
    if (!this.ownsName(originalName)) throw new Error('Refusing to record a resource without this run prefix')
    const definition = { kind, id: id(resourceId), originalName }
    if (this.definitions.some(value => value.kind === kind && value.id === definition.id)) throw new Error('A resource ID was recorded twice')
    this.definitions.push(definition)
    return definition.id
  }
  trackInstance(instanceId: ID, definitionId: ID, type: Instance['type'] = 'NORMAL') {
    const kind = type === 'WF_INSTANCE' ? 'workflow' : 'job'
    if (!this.definitions.some(value => value.kind === kind && value.id === id(definitionId))) throw new Error('Refusing to record an instance for an unowned definition')
    const instance = { id: id(instanceId), definitionId: id(definitionId), type }
    if (this.instances.some(value => value.id === instance.id && value.type === type)) throw new Error('An instance was recorded twice')
    this.instances.push(instance)
    return instance.id
  }
  private ownsName(name: unknown) { return typeof name === 'string' && name.startsWith(this.prefix + '_') }
  private verify(definition: Definition, actual: RecordDTO) {
    if (id(actual.id) !== definition.id || !this.ownsName(actual[definition.kind === 'job' ? 'jobName' : definition.kind === 'workflow' ? 'wfName' : 'containerName'])) throw new Error('Refusing to clean a resource whose reread ID or name is not owned')
    if (actual.appId != null && id(actual.appId) !== id(this.backend.appId)) throw new Error('Refusing to clean a resource belonging to another application')
  }
  private async find(definition: Definition): Promise<RecordDTO | undefined> {
    if (definition.kind === 'container') return (await this.backend.containers()).find(row => id(row.id) === definition.id)
    // Exact job-ID queries in formal 5.1.6 include soft-deleted jobs. Use the active keyword list, not that path, for cleanup absence.
    let index = 0
    while (true) {
      const result = definition.kind === 'job' ? await this.backend.listJobs(this.prefix, index, 100) : await this.backend.listWorkflows(this.prefix, index, 100)
      const found = result.data.find(row => id(row.id) === definition.id)
      if (found) return found
      if ((index + 1) * 100 >= Number(result.totalItems) || result.data.length === 0) return undefined
      index++
    }
  }
  private async runningInstances(definition: Definition): Promise<RecordDTO[]> {
    const workflow = definition.kind === 'workflow'
    if (definition.kind === 'container') return []
    const all: RecordDTO[] = []
    for (const type of workflow ? ['WF_INSTANCE'] : ['NORMAL', 'WORKFLOW']) {
      for (let index = 0; ; index++) {
        const data = workflow ? { appId: this.backend.appId, workflowId: definition.id, index, pageSize: 100 } : { appId: this.backend.appId, jobId: definition.id, type, index, pageSize: 100 }
        const page = await this.backend.call<PageDTO<RecordDTO>>(workflow ? '/wfInstance/list' : '/instance/list', { method: 'POST', data })
        all.push(...page.data.filter(row => (workflow ? [1, 2] : [1, 2, 3]).includes(Number(row.status))))
        if ((index + 1) * 100 >= Number(page.totalItems) || page.data.length === 0) break
      }
    }
    return all
  }
  private async definitionIsReferenced(definition: Definition): Promise<boolean> {
    for (let index = 0; ; index++) {
      if (definition.kind !== 'container') {
        const page = await this.backend.listWorkflows('', index, 100)
        for (const row of page.data) {
          if (definition.kind === 'workflow' && id(row.id) === definition.id) continue
          const full = await this.backend.workflow(id(row.id))
          const nodes = (full.peworkflowDAG as { nodes?: RecordDTO[] } | undefined)?.nodes || []
          if (nodes.some(node => Number(node.nodeType) === (definition.kind === 'job' ? 1 : 3) && node.jobId != null && id(node.jobId) === definition.id)) return true
        }
        if ((index + 1) * 100 >= Number(page.totalItems) || page.data.length === 0) return false
      } else {
        const page = await this.backend.listJobs('', index, 100)
        if (page.data.some(job => job.processorType === 'EXTERNAL' && String(job.processorInfo).startsWith(definition.id + '#'))) return true
        if ((index + 1) * 100 >= Number(page.totalItems) || page.data.length === 0) return false
      }
    }
  }
  private async stop(instance: Instance, actions: CleanupAction[]) {
    const definition = this.definitions.find(value => value.id === instance.definitionId && value.kind === (instance.type === 'WF_INSTANCE' ? 'workflow' : 'job'))!
    const actual = instance.type === 'WF_INSTANCE' ? await this.backend.workflowInstance(instance.id) : await this.backend.instance(instance.id, instance.type)
    if (!actual) throw new Error('The exact recorded instance could not be reread during cleanup')
    if (id(actual[instance.type === 'WF_INSTANCE' ? 'workflowId' : 'jobId']) !== instance.definitionId) throw new Error('Refusing to stop an instance attached to another definition')
    const running = (instance.type === 'WF_INSTANCE' ? [1, 2] : [1, 2, 3]).includes(Number(actual.status))
    if (running) {
      const actualDefinition = await this.find(definition)
      if (!actualDefinition) throw new Error('Refusing to stop an instance after its definition disappeared')
      this.verify(definition, actualDefinition)
      const endpoint = instance.type === 'WF_INSTANCE' ? '/wfInstance/stop' : '/instance/stop'
      const query = instance.type === 'WF_INSTANCE' ? { wfInstanceId: instance.id } : { instanceId: instance.id }
      await this.backend.call(endpoint, { query })
      if (instance.type === 'WF_INSTANCE') await this.backend.waitWorkflowInstance(instance.id, [3, 4, 10])
      else await this.backend.waitInstance(instance.id, [4, 5, 9, 10], 90_000, instance.type)
    }
    actions.push({ kind: instance.type, id: instance.id, action: running ? 'stop-exact-recorded-instance' : 'preserve-terminal-history', result: 'VERIFIED' })
  }
  async cleanup(info: TestInfo) {
    const actions: CleanupAction[] = []
    const failures: { kind: string; id: string; reason: string }[] = []
    for (const instance of this.instances) {
      try { await this.stop(instance, actions) } catch (error) { failures.push({ kind: instance.type, id: instance.id, reason: String(redact(error instanceof Error ? error.message : 'Instance cleanup failed')) }) }
    }
    // Workflow definitions are disabled/deleted before their jobs. This ledger never edits an unrecorded Server DAG node.
    const ordered = [...this.definitions].reverse().sort((a, b) => ['workflow', 'job', 'container'].indexOf(a.kind) - ['workflow', 'job', 'container'].indexOf(b.kind))
    for (const definition of ordered) {
      try {
        const actual = await this.find(definition)
        if (!actual) { actions.push({ kind: definition.kind, id: definition.id, action: 'already-absent', result: 'VERIFIED' }); continue }
        this.verify(definition, actual)
        if (failures.some(value => value.id === definition.id || this.instances.some(instance => instance.id === value.id && instance.definitionId === definition.id))) throw new Error('Instance cleanup did not close; preserve definition for review')
        if (definition.kind !== 'container') {
          // Prevent new scheduled instances before verifying every active row. Do not silently stop unrecorded instances.
          await this.backend.call(definition.kind === 'job' ? '/job/disable' : '/workflow/disable', { query: definition.kind === 'job' ? { jobId: definition.id } : { workflowId: definition.id } })
          if ((await this.runningInstances(definition)).length) throw new Error('An unrecorded active instance remains; definition preserved for exact review')
        }
        if (await this.definitionIsReferenced(definition)) throw new Error('An active workflow or external job still references this definition; preserve it for exact review')
        const query = definition.kind === 'workflow' ? { workflowId: definition.id } : definition.kind === 'job' ? { jobId: definition.id } : { containerId: definition.id }
        await this.backend.call(`/${definition.kind}/delete`, { query })
        if (await this.find(definition)) throw new Error('The deleted resource remained active in the real Server list')
        actions.push({ kind: definition.kind, id: definition.id, action: 'soft-delete-exact-owned-definition', result: 'VERIFIED' })
      } catch (error) { failures.push({ kind: definition.kind, id: definition.id, reason: String(redact(error instanceof Error ? error.message : 'Definition cleanup failed')) }) }
    }
    const receipt = { schemaVersion: 1, runId, prefix: this.prefix, appId: id(this.backend.appId), status: failures.length ? 'CLEANUP_INCOMPLETE' : 'EXACT_RECORDED_DEFINITIONS_CLEANED', actions, failures, boundaries: { historiesPreserved: true, onlyExplicitlyTrackedIDs: true, dagOrphanSQLAudit: 'NOT_RUN_IN_THIS_HELPER', applicationNamespaceUserCleanup: 'OWNING_ADMIN_TEST_RESPONSIBILITY', remoteTemporaryFiles: 'NOT_AUDITED' } }
    const filename = info.outputPath('owned-cleanup.json')
    await fs.writeFile(filename, JSON.stringify(receipt, null, 2) + '\n')
    await info.attach('exact-owned-cleanup', { path: filename, contentType: 'application/json' })
    if (failures.length) throw new Error('Owned cleanup is incomplete; retained exact-ID receipt requires review')
    return receipt
  }
}
