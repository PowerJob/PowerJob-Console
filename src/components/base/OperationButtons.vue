<template>
  <div class="operation-buttons">
    <!-- 主要操作按钮 -->
    <el-button
      v-for="action in visiblePrimaryActions"
      :key="action.label"
      :type="action.type || 'primary'"
      :size="size"
      :loading="action.loading"
      :disabled="isActionDisabled(action)"
      link
      @click="handleAction(action)"
    >
      <el-icon v-if="action.icon">
        <component :is="action.icon" />
      </el-icon>
      {{ action.label }}
    </el-button>

    <!-- 更多操作下拉菜单 -->
    <el-dropdown v-if="hasMoreActions" trigger="click" @command="handleAction">
      <el-button :size="size" link>
        {{ moreText }}
        <el-icon class="el-icon--right">
          <ArrowDown />
        </el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="action in dropdownActions"
            :key="action.label"
            :command="action"
            :disabled="isActionDisabled(action)"
          >
            <el-icon v-if="action.icon">
              <component :is="action.icon" />
            </el-icon>
            {{ action.label }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, unknown>">
  import { ArrowDown } from '@element-plus/icons-vue'
  import { computed } from 'vue'
  import type { Component } from 'vue'
  import type { ActionItem } from './types'

  export interface ActionConfig extends ActionItem {
    /** 图标组件 */
    icon?: Component
    /** 是否禁用 */
    disabled?: boolean | ((row: T) => boolean)
    /** 是否显示 */
    visible?: boolean | ((row: T) => boolean)
  }

  interface Props {
    /** 当前行数据 */
    row: T
    /** 操作配置 */
    actions: ActionConfig[]
    /** 按钮尺寸 */
    size?: 'large' | 'default' | 'small'
    /** 主要操作数量（超过的放入下拉菜单） */
    maxPrimary?: number
    /** 更多按钮文本 */
    moreText?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 'small',
    maxPrimary: 2,
    moreText: '更多'
  })

  const emit = defineEmits<{
    action: [action: ActionConfig, row: T]
  }>()

  // 过滤可见的操作
  const visibleActions = computed(() => {
    return props.actions.filter(action => {
      if (typeof action.visible === 'function') {
        return action.visible(props.row)
      }
      return action.visible !== false
    })
  })

  // 主要操作按钮
  const visiblePrimaryActions = computed(() => {
    const primaryActions = visibleActions.value.filter(action => action.primary !== false)
    return primaryActions.slice(0, props.maxPrimary)
  })

  // 下拉菜单中的操作
  const dropdownActions = computed(() => {
    const primaryActions = visibleActions.value.filter(action => action.primary !== false)
    const secondaryActions = visibleActions.value.filter(action => action.primary === false)

    // 如果主要操作超过限制，多余的放入下拉菜单
    const overflowPrimary = primaryActions.slice(props.maxPrimary)

    return [...overflowPrimary, ...secondaryActions]
  })

  // 是否有更多操作
  const hasMoreActions = computed(() => dropdownActions.value.length > 0)

  // 判断操作是否禁用
  const isActionDisabled = (action: ActionConfig): boolean => {
    if (typeof action.disabled === 'function') {
      return action.disabled(props.row)
    }
    return action.disabled === true
  }

  // 处理操作点击
  const handleAction = async (action: ActionConfig) => {
    if (action.confirm || action.confirmMessage) {
      const { ElMessageBox } = await import('element-plus')
      try {
        await ElMessageBox.confirm(
          action.confirmMessage || `确定执行「${action.label}」操作？`,
          '提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: action.danger ? 'warning' : 'info'
          }
        )
        emit('action', action, props.row)
      } catch {
        // 用户取消
      }
    } else {
      emit('action', action, props.row)
    }
  }
</script>

<style scoped lang="scss">
  .operation-buttons {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--pj-space-xs, 4px);
  }
</style>
