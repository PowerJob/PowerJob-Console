<template>
  <section class="profile-page">
    <header class="page-heading"><h1>{{ $t('message.tabPersonal') }}</h1><p>{{ $t('message.profileDescription') }}</p></header>
    <div class="profile-grid">
      <section class="profile-card" v-loading="loading">
        <div class="profile-summary">
          <span class="avatar">{{ avatarLetter }}</span>
          <div><h2>{{ userDetailInfo.nick || userDetailInfo.username || $t('message.personalInfo') }}</h2>
            <span class="account-label">{{ userDetailInfo.accountType || 'PowerJob' }} · ID {{ userDetailInfo.id ?? '—' }}</span>
          </div>
        </div>
        <el-form ref="profileForm" :model="userDetailInfo" :disabled="saving || loading" label-position="top">
          <div class="form-grid">
            <el-form-item :label="$t('message.username')"><el-input disabled v-model="userDetailInfo.username" /></el-form-item>
            <el-form-item :label="$t('message.originUsername')"><el-input disabled v-model="userDetailInfo.originUsername" /></el-form-item>
            <el-form-item :label="$t('message.accountType')"><el-input disabled v-model="userDetailInfo.accountType" /></el-form-item>
            <el-form-item :label="$t('message.globalRoles')"><el-input disabled :model-value="globalRolesText" /></el-form-item>
          </div>
          <div class="form-grid profile-contact">
            <el-form-item :label="$t('message.nick')"><el-input v-model="userDetailInfo.nick" /></el-form-item>
            <el-form-item :label="$t('message.phone')"><el-input v-model="userDetailInfo.phone" autocomplete="tel" /></el-form-item>
          <el-form-item :label="$t('message.email')"><el-input v-model="userDetailInfo.email" autocomplete="email" /></el-form-item>
          <el-form-item :label="$t('message.webhook')"><el-input v-model="userDetailInfo.webHook" /></el-form-item>
          </div>
          <div class="profile-actions">
            <el-button v-if="userDetailInfo.accountType === 'PWJB'" :disabled="loading || !userLoaded" @click="onClickChangePassword">{{ $t('message.changePassword') }}</el-button>
            <el-button type="primary" :loading="saving" :disabled="loading || !userLoaded" @click="onClickSaveNewUserInfo">{{ $t('message.save') }}</el-button>
          </div>
          <el-button v-if="!loading && !userLoaded" @click="fetchUserDetail">{{ $t('message.retry') }}</el-button>
        </el-form>
      </section>
      <section class="profile-card app-admin-card">
        <div class="card-heading"><h2>{{ $t('message.appAdmin') }}</h2></div>
        <el-form ref="appAdminForm" :model="appAssertRequest" label-position="top" @submit.prevent="onClickAuthThenBecomeAdmin">
          <el-form-item label="appName" prop="appName" :rules="requiredRule"><el-input v-model="appAssertRequest.appName" /></el-form-item>
          <el-form-item :label="$t('message.password')" prop="password" :rules="requiredRule">
            <el-input v-model="appAssertRequest.password" show-password autocomplete="off" />
          </el-form-item>
          <el-button type="primary" native-type="submit" :loading="granting">{{ $t('message.authThenBecomeAdmin') }}</el-button>
        </el-form>
      </section>
    </div>

    <el-dialog :title="$t('message.changePassword')" v-model="changePasswordFormVisible" width="min(540px, calc(100vw - 32px))"
               :close-on-click-modal="false" :close-on-press-escape="!changingPassword" :show-close="!changingPassword">
      <el-form ref="passwordForm" :model="changePasswordRequest" label-position="top">
        <el-form-item :label="$t('message.username')"><el-input disabled v-model="changePasswordRequest.username" autocomplete="username" /></el-form-item>
        <el-form-item :label="$t('message.oldPassword')" prop="oldPassword" :rules="requiredRule">
          <el-input v-model="changePasswordRequest.oldPassword" show-password autocomplete="current-password" />
        </el-form-item>
        <el-form-item :label="$t('message.newPassword')" prop="newPassword" :rules="requiredRule">
          <el-input v-model="changePasswordRequest.newPassword" show-password autocomplete="new-password" />
        </el-form-item>
        <el-form-item :label="$t('message.newPassword2')" prop="newPassword2" :rules="requiredRule">
          <el-input v-model="changePasswordRequest.newPassword2" show-password autocomplete="new-password" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="changingPassword" @click="changePasswordFormVisible = false">{{ $t('message.cancel') }}</el-button>
        <el-button type="primary" :loading="changingPassword" @click="submitChangePasswordRequest">{{ $t('message.confirm') }}</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script>
import { useAppStore } from '../../store.js'
const emptyUser = () => ({
  id: undefined, username: '', nick: '', accountType: '', phone: '', email: '', webHook: '',
  originUsername: '', extra: undefined, globalRoles: [], role2NamespaceList: {}, role2AppList: {}
})
const emptyPassword = (username = '') => ({ username, oldPassword: '', newPassword: '', newPassword2: '' })
export default {
  name: 'UserCenter',
  data() {
    return {
      userDetailInfo: emptyUser(), loading: false, userLoaded: false, saving: false, granting: false, changingPassword: false,
      changePasswordRequest: emptyPassword(), changePasswordFormVisible: false,
      appAssertRequest: { appName: '', password: '' }
    }
  },
  computed: {
    requiredRule() { return { required: true, message: this.$t('message.requiredField'), trigger: 'blur' } },
    globalRolesText() {
      const roles = this.userDetailInfo.globalRoles
      return Array.isArray(roles) ? roles.join(', ') : String(roles || '')
    },
    avatarLetter() { return Array.from(this.userDetailInfo.nick || this.userDetailInfo.username || 'P')[0].toUpperCase() }
  },
  methods: {
    showError(error) { this.$message.error(error?.message || String(error)) },
    async fetchUserDetail() {
      this.loading = true
      try {
        const result = await this.axios.get('/user/detail')
        if (!result || typeof result !== 'object') throw new Error(this.$t('message.failed'))
        this.userDetailInfo = { ...emptyUser(), ...result }
        this.userLoaded = true
        return this.userDetailInfo
      } catch (error) { this.showError(error); return null }
      finally { this.loading = false }
    },
    async onClickSaveNewUserInfo() {
      if (this.saving || !this.userLoaded) return
      this.saving = true
      const draft = { ...this.userDetailInfo }
      try {
        await this.axios.post('/user/modify', draft)
        const saved = await this.fetchUserDetail()
        if (!saved) { this.userDetailInfo = draft; return }
        if (['nick', 'phone', 'email', 'webHook'].some(key => String(saved[key] ?? '') !== String(draft[key] ?? ''))) {
          this.userDetailInfo = draft
          throw new Error(this.$t('message.profileUpdateMismatch'))
        }
        this.$message.success(this.$t('message.success'))
      } catch (error) { this.showError(error) }
      finally { this.saving = false }
    },
    onClickChangePassword() {
      this.changePasswordRequest = emptyPassword(this.userDetailInfo.originUsername)
      this.changePasswordFormVisible = true
      this.$nextTick(() => this.$refs.passwordForm?.clearValidate())
    },
    async submitChangePasswordRequest() {
      if (this.changingPassword) return
      this.changingPassword = true
      try {
        const request = this.changePasswordRequest
        if (!request.username || !request.oldPassword || !request.newPassword || !request.newPassword2) {
          this.$message.warning(this.$t('message.requiredField'))
          await this.$refs.passwordForm?.validate().catch(() => false)
          return
        }
        if (this.$refs.passwordForm && !await this.$refs.passwordForm.validate().catch(() => false)) return
        if (this.changePasswordRequest.newPassword !== this.changePasswordRequest.newPassword2) {
          this.$message.warning(this.$t('message.passwordMismatch'))
          return
        }
        await this.axios.post('/pwjbUser/changePassword', { ...this.changePasswordRequest })
        this.$message.success(this.$t('message.success'))
        this.changePasswordFormVisible = false
        this.changePasswordRequest = emptyPassword()
        window.localStorage.removeItem('PowerJwt')
        useAppStore().clearApplication()
        await this.$router.push('/')
      } catch (error) { this.showError(error) }
      finally { this.changingPassword = false }
    },
    async onClickAuthThenBecomeAdmin() {
      if (this.granting) return
      this.granting = true
      try {
        if (!this.appAssertRequest.appName || !this.appAssertRequest.password) {
          this.$message.warning(this.$t('message.requiredField'))
          await this.$refs.appAdminForm?.validate().catch(() => false)
          return
        }
        if (this.$refs.appAdminForm && !await this.$refs.appAdminForm.validate().catch(() => false)) return
        await this.axios.post('/appInfo/becomeAdmin', { ...this.appAssertRequest })
        this.appAssertRequest.password = ''
        this.$message.success(this.$t('message.success'))
        await this.fetchUserDetail()
      } catch (error) { this.showError(error) }
      finally { this.granting = false }
    }
  },
  mounted() { this.fetchUserDetail() }
}
</script>

<style scoped>
.profile-page { width: 100%; min-width: 0; }
.page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
.page-heading > div { min-width: 0; }
.page-heading h1 { color: var(--pj-text); font-size: 24px; line-height: 1.3; font-weight: 600; margin: 0 0 6px; }
.page-heading p { color: var(--pj-muted); font-size: 13px; line-height: 1.6; max-width: 72ch; margin: 0; }
.page-heading > .el-button { flex-shrink: 0; }
.profile-page .page-heading { display: block; }
.profile-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, .46fr); gap: 32px; align-items: start; border-top: 1px solid var(--pj-border); }
.profile-card { min-width: 0; padding: 24px 0; background: var(--pj-surface); }
.profile-summary { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
.profile-summary > div { min-width: 0; }
.avatar { flex-shrink: 0; display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid var(--pj-border); border-radius: 50%; background: var(--pj-subtle, #f3f7fa); color: var(--pj-primary); font-size: 22px; font-weight: 500; }
.profile-summary h2 { color: var(--pj-text); font-weight: 600; font-size: 18px; line-height: 1.4; margin: 0 0 3px; overflow-wrap: anywhere; }
.account-label { color: var(--pj-muted); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; }
.profile-contact { padding-top: 20px; margin-top: 4px; border-top: 1px solid var(--pj-border); }
.profile-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 10px; padding-top: 12px; }
.profile-actions .el-button { margin: 0; }
.app-admin-card { padding-left: 28px; border-left: 1px solid var(--pj-border); }
.card-heading { margin-bottom: 22px; }
.card-heading h2 { color: var(--pj-text); font-size: 14px; line-height: 1.5; margin: 0; font-weight: 600; }
.app-admin-card :deep(.el-button) { max-width: 100%; height: auto; min-height: 32px; padding-top: 8px; padding-bottom: 8px; white-space: normal; }
@media (max-width: 950px) { .profile-grid { grid-template-columns: 1fr; gap: 0; } .app-admin-card { border-left: 0; border-top: 1px solid var(--pj-border); padding-left: 0; max-width: 560px; } }
@media (max-width: 540px) { .form-grid { grid-template-columns: 1fr; } .page-heading h1 { font-size: 22px; } .profile-card { padding: 20px 0; } }
</style>
