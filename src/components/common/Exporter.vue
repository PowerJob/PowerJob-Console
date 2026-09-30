<template>
  <div>
    <el-input type="textarea" v-model="jsonContent" :autosize="{ minRows: 12, maxRows: 28 }" :readonly="mode === 'EXPORT'"/>
    <el-alert v-if="error" :title="error" type="error" :closable="false" style="margin-top:12px"/>
    <div class="export-actions"><el-button @click="$emit('finished', 'cancel')">{{ $t('message.cancel') }}</el-button><el-button type="primary" :loading="loading" @click="onClickConfirmButton">{{ $t('message.confirm') }}</el-button></div>
  </div>
</template>
<script>
import { parseResponse } from '../../services/http.js'
export default {
  name: 'Exporter', props: ['type','mode','targetId'], emits: ['finished'],
  data() { return { jsonContent: '', loading: false, error: '' } },
  methods: {
    async fetchExportInfo() {
      this.loading = true
      try { const workflow = this.type === 'WORKFLOW'; const result = await this.axios.get(workflow ? '/workflow/export' : '/job/export', { params: { [workflow ? 'workflowId' : 'jobId']: this.targetId } }); this.jsonContent = JSON.stringify(result, null, 2) } catch (error) { this.error = error.message } finally { this.loading = false }
    },
    async onClickConfirmButton() {
      if (this.loading) return
      if (this.mode !== 'INPUT') { this.$emit('finished', 'ok'); return }
      this.error = ''
      let payload
      try { payload = parseResponse(this.jsonContent); if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('invalid') } catch { this.error = this.$t('message.invalidJson'); return }
      this.loading = true
      try { await this.axios.post(this.type === 'WORKFLOW' ? '/workflow/save' : '/job/save', { ...payload, appId: localStorage.getItem('Power_appId') }); this.$emit('finished','ok') } catch (error) { this.error = error.message } finally { this.loading = false }
    },
  },
  mounted() { if (this.mode === 'EXPORT') this.fetchExportInfo() },
}
</script>
<style scoped>.export-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}</style>
