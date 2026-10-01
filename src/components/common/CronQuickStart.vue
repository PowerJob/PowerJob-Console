<template>
  <el-popover v-model:visible="visible" placement="bottom-end" :fallback-placements="['top-end', 'right', 'left']" :popper-options="{ modifiers: [{ name: 'preventOverflow', options: { altAxis: true, padding: 16 } }] }" width="min(360px, calc(100vw - 32px))" trigger="click" role="dialog" :persistent="false" @after-enter="focusBuilder" @after-leave="restoreFocus">
    <template #reference><el-button ref="trigger" class="cron-quick-trigger" data-testid="cron-quick-trigger" :aria-label="$t('message.cronQuickStart')">{{ $t('message.cronQuickStart') }}</el-button></template>
    <section ref="builder" class="cron-builder" data-testid="cron-builder" :aria-label="$t('message.cronQuickStart')" @keydown.esc.stop="close">
      <div class="cron-builder-heading"><strong>{{ $t('message.cronQuickStart') }}</strong></div>
      <el-form label-position="top" @submit.prevent="apply">
        <el-form-item :label="$t('message.cronCadence')"><el-select v-model="draft.cadence" :teleported="false" data-testid="cron-cadence"><el-option v-for="cadence in cronCadences" :key="cadence" :label="$t(`message.cron_${cadence}`)" :value="cadence" /></el-select></el-form-item>
        <div class="cron-fields">
          <el-form-item v-if="['minutes','hours'].includes(draft.cadence)" :label="$t('message.cronInterval')"><el-input-number v-model="draft.interval" :min="1" :max="draft.cadence === 'minutes' ? 59 : 23" controls-position="right" data-testid="cron-interval" /></el-form-item>
          <el-form-item v-if="!['minutes','hours'].includes(draft.cadence)" :label="$t('message.cronHour')"><el-input-number v-model="draft.hour" :min="0" :max="23" controls-position="right" data-testid="cron-hour" /></el-form-item>
          <el-form-item v-if="draft.cadence !== 'minutes'" :label="$t('message.cronMinute')"><el-input-number v-model="draft.minute" :min="0" :max="59" controls-position="right" data-testid="cron-minute" /></el-form-item>
        </div>
        <p v-if="['minutes','hours'].includes(draft.cadence)" class="cron-note">{{ $t('message.cronFieldStep') }}</p>
        <el-form-item v-if="draft.cadence === 'weekly'" :label="$t('message.cronWeekday')"><el-select v-model="draft.weekday" :teleported="false" data-testid="cron-weekday"><el-option v-for="day in [2,3,4,5,6,7,1]" :key="day" :label="$t(`message.cronDay${day}`)" :value="day" /></el-select></el-form-item>
        <el-form-item v-if="draft.cadence === 'monthly'" :label="$t('message.cronMonthDay')"><el-input-number v-model="draft.day" :min="1" :max="31" controls-position="right" data-testid="cron-month-day" /></el-form-item>
        <p v-if="draft.cadence === 'monthly' && draft.day > 28" class="cron-note">{{ $t('message.cronShortMonth') }}</p>
        <div class="cron-expression"><span>{{ $t('message.cronGenerated') }}</span><output data-testid="cron-generated" aria-live="polite">{{ expression || '—' }}</output></div>
        <p class="cron-note">{{ $t('message.cronServerTimezone') }}</p>
        <div class="cron-actions"><el-button @click="close">{{ $t('message.cancel') }}</el-button><el-button type="primary" native-type="submit" :disabled="!expression" data-testid="cron-apply">{{ $t('message.cronApply') }}</el-button></div>
      </el-form>
    </section>
  </el-popover>
</template>
<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { cronCadences, cronFromDraft, defaultCronDraft, draftFromCron } from '../../services/cron-presets.js'
const props = defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])
const visible = ref(false)
const draft = ref(defaultCronDraft())
const trigger = ref(null), builder = ref(null)
let returnFocus = false
const expression = computed(() => cronFromDraft(draft.value))
watch(visible, open => { if (open) { returnFocus = false; draft.value = draftFromCron(props.modelValue); nextTick(focusBuilder) } }, { flush: 'sync' })
// An entrance transition can finish after the user has already started editing.
function focusBuilder() { if (visible.value && document.activeElement === trigger.value?.$el) builder.value?.querySelector('[role="combobox"]')?.focus() }
function restoreFocus() { if (returnFocus) trigger.value?.$el?.focus() }
function close() { returnFocus = true; visible.value = false }
function apply() { if (expression.value) { emit('update:modelValue', expression.value); close() } }
</script>
<style scoped>
.cron-builder{max-height:calc(100dvh - 64px);overflow-y:auto;overscroll-behavior:contain}.cron-builder-heading{margin-bottom:18px;font-size:16px;font-weight:600;color:var(--pj-text)}
.cron-builder :deep(.el-form-item){margin-bottom:14px}.cron-builder :deep(.el-select){width:100%}.cron-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.cron-builder :deep(.el-input-number){width:100%}.cron-expression{padding:12px 14px;background:var(--pj-subtle);border-left:3px solid var(--pj-primary);border-radius:0 5px 5px 0}.cron-expression span{display:block;color:var(--pj-muted);font-size:12px;margin-bottom:6px}.cron-expression output{font:15px ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--pj-text)}.cron-note{font-size:12px;line-height:1.6;color:var(--pj-muted);margin:10px 0 16px}.cron-actions{display:flex;justify-content:flex-end;gap:8px;padding-top:8px;border-top:1px solid var(--pj-border)}.cron-actions :deep(.el-button+.el-button){margin-left:0}
@media(max-width:420px){.cron-builder{max-width:calc(100vw - 54px)}}
</style>
