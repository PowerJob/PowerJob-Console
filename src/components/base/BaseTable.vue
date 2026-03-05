<template>
  <div class="base-table pj-table">
    <el-table
      :data="data"
      :loading="loading"
      :row-key="rowKey"
      :row-class-name="rowClassName"
      :stripe="stripe"
      :border="border"
      :height="height"
      :max-height="maxHeight"
      v-bind="$attrs"
    >
      <slot>
        <!-- 默认列渲染 -->
        <template v-for="column in columns" :key="column.prop">
          <!-- 带插槽的列 -->
          <el-table-column v-if="column.slot" v-bind="column">
            <template #default="scope">
              <slot :name="column.slot" :row="scope.row" :index="scope.$index" />
            </template>
          </el-table-column>

          <!-- 标签列 -->
          <el-table-column v-else-if="column.type === 'tags'" v-bind="column">
            <template #default="scope">
              <el-tag
                v-for="tag in getTags(scope.row[column.prop as string])"
                :key="tag"
                size="small"
                class="mr-1"
              >
                {{ tag }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- 状态列 -->
          <el-table-column v-else-if="column.type === 'status'" v-bind="column">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row[column.prop as string])" size="small">
                {{ getStatusLabel(scope.row[column.prop as string], column.statusMap) }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- 时间列 -->
          <el-table-column v-else-if="column.type === 'time'" v-bind="column">
            <template #default="scope">
              {{ formatTime(scope.row[column.prop as string], column.timeFormat) }}
            </template>
          </el-table-column>

          <!-- 普通列 -->
          <el-table-column v-else v-bind="column" />
        </template>
      </slot>

      <!-- 操作列 -->
      <el-table-column
        v-if="hasActions"
        :label="actionLabel || $t('message.operation')"
        :width="actionWidth"
        :fixed="actionFixed"
        align="center"
      >
        <template #default="scope">
          <slot name="actions" :row="scope.row" :index="scope.$index" />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, unknown>">
  import type { StatusMap } from './types'

  export interface TableColumn {
    /** 列字段名 */
    prop?: string
    /** 列标题 */
    label?: string
    /** 列宽度 */
    width?: string | number
    /** 最小列宽 */
    minWidth?: string | number
    /** 是否固定列 */
    fixed?: boolean | 'left' | 'right'
    /** 对齐方式 */
    align?: 'left' | 'center' | 'right'
    /** 是否可排序 */
    sortable?: boolean | 'custom'
    /** 列类型 */
    type?: 'selection' | 'index' | 'expand' | 'tags' | 'status' | 'time'
    /** 自定义插槽名 */
    slot?: string
    /** 状态映射 */
    statusMap?: StatusMap
    /** 时间格式 */
    timeFormat?: string
  }

  interface Props {
    /** 表格数据 */
    data?: T[]
    /** 列配置 */
    columns?: TableColumn[]
    /** 加载状态 */
    loading?: boolean
    /** 行唯一标识字段 */
    rowKey?: string | ((row: T) => string)
    /** 行样式类名 */
    rowClassName?: string | ((data: { row: T; rowIndex: number }) => string)
    /** 是否显示斑马纹 */
    stripe?: boolean
    /** 是否显示边框 */
    border?: boolean
    /** 表格高度 */
    height?: string | number
    /** 表格最大高度 */
    maxHeight?: string | number
    /** 是否有操作列 */
    hasActions?: boolean
    /** 操作列标题 */
    actionLabel?: string
    /** 操作列宽度 */
    actionWidth?: string | number
    /** 操作列固定位置 */
    actionFixed?: boolean | 'left' | 'right'
  }

  withDefaults(defineProps<Props>(), {
    data: () => [],
    loading: false,
    stripe: true,
    border: false,
    hasActions: false,
    actionLabel: '操作',
    actionWidth: 180,
    actionFixed: 'right'
  })

  defineSlots<{
    default?: () => unknown
    actions?: (props: { row: T; index: number }) => unknown
  }>()

  const getTags = (value: unknown): string[] => {
    if (!value) return []
    if (Array.isArray(value)) return value.filter(Boolean) as string[]
    if (typeof value === 'string') return value.split(',').filter(Boolean)
    return [String(value)]
  }

  const getStatusType = (status: number | string): string => {
    const typeMap: Record<number, string> = {
      1: 'warning', // 等待调度
      2: 'warning', // 等待执行
      3: 'primary', // 运行中
      4: 'success', // 成功
      5: 'danger', // 失败
      10: 'info' // 停止
    }
    return typeMap[Number(status)] || 'info'
  }

  const getStatusLabel = (status: number | string, statusMap?: StatusMap): string => {
    if (statusMap && statusMap[status]) {
      return statusMap[status].label
    }
    return String(status)
  }

  const formatTime = (timestamp: unknown, format?: string): string => {
    if (!timestamp || typeof timestamp !== 'number') return '-'
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return '-'

    // 简单的时间格式化
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    if (format === 'date') {
      return `${year}-${month}-${day}`
    }
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
</script>

<style scoped lang="scss">
  .base-table {
    background: var(--el-bg-color);
    border-radius: 4px;
  }

  :deep(.el-table) {
    .waiting-dispatch-row,
    .waiting-worker-row {
      color: var(--pj-status-waiting, #ea580c) !important;
      font-weight: 500;
    }

    .running-row {
      color: var(--pj-status-running, #0891b2) !important;
      font-weight: 600;
      animation: pulse-text 2s infinite;
    }

    .success-row {
      color: var(--pj-status-success, #16a34a) !important;
    }

    .failed-row {
      color: var(--pj-status-failed, #dc2626) !important;
    }
  }

  @keyframes pulse-text {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
</style>
