<template>
  <div class="container-page">
    <div class="page-heading container-heading"><div><h1>{{ $t('message.tabContainerManager') }}</h1><p>{{ $t('message.containersDescription') }}</p></div><div class="toolbar-actions"><el-button :loading="loading" @click="listContainers"><PjIcon name="refresh"/>{{ $t('message.refresh') }}</el-button><el-button type="primary" @click="newContainer"><PjIcon name="plus"/>{{ $t('message.newContainer') }}</el-button></div></div>
    <div v-loading="loading" class="container-grid">
      <el-empty v-if="!loading && !containerList.length" :description="$t('message.noData')"/>
      <article v-for="item in containerList" :key="item.id" class="container-card">
        <div class="container-card-heading"><span class="container-symbol"><PjIcon name="container"/></span><div class="container-identity"><h2 :title="item.containerName">{{ item.containerName }}</h2><span class="container-id">#{{ item.id }}</span></div><el-tag effect="plain">{{ item.sourceType }}</el-tag></div>
        <dl><dt>{{ $t('message.containerVersion') }}</dt><dd>{{ item.version || '—' }}</dd><dt>{{ $t('message.deployTime') }}</dt><dd>{{ item.lastDeployTime || '—' }}</dd><dt>{{ $t('message.status') }}</dt><dd>{{ item.status }}</dd></dl>
        <div class="container-actions"><el-button type="primary" plain @click="arrangeItem(item)">{{ $t('message.deploy') }}</el-button><el-button @click="editItem(item)">{{ $t('message.edit') }}</el-button><el-dropdown trigger="click"><el-button>{{ $t('message.more') }}</el-button><template #dropdown><el-dropdown-menu><el-dropdown-item @click="listOfItem(item)">{{ $t('message.deployedWorkerList') }}</el-dropdown-item><el-dropdown-item @click="deleteItem(item)">{{ $t('message.delete') }}</el-dropdown-item></el-dropdown-menu></template></el-dropdown></div>
      </article>
    </div>
    <el-dialog :title="$t(id ? 'message.edit' : 'message.newContainer')" v-model="dialogVisible" width="640px" @closed="closeEdit" destroy-on-close>
      <el-form :model="form" label-width="140px">
        <el-form-item :label="$t('message.containerName')" required><el-input v-model="form.containerName"/></el-form-item>
        <el-form-item :label="$t('message.containerType')"><el-radio-group v-model="form.sourceType"><el-radio value="Git">Git</el-radio><el-radio value="FatJar">FatJar</el-radio></el-radio-group></el-form-item>
        <template v-if="form.sourceType === 'Git'">
          <el-form-item :label="$t('message.containerGitURL')" required><el-input v-model="gitForm.repo"/></el-form-item>
          <el-form-item :label="$t('message.branchName')"><el-input v-model="gitForm.branch"/></el-form-item>
          <el-form-item :label="$t('message.username')"><el-input v-model="gitForm.username" autocomplete="off"/></el-form-item>
          <el-form-item :label="$t('message.password')"><el-input v-model="gitForm.password" type="password" show-password autocomplete="new-password"/></el-form-item>
        </template>
        <el-form-item v-else :label="$t('message.upload')">
          <el-upload drag :file-list="fileList" :on-success="onSuccess" :on-error="onUploadError" :before-upload="beforeUpload" :on-remove="onRemove" :action="`${requestUrl}/container/jarUpload`" :headers="headersObj" :limit="1" accept=".jar"><PjIcon name="container"/><div class="el-upload__text">{{ $t('message.uploadTips') }}</div></el-upload>
          <span v-if="sourceInfo" class="artifact-ready">{{ $t('message.success') }}</span>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">{{ $t('message.cancel') }}</el-button><el-button type="primary" :loading="saving" :disabled="form.sourceType === 'FatJar' && !sourceInfo" @click="onSubmit">{{ $t('message.save') }}</el-button></template>
    </el-dialog>
    <el-dialog :title="arrangeTitle" v-model="arrangeVisible" width="900px" @close="closeArrange">
      <el-alert v-if="deploymentStatus !== 'idle'" :title="$t(`message.deployment${deploymentStatus[0].toUpperCase() + deploymentStatus.slice(1)}`)" :type="deploymentStatus === 'error' ? 'error' : deploymentStatus === 'success' ? 'success' : 'info'" :closable="false" :data-status="deploymentStatus" show-icon/>
      <pre class="deployment-log" aria-live="polite">{{ logs.join('\n') || $t('message.waitingDispatch') }}</pre>
    </el-dialog>
  </div>
</template>
<script>
import { markRaw } from 'vue'
import { apiBaseUrl, websocketUrl } from '../../config.js'
export default {
  name: 'ContainerManager',
  data() {
    return { form: { sourceType: 'Git', containerName: '' }, gitForm: { repo: '', branch: '', username: '', password: '' }, sourceInfo: '', id: '', dialogVisible: false, arrangeTitle: '', arrangeVisible: false, containerList: [], logs: [], deploymentStatus: 'idle', arrangeGeneration: 0, fileList: [], loading: false, listGeneration: 0, saving: false, socket: null, uploadHeaders: {}, requestUrl: apiBaseUrl.replace(/\/$/, '') }
  },
  computed: {
    appId() { return localStorage.getItem('Power_appId') },
    headersObj() { return this.uploadHeaders },
  },
  methods: {
    newContainer() { this.closeEdit(); this.dialogVisible = true },
    async onSubmit() {
      if (this.saving) return
      if (this.form.sourceType === 'FatJar' && !this.sourceInfo) { this.$message.warning(this.$t('message.requiredField')); return }
      if (!this.form.containerName.trim() || (this.form.sourceType === 'Git' && !this.gitForm.repo.trim())) { this.$message.warning(this.$t('message.requiredField')); return }
      this.saving = true
      try {
        await this.axios.post('/container/save', { appId: this.appId, containerName: this.form.containerName, status: this.form.status || 'ENABLE', ...(this.id ? { id: this.id } : {}), sourceType: this.form.sourceType, sourceInfo: this.form.sourceType === 'Git' ? JSON.stringify(this.gitForm) : this.sourceInfo })
        this.$message.success(this.$t('message.success')); this.dialogVisible = false
        await this.listContainers()
      } catch { /* Keep the draft on failure. */ } finally { this.saving = false }
    },
    beforeUpload(file) { this.uploadHeaders = { PowerJwt: localStorage.getItem('PowerJwt') || '', AppId: localStorage.getItem('Power_appId') || '' }; if (!file.name.toLowerCase().endsWith('.jar')) { this.$message.warning(this.$t('message.uploadTips')); return false } return true },
    onSuccess(response, file) {
      if (response.success !== true || !response.data) { this.sourceInfo = ''; this.fileList = []; this.$message.error(response.message || this.$t('message.requestFailed')); return }
      this.sourceInfo = response.data; this.fileList = [file]
    },
    onUploadError() { this.$message.error(this.$t('message.requestFailed')) },
    onRemove() { this.sourceInfo = ''; this.fileList = [] },
    async deleteItem(item) {
      try { await this.$confirm(this.$t('message.deleteConfirm'), this.$t('message.confirmTitle'), { type: 'warning' }) } catch { return }
      try { await this.axios.get('/container/delete', { params: { containerId: item.id, appId: this.appId } }); await this.listContainers(); this.$message.success(this.$t('message.success')) } catch { /* Request feedback is centralized. */ }
    },
    editItem(item) {
      this.closeEdit()
      this.form = { sourceType: item.sourceType, containerName: item.containerName, status: item.status || 'ENABLE' }; this.id = item.id
      if (item.sourceType === 'Git') { try { const config = JSON.parse(item.sourceInfo || '{}'); if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Invalid Git configuration'); this.gitForm = { ...this.gitForm, ...config } } catch { this.$message.warning(this.$t('message.invalidJson')); return } }
      else this.sourceInfo = item.sourceInfo || ''
      this.dialogVisible = true
    },
    arrangeItem(item) {
      this.closeArrange(); this.arrangeTitle = `${this.$t('message.deploy')} · ${item.containerName}`; this.arrangeVisible = true; this.deploymentStatus = 'running'
      const socket = markRaw(new WebSocket(websocketUrl(`/container/deploy/${item.id}`)))
      this.socket = socket
      socket.onopen = () => { if (this.socket === socket) socket.send(JSON.stringify({ jwtToken: localStorage.getItem('PowerJwt') })) }
      socket.onmessage = event => {
        if (this.socket !== socket) return
        const text = String(event.data)
        this.logs.push(text)
        // Older Servers can emit a completion message after a preparation error.
        // Keep the failure visible for the entire deployment attempt.
        if (/\[ERROR\]|BUILD FAILURE|deploy (?:lock )?failed/i.test(text)) this.deploymentStatus = 'error'
        else if (this.deploymentStatus !== 'error' && /deploy finished, congratulations/i.test(text)) this.deploymentStatus = 'success'
      }
      socket.onerror = () => { if (this.socket === socket) { this.deploymentStatus = 'error'; this.$message.error(this.$t('message.requestFailed')) } }
    },
    closeArrange() {
      this.arrangeGeneration++
      if (this.socket) { const socket = this.socket; this.socket = null; socket.onopen = socket.onmessage = socket.onerror = null; socket.close() }
      this.logs = []; this.deploymentStatus = 'idle'
    },
    closeEdit() { this.form = { sourceType: 'Git', containerName: '' }; this.gitForm = { repo: '', branch: '', username: '', password: '' }; this.sourceInfo = ''; this.fileList = []; this.id = '' },
    async listOfItem(item) {
      this.closeArrange(); const generation = this.arrangeGeneration
      try { const response = await this.axios.get('/container/listDeployedWorker', { params: { containerId: item.id, appId: this.appId } }); if (generation !== this.arrangeGeneration) return; this.logs = String(response.data.data || '').split('\n'); this.arrangeTitle = this.$t('message.deployedWorkerList'); this.arrangeVisible = true } catch { /* Retry from the card. */ }
    },
    async listContainers() { const generation = ++this.listGeneration; this.loading = true; try { const response = await this.axios.get('/container/list', { params: { appId: this.appId } }); if (generation === this.listGeneration) this.containerList = response.data.data || [] } catch { /* Preserve data on failure. */ } finally { if (generation === this.listGeneration) this.loading = false } },
  },
  mounted() { this.uploadHeaders = { PowerJwt: localStorage.getItem('PowerJwt') || '', AppId: this.appId || '' }; this.listContainers() },
  beforeUnmount() { this.listGeneration++; this.closeArrange() },
}
</script>
<style scoped>
.container-page { min-width:0; color:var(--pj-text); }
.container-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; }
.container-heading > div:first-child { min-width:0; }
.toolbar-actions { display:flex; align-items:center; gap:8px; flex-shrink:0; }
.toolbar-actions .el-button { margin:0; }
.toolbar-actions .pj-icon { width:15px; height:15px; margin-right:6px; }
.container-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr)); gap:24px; min-height:100px; }
.container-grid > .el-empty { grid-column:1/-1; }
.container-card { background:var(--pj-surface); border:0; border-top:1px solid var(--pj-border); border-radius:0; padding:18px 0; min-width:0; }
.container-card-heading { display:flex; align-items:flex-start; gap:10px; min-width:0; }
.container-symbol { width:30px; height:30px; display:grid; place-items:center; color:var(--pj-primary); flex-shrink:0; }
.container-symbol .pj-icon { width:20px; height:20px; }
.container-identity { min-width:0; flex:1; }
.container-card-heading h2 { font-size:14px; line-height:1.4; font-weight:600; margin:0 0 3px; overflow-wrap:anywhere; }
.container-id { font-size:11px; color:var(--pj-muted); font-variant-numeric:tabular-nums; }
.container-card-heading .el-tag { flex-shrink:0; }
.container-card dl { display:grid; grid-template-columns:auto minmax(0,1fr); gap:9px 12px; margin:16px 0; font-size:12px; line-height:1.5; }
.container-card dt { color:var(--pj-muted); }
.container-card dd { margin:0; overflow-wrap:anywhere; font-variant-numeric:tabular-nums; }
.container-actions { display:flex; align-items:center; gap:8px; padding-top:12px; flex-wrap:wrap; }
.container-actions .el-button { margin:0; }
.deployment-log { background:var(--pj-log-bg); color:var(--pj-log-text); border-radius:4px; min-height:180px; max-height:55vh; overflow:auto; white-space:pre-wrap; overflow-wrap:anywhere; padding:16px; font:12px/1.75 ui-monospace,SFMono-Regular,monospace; }
.artifact-ready { display:block; color:var(--pj-primary); font-size:12px; }
.el-upload { width:100%; }
@media(max-width:760px) {
  .container-heading { align-items:flex-start; flex-wrap:wrap; gap:12px; }
  .container-grid { grid-template-columns:1fr; gap:8px; }
}
</style>
