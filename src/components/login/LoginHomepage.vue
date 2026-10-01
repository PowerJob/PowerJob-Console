<template>
  <main class="auth-page">
    <section class="auth-brand">
      <router-link class="brand-wordmark" to="/loginHomepage"><PowerJobMark class="brand-mark" /> PowerJob</router-link>
      <div class="brand-content">
        <h1>{{ $t('message.consoleTagline') }}</h1>
<div class="schedule-visual" aria-hidden="true">
          <svg viewBox="0 0 520 260" class="schedule-diagram">
            <g class="diagram-route"><path d="M73 130h83m52 0h25V60h23m-23 70v70h23m68-140h44v70h60m-104 70h44v-70"/><path d="M208 130h220"/></g>
            <path class="diagram-accent" d="M73 130h83m52 0h25V60h23m68 0h44v70h60"/>
            <circle class="diagram-node" cx="56" cy="130" r="17"/>
            <rect class="diagram-node" x="156" y="104" width="52" height="52" rx="9"/>
            <rect class="diagram-node" x="256" y="34" width="68" height="52" rx="9"/>
            <rect class="diagram-node" x="256" y="174" width="68" height="52" rx="9"/>
            <rect class="diagram-node" x="428" y="104" width="52" height="52" rx="9"/>
            <g class="diagram-detail"><path d="M49 130h14m-7-7v14M172 123h20m-20 7h20m-20 7h12M273 53h34m-34 8h34m-34 8h22M273 193h34m-34 8h34m-34 8h22M442 123h24m-24 7h24m-24 7h16"/></g>
            <g class="diagram-junction"><circle cx="233" cy="130" r="3"/><circle cx="368" cy="130" r="3"/></g>
          </svg>
        </div>
      </div>
    </section>
    <section class="auth-content">
      <div class="auth-card" v-loading="authLoading">
        <h2>{{ $t('message.welcomeTitle') }}</h2>
        <p>{{ $t('message.chooseLoginType') }}</p>
        <div class="login-buttons" v-loading="loadingTypes">
          <el-button v-for="login in login_type_info" :key="login.type" type="primary" size="large"
                     :loading="pendingLoginType === login.type" :disabled="pendingLoginType !== null"
                     @click="onClickLoginTypeBottom(login)">{{ login.name }}</el-button>
          <el-empty v-if="!loadingTypes && login_type_info.length === 0" :description="$t('message.noLoginMethods')" :image-size="70">
            <el-button @click="fetchSupportLoginTypes">{{ $t('message.retry') }}</el-button>
          </el-empty>
        </div>
      </div>
    </section>
  </main>
</template>

<script>
import { useAppStore } from '../../store.js'
import PowerJobMark from '../common/PowerJobMark.vue'

export default {
  name: 'LoginHomepage',
  components: { PowerJobMark },
  data() {
    return { login_type_info: [], loadingTypes: false, pendingLoginType: null, authLoading: false }
  },
  methods: {
    showError(error) { this.$message.error(error?.message || String(error)) },
    async fetchSupportLoginTypes() {
      this.loadingTypes = true
      try {
        const result = await this.axios.get('/auth/supportLoginTypes')
        this.login_type_info = Array.isArray(result) ? result : []
      } catch (error) { this.showError(error) }
      finally { this.loadingTypes = false }
    },
    async onClickLoginTypeBottom(loginInfo) {
      if (this.pendingLoginType !== null) return
      this.pendingLoginType = loginInfo.type
      try {
        const result = await this.axios.get('/auth/thirdPartyLoginUrl?type=' + encodeURIComponent(loginInfo.type))
        const redirectUrl = String(result || '')
        if (redirectUrl.startsWith('FE-REDIRECT:')) {
          await this.$router.push(redirectUrl.slice('FE-REDIRECT:'.length))
        } else if (redirectUrl) {
          window.location.assign(redirectUrl)
        }
      } catch (error) { this.showError(error) }
      finally { this.pendingLoginType = null }
    },
    async tryLogin() {
      const checkedToken = window.localStorage.getItem('PowerJwt')
      try {
        const result = await this.axios.get('/auth/ifLogin')
        if (checkedToken !== window.localStorage.getItem('PowerJwt')) return
        if (result !== null && result !== undefined) {
          useAppStore().restoreApplication()
          await this.$router.push('/admin/app')
        } else {
          window.localStorage.removeItem('PowerJwt')
          useAppStore().clearApplication()
        }
      } catch (error) {
        const currentToken = window.localStorage.getItem('PowerJwt')
        if (!currentToken || checkedToken === currentToken) {
          window.localStorage.removeItem('PowerJwt')
          useAppStore().clearApplication()
          this.showError(error)
        }
      }
    },
    async callbackLogin() {
      const params = new URLSearchParams(window.location.search)
      if (!params.toString()) return false
      // Re-encode decoded +, &, = and Unicode values without changing their meaning.
      const result = await this.axios.get('/auth/thirdPartyLoginCallback?' + params.toString())
      if (!result?.jwtToken) throw new Error(this.$t('message.failed'))
      useAppStore().clearApplication()
      window.localStorage.setItem('PowerJwt', result.jwtToken)
      // Consume a single-use provider code before navigating to the hash route.
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash)
      await this.$router.push('/admin/app')
      return true
    },
    async initializeAuthentication() {
      this.authLoading = true
      try {
        // A stale ifLogin failure must never erase a newly issued callback token.
        if (!await this.callbackLogin()) await this.tryLogin()
      } catch (error) { this.showError(error) }
      finally { this.authLoading = false }
    }
  },
  mounted() {
    this.fetchSupportLoginTypes()
    this.initializeAuthentication()
  }
}
</script>

<style scoped>
.auth-page { min-height: 100vh; min-height: 100svh; display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr); background: var(--pj-bg, #fff); }
.auth-brand { min-width: 0; display: flex; flex-direction: column; padding: 40px clamp(28px, 5vw, 80px); background: var(--pj-nav-bg, #f3f7fa); border-right: 1px solid var(--pj-border, #dce6ed); }
.brand-wordmark { color: var(--pj-text, #19374a); text-decoration: none; display: inline-flex; align-items: center; align-self: flex-start; gap: 12px; font-size: 23px; line-height: 1.3; font-weight: 600; }
.brand-content { width: 100%; margin: auto 0; padding: 64px 0; }
.brand-content h1 { max-width: 16ch; color: var(--pj-text, #19374a); font-size: clamp(30px, 3.1vw, 46px); line-height: 1.2; font-weight: 500; margin: 0; }
.brand-mark { flex: 0 0 auto; width: 38px; height: 38px; }
.schedule-visual { width: min(100%, 520px); margin-top: 32px; }
.schedule-diagram { display: block; width: 100%; height: auto; overflow: visible; }
.diagram-route { fill: none; stroke: var(--pj-border, #dce6ed); stroke-width: 2; stroke-linejoin: round; }
.diagram-accent { fill: none; stroke: var(--pj-primary, #007a98); stroke-width: 2; stroke-linejoin: round; }
.diagram-node { fill: var(--pj-bg, #fff); stroke: var(--pj-border, #dce6ed); stroke-width: 1.5; }
.diagram-detail { fill: none; stroke: var(--pj-muted, #607787); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.diagram-junction { fill: var(--pj-primary, #007a98); }
.auth-content { min-width: 0; display: grid; place-items: center; padding: 48px 32px; }
.auth-card { width: min(100%, 380px); padding: 0; background: var(--pj-surface, #fff); }
.auth-card h2 { color: var(--pj-text, #19374a); font-size: 28px; font-weight: 600; line-height: 1.3; margin: 0 0 10px; }
.auth-card p { color: var(--pj-muted, #607787); margin: 0 0 30px; font-size: 14px; line-height: 1.6; }
.login-buttons { display: flex; flex-direction: column; gap: 12px; }
.login-buttons .el-button { width: 100%; min-height: 44px; height: auto; margin: 0; padding: 12px 18px; white-space: normal; }
.login-buttons :deep(.el-button > span) { overflow-wrap: anywhere; }
.brand-wordmark:focus-visible { outline: 2px solid var(--pj-primary); outline-offset: 6px; }
@media (max-width: 760px) { .auth-page { grid-template-columns: 1fr; align-content: start; } .auth-brand { padding: 24px; border-right: 0; border-bottom: 1px solid var(--pj-border); } .brand-content { padding: 36px 0 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(100px, .7fr); align-items: center; gap: 18px; } .brand-content h1 { font-size: 27px; max-width: 18ch; } .schedule-visual { margin-top: 0; } .auth-content { padding: 36px 24px 48px; } }
@media (max-width: 420px) { .brand-content { grid-template-columns: 1fr; padding-top: 28px; gap: 20px; } .brand-content h1 { font-size: 29px; } .schedule-visual { width: 260px; max-width: 100%; margin-left: auto; margin-top: -8px; } .auth-content { padding-top: 30px; } }
</style>
