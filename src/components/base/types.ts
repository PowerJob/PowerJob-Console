/** 状态映射类型 */
export interface StatusMap {
  [key: number | string]: { label: string; type: string }
}

/** 表格列配置 */
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

/** 搜索字段选项 */
export interface SearchFieldOption {
  label: string
  value: string | number | boolean
}

/** 搜索字段配置 */
export interface SearchField {
  /** 字段名 */
  prop: string
  /** 标签 */
  label: string
  /** 字段类型 */
  type?: 'input' | 'select' | 'date' | 'number'
  /** 占位符 */
  placeholder?: string
  /** 样式 */
  style?: string
  /** 选项（用于 select 类型） */
  options?: SearchFieldOption[]
  /** 最小值（用于 number 类型） */
  min?: number
  /** 最大值（用于 number 类型） */
  max?: number
}

/** 操作按钮配置 */
export interface ActionItem {
  /** 操作标识 */
  key?: string
  /** 显示标签 */
  label: string
  /** 按钮类型 */
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  /** 图标组件 */
  icon?: unknown
  /** 是否为主要操作（显示为按钮） */
  primary?: boolean
  /** 是否危险操作 */
  danger?: boolean
  /** 是否需要确认 */
  confirm?: boolean | string
  /** 确认消息 */
  confirmMessage?: string
  /** 是否禁用 */
  disabled?: boolean | ((row: unknown) => boolean)
  /** 是否显示 */
  visible?: boolean | ((row: unknown) => boolean)
  /** 加载状态 */
  loading?: boolean
}
