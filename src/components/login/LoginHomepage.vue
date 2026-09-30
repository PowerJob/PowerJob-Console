<template>
  <main class="auth-page">
    <section class="auth-brand">
      <router-link class="brand-wordmark" to="/loginHomepage"><span class="brand-mark">P</span> PowerJob</router-link>
      <div class="brand-content">
        <span class="brand-eyebrow">DISTRIBUTED SCHEDULING</span>
        <h1>{{ $t('message.consoleTagline') }}</h1>
        <div class="brand-visual" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      </div>
      <span class="brand-footnote">PowerJob Console</span>
    </section>
    <section class="auth-content">
      <div class="auth-card" v-loading="authLoading">
        <span class="card-eyebrow">POWERJOB CONSOLE</span>
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

export default {
  name: 'LoginHomepage',
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
.auth-page { min-height: 100vh; display: grid; grid-template-columns: minmax(350px, 44%) 1fr; background: var(--pj-bg, #f4f6f9); }
.auth-brand { display: flex; flex-direction: column; padding: 44px 52px; background: #173f3b; color: #fff; overflow: hidden; }
.brand-wordmark { color: inherit; text-decoration: none; display: flex; align-items: center; gap: 12px; font-size: 23px; font-weight: 750; }
.brand-mark { display: grid; place-items: center; height: 37px; width: 37px; border-radius: 11px; background: #d6f0da; color: #173f3b; }
.brand-content { margin: auto 0; padding: 75px 0; }
.brand-eyebrow, .card-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 2px; }
.brand-eyebrow { color: #a8cfbf; }
.brand-content h1 { max-width: 410px; font-size: clamp(32px, 3.3vw, 48px); line-height: 1.25; margin: 22px 0 48px; font-weight: 650; }
.brand-visual { display: flex; align-items: flex-end; gap: 12px; height: 135px; transform: skewY(-8deg); }
.brand-visual i { display: block; width: 46px; height: 75px; border-radius: 12px; background: #42756b; }
.brand-visual i:nth-child(2) { height: 107px; background: #689d85; }
.brand-visual i:nth-child(3) { height: 135px; background: #b4d2a5; }
.brand-visual i:nth-child(4) { height: 96px; background: #7faf8e; }
.brand-visual i:nth-child(5) { height: 58px; background: #4a8070; }
.brand-footnote { color: #a8c7bd; font-size: 12px; }
.auth-content { display: grid; place-items: center; padding: 44px; }
.auth-card { width: min(100%, 405px); padding: 38px; border: 1px solid var(--pj-border, #e2e8ef); border-radius: 18px; background: var(--pj-surface, #fff); box-shadow: 0 18px 55px #173f3b08; box-sizing: border-box; }
.card-eyebrow { color: var(--pj-primary, #24756c); }
.auth-card h2 { color: var(--pj-text, #1b2c44); font-size: 27px; line-height: 1.3; margin: 18px 0 12px; }
.auth-card p { color: var(--pj-muted, #76859b); margin: 0 0 28px; line-height: 1.6; }
.login-buttons { display: flex; flex-direction: column; gap: 12px; }
.login-buttons .el-button { width: 100%; margin: 0; }
@media (max-width: 760px) { .auth-page { grid-template-columns: 1fr; } .auth-brand { padding: 26px; } .brand-content { padding: 25px 0 0; } .brand-content h1 { font-size: 28px; margin: 14px 0 5px; max-width: none; } .brand-visual, .brand-footnote { display: none; } .auth-content { padding: 26px 18px; } .auth-card { padding: 28px; } }
</style>
