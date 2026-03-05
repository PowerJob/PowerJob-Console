const TOKEN_KEY = 'PowerJwt'
const APP_ID_KEY = 'Power_appId'
const LANG_KEY = 'oms_lang'

export const storage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
  },

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY)
  },

  getAppId(): string | null {
    return localStorage.getItem(APP_ID_KEY)
  },

  setAppId(appId: string | number): void {
    localStorage.setItem(APP_ID_KEY, String(appId))
  },

  removeAppId(): void {
    localStorage.removeItem(APP_ID_KEY)
  },

  getLang(): string {
    return localStorage.getItem(LANG_KEY) || 'cn'
  },

  setLang(lang: string): void {
    localStorage.setItem(LANG_KEY, lang)
  },
}
