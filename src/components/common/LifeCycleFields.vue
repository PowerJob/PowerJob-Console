<template>
  <div class="lifecycle-fields">
    <el-date-picker :model-value="modelValue?.start ?? null" type="datetime" value-format="x" :placeholder="$t('message.startTime')" :aria-label="$t('message.startTime')" @update:model-value="update('start', $event)"/>
    <span>—</span>
    <el-date-picker :model-value="modelValue?.end ?? null" type="datetime" value-format="x" :placeholder="$t('message.finishedTime')" :aria-label="$t('message.finishedTime')" @update:model-value="update('end', $event)"/>
  </div>
</template>
<script setup>
const props = defineProps({ modelValue: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue'])
function update(bound, value) {
  const next = { ...(props.modelValue || {}), [bound]: value == null || value === '' ? null : Number(value) }
  const extraKeys = Object.keys(next).filter(key => !['start', 'end'].includes(key))
  emit('update:modelValue', next.start == null && next.end == null && !extraKeys.length ? null : next)
}
</script>
<style scoped>.lifecycle-fields{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.lifecycle-fields :deep(.el-date-editor){flex:1;width:200px;min-width:160px}</style>
