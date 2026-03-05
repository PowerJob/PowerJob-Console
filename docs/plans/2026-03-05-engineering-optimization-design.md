# PowerJob Console 工程化优化设计

> 创建日期: 2026-03-05
> 完成日期: 2026-03-06
> 状态: ✅ 已完成

## 概述

本文档描述了 PowerJob Console 前端项目的工程化优化方案，涵盖代码重用、组件化和规范化三个核心领域。

## 现状分析

### 项目技术栈

- **框架**: Vue 3 + TypeScript
- **构建工具**: Vite 7
- **UI 组件库**: Element Plus + Tailwind CSS
- **状态管理**: Pinia
- **特色**: Vue + React 混合架构（工作流编辑器）

### 主要问题

1. **组件重复** - 6个管理页面有 70-80% 相似代码
2. **组合式函数未使用** - 已有 `useTable` 和 `useFormDialog` 但未被使用
3. **API 层不一致** - URL 构建方式不统一，缺少请求参数处理
4. **规范化不足** - 缺少 prettier、commitlint、husky 等工程化工具

## 实施策略

采用**渐进式优化**策略，从风险最低、收益最明显的部分开始，分四个阶段实施。

---

## 第一阶段: 规范化建设

**预计工期**: 1-2 天

### 目标

建立统一的代码规范和质量保障机制，为后续重构打下基础。

### 具体内容

#### 1. Prettier 配置

创建 `.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "none",
  "printWidth": 100,
  "vueIndentScriptAndStyle": true
}
```

#### 2. ESLint 增强

更新 `.eslintrc.cjs`:

- 添加 `@typescript-eslint` 规则
- 添加 Vue 3 推荐规则
- 添加 import 排序规则 (`eslint-plugin-import`)
- 添加未使用变量检测

#### 3. Commitlint 配置

创建 `commitlint.config.cjs`:

- 使用 conventional commits 规范
- 类型: feat/fix/refactor/style/docs/test/chore
- 支持中文提交信息

#### 4. Husky Git Hooks

配置 `.husky/`:

- `pre-commit`: 运行 lint-staged (格式化 + lint 检查)
- `commit-msg`: 运行 commitlint 校验

#### 5. 编辑器配置

- 添加 `.editorconfig` 统一编辑器设置
- 配置 `.vscode/extensions.json` 推荐扩展
- 配置 `.vscode/settings.json` 工作区设置

### 产出

- 配置文件: `.prettierrc`, `.eslintrc.cjs`, `commitlint.config.cjs`, `.husky/`
- 格式化后的代码提交
- `docs/development-guide.md` 开发者文档

---

## 第二阶段: API 层统一

**预计工期**: 2-3 天

### 目标

建立统一、类型安全的 API 请求层，消除重复代码。

### 具体内容

#### 1. 请求工具函数

创建 `src/utils/request-helper.ts`:

```typescript
/**
 * 统一的 URL 参数序列化
 * 自动过滤 undefined 和 null 值
 */
export function buildQueryString(params: Record<string, unknown>): string

/**
 * 统一的请求配置生成
 */
export function createRequestConfig(url: string, options?: RequestOptions): AxiosRequestConfig

/**
 * 请求取消令牌管理
 */
export function createCancelToken(): CancelTokenSource
```

#### 2. API 响应类型定义

创建/完善 `src/types/api.ts`:

```typescript
// 统一响应结构
interface ApiResponse<T> {
  code: string
  data: T
  message?: string
}

// 分页请求参数
interface PageQuery {
  index: number
  pageSize: number
  appId?: string
}

// 分页响应
interface PageResult<T> {
  totalItems: number
  pageSize: number
  index: number
  data: T[]
}

// 错误类型枚举
enum ErrorCode {
  UNAUTHORIZED = '-100',
  FORBIDDEN = '-101',
  NOT_FOUND = '-102',
  INTERNAL_ERROR = '-500'
}

// 错误码映射
const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.UNAUTHORIZED]: '登录已过期，请重新登录',
  [ErrorCode.FORBIDDEN]: '没有权限执行此操作'
  // ...
}
```

#### 3. 统一错误处理

重构 `src/utils/request.ts`:

```typescript
// 统一使用 ElMessage.warning 显示错误
// 添加错误码映射表
// 支持自定义错误处理函数
// 添加请求重试机制 (可选)

request.interceptors.response.use(
  response => {
    const { data } = response
    if (data.code === ErrorCode.UNAUTHORIZED) {
      // 统一处理登录过期
    }
    return data
  },
  error => {
    // 统一错误提示
    const message = ErrorMessages[error.code] || error.message
    ElMessage.warning(message)
    return Promise.reject(error)
  }
)
```

#### 4. API 模块重构

重构现有 API 文件，使用新的工具函数:

```typescript
// 改造前
run(jobId: number, appId: string, params?: string) {
  let url = `/job/run?jobId=${jobId}&appId=${appId}`
  if (params) url += `&instanceParams=${encodeURIComponent(params)}`
  return request.get(url)
}

// 改造后
run(jobId: number, appId: string, params?: string) {
  return request.get('/job/run', {
    jobId,
    appId,
    instanceParams: params
  })
}
```

### 产出

- `src/utils/request-helper.ts` - 请求工具函数
- `src/types/api.ts` - 完整的 API 类型定义
- 重构后的 API 模块 (`src/api/*.ts`)
- `docs/api-guide.md` - API 使用文档

---

## 第三阶段: 组件化重构

**预计工期**: 3-5 天

### 目标

消除管理页面的重复代码，建立可复用的组件体系。

### 具体内容

#### 1. 基础组件

创建 `src/components/base/` 目录:

```
src/components/base/
├── BasePagination.vue      # 统一分页组件
├── BaseTable.vue           # 统一表格组件
├── SearchSection.vue       # 搜索区域组件
├── BaseDialog.vue          # 基础对话框组件
└── OperationButtons.vue    # 操作按钮组组件
```

**BasePagination.vue**:

```vue
<template>
  <div class="pagination-container">
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="currentSize"
      layout="total, sizes, prev, pager, next, jumper"
      :page-sizes="[10, 20, 50, 100]"
      :total="total"
      background
    />
  </div>
</template>

<script setup lang="ts">
  interface Props {
    total: number
    page?: number
    size?: number
  }

  const props = withDefaults(defineProps<Props>(), {
    page: 1,
    size: 10
  })

  const emit = defineEmits<{
    'update:page': [value: number]
    'update:size': [value: number]
    change: [page: number, size: number]
  }>()

  // 转换: 前端页码从1开始，后端从0开始
  const currentPage = computed({
    get: () => props.page + 1,
    set: val => emit('update:page', val - 1)
  })
</script>
```

**SearchSection.vue**:

```vue
<template>
  <div class="pj-form-section">
    <div class="search-container">
      <el-form :inline="true" :model="modelValue">
        <el-form-item v-for="field in fields" :key="field.prop" :label="field.label">
          <component
            :is="field.component || 'el-input'"
            v-model="modelValue[field.prop]"
            :placeholder="field.placeholder"
            :style="field.style"
            v-bind="field.props"
          >
            <template v-if="field.options">
              <el-option
                v-for="opt in field.options"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </template>
          </component>
        </el-form-item>
      </el-form>
      <div class="action-buttons">
        <el-button @click="handleReset">{{ $t('message.reset') }}</el-button>
        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon>
          {{ $t('message.query') }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  interface SearchField {
    prop: string
    label: string
    placeholder?: string
    component?: string
    options?: { label: string; value: any }[]
    style?: string
    props?: Record<string, any>
  }

  interface Props {
    fields: SearchField[]
  }

  defineProps<Props>()
  const modelValue = defineModel<Record<string, any>>({ required: true })
  const emit = defineEmits<{ search: []; reset: [] }>()
</script>
```

#### 2. 组合式函数增强

完善 `src/composables/` 目录:

**useTable.ts** - 增强版:

```typescript
export interface UseTableOptions<T, Q = Record<string, any>> {
  /** 数据获取函数 */
  fetchFn: (params: Q & PageQuery) => Promise<PageResult<T>>
  /** 默认每页条数 */
  defaultPageSize?: number
  /** 是否自动加载 */
  autoLoad?: boolean
  /** 默认查询参数 */
  defaultQuery?: Partial<Q>
  /** 行唯一标识字段 */
  rowKey?: keyof T
}

export function useTable<T, Q = Record<string, any>>(options: UseTableOptions<T, Q>) {
  const { fetchFn, defaultPageSize = 10, autoLoad = true, defaultQuery = {} } = options

  // 状态
  const loading = ref(false)
  const data = ref<T[]>([])
  const total = ref(0)
  const index = ref(0)
  const pageSize = ref(defaultPageSize)
  const queryParams = ref<Partial<Q>>({ ...defaultQuery }) as Ref<Partial<Q>>

  // 新增: 行选择管理
  const selectedRows = ref<T[]>([])
  const selectedKeys = computed(() => selectedRows.value.map(row => row[rowKey]))

  // 新增: 排序状态
  const sortField = ref<string>()
  const sortOrder = ref<'asc' | 'desc'>()

  // 加载数据
  const loadData = async () => {
    loading.value = true
    try {
      const result = await fetchFn({
        ...queryParams.value,
        index: index.value,
        pageSize: pageSize.value
      } as Q & PageQuery)
      data.value = result.data
      total.value = result.totalItems
    } finally {
      loading.value = false
    }
  }

  // 分页操作
  const onPageChange = (page: number) => {
    index.value = page
    loadData()
  }

  const onSizeChange = (size: number) => {
    pageSize.value = size
    index.value = 0
    loadData()
  }

  // 重置
  const reset = () => {
    queryParams.value = { ...defaultQuery }
    index.value = 0
    loadData()
  }

  // 刷新
  const refresh = () => loadData()

  // 新增: 防抖刷新
  const debouncedRefresh = useDebounceFn(refresh, 300)

  // 自动加载
  if (autoLoad) {
    onMounted(loadData)
  }

  return {
    // 状态
    loading,
    data,
    total,
    index,
    pageSize,
    queryParams,
    selectedRows,
    selectedKeys,
    sortField,
    sortOrder,
    // 方法
    loadData,
    onPageChange,
    onSizeChange,
    reset,
    refresh,
    debouncedRefresh
  }
}
```

**useSearch.ts** - 新增:

```typescript
export interface UseSearchOptions<T> {
  /** 默认值 */
  defaultValues: T
  /** 搜索回调 */
  onSearch?: (params: T) => void
  /** 防抖延迟 */
  debounce?: number
}

export function useSearch<T extends Record<string, any>>(options: UseSearchOptions<T>) {
  const { defaultValues, onSearch, debounce = 300 } = options

  const params = ref<T>({ ...defaultValues } as T)
  const isSearching = ref(false)

  // 重置
  const reset = () => {
    params.value = { ...defaultValues } as T
    onSearch?.(params.value)
  }

  // 搜索 (带防抖)
  const search = useDebounceFn(() => {
    isSearching.value = true
    onSearch?.(params.value)
    isSearching.value = false
  }, debounce)

  // 立即搜索
  const searchImmediate = () => {
    onSearch?.(params.value)
  }

  return {
    params,
    isSearching,
    reset,
    search,
    searchImmediate
  }
}
```

#### 3. 管理页面模板组件

创建 `src/components/templates/ManagementTemplate.vue`:

```vue
<template>
  <div class="pj-management-page">
    <!-- 搜索区域 -->
    <slot name="search" :query="queryParams" :search="refresh" :reset="reset">
      <SearchSection
        v-if="searchFields?.length"
        v-model="queryParams"
        :fields="searchFields"
        @search="refresh"
        @reset="reset"
      />
    </slot>

    <!-- 表格区域 -->
    <slot name="table" :data="tableData" :loading="loading">
      <BaseTable
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :row-class-name="rowClassName"
      >
        <template v-if="$slots.actions" #actions="{ row }">
          <slot name="actions" :row="row" />
        </template>
      </BaseTable>
    </slot>

    <!-- 分页区域 -->
    <BasePagination
      :total="total"
      :page="index"
      :size="pageSize"
      @update:page="onPageChange"
      @update:size="onSizeChange"
    />

    <!-- 弹窗插槽 -->
    <slot name="dialog" />

    <!-- 自定义插槽 -->
    <slot />
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, any>, Q extends Record<string, any>">
  import type { SearchField } from '@/components/base/SearchSection.vue'
  import type { TableColumn } from '@/components/base/BaseTable.vue'

  interface Props {
    searchFields?: SearchField[]
    columns: TableColumn[]
    fetchFn: (params: Q) => Promise<PageResult<T>>
    rowClassName?: (data: { row: T }) => string
  }

  const props = defineProps<Props>()

  const {
    loading,
    data: tableData,
    total,
    index,
    pageSize,
    queryParams,
    onPageChange,
    onSizeChange,
    reset,
    refresh
  } = useTable<T, Q>({
    fetchFn: props.fetchFn
  })
</script>
```

#### 4. 页面改造示例

以 `AppManager.vue` 为例:

```vue
<template>
  <ManagementTemplate :search-fields="searchFields" :columns="columns" :fetch-fn="appApi.list">
    <template #actions="{ row }">
      <OperationButtons :row="row" :actions="rowActions" @edit="openEdit" @delete="handleDelete" />
    </template>

    <template #dialog>
      <AppFormDialog
        v-model="dialogVisible"
        :data="currentApp"
        :loading="saving"
        @save="handleSave"
      />
    </template>
  </ManagementTemplate>
</template>

<script setup lang="ts">
  import { useTable } from '@/composables/useTable'
  import { useFormDialog } from '@/composables/useFormDialog'
  import { appApi } from '@/api/app'

  // 表格配置
  const columns = [
    { prop: 'appName', label: '应用名称' },
    { prop: 'title', label: '应用描述' },
    { prop: 'tags', label: '标签' }
  ]

  // 搜索配置
  const searchFields = [{ prop: 'appName', label: '应用名称', placeholder: '请输入应用名称' }]

  // 使用组合式函数
  const { data: tableData, loading, refresh } = useTable({ fetchFn: appApi.list })
  const { visible: dialogVisible, open: openDialog, close } = useFormDialog()

  // 当前编辑的应用
  const currentApp = ref<App | null>(null)
  const saving = ref(false)

  // 操作按钮配置
  const rowActions = [
    { label: '编辑', event: 'edit', type: 'primary' },
    { label: '删除', event: 'delete', type: 'danger' }
  ]

  // 打开编辑弹窗
  const openEdit = (row: App) => {
    currentApp.value = { ...row }
    openDialog()
  }

  // 保存
  const handleSave = async (data: App) => {
    saving.value = true
    try {
      await appApi.save(data)
      close()
      refresh()
    } finally {
      saving.value = false
    }
  }

  // 删除
  const handleDelete = async (row: App) => {
    await ElMessageBox.confirm('确定删除该应用?')
    await appApi.delete(row.id)
    refresh()
  }
</script>
```

#### 5. 公共样式抽取

重构 `src/styles/management-pages.scss`:

```scss
// 公共变量
:root {
  --pj-space-xs: 4px;
  --pj-space-sm: 8px;
  --pj-space-md: 16px;
  --pj-space-lg: 24px;

  // 状态颜色
  --pj-status-waiting: #ea580c;
  --pj-status-running: #0891b2;
  --pj-status-success: #16a34a;
  --pj-status-failed: #dc2626;
}

// 管理页面基础样式
.pj-management-page {
  padding: var(--pj-space-md);
  background: transparent;

  .pj-form-section {
    // 搜索区域样式
  }

  .pj-table {
    // 表格区域样式
  }

  .pagination-container {
    // 分页区域样式
  }
}

// 状态行样式
@each $status,
  $color
    in (
      'waiting-dispatch': var(--pj-status-waiting),
      'running': var(--pj-status-running),
      'success': var(--pj-status-success),
      'failed': var(--pj-status-failed)
    )
{
  :deep(.el-table .#{$status}-row) {
    color: $color !important;
    font-weight: 500;
  }
}

// 运行状态动画
:deep(.el-table .running-row) {
  animation: pulse-text 2s infinite;
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
```

### 产出

- 5 个基础组件 (`src/components/base/`)
- 3 个组合式函数 (`src/composables/`)
- 1 个模板组件 (`src/components/templates/ManagementTemplate.vue`)
- 重构后的 6 个管理页面
- 公共样式文件 (`src/styles/management-pages.scss`)

---

## 第四阶段: 深度优化

**预计工期**: 2-3 天

### 目标

完善类型系统、添加测试、优化性能，提升代码质量。

### 具体内容

#### 1. TypeScript 类型完善

创建 `src/types/` 完整类型体系:

```
src/types/
├── api.ts          # API 通用类型 (已有, 补充)
├── models/         # 业务模型类型
│   ├── job.ts
│   ├── instance.ts
│   ├── workflow.ts
│   ├── app.ts
│   └── user.ts
├── components.ts   # 组件 Props 类型
└── utils.ts        # 工具类型
```

**工具类型** (`src/types/utils.ts`):

```typescript
// 深度只读
export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K]
}

// 可选字段
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// 必选字段
export type Required<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: T[P] }

// API 请求参数 (自动移除 undefined)
export type ApiParams<T> = {
  [K in keyof T as T[K] extends undefined ? never : K]: T[K]
}

// 提取函数参数类型
export type ExtractParams<T> = T extends (...args: infer P) => any ? P : never

// 提取 Promise 返回类型
export type AsyncReturnType<T extends (...args: any) => Promise<any>> = Awaited<ReturnType<T>>
```

**业务模型** (`src/types/models/job.ts`):

```typescript
export interface Job {
  id: number
  appId: string
  jobName: string
  jobDescription: string
  jobParams: string
  timeExpressionType: TimeExpressionType
  timeExpression: string
  executeType: ExecuteType
  processorType: ProcessorType
  processorInfo: string
  maxInstanceNum: number
  concurrency: number
  instanceTimeLimit: number
  instanceRetryNum: number
  taskRetryNum: number
  minCpuCores: number
  minMemorySpace: number
  minDiskSpace: number
  designatedWorkers: string
  maxWorkerCount: number
  notifyUserIds: string
  enable: boolean
  dispatchStrategy: DispatchStrategy
  lifecycle: string
  status: InstanceStatus
  gmtCreate: number
  gmtModified: number
}

export type JobForm = Omit<Job, 'id' | 'gmtCreate' | 'gmtModified'> & {
  id?: number
}

export type TimeExpressionType = 'API' | 'CRON' | 'FIXED_RATE' | 'FIXED_DELAY'
export type ExecuteType = 'STANDALONE' | 'BROADCAST' | 'MAP' | 'MAP_REDUCE'
export type ProcessorType = 'EMBEDDED_JAVA' | 'EXTERNAL_JAVA' | 'SHELL' | 'PYTHON'
export type DispatchStrategy = 'HEALTH_FIRST' | 'RANDOM' | 'SUPPORT_SERIAL'
```

#### 2. 单元测试

使用 Vitest 添加测试覆盖:

```
src/__tests__/
├── composables/
│   ├── useTable.test.ts
│   ├── useFormDialog.test.ts
│   └── useSearch.test.ts
├── utils/
│   ├── date.test.ts
│   ├── format.test.ts
│   └── request-helper.test.ts
└── components/
    ├── BasePagination.test.ts
    └── SearchSection.test.ts
```

**测试示例** (`src/__tests__/composables/useTable.test.ts`):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTable } from '@/composables/useTable'

describe('useTable', () => {
  const mockFetchFn = vi.fn()

  beforeEach(() => {
    mockFetchFn.mockReset()
    mockFetchFn.mockResolvedValue({
      totalItems: 100,
      pageSize: 10,
      index: 0,
      data: [{ id: 1, name: 'test' }]
    })
  })

  it('should initialize with default values', () => {
    const { loading, data, total, index, pageSize } = useTable({
      fetchFn: mockFetchFn,
      autoLoad: false
    })

    expect(loading.value).toBe(false)
    expect(data.value).toEqual([])
    expect(total.value).toBe(0)
    expect(index.value).toBe(0)
    expect(pageSize.value).toBe(10)
  })

  it('should load data on mount when autoLoad is true', async () => {
    useTable({
      fetchFn: mockFetchFn,
      autoLoad: true
    })

    // 等待 onMounted 执行
    await vi.waitFor(() => {
      expect(mockFetchFn).toHaveBeenCalled()
    })
  })

  it('should update pagination correctly', async () => {
    const { onPageChange, onSizeChange, index, pageSize } = useTable({
      fetchFn: mockFetchFn,
      autoLoad: false
    })

    onPageChange(2)
    expect(index.value).toBe(2)

    onSizeChange(20)
    expect(pageSize.value).toBe(20)
    expect(index.value).toBe(0) // 重置到第一页
  })
})
```

#### 3. 性能优化

**组件懒加载** (`src/router.js`):

```javascript
const routes = [
  {
    path: '/oms/job',
    component: () => import('@/components/views/JobManager.vue')
  },
  {
    path: '/oms/instance',
    component: () => import('@/components/views/InstanceManager.vue')
  }
  // ...
]
```

**表格虚拟滚动** (大数据量场景):

```vue
<el-table :data="tableData" :row-key="rowKey" :height="500" :row-height="50" use-virtual>
  <!-- columns -->
</el-table>
```

**请求缓存** (`src/utils/cache.ts`):

```typescript
interface CacheOptions {
  key: string
  ttl?: number // 缓存时间 (ms)
}

export function withCache<T>(fetchFn: () => Promise<T>, options: CacheOptions): Promise<T> {
  const cache = sessionStorage.getItem(options.key)

  if (cache) {
    const { data, timestamp } = JSON.parse(cache)
    const ttl = options.ttl || 5 * 60 * 1000 // 默认 5 分钟

    if (Date.now() - timestamp < ttl) {
      return Promise.resolve(data)
    }
  }

  return fetchFn().then(data => {
    sessionStorage.setItem(
      options.key,
      JSON.stringify({
        data,
        timestamp: Date.now()
      })
    )
    return data
  })
}
```

#### 4. 开发体验提升

**VS Code 配置** (`.vscode/extensions.json`):

```json
{
  "recommendations": [
    "Vue.volar",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "stylelint.vscode-stylelint",
    "bradlc.vscode-tailwindcss"
  ]
}
```

**代码片段** (`.vscode/vue.code-snippets`):

```json
{
  "Vue 3 Composition API Component": {
    "prefix": "v3comp",
    "body": [
      "<template>",
      "  <div class=\"${1:component-name}\">",
      "    $2",
      "  </div>",
      "</template>",
      "",
      "<script setup lang=\"ts\">",
      "$3",
      "</script>",
      "",
      "<style scoped lang=\"scss\">",
      ".${1:component-name} {",
      "  $4",
      "}",
      "</style>"
    ]
  }
}
```

### 产出

- 完整的类型定义文件 (`src/types/`)
- 单元测试覆盖 (目标 60%+)
- 性能优化配置
- 开发者文档 (`docs/`)

---

## 总体时间规划

| 阶段     | 内容       | 预计工期 | 累计    |
| -------- | ---------- | -------- | ------- |
| 第一阶段 | 规范化建设 | 1-2 天   | 1-2 天  |
| 第二阶段 | API 层统一 | 2-3 天   | 3-5 天  |
| 第三阶段 | 组件化重构 | 3-5 天   | 6-10 天 |
| 第四阶段 | 深度优化   | 2-3 天   | 8-13 天 |

## 预期效果

1. **代码量减少 60%** - 通过组件和逻辑复用
2. **维护成本降低** - 统一修改，多处生效
3. **开发效率提升** - 新页面可快速搭建
4. **代码一致性** - 统一的交互和视觉体验
5. **类型安全** - 完整的 TypeScript 覆盖
6. **质量保障** - 单元测试覆盖

## 风险与对策

| 风险             | 对策                       |
| ---------------- | -------------------------- |
| 重构引入 bug     | 每阶段完成后进行回归测试   |
| 时间超出预期     | 可随时暂停，各阶段相对独立 |
| 团队不熟悉新组件 | 编写详细文档和示例         |

---

## 附录: 需要改造的文件清单

### 管理页面 (优先级从高到低)

1. `src/components/views/JobManager.vue`
2. `src/components/views/InstanceManager.vue`
3. `src/components/views/WorkflowManager.vue`
4. `src/components/views/WFInstanceManager.vue`
5. `src/components/admin/AppManager.vue`
6. `src/components/admin/NamespaceManager.vue`
7. `src/components/admin/UserManager.vue`

### API 模块

1. `src/api/job.ts`
2. `src/api/instance.ts`
3. `src/api/workflow.ts`
4. `src/api/app.ts`
5. `src/api/user.ts`

### 工具函数

1. `src/utils/request.ts`
2. `src/utils/date.ts`
3. `src/utils/format.ts`
