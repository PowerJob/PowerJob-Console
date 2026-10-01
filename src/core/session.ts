import { reactive } from 'vue'

export type Entity = Record<string, any>
export const session = reactive({
  jwt: localStorage.getItem('PowerJwt') as string | null,
  appId: localStorage.getItem('Power_appId') || '',
  appName: localStorage.getItem('Power_appName') || '',
  user: null as Entity | null,
  revision: 0,
})
export function clearApp() {
  session.appId = ''; session.appName = ''
  localStorage.removeItem('Power_appId'); localStorage.removeItem('Power_appName')
  session.revision++
}
export function selectApp(app: Entity) {
  session.appId = String(app.id); session.appName = app.appName || app.title || app.name || ''
  localStorage.setItem('Power_appId', session.appId)
  localStorage.setItem('Power_appName', session.appName)
  session.revision++
}
export function establishSession(jwt: string) {
  clearApp()
  localStorage.setItem('PowerJwt', jwt); session.jwt = jwt; session.user = null; session.revision++
}
export function signOut() {
  localStorage.removeItem('PowerJwt'); session.jwt = null; session.user = null; clearApp()
}
window.addEventListener('storage', event => {
  if (!['PowerJwt', 'Power_appId', 'Power_appName', null].includes(event.key)) return
  const jwt = localStorage.getItem('PowerJwt')
  if (jwt !== session.jwt) { session.jwt = jwt; session.user = null }
  session.appId = localStorage.getItem('Power_appId') || ''
  session.appName = localStorage.getItem('Power_appName') || ''
  session.revision++
})
