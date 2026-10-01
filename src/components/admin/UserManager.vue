<template>
  <section class="admin-page user-manager">
    <header class="page-heading">
      <div><h1>{{ $t('message.tabUserManager') }}</h1><p>{{ $t('message.usersDescription') }}</p></div>
    </header>
    <section class="admin-data-surface">
    <div class="filter-panel">
      <el-form :inline="true" :model="queryUserRequest" @submit.prevent="searchUser">
        <el-form-item label="ID"><el-input v-model="queryUserRequest.userIdEq" clearable placeholder="ID" @keyup.enter="searchUser" /></el-form-item>
        <el-form-item :label="$t('message.nick')"><el-input v-model="queryUserRequest.nickLike" clearable :placeholder="$t('message.fuzzyQuery')" @keyup.enter="searchUser" /></el-form-item>
        <el-form-item :label="$t('message.phone')"><el-input v-model="queryUserRequest.phoneLike" clearable :placeholder="$t('message.fuzzyQuery')" @keyup.enter="searchUser" /></el-form-item>
        <el-form-item class="filter-actions">
          <el-button type="primary" native-type="submit" :loading="loading">{{ $t('message.query') }}</el-button>
          <el-button @click="onClickReset">{{ $t('message.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </div>
    <div class="data-panel">
      <el-table v-loading="loading" :data="visibleUsers" row-key="id" style="width: 100%">
        <el-table-column prop="id" label="ID" min-width="90" />
        <el-table-column prop="accountType" :label="$t('message.accountType')" min-width="140" />
        <el-table-column prop="username" :label="$t('message.username')" min-width="180" show-overflow-tooltip />
        <el-table-column prop="nick" :label="$t('message.nick')" min-width="160" show-overflow-tooltip />
        <el-table-column prop="phone" :label="$t('message.phone')" min-width="140" show-overflow-tooltip />
        <el-table-column prop="email" :label="$t('message.email')" min-width="210" show-overflow-tooltip />
        <el-table-column :label="$t('message.status')" width="110" fixed="right">
          <template #default="{ row }">
            <el-switch v-model="row.enable" :loading="Boolean(statusLoading[row.id])"
                       :before-change="() => changeUserStatus(row)" @change="listUser" />
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination v-model:current-page="currentPage" :page-size="pageSize" :total="userListResult.length"
                       layout="total, prev, pager, next" :hide-on-single-page="true" />
      </div>
    </div>
    </section>
  </section>
</template>

<script>
const emptyQuery = () => ({ userIdEq: undefined, nickLike: undefined, phoneLike: undefined })
export default {
  name: 'UserManager',
  data() {
    return { queryUserRequest: emptyQuery(), userListResult: [], loading: false, statusLoading: {}, requestGeneration: 0, currentPage: 1, pageSize: 10 }
  },
  computed: {
    visibleUsers() { return this.userListResult.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize) }
  },
  methods: {
    showError(error) { this.$message.error(error?.message || String(error)) },
    onClickReset() { this.queryUserRequest = emptyQuery(); this.currentPage = 1; return this.listUser() },
    searchUser() { this.currentPage = 1; return this.listUser() },
    async listUser() {
      const generation = ++this.requestGeneration
      this.loading = true
      try {
        const result = await this.axios.post('/user/query', { ...this.queryUserRequest })
        if (generation === this.requestGeneration) {
          this.userListResult = Array.isArray(result) ? result : []
          this.currentPage = Math.min(this.currentPage, Math.max(1, Math.ceil(this.userListResult.length / this.pageSize)))
        }
      } catch (error) { if (generation === this.requestGeneration) this.showError(error) }
      finally { if (generation === this.requestGeneration) this.loading = false }
    },
    async changeUserStatus(data) {
      if (this.statusLoading[data.id]) return false
      this.statusLoading[data.id] = true
      try {
        const action = data.enable ? 'disable' : 'enable'
        await this.axios.post('/user/' + action + '?uid=' + encodeURIComponent(data.id))
        this.$message.success(this.$t('message.success'))
        // Element Plus only mutates the switch after this Promise succeeds.
        return true
      } catch (error) {
        this.showError(error)
        return false
      } finally { delete this.statusLoading[data.id] }
    }
  },
  mounted() { this.listUser() }
}
</script>

<style scoped>
.admin-page { width: 100%; min-width: 0; }
.page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
.page-heading > div { min-width: 0; }
.page-heading h1 { color: var(--pj-text); font-size: 24px; line-height: 1.3; font-weight: 600; margin: 0 0 6px; }
.page-heading p { color: var(--pj-muted); font-size: 13px; line-height: 1.6; max-width: 72ch; margin: 0; }
.page-heading > .el-button { flex-shrink: 0; }
.admin-data-surface { border-top: 1px solid var(--pj-border); background: var(--pj-surface); }
.filter-panel { padding: 16px 12px; border-bottom: 1px solid var(--pj-border); }
.filter-panel :deep(.el-form) { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) max-content; align-items: end; gap: 12px; }
.filter-panel :deep(.el-form-item) { display: flex; flex-direction: column; align-items: stretch; min-width: 0; margin: 0; }
.filter-panel :deep(.el-form-item__label) { display: block; height: auto; padding: 0; margin: 0 0 6px; color: var(--pj-muted); font-size: 12px; line-height: 20px; text-align: left; white-space: normal; }
.filter-panel :deep(.el-form-item__content) { min-width: 0; min-height: 32px; margin-left: 0; flex-wrap: nowrap; }
.filter-panel :deep(.el-input), .filter-panel :deep(.el-select) { width: 100%; }
.filter-actions :deep(.el-form-item__content) { gap: 8px; }
.filter-actions :deep(.el-button + .el-button) { margin-left: 0; }
.data-panel { min-width: 0; overflow: hidden; }
.pagination { display: flex; justify-content: flex-end; padding: 14px 12px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; }
.form-grid .el-select { width: 100%; }
.dialog-actions { display: flex; align-items: center; gap: 8px; }
.dialog-actions .el-button { margin: 0; }
.action-spacer { flex: 1; }
@media (max-width: 760px) { .page-heading { gap: 12px; margin-bottom: 20px; } .page-heading h1 { font-size: 22px; } .filter-panel { padding: 14px 0; } .filter-panel :deep(.el-form) { grid-template-columns: repeat(2, minmax(0, 1fr)); } .pagination { padding: 12px 0; } }
@media (max-width: 480px) { .filter-panel :deep(.el-form) { grid-template-columns: 1fr; } .form-grid { grid-template-columns: 1fr; } .filter-actions { padding-top: 2px; } .pagination { justify-content: flex-start; } }
</style>
