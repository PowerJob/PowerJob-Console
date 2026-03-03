<template>
  <div class="workflow-instance-detail">
    <!-- 顶部操作栏 -->
    <div class="wf-header">
      <div class="header-left">
        <button class="back-btn" @click="back">
          <el-icon><ArrowLeft /></el-icon>
          <span>{{ $t('message.back') }}</span>
        </button>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="fetchWfInstanceInfo">
          <el-icon><Refresh /></el-icon>
          <span>{{ $t('message.refresh') }}</span>
        </button>
        <button class="action-btn warning" @click="restart">
          <el-icon><RefreshRight /></el-icon>
          <span>{{ $t('message.reRun') }}</span>
        </button>
        <button class="action-btn danger" @click="stop">
          <el-icon><VideoPause /></el-icon>
          <span>{{ $t('message.stop') }}</span>
        </button>
      </div>
    </div>

    <!-- 工作流实例信息 - 紧凑卡片式布局 -->
    <div class="wf-info-section">
      <!-- 信息网格 -->
      <div class="info-grid">
        <!-- 第一排：ID 信息 + 状态 -->
        <div class="info-item">
          <span class="info-label">{{ $t('message.wfId') }}</span>
          <span class="info-value mono">{{ wfInstanceDetail.workflowId || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">{{ $t('message.wfInstanceId') }}</span>
          <span class="info-value mono">{{ wfInstanceDetail.wfInstanceId || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">{{ $t('message.status') }}</span>
          <span class="info-value">
            <span class="status-tag" :class="statusTagClass">
              <span class="status-dot"></span>
              {{ common.translateWfInstanceStatus(wfInstanceDetail.status) }}
            </span>
          </span>
        </div>

        <!-- 第二排：时间信息 -->
        <div class="info-item">
          <span class="info-label">{{ $t('message.expectedTriggerTime') }}</span>
          <span class="info-value">{{ wfInstanceDetail.expectedTriggerTime || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">{{ $t('message.triggerTime') }}</span>
          <span class="info-value">{{ wfInstanceDetail.actualTriggerTime || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">{{ $t('message.finishedTime') }}</span>
          <span class="info-value">{{ wfInstanceDetail.finishedTime || '-' }}</span>
        </div>

        <!-- 参数预览 -->
        <div class="info-item full-width" v-if="wfInstanceDetail.wfInitParams">
          <span class="info-label">{{ $t('message.wfInitParams') }}</span>
          <div class="info-value-interactive">
            <code class="preview-text">{{ truncateText(wfInstanceDetail.wfInitParams, 60) }}</code>
            <button class="view-detail-btn" @click="openDetailDialog('params', $t('message.wfInitParams'), wfInstanceDetail.wfInitParams)">
              <el-icon><View /></el-icon>
            </button>
          </div>
        </div>

        <!-- 上下文预览 -->
        <div class="info-item full-width" v-if="wfInstanceDetail.wfContext">
          <span class="info-label">{{ $t('message.wfContext') }}</span>
          <div class="info-value-interactive">
            <code class="preview-text">{{ truncateText(wfInstanceDetail.wfContext, 60) }}</code>
            <button class="view-detail-btn" @click="openDetailDialog('context', $t('message.wfContext'), wfInstanceDetail.wfContext)">
              <el-icon><View /></el-icon>
            </button>
          </div>
        </div>

        <!-- 结果预览 -->
        <div class="info-item full-width" v-if="wfInstanceDetail.result">
          <span class="info-label">{{ $t('message.result') }}</span>
          <div class="info-value-interactive">
            <code class="preview-text">{{ truncateText(wfInstanceDetail.result, 80) }}</code>
            <button class="view-detail-btn" @click="openDetailDialog('result', $t('message.result'), wfInstanceDetail.result)">
              <el-icon><View /></el-icon>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="detailDialogTitle"
      width="680px"
      class="wf-detail-dialog"
      :close-on-click-modal="true"
      destroy-on-close
    >
      <div class="detail-dialog-content">
        <!-- 格式切换 -->
        <div class="format-toggle" v-if="canFormatAsJson">
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'raw' }"
            @click="viewMode = 'raw'"
          >
            <el-icon><Document /></el-icon>
            <span>原始</span>
          </button>
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'json' }"
            @click="viewMode = 'json'"
          >
            <el-icon><List /></el-icon>
            <span>JSON</span>
          </button>
          <button class="copy-btn" @click="copyToClipboard">
            <el-icon><CopyDocument /></el-icon>
            <span>复制</span>
          </button>
        </div>

        <!-- 内容展示 -->
        <div class="detail-content">
          <template v-if="viewMode === 'json' && canFormatAsJson">
            <JsonViewer :value="parsedDetailContent" />
          </template>
          <template v-else>
            <pre class="raw-content"><code>{{ detailDialogContent }}</code></pre>
          </template>
        </div>
      </div>
    </el-dialog>

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
                  <button class="panel-action-btn" @click="refreshNodeDetail">
                    <el-icon size="16"><Refresh /></el-icon>
                  </button>
                </el-tooltip>
                <el-tooltip
                  :content="$t('message.detail')"
                  placement="top"
                  v-if="showDetailButton"
                >
                  <button class="panel-action-btn" @click.stop="toNodeDetail">
                    <el-icon size="16"><Document /></el-icon>
                  </button>
                </el-tooltip>
                <button class="panel-action-btn close-btn" @click="selectedNode = null">
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
  Monitor, Share, Operation,
  ArrowLeft, RefreshRight, VideoPause, View,
  CopyDocument, List
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
    ArrowLeft,
    RefreshRight,
    VideoPause,
    View,
    CopyDocument,
    List,
    TaskNodeDetail,
    DecisionNodeDetail,
    NestedWorkflowDetail
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
      nodeDetail: null,
      // 详情弹窗
      detailDialogVisible: false,
      detailDialogTitle: '',
      detailDialogContent: '',
      detailDialogType: '',
      viewMode: 'raw'
    };
  },
  computed: {
    wfInstanceId() {
      return this.$route.params.wfInstanceId;
    },
    // 状态标签样式
    statusTagClass() {
      const status = this.wfInstanceDetail.status;
      if (status === 1) return 'tag-waiting';
      if (status === 2) return 'tag-running';
      if (status === 3) return 'tag-running';
      if (status === 4) return 'tag-failed';
      if (status === 5) return 'tag-success';
      if (status === 10) return 'tag-stopped';
      return '';
    },
    // 是否可以格式化为 JSON
    canFormatAsJson() {
      if (!this.detailDialogContent) return false;
      try {
        JSON.parse(this.detailDialogContent);
        return true;
      } catch {
        return false;
      }
    },
    // 解析后的 JSON 内容
    parsedDetailContent() {
      try {
        return JSON.parse(this.detailDialogContent);
      } catch {
        return this.detailDialogContent;
      }
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
    },

    /** 截断文本 */
    truncateText(text, maxLength) {
      if (!text) return '-';
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    },

    /** 打开详情弹窗 */
    openDetailDialog(type, title, content) {
      this.detailDialogType = type;
      this.detailDialogTitle = title;
      this.detailDialogContent = content;
      this.viewMode = 'raw';
      // 自动检测是否为 JSON
      try {
        JSON.parse(content);
        this.viewMode = 'json';
      } catch {
        this.viewMode = 'raw';
      }
      this.detailDialogVisible = true;
    },

    /** 复制到剪贴板 */
    async copyToClipboard() {
      try {
        await navigator.clipboard.writeText(this.detailDialogContent);
        ElMessage.success('已复制到剪贴板');
      } catch (err) {
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = this.detailDialogContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        ElMessage.success('已复制到剪贴板');
      }
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

/* ========== 顶部操作栏 ========== */
.wf-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  color: #334155;
  transform: translateX(-2px);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #334155;
}

.action-btn.warning {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #f59e0b;
  color: #92400e;
}

.action-btn.warning:hover {
  background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
}

.action-btn.danger {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-color: #ef4444;
  color: #991b1b;
}

.action-btn.danger:hover {
  background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
}

/* ========== 信息区域 ========== */
.wf-info-section {
  padding: 0 0 12px 0;
}

/* 信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px 16px;
  background: white;
  border-radius: 12px;
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* 状态标签 */
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
}

.status-tag .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-tag.tag-waiting {
  background: linear-gradient(135deg, #fef9c3 0%, #fef08a 100%);
  color: #854d0e;
}

.status-tag.tag-waiting .status-dot {
  background: #eab308;
}

.status-tag.tag-running {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
}

.status-tag.tag-running .status-dot {
  background: #3b82f6;
  animation: pulse-dot 1.5s infinite;
}

.status-tag.tag-success {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #166534;
}

.status-tag.tag-success .status-dot {
  background: #22c55e;
}

.status-tag.tag-failed {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #991b1b;
}

.status-tag.tag-failed .status-dot {
  background: #ef4444;
}

.status-tag.tag-stopped {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #475569;
}

.status-tag.tag-stopped .status-dot {
  background: #94a3b8;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item.full-width {
  grid-column: 1 / -1;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
  margin-top: 4px;
}

.info-label {
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.info-value {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  font-family: 'JetBrains Mono', monospace;
}

.info-value-interactive {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.preview-text {
  flex: 1;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  color: #64748b;
  background: #f8fafc;
  padding: 6px 10px;
  border-radius: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: 1px solid #e2e8f0;
}

.view-detail-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-detail-btn:hover {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-color: #3b82f6;
  color: white;
  transform: scale(1.05);
}

/* ========== 详情弹窗 ========== */
.wf-detail-dialog :deep(.el-dialog__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  margin-right: 0;
}

.wf-detail-dialog :deep(.el-dialog__title) {
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
  color: #1e293b;
}

.wf-detail-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.detail-dialog-content {
  padding: 20px;
}

.format-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 4px;
  background: #f1f5f9;
  border-radius: 8px;
  width: fit-content;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  color: #334155;
}

.toggle-btn.active {
  background: white;
  color: #3b82f6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 8px;
}

.copy-btn:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
}

.detail-content {
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.raw-content {
  margin: 0;
  padding: 16px;
  max-height: 400px;
  overflow: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-all;
}

.raw-content code {
  background: transparent;
}

/* ========== 画布区域 ========== */
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

.panel-action-btn {
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

.panel-action-btn:hover {
  background: #f1f5f9;
  color: #334155;
}

.panel-action-btn.close-btn:hover {
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
.title {
  display: inline-block;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
}

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
