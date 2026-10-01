import type { ID } from '../admin/contracts'

export interface LoginMethod { type: string; name: string; iconUrl?: string }
export interface LoginUser { id?: ID; username?: string; jwtToken?: string; [key: string]: unknown }
export interface Registration { username: string; nick: string; phone: string; email: string; webHook: string; password: string; password2: string }
export function newRegistration(): Registration { return { username: '', nick: '', phone: '', email: '', webHook: '', password: '', password2: '' } }
export function directLoginBody(username: string, password: string) { return { loginType: 'PWJB', originParams: JSON.stringify({ username, password, encryption: 'none' }) } }
export function callbackPath(search: string) { return '/auth/thirdPartyLoginCallback' + (search.startsWith('?') ? search : search ? '?' + search : '') }
export function registrationValid(value: Registration) { return Boolean(value.username && value.password && value.password2 && value.password === value.password2) }
