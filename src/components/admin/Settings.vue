<template>
  <section class="settings-page">
    <header class="page-heading">
      <h1>{{ $t('message.tabSettings') }}</h1>
      <p>{{ $t('message.settingsDescription') }}</p>
    </header>
    <section class="settings-card" v-loading="loading">
      <div class="card-heading"><span class="card-icon" aria-hidden="true">◎</span><h2>{{ $t('message.globalAdmin') }}</h2></div>
      <el-form label-position="top" @submit.prevent="saveGlobalAdmins">
        <el-form-item :label="$t('message.globalAdmin')">
          <el-select multiple filterable v-model="adminUserIds" :placeholder="$t('message.globalAdmin')"
                     :disabled="!adminsLoaded" collapse-tags collapse-tags-tooltip>
            <el-option v-for="item in user_list" :key="item.id" :label="item.showName" :value="item.id" />
          </el-select>
        </el-form-item>
        <div class="settings-actions">
          <el-button v-if="!adminsLoaded && !loading" @click="loadSettings">{{ $t('message.retry') }}</el-button>
          <el-button type="primary" native-type="submit" :loading="saving" :disabled="!adminsLoaded || loading">{{ $t('message.save') }}</el-button>
        </div>
      </el-form>
    </section>
  </section>
</template>

<script>
export default {
  name: 'Settings',
  data() { return { user_list: [], adminUserIds: [], loading: false, saving: false, adminsLoaded: false } },
  methods: {
    showError(error) { this.$message.error(error?.message || String(error)) },
    async listUser() {
      const result = await this.axios.get('/user/list')
      this.user_list = Array.isArray(result) ? result : []
    },
    async listGlobalAdmins() {
      this.adminsLoaded = false
      const result = await this.axios.get('/auth/listGlobalAdmin')
      this.adminUserIds = Array.isArray(result) ? result : []
      this.adminsLoaded = true
    },
    async loadSettings() {
      this.loading = true
      // Independent reads complete separately so one failure does not leave an unhandled rejection.
      const results = await Promise.allSettled([this.listUser(), this.listGlobalAdmins()])
      results.forEach(result => { if (result.status === 'rejected') this.showError(result.reason) })
      this.loading = false
    },
    async saveGlobalAdmins() {
      if (this.saving || this.loading || !this.adminsLoaded) return
      if (!this.adminUserIds.length) { this.$message.warning(this.$t('message.requiredField')); return }
      this.saving = true
      try {
        await this.axios.post('/auth/saveGlobalAdmin', { admin: [...this.adminUserIds] })
        this.$message.success(this.$t('message.success'))
      } catch (error) { this.showError(error) }
      finally { this.saving = false }
    }
  },
  mounted() { this.loadSettings() }
}
</script>

<style scoped>
.page-heading { margin-bottom: 22px; }
.page-heading h1 { font-size: 25px; font-weight: 650; letter-spacing: -.6px; color: var(--pj-text); margin: 0 0 8px; }
.page-heading p { color: var(--pj-muted); font-size: 13px; margin: 0; line-height: 1.6; }
.settings-card { padding: 26px; border: 1px solid var(--pj-border); border-radius: 14px; background: var(--pj-surface); max-width: 800px; }
.card-heading { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }
.card-heading h2 { color: var(--pj-text); font-size: 16px; margin: 0; font-weight: 600; }
.card-icon { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; color: var(--pj-primary); background: #edf5ef; font-size: 23px; }
.el-select { width: 100%; }
.settings-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
@media (max-width: 650px) { .settings-card { padding: 20px; } .page-heading h1 { font-size: 22px; } }
</style>
