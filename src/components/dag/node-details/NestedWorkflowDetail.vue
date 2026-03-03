<template>
  <div class="nested-workflow-detail">
    <!-- 嵌套工作流标识 -->
    <div class="workflow-banner">
      <div class="banner-icon">
        <el-icon size="24"><Share /></el-icon>
      </div>
      <div class="banner-content">
        <h3 class="banner-title">{{ nodeDetail?.label || '嵌套工作流' }}</h3>
        <p class="banner-subtitle">Nested Workflow Instance</p>
      </div>
    </div>

    <!-- 工作流信息卡片 -->
    <div class="info-card">
      <div class="card-header">
        <span class="card-title">
          <el-icon><FolderOpened /></el-icon>
          工作流信息
        </span>
      </div>
      <div class="card-body">
        <div class="info-row">
          <span class="info-label">工作流ID</span>
          <span class="info-value mono">{{ nodeDetail?.instanceId || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">执行状态</span>
          <span class="info-value">
            <span class="status-badge" :class="statusClass">
              <span class="status-dot"></span>
              {{ statusText }}
            </span>
          </span>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions" v-if="nodeDetail?.instanceId">
      <button class="action-card primary" @click="navigateToWorkflow">
        <div class="action-icon">
          <el-icon size="20"><ZoomIn /></el-icon>
        </div>
        <div class="action-content">
          <span class="action-title">查看工作流详情</span>
          <span class="action-desc">跳转到子工作流实例页面</span>
        </div>
        <div class="action-arrow">
          <el-icon><Right /></el-icon>
        </div>
      </button>
    </div>

    <!-- 无实例提示 -->
    <div class="empty-state" v-if="!nodeDetail?.instanceId">
      <div class="empty-icon">
        <el-icon size="48"><Clock /></el-icon>
      </div>
      <p class="empty-text">嵌套工作流尚未启动</p>
      <p class="empty-hint">等待父工作流执行到该节点后，嵌套工作流将自动创建并运行</p>
    </div>

    <!-- 工作流参数 -->
    <!-- params: ReactWorkflowBridge 转换后的字段名，对应后端的 nodeParams -->
    <div class="info-card" v-if="nodeDetail?.params">
      <div class="card-header">
        <span class="card-title">
          <el-icon><Setting /></el-icon>
          传递参数
        </span>
      </div>
      <div class="card-body">
        <div class="params-display">
          <code>{{ nodeDetail.params }}</code>
        </div>
      </div>
    </div>

    <!-- 节点配置 -->
    <div class="info-card">
      <div class="card-header">
        <span class="card-title">
          <el-icon><Operation /></el-icon>
          节点配置
        </span>
      </div>
      <div class="card-body">
        <div class="config-grid">
          <div class="config-item">
            <span class="config-label">启用状态</span>
            <span class="config-value" :class="nodeDetail?.enable ? 'enabled' : 'disabled'">
              {{ nodeDetail?.enable ? '启用' : '禁用' }}
            </span>
          </div>
          <div class="config-item">
            <span class="config-label">失败策略</span>
            <span class="config-value" :class="nodeDetail?.skip ? 'skip' : 'stop'">
              {{ nodeDetail?.skip ? '跳过继续' : '中断流程' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 说明提示 -->
    <div class="info-tip">
      <div class="tip-icon">
        <el-icon><InfoFilled /></el-icon>
      </div>
      <div class="tip-content">
        <p class="tip-text">嵌套工作流节点会在父工作流执行时自动创建独立的子工作流实例</p>
      </div>
    </div>
  </div>
</template>

<script>
import {
  Share, FolderOpened, ZoomIn, Right, Clock,
  Setting, Operation, InfoFilled
} from '@element-plus/icons-vue';

export default {
  name: 'NestedWorkflowDetail',
  components: {
    Share,
    FolderOpened,
    ZoomIn,
    Right,
    Clock,
    Setting,
    Operation,
    InfoFilled,
  },
  props: {
    nodeDetail: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    statusClass() {
      if (!this.nodeDetail) return '';
      const status = this.nodeDetail.status;
      if (status === 1) return 'status-waiting';
      if (status === 2 || status === 3) return 'status-running';
      if (status === 4) return 'status-failed';
      if (status === 5) return 'status-success';
      if (status === 10) return 'status-stopped';
      return '';
    },
    statusText() {
      if (!this.nodeDetail) return '未知';
      const map = {
        1: '等待执行',
        2: '运行中',
        3: '运行中',
        4: '执行失败',
        5: '执行成功',
        10: '已停止'
      };
      return map[this.nodeDetail.status] || '未知';
    }
  },
  methods: {
    navigateToWorkflow() {
      if (this.nodeDetail?.instanceId) {
        this.$emit('navigate', this.nodeDetail.instanceId);
      }
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Outfit:wght@400;500;600;700&display=swap');

.nested-workflow-detail {
  font-family: 'Outfit', sans-serif;
}

/* 工作流横幅 */
.workflow-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  border-radius: 10px;
  margin-bottom: 12px;
  color: white;
  position: relative;
  overflow: hidden;
}

.workflow-banner::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
}

.banner-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  backdrop-filter: blur(10px);
}

.banner-icon .el-icon {
  font-size: 22px;
}

.banner-content {
  flex: 1;
}

.banner-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 2px;
}

.banner-subtitle {
  margin: 0;
  font-size: 10px;
  opacity: 0.8;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 信息卡片 */
.info-card {
  background: white;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.card-body {
  padding: 12px 16px;
}

/* 信息行 */
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed #f1f5f9;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  min-width: 70px;
}

.info-value {
  font-size: 13px;
  color: #1e293b;
  font-weight: 500;
}

.info-value.mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  background: #f1f5f9;
  padding: 3px 10px;
  border-radius: 6px;
}

/* 状态标签 */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-waiting {
  background: #fef3c7;
  color: #92400e;
}
.status-waiting .status-dot { background: #f59e0b; }

.status-running {
  background: #dbeafe;
  color: #1e40af;
}
.status-running .status-dot {
  background: #3b82f6;
  animation: pulse 1s infinite;
}

.status-success {
  background: #dcfce7;
  color: #166534;
}
.status-success .status-dot { background: #22c55e; }

.status-failed {
  background: #fee2e2;
  color: #991b1b;
}
.status-failed .status-dot { background: #ef4444; }

.status-stopped {
  background: #f1f5f9;
  color: #64748b;
}
.status-stopped .status-dot { background: #94a3b8; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* 快捷操作 */
.quick-actions {
  margin-bottom: 12px;
}

.action-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.action-card:hover {
  border-color: #6366f1;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  transform: translateY(-1px);
}

.action-card.primary .action-icon {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
}

.action-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border-radius: 10px;
  color: #64748b;
  flex-shrink: 0;
}

.action-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.action-desc {
  font-size: 12px;
  color: #64748b;
}

.action-arrow {
  color: #94a3b8;
  transition: transform 0.2s;
}

.action-card:hover .action-arrow {
  transform: translateX(4px);
  color: #6366f1;
}

/* 参数展示 */
.params-display {
  background: #1e293b;
  border-radius: 8px;
  padding: 12px;
}

.params-display code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #a5f3fc;
  word-break: break-all;
}

/* 配置网格 */
.config-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.config-item {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.config-label {
  display: block;
  font-size: 11px;
  color: #64748b;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.config-value {
  font-size: 13px;
  font-weight: 600;
}

.config-value.enabled { color: #16a34a; }
.config-value.disabled { color: #64748b; }
.config-value.skip { color: #ca8a04; }
.config-value.stop { color: #dc2626; }

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  background: #f8fafc;
  border-radius: 12px;
  margin-bottom: 12px;
}

.empty-icon {
  color: #cbd5e1;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 15px;
  font-weight: 600;
  color: #475569;
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
}

/* 提示 */
.info-tip {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  border-radius: 10px;
  border: 1px solid #c4b5fd;
}

.tip-icon {
  color: #7c3aed;
  margin-top: 2px;
}

.tip-content {
  flex: 1;
}

.tip-text {
  font-size: 12px;
  color: #5b21b6;
  margin: 0;
  line-height: 1.5;
}
</style>
