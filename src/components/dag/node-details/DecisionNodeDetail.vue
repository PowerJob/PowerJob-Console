<template>
  <div class="decision-node-detail">
    <!-- 节点信息卡片 -->
    <div class="info-card">
      <div class="card-header decision-theme">
        <span class="card-title">
          <el-icon><Operation /></el-icon>
          判断节点
        </span>
        <span class="card-badge">条件分支</span>
      </div>
      <div class="card-body">
        <div class="info-row">
          <span class="info-label">节点名称</span>
          <span class="info-value">{{ nodeDetail?.label || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">执行状态</span>
          <span class="info-value">
            <span class="status-badge" :class="statusClass">
              {{ statusText }}
            </span>
          </span>
        </div>
      </div>
    </div>

    <!-- 判断逻辑卡片 -->
    <div class="info-card logic-card">
      <div class="card-header">
        <span class="card-title">
          <el-icon><Document /></el-icon>
          判断逻辑
        </span>
      </div>
      <div class="card-body">
        <div class="code-block">
          <div class="code-header">
            <span class="code-label">Node Params</span>
            <button class="copy-btn" @click="copyParams">
              <el-icon><CopyDocument /></el-icon>
            </button>
          </div>
          <pre class="code-content">{{ nodeDetail?.nodeParams || '// 无判断逻辑' }}</pre>
        </div>
      </div>
    </div>

    <!-- 执行结果 -->
    <div class="info-card result-card" v-if="nodeDetail?.result">
      <div class="card-header">
        <span class="card-title">
          <el-icon><CircleCheck /></el-icon>
          判断结果
        </span>
      </div>
      <div class="card-body">
        <div class="result-display">
          <div class="result-icon">
            <el-icon size="24"><Right /></el-icon>
          </div>
          <div class="result-content">
            <span class="result-label">分支路径</span>
            <span class="result-value">{{ nodeDetail.result }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 提示信息 -->
    <div class="tip-card">
      <div class="tip-icon">
        <el-icon><InfoFilled /></el-icon>
      </div>
      <div class="tip-content">
        <p class="tip-text">判断节点根据条件表达式决定工作流的执行路径</p>
      </div>
    </div>
  </div>
</template>

<script>
import {
  Operation, Document, CircleCheck, Right,
  InfoFilled, CopyDocument
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

export default {
  name: 'DecisionNodeDetail',
  components: {
    Operation,
    Document,
    CircleCheck,
    Right,
    InfoFilled,
    CopyDocument,
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
      if (status === 5) return 'status-success';
      if (status === 4) return 'status-failed';
      if (status === 2 || status === 3) return 'status-running';
      return 'status-pending';
    },
    statusText() {
      if (!this.nodeDetail) return '未知';
      const map = {
        1: '等待执行',
        2: '判断中',
        3: '判断中',
        4: '判断失败',
        5: '判断完成',
        10: '已停止'
      };
      return map[this.nodeDetail.status] || '未知';
    }
  },
  methods: {
    copyParams() {
      if (this.nodeDetail?.nodeParams) {
        navigator.clipboard.writeText(this.nodeDetail.nodeParams);
        ElMessage.success('已复制到剪贴板');
      }
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Outfit:wght@400;500;600&display=swap');

.decision-node-detail {
  font-family: 'Outfit', sans-serif;
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

.card-header.decision-theme {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.card-badge {
  padding: 3px 10px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: #92400e;
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

/* 状态标签 */
.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.status-success {
  background: #dcfce7;
  color: #166534;
}

.status-failed {
  background: #fee2e2;
  color: #991b1b;
}

.status-running {
  background: #dbeafe;
  color: #1e40af;
}

.status-pending {
  background: #f1f5f9;
  color: #64748b;
}

/* 代码块 */
.code-block {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #1e293b;
}

.code-content {
  margin: 0;
  padding: 12px;
  background: #1e293b;
  color: #a5f3fc;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
}

.code-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #94a3b8;
}

.copy-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #94a3b8;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

/* 结果展示 */
.result-display {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-radius: 10px;
}

.result-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 50%;
  color: #22c55e;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.2);
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-label {
  font-size: 11px;
  color: #166534;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.result-value {
  font-size: 15px;
  font-weight: 700;
  color: #14532d;
  font-family: 'JetBrains Mono', monospace;
}

/* 提示卡片 */
.tip-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: linear-gradient(135deg, #fef9c3 0%, #fef3c7 100%);
  border-radius: 10px;
  border: 1px solid #fde047;
}

.tip-icon {
  color: #ca8a04;
  margin-top: 2px;
}

.tip-content {
  flex: 1;
}

.tip-text {
  font-size: 12px;
  color: #713f12;
  margin: 0;
  line-height: 1.5;
}
</style>
