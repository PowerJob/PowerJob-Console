<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../core/ui'
const props = withDefaults(defineProps<{index:number;size?:number;total:number}>(), {size:10})
const emit = defineEmits<{change:[index:number]}>()
const pages = computed(() => Math.max(1, Math.ceil(props.total/props.size)))
</script>
<template><nav class="pagination" :aria-label="t('分页','Pagination')"><span>{{t('共','Total')}} {{total}} {{t('条','items')}}</span><div><button type="button" class="btn btn-quiet" :disabled="index===0" @click="emit('change',index-1)">{{t('上一页','Previous')}}</button><span>{{index+1}} / {{pages}}</span><button type="button" class="btn btn-quiet" :disabled="index+1>=pages" @click="emit('change',index+1)">{{t('下一页','Next')}}</button></div></nav></template>
