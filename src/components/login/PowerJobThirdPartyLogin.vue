<template>
  <main class="login-page">
    <div class="login-shell">
      <router-link class="brand" to="/loginHomepage"><span>P</span> PowerJob</router-link>
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
      <p class="footer">PowerJob Console</p>
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

const emptyRegistration = () => ({ username: '', nick: '', phone: '', email: '', webHook: '', password: '', password2: '' })
export default {
  name: 'PowerJobThirdPartyLogin',
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
.login-page { min-height: 100vh; display: grid; place-items: center; padding: 40px 20px; box-sizing: border-box; background: radial-gradient(ellipse at 20% 10%, #e2ede7, transparent 48%), var(--pj-bg, #f4f6f9); }
.login-shell { width: min(100%, 430px); }
.brand { display: flex; justify-content: center; align-items: center; gap: 12px; color: var(--pj-text, #1b2c44); font-size: 25px; font-weight: 750; text-decoration: none; margin-bottom: 28px; }
.brand span { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 11px; background: var(--pj-primary, #24756c); color: #fff; }
.login-card { padding: 36px; background: var(--pj-surface, #fff); border: 1px solid var(--pj-border, #e2e8ef); border-radius: 18px; box-shadow: 0 16px 45px #173f3b08; }
.login-card h1 { margin: 0 0 10px; color: var(--pj-text, #1b2c44); font-size: 27px; }
.intro { color: var(--pj-muted, #76859b); line-height: 1.6; margin: 0 0 26px; font-size: 14px; }
.submit-login { width: 100%; margin-top: 7px; }
.registration-notice { margin-bottom: 20px; }
.login-links { margin-top: 23px; display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 12px; }
.login-links a { color: var(--pj-muted); text-decoration: none; }
.login-links a:hover { color: var(--pj-primary); }
.footer { text-align: center; font-size: 12px; color: var(--pj-muted); margin: 25px 0 0; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; }
@media (max-width: 540px) { .login-card { padding: 27px; } .form-grid { grid-template-columns: 1fr; } }
</style>
