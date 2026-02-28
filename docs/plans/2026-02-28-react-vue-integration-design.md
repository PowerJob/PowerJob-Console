# React 工作流组件集成到 Vue3 项目设计方案

## 项目背景

将基于 React 18 + @xyflow/react 的 `power-workflow-next` 组件集成到 Vue3 项目 `PowerJob-Console` 中，完全替换现有的基于 @antv/g6 的 `power-workflow` 组件。

### 当前状态

| 项目 | 技术栈 | 角色 |
|------|--------|------|
| PowerJob-Console | Vue 3 + Element Plus + Vue CLI (Webpack) | 宿主项目 |
| power-workflow | @antv/g6 + 命令式 API | 旧工作流组件（待替换） |
| power-workflow-next | React 18 + @xyflow/react + Zustand + Tailwind | 新工作流组件 |

### 核心决策

- **集成方案**: Vue 组件内直接挂载 React（createRoot 方案）
- **构建工具**: Vue CLI 迁移到 Vite（双框架插件共存）
- **依赖方式**: 源码引入（file: 本地依赖）
- **节点编辑面板**: 使用 power-workflow-next 自带的 EditorPanel

## 架构设计

### 整体结构

```
WorkflowEditor.vue（Vue - 工作流元数据编辑 + 保存/加载）
  └── ReactWorkflowBridge.vue（Vue - 桥接层）
        ├── <div ref="reactRoot">
        │     └── WorkflowCanvas（React - 画布）
        └── <div ref="panelRoot">
              └── EditorPanel（React - 节点编辑面板）
```

### 数据流

```
Vue → React（数据下行）:
  Vue watch props 变化 → 调用 renderReact() 重新渲染 → React 组件接收新 props

React → Vue（事件上行）:
  React 调用 callback props → callback 内触发 Vue emit → Vue 父组件处理
```

### 关键回调映射

| React Callback | Vue Event | 用途 |
|---|---|---|
| onNodesChange | @nodes-change | 节点增删移动 |
| onEdgesChange | @edges-change | 连线增删 |
| onNodeDataChange | @node-data-change | 节点属性编辑 |
| onNodeClick | @node-selected | 节点选中 |
| onPaneClick | @selection-cleared | 取消选中 |

### 数据结构适配

旧格式（后端/PowerWorkflow）:
```javascript
{
  nodes: [{ nodeId: 1, jobId: 100, nodeName: "任务A", nodeParams: "{}", enable: true, skipWhenFailed: false, type: 1 }],
  edges: [{ from: 1, to: 2, property: "" }]
}
```

新格式（power-workflow-next）:
```typescript
{
  nodes: [{ id: "1", type: "JOB", position: { x: 0, y: 0 }, data: { label: "任务A", jobId: 100, params: "{}", enable: true, skip: false, type: "JOB" } }],
  edges: [{ id: "e1-2", source: "1", target: "2", data: { property: "" } }]
}
```

Bridge 组件内提供 `toReactFormat()` / `toBackendFormat()` 转换函数。

## 实施步骤

### 阶段一：Vite 迁移

1. 安装 Vite + 插件（`vite`, `@vitejs/plugin-vue`, `@vitejs/plugin-react`）
2. 创建 `vite.config.ts`（双框架插件、proxy、alias）
3. 移动 `public/index.html` → 根目录 `index.html`，添加 `<script type="module" src="/src/main.js">`
4. 环境变量 `VUE_APP_*` → `VITE_*`（`.env` 文件 + 代码引用）
5. 消除 `require()` 调用，改为 ESM import
6. 删除 Vue CLI 相关依赖（`@vue/cli-*`）
7. 更新 `package.json` scripts
8. 验证项目正常启动和构建

### 阶段二：引入 React 依赖 + power-workflow-next

1. 安装 React 依赖（`react`, `react-dom`）
2. `package.json` 添加 `"@echo009/power-workflow-next": "file:../power-workflow-next"`
3. 配置 Vite `resolve.alias` 确保源码引入正常
4. 验证 React JSX 编译正常

### 阶段三：创建 ReactWorkflowBridge.vue

1. 创建桥接组件，实现 createRoot 挂载/卸载
2. 实现 props watch → React 重渲染
3. 实现 callback → emit 事件桥接
4. 实现 `toReactFormat()` / `toBackendFormat()` 数据转换
5. 通过 `defineExpose` 暴露 `getWorkflowData()`、`fitView()` 等方法

### 阶段四：样式兼容处理

1. power-workflow-next Tailwind 配置添加 `prefix: 'pw-'`
2. 修改 power-workflow-next 源码中的 Tailwind class（批量加前缀）
3. 统一主色调（primary → #009688）
4. React 容器添加 `.power-workflow-container` 作用域 class
5. 引入 power-workflow-next 的 CSS 文件

### 阶段五：改造 WorkflowEditor.vue

1. 替换 PowerWorkflow 引用为 ReactWorkflowBridge
2. 移除旧的节点编辑面板 UI（改用 React EditorPanel）
3. 适配保存/加载逻辑（使用 Bridge 暴露的方法）
4. 适配导入任务/工作流的交互
5. 保留工作流元数据编辑（名称、描述、调度配置）

### 阶段六：改造 WorkflowInstanceDetail.vue

1. 替换为 ReactWorkflowBridge（view 模式）
2. 适配实例状态数据到新格式
3. 节点执行详情通过 EditorPanel 或自定义展示

### 阶段七：清理

1. 移除 `power-workflow` 依赖
2. 删除 `PowerWorkflow.vue`
3. 移除 `d3`、`dagre-d3` 等旧依赖
4. 移除 Vue CLI 残留配置文件（`babel.config.js` 等）

## 样式兼容策略

| 问题 | 解决方案 |
|------|----------|
| Tailwind 与 Element Plus class 冲突 | Tailwind 加 `pw-` 前缀 |
| 主色调不一致 | 修改 Tailwind primary 为 #009688 |
| React 组件样式泄漏 | `.power-workflow-container` 作用域隔离 |
| CSS 加载顺序 | Vite 中显式 import CSS，确保顺序可控 |

## 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| React/Vue 生命周期不同步 | 组件卸载时内存泄漏 | Bridge 在 onUnmounted 中严格调用 root.unmount() |
| 双框架 HMR 冲突 | 开发时热更新异常 | Vite 插件通过文件扩展名隔离，.vue 和 .tsx 各走各的 |
| Zustand store 与 Vue 响应式不互通 | 状态同步延迟 | 通过 callback props 做单向数据流，不共享 store |
| Tailwind 前缀改造工作量 | power-workflow-next 大量 class 需修改 | 可用脚本批量替换，或考虑用 important 选择器隔离替代前缀方案 |
| Vite 迁移兼容性 | 旧代码中 require/process.env 不兼容 | 逐文件排查，项目规模小（28 个 Vue 文件）可控 |

## 相关文档

- [工作流画布桥接层问题与修复经验总结](./2026-02-28-workflow-canvas-bridge-lessons.md)：画布拖拽、连线、右键、CPU 等问题的根因与实现要点沉淀。
