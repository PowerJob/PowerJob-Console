<script setup lang="ts">
import { t } from '../core/ui'
defineProps<{loading?:boolean;empty?:boolean}>()
</script>
<template><div :aria-busy="loading" class="table-state"><div v-if="loading" class="loading-line" role="status">{{t('正在加载…','Loading…')}}</div><slot/><div v-if="empty && !loading" class="empty-state"><strong>{{t('没有符合条件的结果','No matching results')}}</strong><p>{{t('调整查询条件，或创建新的记录。','Adjust your filters or create a new record.')}}</p></div></div></template>
