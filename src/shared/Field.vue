<script setup lang="ts">
import { useId, ref, onMounted, onUpdated } from 'vue'
const props=defineProps<{label:string;hint?:string;required?:boolean}>()
const id = useId(), labelId=useId(), hintId=useId()
const control=ref<HTMLElement>(),targetId=ref(id)
function associate(){
  const input=control.value?.querySelector<HTMLInputElement>('input:not([type="hidden"]),select,textarea')
  if(!input)return
  if(!input.id)input.id=id
  targetId.value=input.id
  input.setAttribute('aria-labelledby',labelId)
  if(props.hint)input.setAttribute('aria-describedby',hintId)
  else if(input.getAttribute('aria-describedby')===hintId)input.removeAttribute('aria-describedby')
}
onMounted(associate);onUpdated(associate)
</script>
<template><div class="field"><label class="field-label" :for="targetId"><span :id="labelId">{{ label }}</span><span v-if="required" class="required" aria-hidden="true"> *</span></label><span ref="control" class="field-control"><slot :id="id"/></span><small v-if="hint" :id="hintId" class="field-hint">{{ hint }}</small></div></template>
