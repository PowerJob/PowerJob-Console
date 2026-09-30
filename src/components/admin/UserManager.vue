<template>
  <section class="admin-page">
    <header class="page-heading">
      <div><h1>{{ $t('message.tabUserManager') }}</h1><p>{{ $t('message.usersDescription') }}</p></div>
    </header>
    <div class="filter-panel">
      <el-form :inline="true" :model="queryUserRequest" @submit.prevent="searchUser">
        <el-form-item label="ID"><el-input v-model="queryUserRequest.userIdEq" clearable placeholder="ID" @keyup.enter="searchUser" /></el-form-item>
        <el-form-item :label="$t('message.nick')"><el-input v-model="queryUserRequest.nickLike" clearable :placeholder="$t('message.fuzzyQuery')" @keyup.enter="searchUser" /></el-form-item>
        <el-form-item :label="$t('message.phone')"><el-input v-model="queryUserRequest.phoneLike" clearable :placeholder="$t('message.fuzzyQuery')" @keyup.enter="searchUser" /></el-form-item>
        <el-form-item>
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
.admin-page { width: 100%; }
.page-heading { margin-bottom: 22px; }
.page-heading h1 { font-size: 25px; font-weight: 650; letter-spacing: -.6px; color: var(--pj-text); margin: 0 0 8px; }
.page-heading p { color: var(--pj-muted); font-size: 13px; margin: 0; line-height: 1.6; }
.filter-panel, .data-panel { background: var(--pj-surface); border: 1px solid var(--pj-border); border-radius: 13px; }
.filter-panel { padding: 20px 20px 2px; margin-bottom: 18px; }
.filter-panel :deep(.el-form-item) { margin-right: 16px; margin-bottom: 18px; }
.filter-panel :deep(.el-input) { width: 190px; }
.data-panel { overflow: hidden; }
.pagination { display: flex; justify-content: flex-end; padding: 14px 18px; }
@media (max-width: 650px) { .page-heading h1 { font-size: 22px; } .filter-panel :deep(.el-form-item), .filter-panel :deep(.el-form-item__content) { width: 100%; margin-right: 0; } .filter-panel :deep(.el-input) { width: 100%; } }
</style>
