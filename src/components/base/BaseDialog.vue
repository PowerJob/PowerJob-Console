<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    :width="width"
    :close-on-click-modal="closeOnClickModal"
    :close-on-press-escape="closeOnPressEscape"
    :destroy-on-close="destroyOnClose"
    @closed="handleClosed"
  >
    <slot />

    <template v-if="showFooter" #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">
          {{ cancelText }}
        </el-button>
        <el-button type="primary" :loading="loading" @click="handleConfirm">
          {{ confirmText }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  interface Props {
    /** 是否显示 */
    modelValue?: boolean
    /** 标题 */
    title?: string
    /** 宽度 */
    width?: string | number
    /** 是否显示底部按钮 */
    showFooter?: boolean
    /** 确认按钮文本 */
    confirmText?: string
    /** 取消按钮文本 */
    cancelText?: string
    /** 确认按钮加载状态 */
    loading?: boolean
    /** 点击遮罩层是否关闭 */
    closeOnClickModal?: boolean
    /** 按下 ESC 是否关闭 */
    closeOnPressEscape?: boolean
    /** 关闭时是否销毁内容 */
    destroyOnClose?: boolean
    /** 是否为编辑模式 */
    isEdit?: boolean
    /** 新增标题 */
    createTitle?: string
    /** 编辑标题 */
    editTitle?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: false,
    title: '',
    width: '500px',
    showFooter: true,
    confirmText: '确定',
    cancelText: '取消',
    loading: false,
    closeOnClickModal: false,
    closeOnPressEscape: true,
    destroyOnClose: true,
    isEdit: false,
    createTitle: '新增',
    editTitle: '编辑'
  })

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    confirm: []
    cancel: []
    closed: []
  }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (val: boolean) => emit('update:modelValue', val)
  })

  const dialogTitle = computed(() => {
    if (props.title) return props.title
    return props.isEdit ? props.editTitle : props.createTitle
  })

  const handleConfirm = () => {
    emit('confirm')
  }

  const handleCancel = () => {
    visible.value = false
    emit('cancel')
  }

  const handleClosed = () => {
    emit('closed')
  }
</script>

<style scoped lang="scss">
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--pj-space-sm, 8px);
  }
</style>
