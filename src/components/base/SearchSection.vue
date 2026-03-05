<template>
  <div class="pj-form-section">
    <div class="search-container">
      <el-form :inline="true" :model="modelValue" class="search-form">
        <el-form-item v-for="field in fields" :key="field.prop" :label="field.label">
          <!-- 输入框 -->
          <el-input
            v-if="field.type === 'input' || !field.type"
            v-model="modelValue[field.prop]"
            :placeholder="field.placeholder || `请输入${field.label}`"
            :style="field.style || 'width: 200px'"
            clearable
            @keyup.enter="handleSearch"
          />

          <!-- 选择器 -->
          <el-select
            v-else-if="field.type === 'select'"
            v-model="modelValue[field.prop]"
            :placeholder="field.placeholder || `请选择${field.label}`"
            :style="field.style || 'width: 200px'"
            clearable
            @change="handleSearch"
          >
            <el-option
              v-for="opt in field.options || []"
              :key="String(opt.value)"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>

          <!-- 日期选择器 -->
          <el-date-picker
            v-else-if="field.type === 'date'"
            v-model="modelValue[field.prop]"
            :placeholder="field.placeholder || `请选择${field.label}`"
            :style="field.style || 'width: 200px'"
            clearable
            @change="handleSearch"
          />

          <!-- 数字输入框 -->
          <el-input-number
            v-else-if="field.type === 'number'"
            v-model="modelValue[field.prop]"
            :placeholder="field.placeholder"
            :style="field.style || 'width: 200px'"
            :min="field.min"
            :max="field.max"
            controls-position="right"
          />
        </el-form-item>
      </el-form>

      <div class="action-buttons">
        <el-button @click="handleReset">
          {{ resetText || $t('message.reset') }}
        </el-button>
        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon>
          {{ searchText || $t('message.query') }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Search } from '@element-plus/icons-vue'
  import type { SearchField } from './types'

  interface Props {
    /** 搜索字段配置 */
    fields: SearchField[]
    /** 搜索按钮文本 */
    searchText?: string
    /** 重置按钮文本 */
    resetText?: string
  }

  defineProps<Props>()

  const modelValue = defineModel<Record<string, unknown>>({ required: true })

  const emit = defineEmits<{
    search: []
    reset: []
  }>()

  const handleSearch = () => {
    emit('search')
  }

  const handleReset = () => {
    emit('reset')
  }
</script>

<style scoped lang="scss">
  .pj-form-section {
    background: var(--el-bg-color);
    border-radius: 4px;
    padding: var(--pj-space-md, 16px);
    margin-bottom: var(--pj-space-md, 16px);
  }

  .search-container {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: var(--pj-space-md, 16px);
  }

  .search-form {
    flex: 1;
    min-width: 0;
  }

  .action-buttons {
    display: flex;
    align-items: center;
    gap: var(--pj-space-sm, 8px);
    flex-shrink: 0;
  }
</style>
