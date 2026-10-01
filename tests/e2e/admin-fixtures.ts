import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import { expect, Backend, id, runId, ownedName, redact, type ID, type RecordDTO, type PageDTO } from './helpers'
import type { TestInfo } from '@playwright/test'

export const emptyRoles = () => ({ observer: [], qa: [], developer: [], admin: [] } as Record<string, ID[]>)
export const sameIDs = (a: ID[], b: ID[]) => a.map(String).sort().join(',') === b.map(String).sort().join(',')

/** API calls prepare isolated preconditions. Every acceptance action uses the actual page. */
export class AdminFixtures {
  readonly apps: RecordDTO[] = []
  readonly spaces: RecordDTO[] = []
  readonly users: { id: string; origin: string; password: string }[] = []
  private committed: { origin: string; password: string }[] = []
  constructor(readonly backend: Backend) {}
  trackCommitted(origin: string, password: string) { if (!origin.startsWith(runId + '_')) throw new Error('Owned account origin mismatch'); this.committed.push({ origin, password }) }
  trackApp(row: RecordDTO) { if (!String(row.appName).startsWith(runId + '_')) throw new Error('Owned application name mismatch'); id(row.id); id(row.namespaceId); this.apps.push(row); return row }
  trackSpace(row: RecordDTO) { if (!String(row.code).startsWith(runId + '_')) throw new Error('Owned namespace name mismatch'); id(row.id); this.spaces.push(row); return row }
  async space(suffix: string, extra: RecordDTO = {}) { return this.trackSpace(await this.backend.call<RecordDTO>('/namespace/save', { method: 'POST', data: { code: ownedName(suffix), name: ownedName(suffix + '_label'), componentUserRoleInfo: emptyRoles(), ...extra } })) }
  async app(suffix: string, namespaceId: ID, extra: RecordDTO = {}) { return this.trackApp(await this.backend.call<RecordDTO>('/appInfo/save', { method: 'POST', appId: null, data: { appName: ownedName(suffix), namespaceId, password: 'App-' + crypto.randomUUID(), componentUserRoleInfo: emptyRoles(), ...extra } })) }
  async user(suffix: string, fields: RecordDTO = {}) {
    const origin = ownedName(suffix); const password = 'User-' + crypto.randomUUID()
    await this.backend.call('/pwjbUser/create', { method: 'POST', data: { username: origin, password } })
    this.committed.push({ origin, password })
    const material = await this.backend.call<RecordDTO>('/auth/thirdPartyLoginDirect', { method: 'POST', data: { loginType: 'PWJB', originParams: JSON.stringify({ username: origin, password, encryption: 'none' }) } })
    const own = new Backend(this.backend.request, this.backend.server, String(material.jwtToken), this.backend.appId)
    const profile = await own.call<RecordDTO>('/user/detail')
    if (profile.username !== 'PWJB_' + origin) throw new Error('Prepared user identity mismatch')
    const record = { id: id(profile.id), origin, password }; this.users.push(record)
    await own.call('/user/modify', { method: 'POST', data: { id: profile.id, nick: origin, ...fields } })
    return { ...record, profile: await own.call<RecordDTO>('/user/detail'), own }
  }
  async cleanup(info: TestInfo) {
    const actions: RecordDTO[] = []; const failures: RecordDTO[] = []
    for (const record of this.committed) {
      if (this.users.some(user => user.origin === record.origin)) continue
      try {
        const material = await this.backend.call<RecordDTO>('/auth/thirdPartyLoginDirect', { method: 'POST', data: { loginType: 'PWJB', originParams: JSON.stringify({ username: record.origin, password: record.password, encryption: 'none' }) } })
        if (material.username !== 'PWJB_' + record.origin) throw new Error('Committed account recovery identity mismatch')
        this.users.push({ ...record, id: id(material.id) })
      } catch (error) { failures.push({ kind: 'committed-account', origin: record.origin, reason: redact((error as Error).message) }) }
    }
    for (const record of this.users) {
      try {
        const users = await this.backend.call<RecordDTO[]>('/user/query', { method: 'POST', data: { userIdEq: record.id } })
        if (users.length !== 1 || id(users[0].id) !== record.id || users[0].username !== 'PWJB_' + record.origin) throw new Error('Owned user identity changed')
        const admins = await this.backend.call<ID[]>('/auth/listGlobalAdmin')
        if (admins.some(value => id(value) === record.id)) { const keep = admins.filter(value => id(value) !== record.id); if (!keep.length) throw new Error('Refusing final global admin removal'); await this.backend.call('/auth/saveGlobalAdmin', { method: 'POST', data: { admin: keep } }) }
        await this.backend.call('/user/disable', { method: 'POST', query: { uid: record.id } })
        const readback = await this.backend.call<RecordDTO[]>('/user/query', { method: 'POST', data: { userIdEq: record.id } }); expect(readback[0].enable).toBe(false)
        actions.push({ kind: 'user', id: record.id, action: 'disabled-exact-owned-account', recordRetained: true })
      } catch (error) { failures.push({ kind: 'user', id: record.id, reason: redact((error as Error).message) }) }
    }
    for (const record of [...this.apps].reverse()) {
      try {
        const rows = (await this.backend.call<PageDTO<RecordDTO>>('/appInfo/list', { method: 'POST', data: { appId: record.id, showMyRelated: false, index: 0, pageSize: 10 } })).data
        if (!rows.length) { actions.push({ kind: 'app', id: id(record.id), action: 'already-absent' }); continue }
        if (rows.length !== 1 || rows[0].appName !== record.appName || id(rows[0].namespaceId) !== id(record.namespaceId)) throw new Error('Owned application identity changed')
        await this.backend.call('/appInfo/delete', { method: 'POST', appId: id(record.id), query: { appId: record.id }, data: {} })
        expect((await this.backend.call<PageDTO<RecordDTO>>('/appInfo/list', { method: 'POST', data: { appId: record.id, showMyRelated: false, index: 0, pageSize: 10 } })).data).toHaveLength(0)
        actions.push({ kind: 'app', id: id(record.id), action: 'deleted-exact-owned-application' })
      } catch (error) { failures.push({ kind: 'app', id: id(record.id), reason: redact((error as Error).message) }) }
    }
    for (const record of [...this.spaces].reverse()) {
      try {
        const rows = (await this.backend.call<PageDTO<RecordDTO>>('/namespace/list', { method: 'POST', data: { codeLike: record.code, index: 0, pageSize: 100 } })).data.filter(row => id(row.id) === id(record.id))
        if (!rows.length) { actions.push({ kind: 'namespace', id: id(record.id), action: 'already-absent' }); continue }
        if (rows.length !== 1 || rows[0].code !== record.code) throw new Error('Owned namespace identity changed')
        const apps = await this.backend.call<PageDTO<RecordDTO>>('/appInfo/list', { method: 'POST', data: { namespaceId: record.id, showMyRelated: false, index: 0, pageSize: 1 } }); if (Number(apps.totalItems)) throw new Error('Owned namespace still contains applications')
        await this.backend.call('/namespace/delete', { method: 'DELETE', namespaceId: id(record.id), query: { id: record.id } })
        expect((await this.backend.call<PageDTO<RecordDTO>>('/namespace/list', { method: 'POST', data: { codeLike: record.code, index: 0, pageSize: 100 } })).data.some(row => id(row.id) === id(record.id))).toBe(false)
        actions.push({ kind: 'namespace', id: id(record.id), action: 'deleted-exact-owned-namespace' })
      } catch (error) { failures.push({ kind: 'namespace', id: id(record.id), reason: redact((error as Error).message) }) }
    }
    const file = info.outputPath('admin-extra-exact-cleanup.json'); await fs.writeFile(file, JSON.stringify({ status: failures.length ? 'CLEANUP_INCOMPLETE' : 'EXACT_OWNED_CLEANED', runId, actions, failures, sharedMetadataChanged: false, accountHistoryRetained: true }, null, 2) + '\n'); await info.attach('admin-extra-exact-cleanup', { path: file, contentType: 'application/json' }); expect(failures).toEqual([])
  }
}
