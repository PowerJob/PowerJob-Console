<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount, useId } from 'vue'
import { t } from '../core/ui'
const props = defineProps<{modelValue:boolean;title:string;wide?:boolean}>()
const emit = defineEmits<{ 'update:modelValue':[value:boolean]; closed:[] }>()
const element = ref<HTMLDialogElement>()
const titleID = useId()
watch(() => props.modelValue, async open => { await nextTick(); if(open!==props.modelValue)return; if (open && !element.value?.open) element.value?.showModal(); else if (!open && element.value?.open) element.value.close() }, {immediate:true})
function close() { emit('update:modelValue', false) }
function closed(){if(props.modelValue)emit('update:modelValue',false);emit('closed')}
onBeforeUnmount(() => element.value?.close())
</script>
<template><Teleport to="body"><dialog ref="element" class="modal" :class="{'modal-wide':wide}" :aria-labelledby="titleID" @cancel.prevent="close" @close="closed"><header class="modal-heading"><h2 :id="titleID">{{ title }}</h2><button type="button" class="icon-button" :aria-label="t('关闭','Close')" @click="close">×</button></header><div v-if="modelValue" class="modal-body"><slot/></div><footer v-if="modelValue && $slots.footer" class="modal-footer"><slot name="footer"/></footer></dialog></Teleport></template>
