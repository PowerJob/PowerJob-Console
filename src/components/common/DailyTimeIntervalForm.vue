<template>
  <el-form :model="dailyTimeIntervalExpress" label-width="100px">
    <el-form-item :label="$t('message.interval')"><el-input-number v-model="dailyTimeIntervalExpress.interval" :min="1" :precision="0"/></el-form-item>
    <el-form-item :label="$t('message.timeRange')"><div class="time-range"><el-time-picker v-model="dailyTimeIntervalExpress.startTimeOfDay" :placeholder="$t('message.startTime')" value-format="HH:mm:ss" format="HH:mm:ss" :save-on-blur="true" :arrow-control="true"/><span>—</span><el-time-picker v-model="dailyTimeIntervalExpress.endTimeOfDay" :placeholder="$t('message.endTime')" value-format="HH:mm:ss" format="HH:mm:ss" :save-on-blur="true" :arrow-control="true"/></div></el-form-item>
    <el-form-item :label="$t('message.weekRange')"><el-checkbox-group v-model="dailyTimeIntervalExpress.daysOfWeek"><el-checkbox v-for="day in weekDaysConstant" :key="day.key" :value="day.key">{{ day.label }}</el-checkbox></el-checkbox-group></el-form-item>
    <el-form-item><el-button type="primary" @click="onSubmit">{{ $t('message.save') }}</el-button></el-form-item>
  </el-form>
</template>
<script>
export default {
  name: 'DailyTimeIntervalForm', props: ['timeExpression'], emits: ['contentChanged'],
  data() { return { dailyTimeIntervalExpress: { interval: 60, startTimeOfDay: '09:00:00', endTimeOfDay: '18:00:00', intervalUnit: 'SECONDS', daysOfWeek: [1,2,3,4,5] }, weekDaysConstant: [{key:1,label:'Monday'},{key:2,label:'Tuesday'},{key:3,label:'Wednesday'},{key:4,label:'Thursday'},{key:5,label:'Friday'},{key:6,label:'Saturday'},{key:7,label:'Sunday'}] } },
  methods: {
    onSubmit() {
      const value = this.dailyTimeIntervalExpress
      if (!Number.isInteger(Number(value.interval)) || Number(value.interval) <= 0 || ![value.startTimeOfDay, value.endTimeOfDay].every(time => /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time || '')) || value.startTimeOfDay > value.endTimeOfDay || value.daysOfWeek.some(day => !Number.isInteger(day) || day < 1 || day > 7)) { this.$message.warning(this.$t('message.intervalInvalid')); return }
      this.$emit('contentChanged', JSON.stringify({ ...value, interval: Number(value.interval) }))
    },
  },
  mounted() { if (this.timeExpression) { try { const value = JSON.parse(this.timeExpression); if (!value || typeof value !== 'object' || Array.isArray(value) || (value.daysOfWeek != null && !Array.isArray(value.daysOfWeek))) throw new Error('Invalid interval configuration'); this.dailyTimeIntervalExpress = { ...this.dailyTimeIntervalExpress, ...value, daysOfWeek: (value.daysOfWeek || []).map(Number) } } catch { this.$message.warning(this.$t('message.invalidJson')) } } },
}
</script>
<style scoped>.time-range{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.time-range :deep(.el-date-editor){width:155px}</style>
