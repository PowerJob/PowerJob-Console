<template>
  <div class="template-page"><div class="page-heading"><h1>{{ $t('message.tabTemplate') }}</h1><p>{{ $t('message.templatesDescription') }}</p></div>
    <el-card class="template-card"><el-form :model="form" label-width="140px"><el-form-item label="Group" required><el-input v-model="form.group" placeholder="com.example"/></el-form-item><el-form-item label="Artifact" required><el-input v-model="form.artifact" placeholder="my-processors"/></el-form-item><el-form-item label="Name" required><el-input v-model="form.name"/></el-form-item><el-form-item label="Package name" required><el-input v-model="form.packageName" placeholder="com.example.processors"/></el-form-item><el-form-item label="Java Version"><el-radio-group v-model="form.javaVersion"><el-radio value="8">Java 8</el-radio><el-radio value="11">Java 11</el-radio></el-radio-group></el-form-item><el-form-item><el-button type="primary" :loading="loading" @click="onSubmit">{{ $t('message.generate') }}</el-button></el-form-item></el-form></el-card>
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
<style scoped>.template-card{max-width:740px;padding:20px}.template-card :deep(.el-input){width:100%}@media(max-width:760px){.template-card{padding:0}}</style>
