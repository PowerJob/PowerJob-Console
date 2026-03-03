<template>
  <div class="workflow-instance-detail">
    <!-- 顶部操作栏 -->
    <el-row>
      <div class="power-toolbtn">
        <div>
          <el-button type="primary" @click="back">{{ $t('message.back') }}</el-button>
        </div>
        <div>
          <el-button @click="fetchWfInstanceInfo">{{ $t('message.refresh') }}</el-button>
          <el-button type="warning" @click="restart">{{ $t('message.reRun') }}</el-button>
          <el-button type="danger" @click="stop">{{ $t('message.stop') }}</el-button>
        </div>
      </div>
    </el-row>

    <!-- 工作流实例信息 -->
    <el-row class="power-work-info-item">
      <el-col :span="24">
        {{ $t('message.status') }}：
        <span class="title">{{ common.translateWfInstanceStatus(wfInstanceDetail.status) }}</span>
      </el-col>
    </el-row>

    <el-row class="power-work-info-item">
      <el-col :span="8">
        {{ $t('message.wfId') }}：
        <span class="title">{{ wfInstanceDetail.workflowId }}</span>
      </el-col>
      <el-col :span="16">
        {{ $t('message.wfInstanceId') }}：
        <span class="title">{{ wfInstanceDetail.wfInstanceId }}</span>
      </el-col>
    </el-row>

    <el-row class="power-work-info-item">
      <el-col :span="8">
        {{ $t('message.expectedTriggerTime') }}：
        <span class="title">{{ wfInstanceDetail.expectedTriggerTime }}</span>
      </el-col>
      <el-col :span="8">
        {{ $t('message.triggerTime') }}：
        <span class="title">{{ wfInstanceDetail.actualTriggerTime }}</span>
      </el-col>
      <el-col :span="8">
        {{ $t('message.finishedTime') }}：
        <span class="title">{{ wfInstanceDetail.finishedTime }}</span>
      </el-col>
    </el-row>

    <el-row class="power-work-info-item">
      <el-col :span="24">
        {{ $t('message.wfInitParams') }}：
        <span class="title">{{ wfInstanceDetail.wfInitParams }}</span>
      </el-col>
    </el-row>

    <el-row v-if="wfInstanceDetail.wfContext" class="power-work-info-item">
      <div>
        <el-col :span="24">
          {{ $t('message.wfContext') }}：
          <el-popover width="400" placement="top" trigger="click">
            <div class="power-work-info-item-content">
              <JsonViewer :value="JSON.parse(wfInstanceDetail.wfContext)" />
            </div>
            <template #reference>
              <span class="power-work-info-item-context">{{ wfInstanceDetail.wfContext }}</span>
            </template>
          </el-popover>
        </el-col>
      </div>
    </el-row>

    <el-row class="power-work-info-item">
      <el-col :span="24">
        {{ $t('message.result') }}（{{ $t('message.wfTips') }}）：
        <span class="title">{{ wfInstanceDetail.result }}</span>
      </el-col>
    </el-row>

    <!-- 工作流画布（view 模式） -->
    <el-row class="canvas-row">
      <div class="workflow-canvas-wrapper">
        <ReactWorkflowBridge
          v-if="peworkflowDAG.nodes.length > 0"
          ref="workflowBridge"
          :nodes="peworkflowDAG.nodes"
          :edges="peworkflowDAG.edges"
          mode="view"
          :showToolbar="true"
          :showMinimap="false"
          @node-selected="handleNodeSelected"
          @selection-cleared="handleSelectionCleared"
        />

        <!-- 节点详情侧边栏 -->
        <transition name="slide-fade">
          <div class="node-detail-panel" v-if="selectedNode">
            <!-- 面板头部 -->
            <div class="panel-header">
              <div class="header-left">
              </div>
              <div class="header-actions">
                <el-tooltip :content="$t('message.refresh')" placement="top">
                  <button class="action-btn" @click="refreshNodeDetail">
                    <el-icon size="16"><Refresh /></el-icon>
                  </button>
                </el-tooltip>
                <el-tooltip
                  :content="$t('message.detail')"
                  placement="top"
                  v-if="showDetailButton"
                >
                  <button class="action-btn" @click.stop="toNodeDetail">
                    <el-icon size="16"><Document /></el-icon>
                  </button>
                </el-tooltip>
                <button class="action-btn close-btn" @click="selectedNode = null">
                  <el-icon size="18"><Close /></el-icon>
                </button>
              </div>
            </div>

            <!-- 节点状态指示器 -->
            <div class="status-indicator" :class="nodeStatusClass">
              <span class="status-dot"></span>
              <span class="status-text">{{ nodeStatusText }}</span>
            </div>

            <!-- 面板内容 - 根据节点类型切换 -->
            <div class="panel-content">
              <!-- 普通任务节点 -->
              <template v-if="isTaskNode">
                <TaskNodeDetail
                  ref="taskDetailRef"
                  :nodeDetail="nodeDetail"
                  :instanceId="currentInstanceId"
                  :currentNodeInfo="currentNodeInfo"
                />
              </template>

              <!-- 判断节点 -->
              <template v-else-if="isDecisionNode">
                <DecisionNodeDetail
                  :nodeDetail="nodeDetail"
                />
              </template>

              <!-- 嵌套工作流节点 -->
              <template v-else-if="isNestedWorkflowNode">
                <NestedWorkflowDetail
                  :nodeDetail="nodeDetail"
                  @navigate="navigateToWorkflow"
                />
              </template>
            </div>

            <!-- 底部操作区 -->
            <div class="panel-footer" v-if="canMarkSuccess">
              <button class="mark-success-btn" @click="markedSuccess">
                <el-icon><CircleCheck /></el-icon>
                <span>{{ $t('message.markerSuccess') }}</span>
              </button>
            </div>
          </div>
        </transition>
      </div>
    </el-row>
  </div>
</template>

<script>
import InstanceDetail from "../common/InstanceDetail";
import ReactWorkflowBridge from "./ReactWorkflowBridge.vue";
import JsonViewer from 'vue-json-viewer';
import JSEditor from "./JSEditor";
import { ElMessage } from 'element-plus';
import {
  Close, Refresh, Document, CircleCheck,
  Monitor, Share, Operation
} from '@element-plus/icons-vue';

// 子组件
import TaskNodeDetail from './node-details/TaskNodeDetail.vue';
import DecisionNodeDetail from './node-details/DecisionNodeDetail.vue';
import NestedWorkflowDetail from './node-details/NestedWorkflowDetail.vue';

export default {
  name: "WorkflowInstanceDetail",
  components: {
    InstanceDetail,
    ReactWorkflowBridge,
    JsonViewer,
    JSEditor,
    Close,
    Refresh,
    Document,
    CircleCheck,
    Monitor,
    Share,
    Operation,
    TaskNodeDetail,
    DecisionNodeDetail,
    NestedWorkflowDetail,
  },
  data() {
    return {
      wfInstanceDetail: {},
      currentInstanceId: undefined,
      selectedNode: null,
      currentNodeInfo: {},
      peworkflowDAG: {
        nodes: [],
        edges: []
      },
      nodeDetail: null
    };
  },
  computed: {
    wfInstanceId() {
      return this.$route.params.wfInstanceId;
    },
    // 节点类型判断
    isTaskNode() {
      return this.nodeDetail &&
             this.nodeDetail.type !== 'DECISION' &&
             this.nodeDetail.type !== 'NESTED_WORKFLOW';
    },
    isDecisionNode() {
      return this.nodeDetail && this.nodeDetail.type === 'DECISION';
    },
    isNestedWorkflowNode() {
      return this.nodeDetail && this.nodeDetail.type === 'NESTED_WORKFLOW';
    },
    // 节点类型样式
    nodeTypeClass() {
      if (this.isDecisionNode) return 'type-decision';
      if (this.isNestedWorkflowNode) return 'type-nested';
      return 'type-task';
    },
    // 节点类型标签
    nodeTypeLabel() {
      if (this.isDecisionNode) return '判断节点';
      if (this.isNestedWorkflowNode) return '嵌套工作流';
      return '任务节点';
    },
    // 是否显示详情按钮
    showDetailButton() {
      if (!this.nodeDetail) return false;
      return !!this.nodeDetail.instanceId;
    },
    // 节点状态
    nodeStatusClass() {
      if (!this.nodeDetail) return '';
      const status = this.nodeDetail.status;
      if (status === 1) return 'status-waiting';
      if (status === 2) return 'status-running';
      if (status === 3) return 'status-running';
      if (status === 4) return 'status-failed';
      if (status === 5) return 'status-success';
      if (status === 10) return 'status-stopped';
      return '';
    },
    nodeStatusText() {
      if (!this.nodeDetail) return '';
      const statusMap = {
        1: '等待中',
        2: '运行中',
        3: '运行中',
        4: '失败',
        5: '成功',
        10: '已停止'
      };
      return statusMap[this.nodeDetail.status] || '未知';
    },
    canMarkSuccess() {
      // 只有失败的节点才能标记成功
      return this.nodeDetail && this.nodeDetail.status === 4;
    }
  },
  methods: {
    /** 获取数据 */
    async fetchWfInstanceInfo() {
      this.peworkflowDAG = {
        nodes: [],
        edges: []
      };

      const wfInstanceId = this.wfInstanceId;

      if (!wfInstanceId) {
        ElMessage.error('工作流实例ID不能为空');
        this.$router.push('/oms/wfinstance');
        return;
      }

      const url = "/wfInstance/info?appId=" + window.localStorage.getItem("Power_appId") + "&wfInstanceId=" + wfInstanceId;
      try {
        const res = await this.axios.get(url);
        this.wfInstanceDetail = res;
        this.peworkflowDAG = res.peworkflowDAG;
      } catch (error) {
        ElMessage.error('获取工作流实例详情失败');
        console.error('Failed to fetch workflow instance detail:', error);
      }
    },

    /** 标记成功 */
    async markedSuccess() {
      if (!this.selectedNode || !this.canMarkSuccess) return;

      const data = {
        appId: window.localStorage.getItem("Power_appId"),
        wfInstanceId: this.wfInstanceId,
        nodeId: this.selectedNode.id
      };

      await this.axios.get('/wfInstance/markNodeAsSuccess', {
        params: data
      });

      // 更新本地状态
      if (this.nodeDetail) {
        this.nodeDetail.status = 5; // SUCCESS
      }

      ElMessage.success(this.$t("message.success"));
      await this.fetchWfInstanceInfo();
    },

    /** 重试 */
    async restart() {
      const data = {
        appId: window.localStorage.getItem("Power_appId"),
        wfInstanceId: this.wfInstanceId,
      };
      await this.axios.get('/wfInstance/retry', {
        params: data
      });
      this.fetchWfInstanceInfo();
    },

    /** 停止实例 */
    async stop() {
      const url = "/wfInstance/stop?wfInstanceId=" + this.wfInstanceId +
        "&appId=" + window.localStorage.getItem("Power_appId");
      await this.axios.get(url);
      ElMessage.success(this.$t('message.success'));
      await this.fetchWfInstanceInfo();
    },

    /** 节点选中处理 */
    handleNodeSelected(node) {
      // 未生成实例的节点不打开侧边抽屉，仅提示
      if (node.data?.type !== 'DECISION' && !node.data?.instanceId) {
        ElMessage.warning(this.$t('message.ntfClickNoInstanceNode'));
        return;
      }

      this.selectedNode = node;
      this.nodeDetail = node.data || null;
      this.currentNodeInfo = {
        enable: node.data?.enable,
        skipWhenFailed: node.data?.skip,
        nodeType: node.data?.type === 'DECISION' ? 2 : (node.data?.type === 'NESTED_WORKFLOW' ? 3 : 1),
      };

      // 嵌套工作流节点存的是 wfInstanceId，不能传给任务实例接口，只传 nodeDetail 用于展示
      const isNestedWorkflow = node.data?.type === 'NESTED_WORKFLOW';
      this.currentInstanceId = isNestedWorkflow ? undefined : node.data?.instanceId;
    },

    /** 取消选中 */
    handleSelectionCleared() {
      this.selectedNode = null;
      this.nodeDetail = null;
      this.currentInstanceId = undefined;
    },

    /** 刷新节点详情 */
    refreshNodeDetail() {
      if (this.$refs.taskDetailRef) {
        this.$refs.taskDetailRef.refresh();
      }
    },

    /** 跳转详情：普通任务节点跳任务实例详情，嵌套工作流节点跳工作流实例详情 */
    toNodeDetail() {
      const detail = this.nodeDetail;
      if (!detail || detail.instanceId == null || detail.instanceId === '') return;
      const id = String(detail.instanceId);
      // node.data 来自 React 节点，仅有 type 字符串，无 nodeType 数字
      const isNestedWorkflow = detail.type === 'NESTED_WORKFLOW' || detail.nodeType === 3;
      if (isNestedWorkflow) {
        this.$router.push({ name: 'WorkflowInstanceDetail', params: { wfInstanceId: id } }).catch(() => {});
      } else {
        this.$router.push({ name: 'instanceDetail', params: { instanceId: id } }).catch(() => {});
      }
    },

    /** 导航到嵌套工作流 */
    navigateToWorkflow(wfInstanceId) {
      this.$router.push({
        name: 'WorkflowInstanceDetail',
        params: { wfInstanceId }
      }).catch(() => {});
    },

    back() {
      this.$router.go(-1);
    }
  },
  watch: {
    // 同路由不同 params 时组件会复用，需根据 wfInstanceId 重新拉取并清空节点选中
    wfInstanceId: {
      handler(newId, oldId) {
        if (oldId != null && newId !== oldId) {
          this.handleSelectionCleared();
          this.fetchWfInstanceInfo();
        }
      },
    },
  },
  mounted() {
    console.log("Welcome to WorkflowInstanceDetail!");
    this.fetchWfInstanceInfo();
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700&display=swap');

*,
*::after,
*::before {
  box-sizing: border-box;
}

.workflow-instance-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  font-family: 'Outfit', -apple-system, sans-serif;
}

.title {
  display: inline-block;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
}

.power-toolbtn {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.power-work-info-item {
  margin: 10px;
  font-size: 13px;
  color: #4a4a68;
}

.power-work-info-item-content {
  max-height: 300px;
  overflow-y: scroll;
}

.power-work-info-item-context {
  max-width: 600px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
}

.canvas-row {
  flex: 1;
  min-height: 400px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.workflow-canvas-wrapper {
  width: 100%;
  flex: 1;
  min-height: 400px;
  min-width: 0;
  display: flex;
  position: relative;
}

/* ========== 节点详情面板样式 ========== */
.node-detail-panel {
  width: 480px;
  height: 100%;
  background: linear-gradient(180deg, #fafbfc 0%, #f5f7fa 100%);
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;
}

/* 面板头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  padding: 0 12px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: fit-content;
}

.node-type-badge.type-task {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #0369a1;
}

.node-type-badge.type-decision {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
}

.node-type-badge.type-nested {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  color: #5b21b6;
}

.type-icon {
  width: 14px;
  height: 14px;
}

.node-name {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  font-family: 'JetBrains Mono', monospace;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #f1f5f9;
  color: #334155;
}

.action-btn.close-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* 状态指示器 */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 500;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-indicator.status-waiting {
  background: #fef9c3;
  color: #854d0e;
}
.status-indicator.status-waiting .status-dot {
  background: #eab308;
}

.status-indicator.status-running {
  background: #dbeafe;
  color: #1e40af;
}
.status-indicator.status-running .status-dot {
  background: #3b82f6;
  animation: pulse-fast 1s infinite;
}

.status-indicator.status-success {
  background: #dcfce7;
  color: #166534;
}
.status-indicator.status-success .status-dot {
  background: #22c55e;
  animation: none;
}

.status-indicator.status-failed {
  background: #fee2e2;
  color: #991b1b;
}
.status-indicator.status-failed .status-dot {
  background: #ef4444;
  animation: none;
}

.status-indicator.status-stopped {
  background: #f1f5f9;
  color: #475569;
}
.status-indicator.status-stopped .status-dot {
  background: #94a3b8;
  animation: none;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.1); }
}

@keyframes pulse-fast {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* 面板内容 */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 底部操作区 */
.panel-footer {
  padding: 16px;
  background: white;
  border-top: 1px solid #e2e8f0;
}

.mark-success-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.mark-success-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(34, 197, 94, 0.4);
}

.mark-success-btn:active {
  transform: translateY(0);
}

/* 过渡动画 */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

/* ========== 旧样式兼容 ========== */
.power-job-text {
  display: inline-block;
  width: 148px;
  text-align: right;
  margin-right: 4px;
  font-size: 14px;
}

.job-detail-text {
  padding: 5px 0;
}
</style>

<style>
.jv-container .jv-code {
  padding: 8px;
}
</style>
