<template>
  <main class="login-page">
    <section class="login-story">
      <router-link class="brand" to="/loginHomepage"><PowerJobMark class="brand-mark" /> PowerJob</router-link>
      <div class="story-content">
        <h2>{{ $t('message.consoleTagline') }}</h2>
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
    <div class="login-shell">
      <div class="login-card">
        <h1>{{ $t('message.login') }}</h1>
        <p class="intro">{{ $t('message.signInDescription') }}</p>
        <el-alert v-if="registrationNotice" :title="registrationNotice" type="warning" :closable="false" class="registration-notice" />
        <el-form ref="loginForm" :model="login_info" :disabled="loginLoading" label-position="top" @submit.prevent="doLogin">
          <el-form-item :label="$t('message.username')" prop="username" :rules="requiredRule">
            <el-input v-model="login_info.username" :placeholder="$t('message.username')" autocomplete="username" size="large" />
          </el-form-item>
          <el-form-item :label="$t('message.password')" prop="password" :rules="requiredRule">
            <el-input v-model="login_info.password" :placeholder="$t('message.password')" show-password
                      autocomplete="current-password" size="large" @keyup.enter="doLogin" />
          </el-form-item>
          <el-button class="submit-login" native-type="submit" size="large" type="primary" :loading="loginLoading">
            {{ $t('message.login') }}
          </el-button>
        </el-form>
        <div class="login-links">
          <router-link to="/loginHomepage">{{ $t('message.backToLogin') }}</router-link>
          <el-button link type="primary" @click="openRegister">{{ $t('message.userRegister') }}</el-button>
        </div>
      </div>
    </div>

    <el-dialog :title="$t('message.userRegister')" v-model="userRegisterFormVisible"
               width="min(580px, calc(100vw - 32px))" :close-on-click-modal="false" :close-on-press-escape="!registerLoading"
               :show-close="!registerLoading">
      <el-form ref="registrationForm" :model="userRegisterForm" :disabled="registerLoading" label-position="top" @submit.prevent="registerUser">
        <div class="form-grid">
          <el-form-item :label="$t('message.username')" prop="username" :rules="requiredRule">
            <el-input v-model="userRegisterForm.username" autocomplete="username" />
          </el-form-item>
          <el-form-item :label="$t('message.nick')">
            <el-input v-model="userRegisterForm.nick" />
          </el-form-item>
          <el-form-item :label="$t('message.phone')">
            <el-input v-model="userRegisterForm.phone" autocomplete="tel" />
          </el-form-item>
          <el-form-item :label="$t('message.email')">
            <el-input v-model="userRegisterForm.email" autocomplete="email" />
          </el-form-item>
        </div>
        <el-form-item :label="$t('message.webhook')">
          <el-input v-model="userRegisterForm.webHook" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item :label="$t('message.newPassword')" prop="password" :rules="requiredRule">
            <el-input v-model="userRegisterForm.password" show-password autocomplete="new-password" />
          </el-form-item>
          <el-form-item :label="$t('message.newPassword2')" prop="password2" :rules="requiredRule">
            <el-input v-model="userRegisterForm.password2" show-password autocomplete="new-password" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button :disabled="registerLoading" @click="userRegisterFormVisible = false">{{ $t('message.cancel') }}</el-button>
        <el-button type="primary" :loading="registerLoading" @click="registerUser">{{ $t('message.register') }}</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<script>
import { useAppStore } from '../../store.js'
import PowerJobMark from '../common/PowerJobMark.vue'

const emptyRegistration = () => ({ username: '', nick: '', phone: '', email: '', webHook: '', password: '', password2: '' })
export default {
  name: 'PowerJobThirdPartyLogin',
  components: { PowerJobMark },
  data() {
    return {
      login_info: { username: '', password: '' },
      loginLoading: false,
      registerLoading: false,
      registeredUsername: '',
      registrationNotice: '',
      userRegisterFormVisible: false,
      userRegisterForm: emptyRegistration()
    }
  },
  computed: {
    requiredRule() { return { required: true, message: this.$t('message.requiredField'), trigger: 'blur' } }
  },
  methods: {
    showError(error) { this.$message.error(error?.message || String(error)) },
    openRegister() {
      this.userRegisterForm = emptyRegistration()
      this.userRegisterFormVisible = true
      this.$nextTick(() => this.$refs.registrationForm?.clearValidate())
    },
    async doLogin() {
      if (this.loginLoading) return
      if (!this.login_info.username || !this.login_info.password) {
        await this.$refs.loginForm?.validate().catch(() => {})
        return
      }
      this.loginLoading = true
      try { await this.innerDoLogin(this.login_info.username, this.login_info.password, true) }
      catch (error) { this.showError(error) }
      finally { this.loginLoading = false }
    },
    async innerDoLogin(name, pwd, real_login) {
      // Keep the existing PWJB direct-login protocol; Server owns credential validation.
      const params = { username: name, password: pwd, encryption: 'none' }
      const request = { loginType: 'PWJB', originParams: JSON.stringify(params) }
      const result = await this.axios.post('/auth/thirdPartyLoginDirect', request)
      if (real_login) {
        if (!result?.jwtToken) throw new Error(this.$t('message.failed'))
        useAppStore().clearApplication()
        window.localStorage.setItem('PowerJwt', result.jwtToken)
        await this.$router.push('/admin/app')
      }
      return result
    },
    async registerUser() {
      if (this.registerLoading) return
      const form = { ...this.userRegisterForm }
      if (!form.username || !form.password || !form.password2) {
        await this.$refs.registrationForm?.validate().catch(() => {})
        return
      }
      if (form.password !== form.password2) {
        this.$message.warning(this.$t('message.passwordMismatch'))
        return
      }
      if (this.registeredUsername === form.username) {
        this.registrationNotice = this.$t('message.registrationProfileIncomplete')
        this.login_info.username = form.username
        this.userRegisterFormVisible = false
        return
      }
      this.registerLoading = true
      let accountCreated = false
      try {
        await this.axios.post('/pwjbUser/create', { ...form })
        accountCreated = true
        this.registeredUsername = form.username
        // Account creation is committed before the separate profile initialization.
        this.userRegisterFormVisible = false
        this.login_info.username = form.username
        this.userRegisterForm = emptyRegistration()
        const result = await this.innerDoLogin(form.username, form.password, false)
        if (!result?.jwtToken) throw new Error(this.$t('message.failed'))
        const config = { headers: { PowerJwt: result.jwtToken } }
        const detail = await this.axios.get('/user/detail', config)
        if (detail?.id == null) throw new Error(this.$t('message.failed'))
        // Server 5.1.x registration omits nick; use the existing owner-authorized profile API.
        const profile = { id: detail.id, nick: form.nick, phone: form.phone, email: form.email, webHook: form.webHook }
        await this.axios.post('/user/modify', profile, config)
        const saved = await this.axios.get('/user/detail', config)
        if (['nick', 'phone', 'email', 'webHook'].some(key => form[key] && saved?.[key] !== form[key])) {
          throw new Error(this.$t('message.registrationProfileIncomplete'))
        }
        this.registrationNotice = ''
        this.$message.success(this.$t('message.success'))
      } catch (error) {
        if (accountCreated) this.registrationNotice = this.$t('message.registrationProfileIncomplete')
        this.showError(error)
      }
      finally { this.registerLoading = false }
    }
  }
}
</script>

<style scoped>
.login-page { min-height: 100vh; min-height: 100svh; display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr); background: var(--pj-bg, #fff); }
.login-story { min-width: 0; display: flex; flex-direction: column; padding: 40px clamp(28px, 5vw, 80px); background: var(--pj-nav-bg, #f3f7fa); border-right: 1px solid var(--pj-border, #dce6ed); }
.brand { flex: 0 0 auto; display: inline-flex; align-items: center; align-self: flex-start; gap: 12px; color: var(--pj-text, #19374a); font-size: 23px; line-height: 1.3; font-weight: 600; text-decoration: none; }
.story-content { width: 100%; margin: auto 0; padding: 64px 0; }
.story-content h2 { max-width: 16ch; color: var(--pj-text, #19374a); font-size: clamp(30px, 3.1vw, 46px); line-height: 1.2; font-weight: 500; margin: 0; }
.brand-mark { flex: 0 0 auto; width: 38px; height: 38px; }
.schedule-visual { width: min(100%, 520px); margin-top: 32px; }
.schedule-diagram { display: block; width: 100%; height: auto; overflow: visible; }
.diagram-route { fill: none; stroke: var(--pj-border, #dce6ed); stroke-width: 2; stroke-linejoin: round; }
.diagram-accent { fill: none; stroke: var(--pj-primary, #007a98); stroke-width: 2; stroke-linejoin: round; }
.diagram-node { fill: var(--pj-bg, #fff); stroke: var(--pj-border, #dce6ed); stroke-width: 1.5; }
.diagram-detail { fill: none; stroke: var(--pj-muted, #607787); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.diagram-junction { fill: var(--pj-primary, #007a98); }
.login-shell { min-width: 0; display: grid; place-items: center; padding: 48px 32px; }
.login-card { width: min(100%, 380px); padding: 0; background: var(--pj-surface, #fff); }
.login-card h1 { margin: 0 0 10px; color: var(--pj-text, #19374a); font-size: 28px; font-weight: 600; line-height: 1.3; }
.intro { color: var(--pj-muted, #607787); line-height: 1.6; margin: 0 0 30px; font-size: 14px; }
.submit-login { width: 100%; min-height: 44px; margin-top: 8px; }
.registration-notice { margin-bottom: 20px; }
.login-links { margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--pj-border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-size: 13px; }
.login-links a { color: var(--pj-muted); text-decoration: none; }
.login-links a:hover { color: var(--pj-primary); }
.brand:focus-visible, .login-links a:focus-visible { outline: 2px solid var(--pj-primary); outline-offset: 6px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; }
@media (max-width: 760px) { .login-page { grid-template-columns: 1fr; align-content: start; } .login-story { padding: 24px; border-right: 0; border-bottom: 1px solid var(--pj-border); } .story-content { padding: 32px 0 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(100px, .7fr); align-items: center; gap: 18px; } .story-content h2 { font-size: 27px; max-width: 18ch; } .schedule-visual { margin-top: 0; } .login-shell { padding: 36px 24px 48px; } }
@media (max-width: 540px) { .form-grid { grid-template-columns: 1fr; } }
@media (max-width: 420px) { .story-content { display: none; } .login-story { padding-top: 20px; padding-bottom: 20px; } .login-shell { padding-top: 28px; } }
</style>
