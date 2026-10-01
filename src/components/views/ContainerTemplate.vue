<template>
  <div class="template-page">
    <div class="page-heading"><h1>{{ $t('message.tabTemplate') }}</h1><p>{{ $t('message.templatesDescription') }}</p></div>
    <el-card class="template-card">
      <el-form :model="form" label-position="top" class="template-form">
        <el-form-item label="Group" required><el-input v-model="form.group" placeholder="com.example"/></el-form-item>
        <el-form-item label="Artifact" required><el-input v-model="form.artifact" placeholder="my-processors"/></el-form-item>
        <el-form-item label="Name" required><el-input v-model="form.name"/></el-form-item>
        <el-form-item label="Package name" required><el-input v-model="form.packageName" placeholder="com.example.processors"/></el-form-item>
        <el-form-item label="Java Version" class="template-runtime"><el-radio-group v-model="form.javaVersion"><el-radio value="8">Java 8</el-radio><el-radio value="11">Java 11</el-radio></el-radio-group></el-form-item>
        <div class="template-footer"><el-button type="primary" :loading="loading" @click="onSubmit"><PjIcon name="download"/>{{ $t('message.generate') }}</el-button></div>
      </el-form>
    </el-card>
  </div>
</template>
<script>
import { validJavaPackage } from '../../services/java-identifiers.js'
export default {
  name: 'ContainerTemplate',
  data() { return { form: { group: '', artifact: '', name: '', packageName: '', javaVersion: '8' }, loading: false } },
  methods: {
    async onSubmit() {
      if (this.loading) return
      if (Object.values(this.form).some(value => !value.trim())) { this.$message.warning(this.$t('message.requiredField')); return }
      if (!validJavaPackage(this.form.packageName, this.form.javaVersion)) { this.$message.warning(this.$t('message.packageNameInvalid')); return }
      this.loading = true
      try {
        const response = await this.axios.post('/container/downloadContainerTemplate', this.form, { responseType: 'blob' })
        const blob = response.data, contentType = response.headers?.['content-type'] || blob.type
        if (!blob || typeof blob.text !== 'function') throw new Error(this.$t('message.invalidResponse'))
        if (contentType.includes('json')) { const result = JSON.parse(await blob.text()); throw new Error(result.message || this.$t('message.requestFailed')) }
        if (!['application/zip','application/octet-stream','application/x-zip-compressed'].some(type => contentType.includes(type))) throw new Error(this.$t('message.invalidResponse'))
        const url = URL.createObjectURL(blob), link = document.createElement('a')
        link.download = 'template.zip'; link.href = url; document.body.appendChild(link)
        try { link.click() } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
      } catch (error) { this.$message.error(error.message || this.$t('message.requestFailed')) } finally { this.loading = false }
    },
  },
}
</script>
<style scoped>
.template-page { min-width:0; color:var(--pj-text); }
.template-card { max-width:920px; border:0; border-top:1px solid var(--pj-border); border-radius:0; box-shadow:none; padding-top:20px; }
.template-card :deep(.el-card__body) { padding:0; }
.template-form { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px 24px; }
.template-form :deep(.el-form-item) { margin:0; min-width:0; }
.template-form :deep(.el-form-item__label) { height:auto; line-height:1.5; margin-bottom:6px; font-size:12px; }
.template-form :deep(.el-input) { width:100%; }
.template-runtime { grid-column:1/-1; }
.template-footer { grid-column:1/-1; display:flex; justify-content:flex-end; padding-top:16px; border-top:1px solid var(--pj-border); }
.template-footer .pj-icon { width:15px; height:15px; margin-right:6px; }
@media(max-width:760px) {
  .template-form { grid-template-columns:1fr; gap:14px; }
  .template-footer .el-button { width:100%; }
}
</style>
