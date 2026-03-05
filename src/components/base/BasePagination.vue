<template>
  <div class="base-pagination">
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="currentSize"
      :total="total"
      :page-sizes="pageSizes"
      :hide-on-single-page="hideOnSinglePage"
      :background="background"
      :layout="layout"
      @current-change="handleCurrentChange"
      @size-change="handleSizeChange"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  interface Props {
    /** 总条数 */
    total: number
    /** 当前页（后端索引，从 0 开始） */
    page?: number
    /** 每页条数 */
    size?: number
    /** 可选的每页条数 */
    pageSizes?: number[]
    /** 是否在单页时隐藏 */
    hideOnSinglePage?: boolean
    /** 是否使用背景色 */
    background?: boolean
    /** 布局 */
    layout?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    page: 0,
    size: 10,
    pageSizes: () => [10, 20, 50, 100],
    hideOnSinglePage: false,
    background: true,
    layout: 'total, sizes, prev, pager, next, jumper'
  })

  const emit = defineEmits<{
    'update:page': [value: number]
    'update:size': [value: number]
    change: [page: number, size: number]
  }>()

  // 转换：前端页码从 1 开始，后端从 0 开始
  const currentPage = computed({
    get: () => props.page + 1,
    set: (val: number) => emit('update:page', val - 1)
  })

  const currentSize = computed({
    get: () => props.size,
    set: (val: number) => emit('update:size', val)
  })

  const handleCurrentChange = (page: number) => {
    emit('update:page', page - 1)
    emit('change', page - 1, props.size)
  }

  const handleSizeChange = (size: number) => {
    // 切换每页条数时重置到第一页
    emit('update:page', 0)
    emit('update:size', size)
    emit('change', 0, size)
  }
</script>

<style scoped lang="scss">
  .base-pagination {
    display: flex;
    justify-content: flex-end;
    padding: var(--pj-space-md, 16px) 0;
  }
</style>
