<template>
  <section class="admin-page app-manager">
    <header class="page-heading">
      <div><h1>{{ $t('message.tabAppManage') }}</h1><p>{{ $t('message.applicationsDescription') }}</p></div>
      <el-button type="primary" @click="onClickNewApps">{{ $t('message.add') }}</el-button>
    </header>
    <section class="admin-data-surface">
    <div class="filter-panel">
      <el-form :inline="true" :model="queryAppRequest" @submit.prevent="searchApps">
        <el-form-item label="ID"><el-input v-model="queryAppRequest.appId" clearable placeholder="ID" @keyup.enter="searchApps" /></el-form-item>
        <el-form-item label="appName"><el-input v-model="queryAppRequest.appNameLike" clearable :placeholder="$t('message.fuzzyQuery')" @keyup.enter="searchApps" /></el-form-item>
        <el-form-item :label="$t('message.tag')"><el-input v-model="queryAppRequest.tagLike" clearable :placeholder="$t('message.fuzzyQuery')" @keyup.enter="searchApps" /></el-form-item>
        <el-form-item label="Namespace">
          <el-select v-model="queryAppRequest.namespaceId" clearable filterable placeholder="Namespace">
            <el-option v-for="item in namespaceList" :key="item.id" :label="item.showName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item class="filter-toggle" :label="$t('message.showMyRelated')"><el-switch v-model="queryAppRequest.showMyRelated" @change="searchApps" /></el-form-item>
        <el-form-item class="filter-actions">
          <el-button type="primary" native-type="submit" :loading="loading">{{ $t('message.query') }}</el-button>
          <el-button @click="onClickReset">{{ $t('message.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </div>
    <div class="data-panel">
      <el-table v-loading="loading" :data="appResult.data" row-key="id" style="width: 100%">
        <el-table-column prop="id" label="ID" min-width="90" />
        <el-table-column prop="appName" label="appName" min-width="160" show-overflow-tooltip />
        <el-table-column prop="title" :label="$t('message.name')" min-width="160" show-overflow-tooltip />
        <el-table-column prop="namespaceName" label="Namespace" min-width="140" show-overflow-tooltip />
        <el-table-column prop="gmtCreateStr" :label="$t('message.createTime')" min-width="180" />
        <el-table-column prop="gmtModifiedStr" :label="$t('message.modifyTime')" min-width="180" />
        <el-table-column prop="creatorShowName" :label="$t('message.creator')" min-width="120" show-overflow-tooltip />
        <el-table-column prop="modifierShowName" :label="$t('message.modifier')" min-width="120" show-overflow-tooltip />
        <el-table-column :label="$t('message.operation')" width="135" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="onClickModify(row)">{{ $t('message.edit') }}</el-button>
            <el-button size="small" link type="primary" @click="onClickEnter(row)">{{ $t('message.enter') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination layout="total, prev, pager, next" :total="appResult.totalItems" :page-size="queryAppRequest.pageSize"
                       :current-page="queryAppRequest.index + 1" @current-change="onClickChangePage" :hide-on-single-page="true" />
      </div>
    </div>

    </section>

    <el-dialog :title="$t(modifiedAppForm.id == null ? 'message.add' : 'message.edit')"
               v-model="modifiedAppFormVisible" :close-on-click-modal="false" :close-on-press-escape="!saving && !deleting"
               :show-close="!saving && !deleting" width="min(800px, calc(100vw - 32px))">
      <el-form ref="appForm" :model="modifiedAppForm" :rules="formRules" :disabled="saving || deleting" label-position="top">
        <div class="form-grid">
          <el-form-item label="Namespace" prop="namespaceId">
            <el-select v-model="modifiedAppForm.namespaceId" filterable placeholder="Namespace">
              <el-option v-for="item in namespaceList" :key="item.id" :label="item.showName" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="appName" prop="appName"><el-input v-model="modifiedAppForm.appName" /></el-form-item>
          <el-form-item :label="$t('message.name')"><el-input v-model="modifiedAppForm.title" /></el-form-item>
          <el-form-item :label="$t('message.password')" prop="password"><el-input v-model="modifiedAppForm.password" show-password autocomplete="new-password" /></el-form-item>
          <el-form-item :label="$t('message.tag')"><el-input v-model="modifiedAppForm.tags" /></el-form-item>
          <el-form-item :label="$t('message.extra')"><el-input v-model="modifiedAppForm.extra" /></el-form-item>
        </div>
        <el-form-item :label="$t('message.permissionManage')"><user-role v-model:user-rule-form="user_rule_form" /></el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-actions">
          <el-button v-if="modifiedAppForm.id != null" type="danger" plain :loading="deleting" :disabled="saving" @click="onClickDeleteApp">{{ $t('message.delete') }}</el-button>
          <span class="action-spacer"></span>
          <el-button :disabled="saving || deleting" @click="modifiedAppFormVisible = false">{{ $t('message.cancel') }}</el-button>
          <el-button type="primary" :loading="saving" :disabled="deleting" @click="onClickSaveApp">{{ $t('message.save') }}</el-button>
        </div>
      </template>
    </el-dialog>
  </section>
</template>

<script>
import UserRole from '../common/UserRole.vue'
import { useAppStore } from '../../store.js'
const emptyRoles = () => ({ observer: [], qa: [], developer: [], admin: [] })
const emptyForm = () => ({ id: undefined, appName: '', namespaceId: undefined, password: '', title: '', tags: '', extra: '' })
const emptyQuery = () => ({ appId: undefined, namespaceId: undefined, appNameLike: undefined, tagLike: undefined, showMyRelated: true, index: 0, pageSize: 10 })
const cloneRoles = (roles) => Object.fromEntries(Object.keys(emptyRoles()).map(role => [role, Array.isArray(roles?.[role]) ? [...roles[role]] : []]))
export default {
  name: 'AppManager',
  components: { UserRole },
  data() {
    return {
      queryAppRequest: emptyQuery(), modifiedAppForm: emptyForm(), user_rule_form: emptyRoles(),
      appResult: { data: [], totalItems: 0, pageSize: 10 }, modifiedAppFormVisible: false,
      namespaceList: [], loading: false, saving: false, deleting: false, requestGeneration: 0
    }
  },
  computed: {
    formRules() {
      const required = { required: true, message: this.$t('message.requiredField'), trigger: 'blur' }
      return { namespaceId: [required], appName: [required], password: [required] }
    }
  },
  methods: {
    showError(error) { this.$message.error(error?.message || String(error)) },
    onClickReset() { this.queryAppRequest = emptyQuery(); return this.listApps() },
    searchApps() { this.queryAppRequest.index = 0; return this.listApps() },
    async listApps() {
      const generation = ++this.requestGeneration
      this.loading = true
      try {
        const result = await this.axios.post('/appInfo/list', { ...this.queryAppRequest })
        if (generation === this.requestGeneration) {
          this.appResult = { data: [], totalItems: 0, pageSize: 10, ...result }
        }
      } catch (error) { if (generation === this.requestGeneration) this.showError(error) }
      finally { if (generation === this.requestGeneration) this.loading = false }
    },
    onClickChangePage(index) { this.queryAppRequest.index = index - 1; return this.listApps() },
    onClickNewApps() {
      this.modifiedAppForm = emptyForm()
      this.user_rule_form = emptyRoles()
      this.modifiedAppFormVisible = true
      this.$nextTick(() => this.$refs.appForm?.clearValidate())
    },
    async onClickSaveApp() {
      if (this.saving) return
      this.saving = true
      try {
        if (!this.modifiedAppForm.appName || !this.modifiedAppForm.password || this.modifiedAppForm.namespaceId == null || this.modifiedAppForm.namespaceId === '') {
          this.$message.warning(this.$t('message.requiredField'))
          await this.$refs.appForm?.validate().catch(() => false)
          return
        }
        if (this.$refs.appForm && !await this.$refs.appForm.validate().catch(() => false)) return
        const payload = { ...this.modifiedAppForm, componentUserRoleInfo: cloneRoles(this.user_rule_form) }
        await this.axios.post('/appInfo/save', payload, { headers: { 'Content-Type': 'application/json', AppId: payload.id } })
        this.$message.success(this.$t('message.success'))
        this.modifiedAppFormVisible = false
        await this.listApps()
      } catch (error) { this.showError(error) }
      finally { this.saving = false }
    },
    async onClickDeleteApp() {
      if (this.deleting || this.saving) return
      const app = { ...this.modifiedAppForm }
      try {
        await this.$confirm(this.$t('message.deleteConfirmation', { name: app.appName }), this.$t('message.delete'), {
          confirmButtonText: this.$t('message.confirm'), cancelButtonText: this.$t('message.cancel'), type: 'warning'
        })
      } catch { return }
      this.deleting = true
      try {
        await this.axios.post('/appInfo/delete?appId=' + encodeURIComponent(app.id), {}, {
          headers: { 'Content-Type': 'application/json', AppId: app.id }
        })
        if (window.localStorage.getItem('Power_appId') === String(app.id)) useAppStore().clearApplication()
        this.$message.success(this.$t('message.success'))
        this.modifiedAppFormVisible = false
        await this.listApps()
      } catch (error) { this.showError(error) }
      finally { this.deleting = false }
    },
    onClickModify(data) {
      this.modifiedAppForm = { ...emptyForm(), ...data }
      this.user_rule_form = cloneRoles(data.componentUserRoleInfo)
      this.modifiedAppFormVisible = true
      this.$nextTick(() => this.$refs.appForm?.clearValidate())
    },
    onClickEnter(data) {
      useAppStore().selectApplication({ id: data.id, appName: data.appName })
      return this.$router.push('/oms/home')
    },
    async listNamespaces() {
      try {
        const result = await this.axios.post('/namespace/listAll', { ...this.queryAppRequest })
        this.namespaceList = Array.isArray(result) ? result : []
      } catch (error) { this.showError(error) }
    }
  },
  mounted() { this.listApps(); this.listNamespaces() }
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
.app-manager .filter-panel :deep(.el-form) { grid-template-columns: minmax(88px, .65fr) minmax(130px, 1fr) minmax(115px, .8fr) minmax(156px, 1.15fr) minmax(135px, .9fr) max-content; }
.data-panel { min-width: 0; overflow: hidden; }
.pagination { display: flex; justify-content: flex-end; padding: 14px 12px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; }
.form-grid .el-select { width: 100%; }
.dialog-actions { display: flex; align-items: center; gap: 8px; }
.dialog-actions .el-button { margin: 0; }
.action-spacer { flex: 1; }
@media (max-width: 1100px) { .app-manager .filter-panel :deep(.el-form) { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 760px) { .page-heading { gap: 12px; margin-bottom: 20px; } .page-heading h1 { font-size: 22px; } .filter-panel { padding: 14px 0; } .app-manager .filter-panel :deep(.el-form), .filter-panel :deep(.el-form) { grid-template-columns: repeat(2, minmax(0, 1fr)); } .pagination { padding: 12px 0; } }
@media (max-width: 480px) { .app-manager .filter-panel :deep(.el-form), .filter-panel :deep(.el-form) { grid-template-columns: 1fr; } .form-grid { grid-template-columns: 1fr; } .filter-actions { padding-top: 2px; } .pagination { justify-content: flex-start; } }
</style>
