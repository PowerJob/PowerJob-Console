# 工作流画布桥接层问题与修复经验总结

> 作者：Echo009  
> 日期：2026-02-28  
> 关联： [React-Vue 集成设计方案](./2026-02-28-react-vue-integration-design.md)

本文档沉淀「Vue 宿主 + React WorkflowCanvas（@xyflow/react）桥接」在画布编辑场景下遇到的问题、根因与解决方案，供后续维护与类似集成参考。

---

## 一、问题现象

| 现象 | 描述 |
|------|------|
| 节点无法拖动 | 拖拽节点时无反应或松手后节点回到原位置 |
| 画布空白区右键无响应 | 右键不弹出菜单，或仅有浏览器原生菜单 |
| 节点之间无法连线 | 从节点拖出连线到另一节点后，连线不出现或不持久 |
| CPU 占用过高 | 拖拽或操作画布时页面卡顿、风扇狂转 |

---

## 二、根因分析

### 2.1 数据流与状态归属

- **React WorkflowCanvas 是受控组件**：`nodes` / `edges` 由父级传入，画布内部不持久化；拖拽、连线等操作通过 `onNodesChange` / `onEdgesChange` / `onConnect` 回传。
- **Vue 侧最初设计**：依赖 power-workflow-next 的 Zustand store（`getWorkflowState()`）作为「画布真实状态」回写到 Vue。但 **WorkflowCanvas 在受控模式下并不写入该 store**，导致 `getWorkflowState()` 始终返回空，Vue 用「空状态」或「仅来自 props 的旧数据」去重渲染，把用户拖拽/连线的结果覆盖掉。

### 2.2 为何「拖不动」与「拖完回弹」

1. **仅用 props 重渲染**：每次 `renderReactComponent()` 都用 `convertToReactFormat(this.nodes, this.edges)` 生成节点，且节点 `position` 来自 Vue 的 `taskList`（无 `positionX/positionY` 时用默认 `{ x: index*250, y: 100 }`）。拖拽后 React 发出 `position` 变更，但 Vue 未把这些变更写回 `taskList`，下次 watch 触发重渲染时又用默认位置，视觉上表现为「回弹」。
2. **移除「每次变更都重渲染」后**：若完全不再在 `onNodesChange` 后重渲染，受控的 `nodes` 不会更新，ReactFlow 收到的仍是旧引用，表现为「拖不动」。因此需要**既更新受控数据，又避免每帧重渲染导致 CPU 飙升**。

### 2.3 为何连线不生效

- `onConnect` 只做了 `$emit('connect', connection)`，Vue 侧用 `getWorkflowData()` 取状态再写回 `peworkflowDAG`。由于 `getWorkflowData()` 依赖的 store 为空，取到的是旧 edges，新连线从未被加入受控数据源；React 侧下次渲染仍用旧的 `edges`，连线不显示或不持久。

### 2.4 为何 CPU 飙升

- 在「拖不动」的修复尝试中，曾在 `handleNodesChange` 内对**每次**变更（包括 `position` / `dimensions` / `select`）都执行 `renderReactComponent()`。拖拽一次会触发数十上百次变更，导致极高频的 React 重渲染与 Vue 更新，CPU 占用暴增。

### 2.5 为何右键「无响应」或出现浏览器菜单

- 右键事件已传到桥接层（`onPaneContextMenu`），但未调用 `event.preventDefault()`，浏览器会继续弹出默认上下文菜单；若未在 Vue 侧做任何 UI 反馈，用户会感觉「无响应」。

---

## 三、解决方案总结

### 3.1 桥接层维护「运行时」状态（核心）

- **在 Vue 桥接组件内维护 `runtimeNodes`、`runtimeEdges`**，作为 React 受控数据的唯一真实来源（不再依赖 Zustand store 的 present）。
- **初始化与 props 变更**：`renderReactComponent()` 中由 `convertToReactFormat(this.nodes, this.edges)` 得到 reactNodes/reactEdges，再与当前 `runtimeNodes` 的 position 合并（保留用户已拖拽的位置），写回 `runtimeNodes` / `runtimeEdges`，再调用 `renderRuntimeComponent()`。
- **节点/边变更回调**：  
  - `onNodesChange` → `applyNodeChanges(changes, runtimeNodes)` 更新 `runtimeNodes`，再触发节流重渲染（见下）。  
  - `onEdgesChange` → `applyEdgeChanges(changes, runtimeEdges)` 更新 `runtimeEdges`，再触发节流重渲染。  
  - `onConnect` → 若该 connection 在 `runtimeEdges` 中不存在，则 push 新 edge，并触发节流重渲染；同时 `$emit('connect')` 让 Vue 侧同步到 `peworkflowDAG.edges`。
- **读回 Vue**：`getWorkflowData()` 优先返回 `convertToVueFormat(runtimeNodes, runtimeEdges)`，仅当 runtime 为空时才回退到 store 或 props 转换结果。

这样既保证受控数据来自桥接层自身，又避免依赖未同步的 store。

### 3.2 节流重渲染（避免 CPU 飙升）

- 不在每次 `onNodesChange` / `onEdgesChange` / `onConnect` 时直接调用 `renderRuntimeComponent()`，而是封装 **`scheduleRuntimeRender(reason)`**：
  - 使用 `requestAnimationFrame`，在同一帧内多次变更只触发一次重渲染；
  - 若已有未执行的 rAF，则不再重复调度。
- 在 `beforeUnmount` 中 `cancelAnimationFrame(runtimeRenderRaf)`，避免卸载后仍执行渲染。

这样拖拽、连线时既能更新视图，又不会因极高频率的渲染导致卡顿。

### 3.3 Vue 侧不同步「瞬时」变更（减少无效更新）

- 在 WorkflowEditor 的 `handleNodesChange` 中，若本次 changes 全是 **`select` / `dimensions` / `position`**，则不从 bridge 拉取状态写回 `taskList` / `peworkflowDAG`（不触发 Vue 的深度 watch，避免连锁重渲染）。
- 仅当存在「结构性」变更（如 add/remove）时，才用 `getWorkflowData()` 的结果同步到 Vue，保证保存/加载时数据一致。

### 3.4 节点 position 的双向同步

- **Vue → React**：节点数据结构中增加 `positionX`、`positionY`（或等价字段）。`convertToReactFormat` 时若存在则用作 `position`，否则用默认布局。
- **React → Vue**：`convertToVueFormat` 时把 `node.position.x/y` 写回 Vue 节点的 `positionX`、`positionY`，这样从 bridge 拉取状态写回 `taskList` 时能保留画布上的位置。

### 3.5 连线在 Vue 侧的持久化

- Bridge 的 `handleConnect` 已把新边加入 `runtimeEdges`；Vue 侧 `handleConnect` 不再只依赖 `getWorkflowData()`（因为可能时序上还未渲染），改为根据本次 `connection` 直接往 `peworkflowDAG.edges` 追加一条边（去重），保证 edges 与 React 一致，并支持后端保存格式（from/to/property 等）。

### 3.6 画布右键行为

- 在 `onPaneContextMenu` 中调用 `event.preventDefault()` 和 `event.stopPropagation()`，避免浏览器默认右键菜单；再 `$emit('pane-context-menu', { clientX, clientY })`，由 Vue 侧决定是否显示自定义菜单或其它交互。

### 3.7 边的 handle 信息

- 若 React 节点存在多 handle（如决策节点的 true/false），连线会带 `sourceHandle` / `targetHandle`。在 `convertToReactFormat` / `convertToVueFormat` 以及 `handleConnect` 中需传递并保存这些字段，避免连线错连或丢失。

---

## 四、实现要点速查

| 要点 | 位置 | 说明 |
|------|------|------|
| 运行时状态 | ReactWorkflowBridge.vue `data()` | `runtimeNodes`、`runtimeEdges`、`runtimeRenderRaf` |
| 合并 position | `renderReactComponent()` | 用 `runtimeNodes` 的 position 覆盖 convert 结果的 position |
| 节流渲染 | `scheduleRuntimeRender()` | requestAnimationFrame，一帧一次 |
| 应用变更 | `handleNodesChange` / `handleEdgesChange` | `applyNodeChanges` / `applyEdgeChanges` 后 `scheduleRuntimeRender` |
| 新连线入桥接层 | `handleConnect` | 去重后 push 到 `runtimeEdges`，再 `scheduleRuntimeRender('connect')` |
| 新连线入 Vue | WorkflowEditor `handleConnect` | 按 connection 直接追加到 `peworkflowDAG.edges`（去重） |
| 瞬时变更不同步 | WorkflowEditor `handleNodesChange` | 仅 select/dimensions/position 时 return，不拉 bridge 状态 |
| 右键拦截 | `handlePaneContextMenu` | preventDefault + stopPropagation，再 emit |
| position 回写 Vue | `convertToVueFormat` + taskList 同步 | node 带 positionX/positionY；同步时保留这些字段 |
| 边 ID 统一 | Bridge / WorkflowEditor 的 `toEdgeId` | 无 handle：`e{source}-{target}`；有 handle：`e{source}-{target}-{sh}-{th}`，两处实现保持一致便于维护 |

---

## 五、可复用的经验

1. **受控组件必须「单源真相」**：谁提供 props，谁就要根据回调更新这份数据并再传回去；不能依赖第三方 store 除非明确其与受控数据同步。
2. **高频回调必须节流/防抖**：类似 ReactFlow 的 position/dimensions 变更，应用 requestAnimationFrame 或 throttle，避免「每次变更 = 一次重渲染」。
3. **Vue 与 React 的边界要清晰**：桥接层既要做「格式转换」，也要做「状态持有」与「事件转发」，避免父组件误用未更新的数据（如总从 store 读空状态）。
4. **先加日志再改逻辑**：用运行时日志区分「事件是否触发」「数据是否写回」「重渲染是否过频」，再做最小改动，避免引入新问题（如 CPU 飙升）。

以上经验可直接用于后续「画布能力扩展」或「其它 Vue+React 受控组件桥接」场景。
