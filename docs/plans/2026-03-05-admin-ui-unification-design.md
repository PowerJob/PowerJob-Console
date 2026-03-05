# Admin 页面 UI 统一设计文档

> 创建日期: 2026-03-05
> 状态: 待实施
> 作者: Claude Code

## 1. 概述

### 1.1 背景

将 `/admin/app` 相关页面的界面风格升级，使其与现有的 `/oms/home` 页面（标准参考页面）保持高度的视觉和交互一致性。

### 1.2 设计目标

- **严格复用**: 复用现有 CSS 变量和样式类，避免冗余代码
- **视觉统一**: 两个模块放在一起对比时，除内容不同外，视觉上应是同一产品
- **最小改动**: 采用渐进式改造，降低风险
- **响应式兼容**: 确保不同屏幕尺寸下的表现一致

### 1.3 主色调

青绿色 `#009688` (`--pj-primary`)，与 `/oms/home` 完全一致。

## 2. 文件结构设计

### 2.1 新增文件

```
src/styles/shared/
├── sidebar.scss          # 共享侧边栏样式（从 Sidebar.vue 提取）
└── _variables.scss       # 共享变量（可选，如需要额外变量）
```

### 2.2 修改文件

```
src/components/admin/
├── AdminConsoleSidebar.vue   # 修改：引入共享样式，调整结构
├── AppManager.vue            # 修改：样式引入改为 management-pages.scss
├── UserManager.vue           # 修改：样式引入改为 management-pages.scss
├── NamespaceManager.vue      # 修改：样式引入改为 management-pages.scss
├── Settings.vue              # 修改：样式引入改为 management-pages.scss
├── UserCenter.vue            # 修改：样式引入改为 management-pages.scss

src/components/bar/
└── Sidebar.vue               # 修改：提取样式到共享文件后引用

src/styles/
└── admin-theme.scss          # 废弃或标记为 legacy（保留但不使用）
```

## 3. 侧边栏样式规范

从 `Sidebar.vue` 提取的样式规范：

### 3.1 布局参数

| 属性 | 值 | CSS 变量 |
|------|-----|---------|
| 侧边栏宽度 | 220px | `--pj-sidebar-width` |
| 顶部导航高度 | 80px | `--pj-navbar-height` |
| 内容区背景 | #f5f7fa | `--pj-bg-base` |
| 侧边栏背景 | #ffffff | `--pj-bg-white` |

### 3.2 菜单项样式

| 属性 | 值 |
|------|-----|
| 高度 | 52px |
| 圆角 | 6px (`--pj-radius-md`) |
| 内边距 | 16px (`--pj-space-md`) |
| 默认文字颜色 | #757575 (`--pj-text-secondary`) |

### 3.3 交互状态

**Hover 效果**:
- 背景色: `color-mix(in srgb, var(--pj-primary) 8%, transparent)`
- 文字颜色: `var(--pj-primary)` (#009688)
- 位移: `translateX(2px)`
- 过渡: 0.25s ease

**Active 效果**:
- 背景渐变: `color-mix(in srgb, var(--pj-primary) 12%, var(--pj-bg-white))`
- 文字颜色: `var(--pj-primary)`
- 字重: 600
- 阴影: `0 2px 8px color-mix(in srgb, var(--pj-primary) 18%, transparent)`
- 左侧指示条: 4px 宽、28px 高、主色背景

### 3.4 图标样式

- 大小: 18px
- 右边距: 8px (`--pj-space-sm`)
- 过渡: 颜色 0.25s ease

### 3.5 响应式断点

- ≤1024px: 侧边栏宽度 180px
- ≤768px: 垂直堆叠布局

## 4. 表格与按钮样式规范

复用 `management-pages.scss` 的样式：

### 4.1 表格样式

| 属性 | 值 |
|------|-----|
| 表头背景 | #fafbfc |
| 表头字重 | 600 |
| 表头边框 | 2px solid #e4e7ed |
| 行内边距 | 12px 8px |
| Hover 背景 | #f5f5f5 (`--pj-bg-hover`) |
| 固定列阴影 | -2px 0 8px rgba(0, 0, 0, 0.1) |

### 4.2 按钮样式

**主要按钮**:
- 背景: `linear-gradient(135deg, var(--pj-primary-light), var(--pj-primary))`
- 圆角: 8px
- Hover: 向上位移 1px + 阴影

**文本按钮**:
- 颜色: `var(--pj-primary)`
- Hover 背景: `rgba(0, 150, 136, 0.1)`

### 4.3 标签样式

- 字体: Outfit
- 字重: 500
- 字号: 12px
- 圆角: 12px
- 内边距: 4px 12px

### 4.4 弹窗样式

- 圆角: 8px (`--pj-radius-lg`)
- 阴影: `var(--pj-shadow-hover)`
- 头部背景: #fafbfc
- 头部边框: 1px solid #e4e7ed

## 5. 实施步骤

### Phase 1: 创建共享样式文件

1. 创建 `src/styles/shared/sidebar.scss`，提取 `Sidebar.vue` 中的侧边栏样式
2. 修改 `Sidebar.vue`，改为引入共享样式文件

### Phase 2: 改造 Admin 侧边栏

1. 修改 `AdminConsoleSidebar.vue`:
   - 引入 `src/styles/shared/sidebar.scss`
   - 添加 `.pj-admin-container` 根容器的背景样式
   - 调整 `.wrap` 内容区样式使用 CSS 变量
   - 删除冗余的硬编码样式

### Phase 3: 改造 Admin 内容页面

1. 修改以下组件，将样式引入从 `admin-theme.scss` 改为 `management-pages.scss`:
   - `AppManager.vue`
   - `UserManager.vue`
   - `NamespaceManager.vue`
   - `Settings.vue`
   - `UserCenter.vue`
2. 将根容器类名从 `pj-admin-container` 改为 `pj-management-page`
3. 调整内部样式类名以匹配 `management-pages.scss` 的命名规范

### Phase 4: 验证与测试

1. 视觉对比测试：确保两个模块视觉一致
2. 响应式测试：测试不同屏幕尺寸下的布局
3. 交互测试：验证 Hover、Active 状态效果

## 6. 风险与缓解措施

| 风险 | 缓解措施 |
|------|---------|
| 样式冲突 | 使用 scoped CSS，避免全局污染 |
| 响应式布局问题 | 保留原有响应式断点，逐步调整 |
| 交互状态遗漏 | 对照参考页面逐项验证 |

## 7. 验收标准

- [ ] Admin 侧边栏与 OMS 侧边栏视觉一致
- [ ] Admin 表格样式与 OMS 表格一致
- [ ] 按钮样式（主按钮、文本按钮）统一
- [ ] 弹窗样式统一
- [ ] 响应式布局正常
- [ ] 无样式冲突或布局崩坏
