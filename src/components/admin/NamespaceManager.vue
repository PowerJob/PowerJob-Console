<template>
  <section class="admin-page">
    <header class="page-heading">
      <div><h1>{{ $t('message.tabNamespace') }}</h1><p>{{ $t('message.namespacesDescription') }}</p></div>
      <el-button type="primary" @click="onClickNewNamespace">{{ $t('message.add') }}</el-button>
    </header>
    <div class="filter-panel">
      <el-form :inline="true" :model="queryNamespaceRequest" @submit.prevent="searchNamespaces">
        <el-form-item label="Code"><el-input v-model="queryNamespaceRequest.codeLike" clearable placeholder="Code" @keyup.enter="searchNamespaces" /></el-form-item>
        <el-form-item :label="$t('message.name')"><el-input v-model="queryNamespaceRequest.nameLike" clearable :placeholder="$t('message.name')" @keyup.enter="searchNamespaces" /></el-form-item>
        <el-form-item :label="$t('message.tag')"><el-input v-model="queryNamespaceRequest.tagLike" clearable :placeholder="$t('message.tag')" @keyup.enter="searchNamespaces" /></el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading">{{ $t('message.query') }}</el-button>
          <el-button @click="onClickReset">{{ $t('message.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </div>
    <div class="data-panel">
      <el-table v-loading="loading" :data="namespaceResult.data" row-key="id" style="width: 100%">
        <el-table-column prop="id" label="ID" min-width="90" />
        <el-table-column prop="code" label="Code" min-width="150" show-overflow-tooltip />
        <el-table-column prop="name" :label="$t('message.name')" min-width="160" show-overflow-tooltip />
        <el-table-column prop="gmtCreateStr" :label="$t('message.createTime')" min-width="180" />
        <el-table-column prop="gmtModifiedStr" :label="$t('message.modifyTime')" min-width="180" />
        <el-table-column prop="statusStr" :label="$t('message.status')" min-width="100" />
        <el-table-column prop="creatorShowName" :label="$t('message.creator')" min-width="120" show-overflow-tooltip />
        <el-table-column prop="modifierShowName" :label="$t('message.modifier')" min-width="120" show-overflow-tooltip />
        <el-table-column :label="$t('message.operation')" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="onClickModify(row)">{{ $t('message.edit') }}</el-button>
            <el-button size="small" link type="danger" :disabled="deletingId === row.id" @click="onClickDeleteNamespace(row)">{{ $t('message.delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination layout="total, prev, pager, next" :total="namespaceResult.totalItems" :page-size="queryNamespaceRequest.pageSize"
                       :current-page="queryNamespaceRequest.index + 1" @current-change="onClickChangePage" :hide-on-single-page="true" />
      </div>
    </div>
    <el-dialog :title="$t(modifiedNamespaceForm.id == null ? 'message.add' : 'message.edit')"
               v-model="modifiedNamespaceFormVisible" :close-on-click-modal="false" :close-on-press-escape="!saving"
               :show-close="!saving" width="min(760px, calc(100vw - 32px))">
      <el-form ref="namespaceForm" :model="modifiedNamespaceForm" :rules="formRules" :disabled="saving" label-position="top">
        <div class="form-grid">
          <el-form-item label="Code" prop="code"><el-input v-model="modifiedNamespaceForm.code" :disabled="modifiedNamespaceForm.id != null" /></el-form-item>
          <el-form-item :label="$t('message.name')"><el-input v-model="modifiedNamespaceForm.name" /></el-form-item>
          <el-form-item label="Token"><el-input disabled v-model="modifiedNamespaceForm.token" show-password /></el-form-item>
          <el-form-item :label="$t('message.tag')"><el-input v-model="modifiedNamespaceForm.tags" /></el-form-item>
        </div>
        <el-form-item :label="$t('message.extra')"><el-input v-model="modifiedNamespaceForm.extra" /></el-form-item>
        <el-form-item :label="$t('message.permissionManage')"><user-role v-model:user-rule-form="user_rule_form" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="saving" @click="modifiedNamespaceFormVisible = false">{{ $t('message.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="onClickSaveNamespace">{{ $t('message.save') }}</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script>
import UserRole from '../common/UserRole.vue'
const emptyRoles = () => ({ observer: [], qa: [], developer: [], admin: [] })
const emptyForm = () => ({ id: undefined, code: '', name: '', tags: '', token: '', status: undefined, extra: '' })
const emptyQuery = () => ({ codeLike: undefined, nameLike: undefined, tagLike: undefined, index: 0, pageSize: 10 })
const cloneRoles = (roles) => Object.fromEntries(Object.keys(emptyRoles()).map(role => [role, Array.isArray(roles?.[role]) ? [...roles[role]] : []]))
export default {
  name: 'NamespaceManager',
  components: { UserRole },
  data() {
    return {
      queryNamespaceRequest: emptyQuery(), modifiedNamespaceForm: emptyForm(), user_rule_form: emptyRoles(),
      namespaceResult: { data: [], totalItems: 0, pageSize: 10 }, modifiedNamespaceFormVisible: false,
      loading: false, saving: false, deletingId: null, requestGeneration: 0
    }
  },
  computed: {
    formRules() { return { code: [{ required: true, message: this.$t('message.requiredField'), trigger: 'blur' }] } }
  },
  methods: {
    showError(error) { this.$message.error(error?.message || String(error)) },
    onClickReset() { this.queryNamespaceRequest = emptyQuery(); return this.listNamespaces() },
    searchNamespaces() { this.queryNamespaceRequest.index = 0; return this.listNamespaces() },
    async listNamespaces() {
      const generation = ++this.requestGeneration
      this.loading = true
      try {
        const result = await this.axios.post('/namespace/list', { ...this.queryNamespaceRequest })
        if (generation === this.requestGeneration) this.namespaceResult = { data: [], totalItems: 0, pageSize: 10, ...result }
      } catch (error) { if (generation === this.requestGeneration) this.showError(error) }
      finally { if (generation === this.requestGeneration) this.loading = false }
    },
    onClickChangePage(index) { this.queryNamespaceRequest.index = index - 1; return this.listNamespaces() },
    onClickNewNamespace() {
      this.modifiedNamespaceForm = emptyForm()
      this.user_rule_form = emptyRoles()
      this.modifiedNamespaceFormVisible = true
      this.$nextTick(() => this.$refs.namespaceForm?.clearValidate())
    },
    async onClickSaveNamespace() {
      if (this.saving) return
      this.saving = true
      try {
        if (!this.modifiedNamespaceForm.code) {
          this.$message.warning(this.$t('message.requiredField'))
          await this.$refs.namespaceForm?.validate().catch(() => false)
          return
        }
        if (this.$refs.namespaceForm && !await this.$refs.namespaceForm.validate().catch(() => false)) return
        const payload = { ...this.modifiedNamespaceForm, componentUserRoleInfo: cloneRoles(this.user_rule_form) }
        await this.axios.post('/namespace/save', payload, { headers: { 'Content-Type': 'application/json', NamespaceId: payload.id } })
        this.$message.success(this.$t('message.success'))
        this.modifiedNamespaceFormVisible = false
        await this.listNamespaces()
      } catch (error) { this.showError(error) }
      finally { this.saving = false }
    },
    onClickModify(data) {
      this.modifiedNamespaceForm = { ...emptyForm(), ...data }
      this.user_rule_form = cloneRoles(data.componentUserRoleInfo)
      this.modifiedNamespaceFormVisible = true
      this.$nextTick(() => this.$refs.namespaceForm?.clearValidate())
    },
    async onClickDeleteNamespace(data) {
      if (this.deletingId !== null) return
      try {
        await this.$confirm(this.$t('message.deleteConfirmation', { name: data.name }), this.$t('message.delete'), {
          confirmButtonText: this.$t('message.confirm'), cancelButtonText: this.$t('message.cancel'), type: 'warning'
        })
      } catch { return }
      this.deletingId = data.id
      try {
        await this.axios.delete('/namespace/delete?id=' + encodeURIComponent(data.id), {
          headers: { 'Content-Type': 'application/json', NamespaceId: data.id }
        })
        this.$message.success(this.$t('message.success'))
        await this.listNamespaces()
      } catch (error) { this.showError(error) }
      finally { this.deletingId = null }
    }
  },
  mounted() { this.listNamespaces() }
}
</script>

<style scoped>
.admin-page { width: 100%; }
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 22px; }
.page-heading h1 { font-size: 25px; font-weight: 650; letter-spacing: -.6px; color: var(--pj-text); margin: 0 0 8px; }
.page-heading p { color: var(--pj-muted); font-size: 13px; margin: 0; line-height: 1.6; }
.filter-panel, .data-panel { background: var(--pj-surface); border: 1px solid var(--pj-border); border-radius: 13px; }
.filter-panel { padding: 20px 20px 2px; margin-bottom: 18px; }
.filter-panel :deep(.el-form-item) { margin-right: 16px; margin-bottom: 18px; }
.filter-panel :deep(.el-input) { width: 190px; }
.data-panel { overflow: hidden; }
.pagination { display: flex; justify-content: flex-end; padding: 14px 18px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; }
@media (max-width: 650px) { .page-heading { align-items: flex-start; } .page-heading h1 { font-size: 22px; } .form-grid { grid-template-columns: 1fr; } .filter-panel :deep(.el-form-item), .filter-panel :deep(.el-form-item__content) { width: 100%; margin-right: 0; } .filter-panel :deep(.el-input) { width: 100%; } .pagination { padding: 12px 8px; } }
</style>
