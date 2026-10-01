<script setup lang="ts">
import { ref, watch } from 'vue'
import { t } from '../../core/ui'
const props = withDefaults(defineProps<{ modelValue: string; id: string; required?: boolean; disabled?: boolean; autocomplete?: string; resetKey?: boolean | string | number }>(), { autocomplete: 'current-password' })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const visible = ref(false)
watch(() => props.resetKey, () => { visible.value = false })
watch(() => props.modelValue, value => { if (!value) visible.value = false })
</script>
<template><span class="password-control"><input :id="id" :value="modelValue" :type="visible ? 'text' : 'password'" :required="required" :disabled="disabled" :autocomplete="autocomplete" @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"><button type="button" :disabled="disabled" :aria-label="visible ? t('隐藏密码', 'Hide password') : t('显示密码', 'Show password')" :aria-pressed="visible" @click="visible = !visible">{{ visible ? t('隐藏', 'Hide') : t('显示', 'Show') }}</button></span></template>
<style scoped>.password-control { display: block; position: relative; }.password-control input { padding-right: 60px; }.password-control button { position: absolute; top: 4px; bottom: 4px; right: 5px; border: 0; border-radius: 4px; background: transparent; color: var(--muted); font-size: 11px; padding: 0 8px; }.password-control button:hover { color: var(--blue); background: var(--blue-soft); }</style>
