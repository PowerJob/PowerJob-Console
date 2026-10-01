export type ID = string | number
export type Role = 'observer' | 'qa' | 'developer' | 'admin'
export interface Roles { observer: ID[]; qa: ID[]; developer: ID[]; admin: ID[] }
export const roleKeys: Role[] = ['observer', 'qa', 'developer', 'admin']
export function emptyRoles(): Roles { return { observer: [], qa: [], developer: [], admin: [] } }
export function copyRoles(value?: Partial<Roles> | null): Roles {
  return Object.fromEntries(roleKeys.map(key => [key, Array.isArray(value?.[key]) ? [...value[key]!] : []])) as unknown as Roles
}
export interface User { id: ID; username?: string; nick?: string; showName?: string; accountType?: string; phone?: string; email?: string; enable?: boolean; status?: number }
export interface Profile extends User { originUsername?: string; webHook?: string; extra?: string; globalRoles?: string[]; role2NamespaceList?: Record<string, Namespace[]>; role2AppList?: Record<string, Application[]> }
export interface Application { id: ID; appName: string; namespaceId?: ID; namespaceName?: string; title?: string; password?: string; tags?: string; extra?: string; componentUserRoleInfo?: Roles; gmtCreateStr?: string; gmtModifiedStr?: string; creatorShowName?: string; modifierShowName?: string; [key: string]: unknown }
export interface Namespace { id: ID; code: string; name?: string; showName?: string; token?: string; tags?: string; extra?: string; status?: number; statusStr?: string; dept?: string; componentUserRoleInfo?: Roles; gmtCreateStr?: string; gmtModifiedStr?: string; creatorShowName?: string; modifierShowName?: string; [key: string]: unknown }
export interface Page<T> { data: T[]; totalItems: number; pageSize?: number }
export interface AppDraft { id?: ID; appName: string; namespaceId?: ID; password: string; title: string; tags: string; extra: string; componentUserRoleInfo: Roles; [key: string]: unknown }
export interface NamespaceDraft { id?: ID; code: string; name: string; token: string; tags: string; extra: string; status?: number; componentUserRoleInfo: Roles; [key: string]: unknown }
export function newApplication(): AppDraft { return { appName: '', password: '', title: '', tags: '', extra: '', componentUserRoleInfo: emptyRoles() } }
export function newNamespace(): NamespaceDraft { return { code: '', name: '', token: '', tags: '', extra: '', componentUserRoleInfo: emptyRoles() } }
export function validIdentifier(value: string) { return value.length > 0 && !/\s/.test(value) }
export function editableApplication(row: Application): AppDraft {
  return { ...row, appName: row.appName, password: row.password ?? '', title: row.title ?? '', tags: row.tags ?? '', extra: row.extra ?? '', componentUserRoleInfo: copyRoles(row.componentUserRoleInfo) }
}
export function editableNamespace(row: Namespace): NamespaceDraft {
  return { ...row, code: row.code, name: row.name ?? '', token: row.token ?? '', tags: row.tags ?? '', extra: row.extra ?? '', componentUserRoleInfo: copyRoles(row.componentUserRoleInfo) }
}
export function sameID(left: ID | undefined, right: ID | undefined) { return left != null && right != null && String(left) === String(right) }
