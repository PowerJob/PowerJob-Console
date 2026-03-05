# Admin 页面 UI 统一实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 `/admin/app` 相关页面的界面风格升级，使其与 `/oms/home` 页面保持高度的视觉和交互一致性。

**Architecture:** 提取 Sidebar.vue 的样式到共享 SCSS 文件，AdminConsoleSidebar 复用该样式；Admin 内容页面改为引入 management-pages.scss，统一使用青绿色 (#009688) 主色调。

**Tech Stack:** Vue 3, Element Plus, SCSS, CSS Variables

---

## Task 1: 创建共享侧边栏样式文件

**Files:**
- Create: `src/styles/shared/sidebar.scss`

**Step 1: 创建 shared 目录**

```bash
mkdir -p src/styles/shared
```

**Step 2: 创建 sidebar.scss 文件**

创建文件 `src/styles/shared/sidebar.scss`，内容如下：

```scss
/**
 * 共享侧边栏样式
 * 从 Sidebar.vue 提取，供 Sidebar.vue 和 AdminConsoleSidebar.vue 复用
 */

/* 侧边栏容器基础样式 */
.sidebar-container {
    display: flex;
    height: calc(100vh - var(--pj-navbar-height));
}

/* 左侧容器 */
.sidebar-left-container {
    width: var(--pj-sidebar-width) !important;
    max-width: var(--pj-sidebar-width);
    min-width: var(--pj-sidebar-width);
    flex: 0 0 var(--pj-sidebar-width);
    background: var(--pj-bg-white);
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.06);
    border-right: 1px solid var(--pj-border-color, #e4e7ed);
    position: relative;
    z-index: 100;
}

/* 侧边栏 aside */
.sidebar-aside {
    padding: var(--pj-space-sm) 0;
}

/* 隐藏滚动条 */
.sidebar-left-container,
.sidebar-aside {
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
    }
}

/* 菜单容器 */
.sidebar-menu {
    height: 100%;
    border-right: none !important;
    padding: 0 var(--pj-space-sm);
}

/* 主内容区 */
.sidebar-wrap {
    flex: 1;
    width: calc(100% - var(--pj-sidebar-width));
    background: var(--pj-bg-base);
    padding: var(--pj-container-padding);
    overflow-y: auto;
    position: relative;
    min-width: 0;
    display: flex;
    flex-direction: column;

    > * {
        flex: 1;
        min-height: 0;
    }

    /* 滚动条样式 */
    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
        transition: background 0.3s ease;

        &:hover {
            background: #a8a8a8;
        }
    }
}

/* Menu 深度样式 - 适用于 el-menu */
.sidebar-menu-deep() {
    border-right: none;
    background: transparent;

    .el-menu-item {
        height: 52px;
        line-height: 52px;
        margin: 2px 0;
        padding: 0 var(--pj-space-md) !important;
        border-radius: var(--pj-radius-md);
        transition: background-color 0.25s ease, color 0.25s ease, transform 0.2s ease, box-shadow 0.25s ease;
        color: var(--pj-text-secondary);
        position: relative;

        &:hover {
            background: color-mix(in srgb, var(--pj-primary) 8%, transparent);
            color: var(--pj-primary);
            transform: translateX(2px);
        }

        &.is-active {
            background: color-mix(in srgb, var(--pj-primary) 12%, var(--pj-bg-white));
            color: var(--pj-primary);
            font-weight: 600;
            box-shadow: 0 2px 8px color-mix(in srgb, var(--pj-primary) 18%, transparent);

            &::before {
                content: '';
                position: absolute;
                left: 0;
                top: 50%;
                transform: translateY(-50%);
                width: 4px;
                height: 28px;
                background: var(--pj-primary);
                border-radius: 0 4px 4px 0;
                animation: sidebar-accent-in 0.3s ease;
            }

            .el-icon {
                color: var(--pj-primary);
            }
        }

        .el-icon {
            margin-right: var(--pj-space-sm);
            font-size: 18px;
            width: 18px;
            transition: color 0.25s ease;
        }

        span {
            font-size: 14px;
            font-weight: 500;
        }
    }

    .el-sub-menu {
        .el-sub-menu__title {
            height: 52px;
            line-height: 52px;
            margin: 2px 0;
            padding: 0 var(--pj-space-md) !important;
            border-radius: var(--pj-radius-md);
            color: var(--pj-text-secondary);
            transition: background-color 0.25s ease, color 0.25s ease, transform 0.2s ease;

            &:hover {
                background: color-mix(in srgb, var(--pj-primary) 8%, transparent);
                color: var(--pj-primary);
                transform: translateX(2px);
            }

            .el-icon {
                margin-right: var(--pj-space-sm);
                font-size: 18px;
                width: 18px;
            }

            span {
                font-size: 14px;
                font-weight: 500;
            }

            .el-submenu__icon-arrow {
                right: var(--pj-space-md);
                transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            }
        }

        &.is-opened .el-submenu__title .el-submenu__icon-arrow {
            transform: rotateZ(180deg);
        }

        .el-menu {
            background: color-mix(in srgb, var(--pj-primary) 3%, var(--pj-bg-white));
            border-radius: var(--pj-radius-md);
            margin: 0 0 var(--pj-space-xs) 0;
            padding: var(--pj-space-xs) 0;

            .el-menu-item {
                height: 44px;
                line-height: 44px;
                margin: 0 var(--pj-space-sm);
                padding-left: 40px !important;
                font-size: 13px;
                border-radius: var(--pj-radius-sm);
                transition: background-color 0.25s ease, color 0.25s ease;

                &:hover {
                    background: color-mix(in srgb, var(--pj-primary) 8%, transparent);
                    color: var(--pj-primary);
                }

                &.is-active {
                    background: color-mix(in srgb, var(--pj-primary) 14%, var(--pj-bg-white));
                    color: var(--pj-primary);
                    font-weight: 600;
                    box-shadow: 0 1px 4px color-mix(in srgb, var(--pj-primary) 15%, transparent);

                    &::before {
                        display: none;
                    }
                }
            }
        }
    }
}

/* 动画关键帧 */
@keyframes sidebar-accent-in {
    from {
        opacity: 0;
        transform: translateY(-50%) scaleY(0.6);
    }
    to {
        opacity: 1;
        transform: translateY(-50%) scaleY(1);
    }
}

@keyframes sidebar-shine {
    from { left: -60%; }
    to { left: 100%; }
}

/* 悬光动效 */
.sidebar-shine-effect() {
    :deep(.el-menu-item):not(.is-active):hover,
    :deep(.el-sub-menu .el-sub-menu__title):hover {
        position: relative;
        overflow: hidden;

        &::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 60%;
            height: 100%;
            background: linear-gradient(
                90deg,
                transparent,
                rgba(0, 150, 136, 0.14),
                transparent
            );
            animation: sidebar-shine 0.6s ease;
            pointer-events: none;
        }
    }
}

/* 响应式样式 */
.sidebar-responsive() {
    @media (max-width: 1024px) {
        .sidebar-left-container {
            width: 180px !important;
            max-width: 180px;
            min-width: 180px;
            flex: 0 0 180px;
        }

        :deep(.el-aside) {
            width: 180px !important;
            max-width: 180px !important;
            min-width: 180px !important;
            flex: 0 0 180px !important;
        }

        .sidebar-wrap {
            width: calc(100% - 180px);
        }
    }

    @media (max-width: 768px) {
        .sidebar-container {
            flex-direction: column;
        }

        .sidebar-left-container {
            width: 100%;
            height: auto;
            max-height: 200px;
            overflow-y: auto;
        }

        :deep(.el-menu) {
            display: flex;
            overflow-x: auto;

            .el-menu-item,
            .el-submenu .el-submenu__title {
                margin: 0 var(--pj-space-xs);
                min-width: 120px;
                text-align: center;
            }
        }

        .sidebar-wrap {
            padding: var(--pj-space-md);
            width: 100%;
        }
    }
}
```

**Step 3: 提交**

```bash
git add src/styles/shared/sidebar.scss
git commit -m "feat(styles): 创建共享侧边栏样式文件"
```

---

## Task 2: 重构 Sidebar.vue 使用共享样式

**Files:**
- Modify: `src/components/bar/Sidebar.vue`

**Step 1: 修改 Sidebar.vue 的 style 部分**

将 `<style scoped>` 部分替换为：

```vue
<style scoped lang="scss">
@import '../../styles/shared/sidebar.scss';

#sidebar {
    @extend .sidebar-container;
}

.left-container {
    @extend .sidebar-left-container;
}

.sidebar-aside {
    @extend .sidebar-aside;
}

.aside {
    @extend .sidebar-menu;
}

.wrap {
    @extend .sidebar-wrap;
}

/* 应用 Menu 深度样式 */
:deep(.el-menu) {
    @include sidebar-menu-deep;
}

/* 应用悬光动效 */
@include sidebar-shine-effect;

/* 应用响应式样式 */
@include sidebar-responsive;

/* el-aside 宽度确保 */
:deep(.el-aside) {
    width: var(--pj-sidebar-width) !important;
    max-width: var(--pj-sidebar-width) !important;
    min-width: var(--pj-sidebar-width) !important;
    flex: 0 0 var(--pj-sidebar-width) !important;
}
</style>
```

**Step 2: 验证页面正常**

```bash
npm run dev
```

访问 `http://localhost:5173/oms/home` 确认侧边栏样式正常。

**Step 3: 提交**

```bash
git add src/components/bar/Sidebar.vue
git commit -m "refactor(Sidebar): 重构使用共享侧边栏样式"
```

---

## Task 3: 重构 AdminConsoleSidebar.vue

**Files:**
- Modify: `src/components/admin/AdminConsoleSidebar.vue`

**Step 1: 修改 template 结构**

将 template 修改为：

```vue
<template>
  <div id="admin_sidebar" class="sidebar-container">
    <el-container class="left-container sidebar-left-container">
      <!--侧边栏容器-->
      <el-aside width="220px" class="sidebar-aside">
        <!-- 菜单 -->
        <el-menu :router="true" :default-active="default_active_index" class="aside sidebar-menu">

          <el-menu-item index="/admin/app">
            <template #title>
              <el-icon><Operation/></el-icon>
              <span>{{$t('message.tabAppManage')}}</span>
            </template>
          </el-menu-item>

          <el-menu-item index="/admin/namespace">
            <template #title>
              <el-icon><FolderOpened/></el-icon>
              <span>{{$t('message.tabNamespace')}}</span>
            </template>
          </el-menu-item>

          <el-menu-item index="/admin/personal">
            <template #title>
              <el-icon><UserFilled/></el-icon>
              <span>{{$t('message.tabPersonal')}}</span>
            </template>
          </el-menu-item>

          <el-menu-item index="/admin/settings">
            <template #title>
              <el-icon><Setting/></el-icon>
              <span>{{$t('message.tabSettings')}}</span>
            </template>
          </el-menu-item>

          <el-menu-item index="/admin/user">
            <template #title>
              <el-icon><User/></el-icon>
              <span>{{$t('message.tabUserManager')}}</span>
            </template>
          </el-menu-item>

        </el-menu>
      </el-aside>
    </el-container>

    <!-- 功能区 -->
    <div class="wrap sidebar-wrap">
      <router-view/>
    </div>
  </div>
</template>
```

**Step 2: 修改 script 中的 default_active_index 计算属性**

```javascript
computed: {
    default_active_index() {
        return this.$route?.path || '/admin/app'
    }
}
```

**Step 3: 替换 style 部分**

```vue
<style scoped lang="scss">
@import '../../styles/shared/sidebar.scss';

#admin_sidebar {
    @extend .sidebar-container;
}

.left-container {
    @extend .sidebar-left-container;
}

.sidebar-aside {
    @extend .sidebar-aside;
}

.aside {
    @extend .sidebar-menu;
}

.wrap {
    @extend .sidebar-wrap;
}

/* 应用 Menu 深度样式 */
:deep(.el-menu) {
    @include sidebar-menu-deep;
}

/* 应用悬光动效 */
@include sidebar-shine-effect;

/* 应用响应式样式 */
@include sidebar-responsive;

/* el-aside 宽度确保 */
:deep(.el-aside) {
    width: var(--pj-sidebar-width) !important;
    max-width: var(--pj-sidebar-width) !important;
    min-width: var(--pj-sidebar-width) !important;
    flex: 0 0 var(--pj-sidebar-width) !important;
}
</style>
```

**Step 4: 验证页面正常**

```bash
npm run dev
```

访问 `http://localhost:5173/admin/app` 确认侧边栏样式与 `/oms/home` 一致。

**Step 5: 提交**

```bash
git add src/components/admin/AdminConsoleSidebar.vue
git commit -m "refactor(AdminConsoleSidebar): 重构使用共享侧边栏样式，统一视觉风格"
```

---

## Task 4: 重构 AppManager.vue 样式

**Files:**
- Modify: `src/components/admin/AppManager.vue`

**Step 1: 修改根容器类名**

将 `<div class="pj-admin-container">` 改为 `<div class="pj-management-page">`

**Step 2: 修改 style 引入**

将：
```vue
<style scoped>
@import '../../styles/admin-theme.scss';
```

改为：
```vue
<style scoped lang="scss">
@import '../../styles/management-pages.scss';
```

**Step 3: 删除冗余的组件特定样式**

删除以下冗余样式（management-pages.scss 已包含）：
```css
/* 组件特定样式 */
.pj-text-tertiary {
  color: var(--pj-text-tertiary);
}

.el-tag {
  border-radius: var(--pj-border-radius-sm);
}

/* 表格优化 */
.el-table {
  --el-table-border-color: var(--pj-border-color);
  --el-table-text-color: var(--pj-text-primary);
  --el-table-header-text-color: var(--pj-text-primary);
  --el-table-header-bg-color: var(--pj-bg-secondary);
}

.el-table .cell {
  white-space: nowrap;
}

/* 确保按钮组紧凑显示 */
.pj-action-group {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: nowrap;
}

.pj-action-group .el-button {
  margin: 0;
  padding: 4px 8px;
}
```

**Step 4: 保留必要的组件特定样式**

保留并调整：
```scss
/* 组件特定样式 - 仅保留 management-pages.scss 未覆盖的 */
.pj-management-page {
    /* 使用 management-pages 的基础样式 */

    /* 表格容器样式 */
    .pj-table-card {
        :deep(.el-table) {
            --el-table-border-color: var(--pj-border-color);
            --el-table-text-color: var(--pj-text-primary);
            --el-table-header-text-color: var(--pj-text-primary);
            --el-table-header-bg-color: var(--pj-bg-secondary);
        }

        :deep(.el-table .cell) {
            white-space: nowrap;
        }
    }

    /* 操作按钮组 */
    .pj-action-group {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: nowrap;

        .el-button {
            margin: 0;
            padding: 4px 8px;
        }
    }

    /* 标签样式 */
    :deep(.el-tag) {
        border-radius: var(--pj-border-radius-sm);
    }
}
```

**Step 5: 验证页面正常**

```bash
npm run dev
```

**Step 6: 提交**

```bash
git add src/components/admin/AppManager.vue
git commit -m "refactor(AppManager): 改用 management-pages 样式，统一视觉风格"
```

---

## Task 5: 重构 UserManager.vue 样式

**Files:**
- Modify: `src/components/admin/UserManager.vue`

**Step 1: 修改根容器类名**

将 `<div class="pj-admin-container">` 改为 `<div class="pj-management-page">`

**Step 2: 修改 style 部分**

替换为：
```vue
<style scoped lang="scss">
@import '../../styles/management-pages.scss';

/* 组件特定样式 */
.pj-management-page {
    :deep(.el-tag) {
        border-radius: var(--pj-border-radius-sm);
    }

    :deep(.el-switch) {
        --el-switch-on-color: var(--pj-success);
        --el-switch-off-color: var(--pj-error);
    }
}
</style>
```

**Step 3: 验证页面正常**

```bash
npm run dev
```

**Step 4: 提交**

```bash
git add src/components/admin/UserManager.vue
git commit -m "refactor(UserManager): 改用 management-pages 样式，统一视觉风格"
```

---

## Task 6: 重构 NamespaceManager.vue 样式

**Files:**
- Modify: `src/components/admin/NamespaceManager.vue`

**Step 1: 修改根容器类名**

将 `<div class="pj-admin-container">` 改为 `<div class="pj-management-page">`

**Step 2: 修改 style 部分**

替换为：
```vue
<style scoped lang="scss">
@import '../../styles/management-pages.scss';

/* 组件特定样式 */
.pj-management-page {
    :deep(.el-tag) {
        border-radius: var(--pj-border-radius-sm);
    }

    :deep(.el-table) {
        --el-table-border-color: var(--pj-border-color);
        --el-table-text-color: var(--pj-text-primary);
        --el-table-header-text-color: var(--pj-text-primary);
        --el-table-header-bg-color: var(--pj-bg-secondary);
    }

    :deep(.el-table .cell) {
        white-space: nowrap;
    }

    .pj-action-group {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: nowrap;

        .el-button {
            margin: 0;
            padding: 4px 8px;
        }
    }
}
</style>
```

**Step 3: 验证页面正常**

```bash
npm run dev
```

**Step 4: 提交**

```bash
git add src/components/admin/NamespaceManager.vue
git commit -m "refactor(NamespaceManager): 改用 management-pages 样式，统一视觉风格"
```

---

## Task 7: 重构 Settings.vue 和 UserCenter.vue 样式

**Files:**
- Modify: `src/components/admin/Settings.vue`
- Modify: `src/components/admin/UserCenter.vue`

**Step 1: 读取 Settings.vue 当前样式**

```bash
# 检查文件内容
```

**Step 2: 修改 Settings.vue**

- 将根容器类名改为 `pj-management-page`
- 将 `@import '../../styles/admin-theme.scss'` 改为 `@import '../../styles/management-pages.scss'`
- 删除冗余样式

**Step 3: 修改 UserCenter.vue**

- 将根容器类名改为 `pj-management-page`
- 将 `@import '../../styles/admin-theme.scss'` 改为 `@import '../../styles/management-pages.scss'`
- 删除冗余样式

**Step 4: 验证页面正常**

```bash
npm run dev
```

**Step 5: 提交**

```bash
git add src/components/admin/Settings.vue src/components/admin/UserCenter.vue
git commit -m "refactor(Settings, UserCenter): 改用 management-pages 样式，统一视觉风格"
```

---

## Task 8: 标记 admin-theme.scss 为 legacy

**Files:**
- Modify: `src/styles/admin-theme.scss`

**Step 1: 添加 legacy 标记**

在文件顶部添加注释：

```scss
/**
 * PowerJob Admin 现代科技风格主题
 *
 * @deprecated 此文件已废弃，请使用 management-pages.scss 和全局 styles.scss
 * @see src/styles/management-pages.scss
 * @see src/styles.scss
 *
 * 保留此文件仅供参考，后续版本将移除
 */
```

**Step 2: 提交**

```bash
git add src/styles/admin-theme.scss
git commit -m "chore: 标记 admin-theme.scss 为 deprecated"
```

---

## Task 9: 最终验证与测试

**Files:**
- None (verification only)

**Step 1: 启动开发服务器**

```bash
npm run dev
```

**Step 2: 视觉对比测试**

| 测试项 | 路径 | 预期结果 |
|--------|------|----------|
| OMS 侧边栏 | `/oms/home` | 青绿色主色调，圆角菜单项，hover 动画 |
| Admin 侧边栏 | `/admin/app` | 与 OMS 侧边栏视觉完全一致 |
| Admin 表格 | `/admin/app` | 表头背景 #fafbfc，hover 效果一致 |
| Admin 按钮 | `/admin/app` | 主按钮渐变背景，圆角 8px |
| Admin 弹窗 | 点击编辑 | 圆角 8px，头部背景 #fafbfc |

**Step 3: 响应式测试**

调整浏览器窗口大小，验证：
- ≤1024px: 侧边栏宽度 180px
- ≤768px: 垂直堆叠布局

**Step 4: 交互测试**

- Hover 菜单项：应有背景变化和 translateX(2px) 效果
- Active 菜单项：应有左侧指示条和阴影
- Hover 按钮：应有向上位移和阴影效果

**Step 5: 提交最终更改**

```bash
git add -A
git commit -m "test: 完成 Admin UI 统一改造的视觉验证"
```

---

## Task 10: 更新 README 文档

**Files:**
- Modify: `README.md` (如果存在样式说明部分)

**Step 1: 添加样式架构说明**

在 README 的技术栈或架构部分添加：

```markdown
### 样式架构

项目使用统一的 CSS 变量系统 (`src/styles.scss`)：

- **主色调**: `--pj-primary: #009688` (青绿色)
- **共享侧边栏样式**: `src/styles/shared/sidebar.scss`
- **管理页面样式**: `src/styles/management-pages.scss`

所有管理页面应使用 `pj-management-page` 类名，并引入 `management-pages.scss`。
```

**Step 2: 提交**

```bash
git add README.md
git commit -m "docs: 更新样式架构说明"
```

---

## 完成清单

- [ ] Task 1: 创建共享侧边栏样式文件
- [ ] Task 2: 重构 Sidebar.vue 使用共享样式
- [ ] Task 3: 重构 AdminConsoleSidebar.vue
- [ ] Task 4: 重构 AppManager.vue 样式
- [ ] Task 5: 重构 UserManager.vue 样式
- [ ] Task 6: 重构 NamespaceManager.vue 样式
- [ ] Task 7: 重构 Settings.vue 和 UserCenter.vue 样式
- [ ] Task 8: 标记 admin-theme.scss 为 legacy
- [ ] Task 9: 最终验证与测试
- [ ] Task 10: 更新 README 文档
