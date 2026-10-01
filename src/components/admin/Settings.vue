<template>
  <section class="settings-page">
    <header class="page-heading">
      <h1>{{ $t('message.tabSettings') }}</h1>
      <p>{{ $t('message.settingsDescription') }}</p>
    </header>
    <section class="settings-card" v-loading="loading">
      <div class="card-heading"><h2>{{ $t('message.globalAdmin') }}</h2></div>
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
.settings-page { width: 100%; min-width: 0; }
.page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
.page-heading > div { min-width: 0; }
.page-heading h1 { color: var(--pj-text); font-size: 24px; line-height: 1.3; font-weight: 600; margin: 0 0 6px; }
.page-heading p { color: var(--pj-muted); font-size: 13px; line-height: 1.6; max-width: 72ch; margin: 0; }
.page-heading > .el-button { flex-shrink: 0; }
.settings-page .page-heading { display: block; }
.settings-card { padding: 24px 0; border-top: 1px solid var(--pj-border); background: var(--pj-surface); }
.card-heading { margin-bottom: 20px; }
.card-heading h2 { color: var(--pj-text); font-size: 14px; line-height: 1.5; margin: 0; font-weight: 600; }
.settings-card :deep(.el-form) { display: grid; grid-template-columns: minmax(0, 640px) max-content; align-items: end; gap: 16px; }
.settings-card :deep(.el-form-item) { min-width: 0; margin: 0; }
.settings-card :deep(.el-select) { width: 100%; }
.settings-actions { display: flex; justify-content: flex-end; gap: 10px; }
.settings-actions .el-button { margin: 0; }
@media (max-width: 760px) { .settings-card :deep(.el-form) { grid-template-columns: 1fr; } .page-heading h1 { font-size: 22px; } }
</style>
