<template><div v-loading="loading"><el-alert v-if="error" :title="error" type="warning" :closable="false"/><el-alert v-else-if="notice" :title="notice" type="info" :closable="false"/><el-card v-else><div v-for="result in nextNTriggerTime" :key="result" class="trigger-time">{{ result }}</div></el-card><el-button @click="checkTimeExpression">{{ $t('message.retry') }}</el-button></div></template>
<script>
export default {
  name: 'TimeExpressionValidator',
  props: ['timeExpressionType','timeExpression'],
  data() { return { nextNTriggerTime: [], loading: false, error: '', notice: '' } },
  methods: {
    async checkTimeExpression() {
      this.loading = true; this.error = ''; this.notice = ''; this.nextNTriggerTime = []
      try {
        const result = await this.axios.get('/validate/timeExpression', { params: { timeExpressionType: this.timeExpressionType, timeExpression: this.timeExpression } })
        this.nextNTriggerTime = Array.isArray(result) ? result : []
        if (this.nextNTriggerTime.some(value => !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(value))) {
          const text = this.nextNTriggerTime.join('\n')
          if (text === 'It is valid, but has not trigger time list!') this.notice = text
          else this.error = text
          this.nextNTriggerTime = []
        }
      } catch (error) { this.error = error.message } finally { this.loading = false }
    },
  },
  mounted() { this.checkTimeExpression() },
}
</script>
<style scoped>.trigger-time{padding:10px 14px;font-variant-numeric:tabular-nums;color:var(--pj-text);background:var(--pj-subtle);border-left:3px solid var(--pj-primary);margin:4px 0}.el-button{margin-top:16px}</style>
