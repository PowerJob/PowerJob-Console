<template>
  <div class="react-workflow-bridge" ref="bridgeRoot">
    <!-- React WorkflowCanvas 将挂载到这里 -->
    <div ref="reactRoot" class="react-workflow-container"></div>
  </div>
</template>

<script>
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { WorkflowCanvas } from '@echo009/power-workflow-next';
import '../../../power-workflow-next/dist/power-workflow-next.css';

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
      workflowState: {
        nodes: [],
        edges: []
      }
    };
  },
  mounted() {
    this.initReactComponent();
  },
  beforeUnmount() {
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

      const props = {
        nodes: reactNodes,
        edges: reactEdges,
        mode: this.mode,
        defaultLocale: this.$i18n.locale.value === 'cn' ? 'zh-CN' : 'en-US',
        showToolbar: this.showToolbar,
        showMinimap: this.showMinimap,
        jobOptions: this.jobOptions,
        workflowOptions: this.workflowOptions,

        // 事件回调
        onNodesChange: this.handleNodesChange,
        onEdgesChange: this.handleEdgesChange,
        onNodeDataChange: this.handleNodeDataChange,
        onConnect: this.handleConnect,
        onNodeClick: this.handleNodeClick,
        onPaneClick: this.handlePaneClick,
        onValidationError: this.handleValidationError,
      };

      this.reactRoot.render(createElement(WorkflowCanvas, props));
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

        // 根据节点类型添加特定数据
        if (nodeType === 'JOB') {
          return {
            id: String(node.nodeId),
            type: nodeType,
            position: { x: index * 250, y: 100 }, // 临时位置，会被 auto-layout 覆盖
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
            position: { x: index * 250, y: 100 },
            data: {
              ...baseData,
              condition: node.nodeParams || '',
            }
          };
        } else if (nodeType === 'NESTED_WORKFLOW') {
          return {
            id: String(node.nodeId),
            type: nodeType,
            position: { x: index * 250, y: 100 },
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

      const reactEdges = vueEdges.map((edge) => {
        return {
          id: `e${edge.from}-${edge.to}`,
          source: String(edge.from),
          target: String(edge.to),
          data: {
            property: edge.property || '',
          }
        };
      });

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
          property: edge.data?.property || '',
        };
      });

      return { vueNodes, vueEdges };
    },

    /**
     * 获取当前工作流数据（供父组件调用）
     */
    getWorkflowData() {
      return this.convertToVueFormat(this.workflowState.nodes, this.workflowState.edges);
    },

    /**
     * 事件处理：节点变化
     */
    handleNodesChange(changes) {
      // 更新内部状态
      // 注意：这里需要从 React 的 changes 中提取最新的 nodes
      // 实际上 WorkflowCanvas 内部已经管理了状态，这里只是记录
      this.$emit('nodes-change', changes);
    },

    /**
     * 事件处理：连线变化
     */
    handleEdgesChange(changes) {
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
      this.$emit('connect', connection);
    },

    /**
     * 事件处理：节点点击
     */
    handleNodeClick(event, node) {
      this.$emit('node-selected', node);
    },

    /**
     * 事件处理：画布点击（取消选中）
     */
    handlePaneClick() {
      this.$emit('selection-cleared');
    },

    /**
     * 事件处理：验证错误
     */
    handleValidationError(errors) {
      this.$emit('validation-error', errors);
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
