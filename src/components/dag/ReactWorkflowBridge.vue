<template>
  <div class="react-workflow-bridge" ref="bridgeRoot">
    <!-- React WorkflowCanvas 将挂载到这里 -->
    <div ref="reactRoot" class="react-workflow-container"></div>
  </div>
</template>

<script>
import { createRoot } from 'react-dom/client';
import { createElement, Fragment } from 'react';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import {
  WorkflowCanvas,
  EditorPanel,
  LocaleProvider,
  getWorkflowState,
  layoutNodes,
} from '@echo009/power-workflow-next';

export default {
  name: 'ReactWorkflowBridge',
  props: {
    nodes: {
      type: Array,
      default: () => []
    },
    edges: {
      type: Array,
      default: () => []
    },
    mode: {
      type: String,
      default: 'edit',
      validator: (value) => ['edit', 'view'].includes(value)
    },
    jobOptions: {
      type: Array,
      default: () => []
    },
    workflowOptions: {
      type: Array,
      default: () => []
    },
    showToolbar: {
      type: Boolean,
      default: true
    },
    showMinimap: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      reactRoot: null,
      runtimeNodes: [],
      runtimeEdges: [],
      runtimeRenderRaf: null,
      /** 当前选中节点 ID（用于显示 power-workflow-next 自带的 EditorPanel） */
      selectedNodeId: null,
    };
  },
  mounted() {
    this.initReactComponent();
  },
  beforeUnmount() {
    if (this.runtimeRenderRaf) {
      cancelAnimationFrame(this.runtimeRenderRaf);
      this.runtimeRenderRaf = null;
    }
    if (this.reactRoot) {
      this.reactRoot.unmount();
      this.reactRoot = null;
    }
  },
  methods: {
    /**
     * 初始化 React 组件
     */
    initReactComponent() {
      const container = this.$refs.reactRoot;
      if (!container) return;

      this.reactRoot = createRoot(container);
      this.renderReactComponent();
    },

    /**
     * 渲染 React 组件
     */
    renderReactComponent() {
      if (!this.reactRoot) return;

      const { reactNodes, reactEdges } = this.convertToReactFormat(this.nodes, this.edges);
      const positionMap = new Map((this.runtimeNodes || []).map((node) => [node.id, node.position]));
      const mergedNodes = reactNodes.map((node) => {
        const cachedPosition = positionMap.get(node.id);
        return cachedPosition ? { ...node, position: cachedPosition } : node;
      });
      this.runtimeNodes = mergedNodes;
      this.runtimeEdges = reactEdges;

      // 获取当前语言设置
      const currentLocale = this.$i18n?.locale?.value || localStorage.getItem('oms_lang') || 'cn';
      const reactLocale = currentLocale === 'cn' ? 'zh-CN' : 'en-US';

      this.renderRuntimeComponent(reactLocale);
    },
    /**
     * 使用 runtime 状态渲染 React 组件
     */
    renderRuntimeComponent(reactLocale) {
      if (!this.reactRoot) return;
      const currentLocale = this.$i18n?.locale?.value || localStorage.getItem('oms_lang') || 'cn';
      const locale = reactLocale || (currentLocale === 'cn' ? 'zh-CN' : 'en-US');
      const canvasProps = {
        nodes: this.runtimeNodes,
        edges: this.runtimeEdges,
        mode: this.mode,
        defaultLocale: locale,
        showToolbar: this.showToolbar,
        showMinimap: this.showMinimap,
        jobOptions: this.jobOptions,
        workflowOptions: this.workflowOptions,

        onNodesChange: this.handleNodesChange,
        onEdgesChange: this.handleEdgesChange,
        onNodeDataChange: this.handleNodeDataChange,
        onConnect: this.handleConnect,
        onNodeClick: this.handleNodeClick,
        onPaneClick: this.handlePaneClick,
        onPaneContextMenu: this.handlePaneContextMenu,
        onNodeDragStop: this.handleNodeDragStop,
        onValidationError: this.handleValidationError,
        onAddNode: this.handleAddNode,
        onAutoLayout: this.handleAutoLayout,
        onExport: this.handleExport,
        onImport: this.handleImport,
      };
      const editingNode =
        this.selectedNodeId != null
          ? (this.runtimeNodes || []).find((n) => n.id === this.selectedNodeId) ?? null
          : null;
      const editorPanelProps = {
        node: editingNode,
        open: !!editingNode,
        onClose: this.handleEditorPanelClose,
        onSave: this.handleEditorPanelSave,
        jobOptions: this.jobOptions,
        workflowOptions: this.workflowOptions,
      };
      const content = createElement(Fragment, null, [
        createElement(WorkflowCanvas, canvasProps),
        createElement(EditorPanel, editorPanelProps),
      ]);
      this.reactRoot.render(createElement(LocaleProvider, { defaultLocale: locale }, content));
    },
    /**
     * 按帧节流重渲染，避免高频节点变更导致 CPU 飙升
     */
    scheduleRuntimeRender() {
      if (this.runtimeRenderRaf) return;
      this.runtimeRenderRaf = requestAnimationFrame(() => {
        this.runtimeRenderRaf = null;
        this.renderRuntimeComponent();
      });
    },

    /**
     * 统一生成边 ID：无 handle 时为 e{source}-{target}，有 handle 时带后缀便于区分多分支
     */
    toEdgeId(source, target, sourceHandle, targetHandle) {
      const s = source ?? '';
      const t = target ?? '';
      if (sourceHandle == null && targetHandle == null) return `e${s}-${t}`;
      return `e${s}-${t}-${sourceHandle ?? 's'}-${targetHandle ?? 't'}`;
    },

    /**
     * 转换 Vue 格式数据到 React 格式
     */
    convertToReactFormat(vueNodes, vueEdges) {
      const reactNodes = vueNodes.map((node, index) => {
        // 节点类型映射：1=JOB, 2=DECISION, 3=NESTED_WORKFLOW
        const typeMap = {
          1: 'JOB',
          2: 'DECISION',
          3: 'NESTED_WORKFLOW'
        };

        // 状态映射：1=WAITING, 2=WAITING, 3=RUNNING, 4=FAILED, 5=SUCCESS, 9=CANCELED, 10=STOPPED
        const statusMap = {
          1: 'WAITING',
          2: 'WAITING',
          3: 'RUNNING',
          4: 'FAILED',
          5: 'SUCCESS',
          9: 'CANCELED',
          10: 'STOPPED'
        };

        const nodeType = typeMap[node.nodeType] || 'JOB';

        const baseData = {
          label: node.nodeName || '',
          type: nodeType,
          status: node.status ? statusMap[node.status] : undefined,
          instanceId: node.instanceId || undefined,
        };

        const positionX = typeof node.positionX === 'number' ? node.positionX : null;
        const positionY = typeof node.positionY === 'number' ? node.positionY : null;
        const fallbackPosition = { x: index * 250, y: 100 };
        const nodePosition = (positionX !== null && positionY !== null)
          ? { x: positionX, y: positionY }
          : fallbackPosition;

        // 根据节点类型添加特定数据
        if (nodeType === 'JOB') {
          return {
            id: String(node.nodeId),
            type: nodeType,
            position: nodePosition,
            data: {
              ...baseData,
              jobId: node.jobId,
              enable: node.enable !== false,
              skip: node.skipWhenFailed || false,
              timeout: node.timeout || undefined,
              params: node.nodeParams || '',
            }
          };
        } else if (nodeType === 'DECISION') {
          return {
            id: String(node.nodeId),
            type: nodeType,
            position: nodePosition,
            data: {
              ...baseData,
              condition: node.nodeParams || '',
            }
          };
        } else if (nodeType === 'NESTED_WORKFLOW') {
          return {
            id: String(node.nodeId),
            type: nodeType,
            position: nodePosition,
            data: {
              ...baseData,
              targetWorkflowId: node.jobId,
              enable: node.enable !== false,
              skip: node.skipWhenFailed || false,
              params: node.nodeParams || '',
            }
          };
        }
      });

      const reactEdges = vueEdges.map((edge) => ({
        id: this.toEdgeId(edge.from, edge.to, edge.sourceHandle, edge.targetHandle),
        source: String(edge.from),
        target: String(edge.to),
        sourceHandle: edge.sourceHandle || undefined,
        targetHandle: edge.targetHandle || undefined,
        data: { property: edge.property || '' },
      }));

      return { reactNodes, reactEdges };
    },

    /**
     * 转换 React 格式数据到 Vue 格式
     */
    convertToVueFormat(reactNodes, reactEdges) {
      const vueNodes = reactNodes.map((node) => {
        // 类型映射：JOB=1, DECISION=2, NESTED_WORKFLOW=3
        const typeMap = {
          'JOB': 1,
          'DECISION': 2,
          'NESTED_WORKFLOW': 3
        };

        const baseNode = {
          nodeId: parseInt(node.id),
          nodeName: node.data.label,
          nodeType: typeMap[node.data.type] || 1,
          positionX: typeof node.position?.x === 'number' ? node.position.x : undefined,
          positionY: typeof node.position?.y === 'number' ? node.position.y : undefined,
        };

        if (node.data.type === 'JOB') {
          return {
            ...baseNode,
            jobId: node.data.jobId,
            enable: node.data.enable !== false,
            skipWhenFailed: node.data.skip || false,
            timeout: node.data.timeout || undefined,
            nodeParams: node.data.params || '',
          };
        } else if (node.data.type === 'DECISION') {
          return {
            ...baseNode,
            nodeParams: node.data.condition || '',
          };
        } else if (node.data.type === 'NESTED_WORKFLOW') {
          return {
            ...baseNode,
            jobId: node.data.targetWorkflowId,
            enable: node.data.enable !== false,
            skipWhenFailed: node.data.skip || false,
            nodeParams: node.data.params || '',
          };
        }
      });

      const vueEdges = reactEdges.map((edge) => {
        return {
          from: parseInt(edge.source),
          to: parseInt(edge.target),
          sourceHandle: edge.sourceHandle || undefined,
          targetHandle: edge.targetHandle || undefined,
          property: edge.data?.property || '',
        };
      });

      return { vueNodes, vueEdges };
    },

    /**
     * 获取当前工作流数据（供父组件调用）
     */
    getWorkflowData() {
      if (this.runtimeNodes?.length || this.runtimeEdges?.length) {
        return this.convertToVueFormat(this.runtimeNodes, this.runtimeEdges);
      }
      // 从 Zustand store 获取当前状态
      const state = getWorkflowState();
      if (state && state.nodes && state.edges) {
        return this.convertToVueFormat(state.nodes, state.edges);
      }
      // 降级：返回 props 中的数据
      return this.convertToVueFormat(
        this.convertToReactFormat(this.nodes, this.edges).reactNodes,
        this.convertToReactFormat(this.nodes, this.edges).reactEdges
      );
    },

    /**
     * 事件处理：节点变化
     */
    handleNodesChange(changes) {
      this.runtimeNodes = applyNodeChanges(changes || [], this.runtimeNodes || []);
      this.scheduleRuntimeRender();
      this.$emit('nodes-change', changes);
    },

    /**
     * 事件处理：连线变化
     */
    handleEdgesChange(changes) {
      this.runtimeEdges = applyEdgeChanges(changes || [], this.runtimeEdges || []);
      this.scheduleRuntimeRender();
      this.$emit('edges-change', changes);
    },

    /**
     * 事件处理：节点数据变化
     */
    handleNodeDataChange(nodeId, data) {
      this.$emit('node-data-change', { nodeId, data });
    },

    /**
     * 事件处理：新建连线
     */
    handleConnect(connection) {
      const exists = (this.runtimeEdges || []).some(
        (edge) =>
          edge.source === connection.source &&
          edge.target === connection.target &&
          (edge.sourceHandle || undefined) === (connection.sourceHandle || undefined) &&
          (edge.targetHandle || undefined) === (connection.targetHandle || undefined)
      );
      if (!exists) {
        const newEdge = {
          id: this.toEdgeId(connection.source, connection.target, connection.sourceHandle, connection.targetHandle),
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle || undefined,
          targetHandle: connection.targetHandle || undefined,
          data: { property: '' },
        };
        this.runtimeEdges = [...(this.runtimeEdges || []), newEdge];
      }
      this.scheduleRuntimeRender();
      this.$emit('connect', connection);
    },

    /**
     * 事件处理：节点点击（打开 power-workflow-next 自带 EditorPanel）
     */
    handleNodeClick(_event, node) {
      this.selectedNodeId = node.id;
      this.renderRuntimeComponent();
      this.$emit('node-selected', node);
    },

    /**
     * 事件处理：画布点击（取消选中、关闭 EditorPanel）
     */
    handlePaneClick() {
      this.selectedNodeId = null;
      this.renderRuntimeComponent();
      this.$emit('selection-cleared');
    },

    /** EditorPanel 关闭 */
    handleEditorPanelClose() {
      this.selectedNodeId = null;
      this.renderRuntimeComponent();
    },

    /** EditorPanel 保存：更新 runtime 节点并通知 Vue */
    handleEditorPanelSave(nodeId, data) {
      const index = (this.runtimeNodes || []).findIndex((n) => n.id === nodeId);
      if (index !== -1) {
        const next = [...this.runtimeNodes];
        next[index] = { ...next[index], data: { ...next[index].data, ...data } };
        this.runtimeNodes = next;
      }
      this.scheduleRuntimeRender();
      this.$emit('node-data-change', { nodeId, data });
    },
    /**
     * 事件处理：画布右键
     */
    handlePaneContextMenu(event) {
      if (event?.preventDefault) event.preventDefault();
      if (event?.stopPropagation) event.stopPropagation();
      this.$emit('pane-context-menu', {
        clientX: event?.clientX,
        clientY: event?.clientY,
      });
    },
    /**
     * 事件处理：节点拖拽结束（占位，兼容 React 回调签名）
     */
    handleNodeDragStop() {},

    /**
     * 事件处理：验证错误
     */
    handleValidationError(errors) {
      this.$emit('validation-error', errors);
    },

    /**
     * 事件处理：工具栏 - 添加节点
     */
    handleAddNode(type, position) {
      this.$emit('add-node', { type, position });
    },

    /**
     * 事件处理：工具栏 - 自动布局
     */
    handleAutoLayout(direction) {
      const state = getWorkflowState();
      if (!state?.nodes?.length && !state?.edges?.length) {
        this.$emit('auto-layout', { direction });
        return;
      }
      const { nodes, edges } = state;
      const layoutedNodes = layoutNodes(nodes, edges, { direction });
      const { vueNodes, vueEdges } = this.convertToVueFormat(layoutedNodes, edges);
      this.$emit('auto-layout-applied', { vueNodes, vueEdges });
    },

    /**
     * 事件处理：工具栏 - 导出
     */
    handleExport() {
      this.$emit('export');
    },

    /**
     * 事件处理：工具栏 - 导入
     */
    handleImport() {
      this.$emit('import');
    },
  },
  watch: {
    nodes: {
      handler() {
        this.renderReactComponent();
      },
      deep: true
    },
    edges: {
      handler() {
        this.renderReactComponent();
      },
      deep: true
    },
    mode() {
      this.renderReactComponent();
    },
    jobOptions: {
      handler() {
        this.renderReactComponent();
      },
      deep: true
    },
    workflowOptions: {
      handler() {
        this.renderReactComponent();
      },
      deep: true
    }
  },
  // 暴露方法给父组件
  expose: ['getWorkflowData']
};
</script>

<style scoped>
.react-workflow-bridge {
  width: 100%;
  height: 100%;
}

.react-workflow-container {
  width: 100%;
  height: 100%;
}

/* 隔离 power-workflow-next 的样式 */
.react-workflow-container :deep(*) {
  box-sizing: border-box;
}
</style>
