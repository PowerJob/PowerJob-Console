<template>
  <div class="task-node-detail">
    <!-- 基础信息卡片 -->
    <div class="info-card">
      <div class="card-header">
        <span class="card-title">
          <el-icon><InfoFilled /></el-icon>
          基础配置
        </span>
      </div>
      <div class="card-body">
        <div class="info-row">
          <span class="info-label">节点名称</span>
          <span class="info-value">{{ nodeDetail?.label || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">实例ID</span>
          <span class="info-value mono">{{ nodeDetail?.instanceId || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">启用状态</span>
          <span class="info-value">
            <span class="tag" :class="currentNodeInfo?.enable ? 'tag-success' : 'tag-default'">
              {{ currentNodeInfo?.enable ? '已启用' : '已禁用' }}
            </span>
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">失败策略</span>
          <span class="info-value">
            <span class="tag" :class="currentNodeInfo?.skipWhenFailed ? 'tag-warning' : 'tag-error'">
              {{ currentNodeInfo?.skipWhenFailed ? '跳过继续' : '中断流程' }}
            </span>
          </span>
        </div>
      </div>
    </div>

    <!-- 任务实例详情 -->
    <div class="info-card" v-if="instanceId">
      <div class="card-header">
        <span class="card-title">
          <el-icon><Clock /></el-icon>
          执行信息
        </span>
        <button class="refresh-btn" @click="refresh">
          <el-icon><Refresh /></el-icon>
        </button>
      </div>
      <div class="card-body">
        <InstanceDetailCompact
          ref="instanceDetailRef"
          :instance-id="instanceId"
          :nodeDetail="nodeDetail"
        >
          <template>
            <div class="extra-info">
              <div class="info-row">
                <span class="info-label">任务参数</span>
                <!-- params: ReactWorkflowBridge 转换后的字段名，对应后端的 nodeParams -->
                <div class="info-value params-value">
                  <code>{{ nodeDetail?.params || '无' }}</code>
                </div>
              </div>
            </div>
          </template>
        </InstanceDetailCompact>
      </div>
    </div>

    <!-- 无实例提示 -->
    <div class="empty-state" v-else>
      <div class="empty-icon">
        <el-icon size="48"><Warning /></el-icon>
      </div>
      <p class="empty-text">该节点尚未生成任务实例</p>
      <p class="empty-hint">节点可能正在等待执行或工作流尚未运行至此节点</p>
    </div>
  </div>
</template>

<script>
import InstanceDetailCompact from "../../common/InstanceDetailCompact";
import { InfoFilled, Clock, Refresh, Warning } from '@element-plus/icons-vue';

export default {
  name: 'TaskNodeDetail',
  components: {
    InstanceDetailCompact,
    InfoFilled,
    Clock,
    Refresh,
    Warning,
  },
  props: {
    nodeDetail: {
      type: Object,
      default: () => ({})
    },
    instanceId: {
      type: [String, Number],
      default: undefined
    },
    currentNodeInfo: {
      type: Object,
      default: () => ({})
    }
  },
  methods: {
    refresh() {
      if (this.$refs.instanceDetailRef) {
        this.$refs.instanceDetailRef.fetchInstanceDetail();
      }
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Outfit:wght@400;500;600&display=swap');

.task-node-detail {
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

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.refresh-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: white;
  color: #64748b;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: #e2e8f0;
  color: #334155;
}

.card-body {
  padding: 12px 16px;
}

/* 信息行 */
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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
  text-align: right;
  flex: 1;
  margin-left: 12px;
}

.info-value.mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
}

/* 标签 */
.tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.tag-success {
  background: #dcfce7;
  color: #166534;
}

.tag-default {
  background: #f1f5f9;
  color: #64748b;
}

.tag-warning {
  background: #fef3c7;
  color: #92400e;
}

.tag-error {
  background: #fee2e2;
  color: #991b1b;
}

/* 额外信息 */
.extra-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.params-value {
  text-align: left !important;
}

.params-value code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  background: #f8fafc;
  padding: 6px 10px;
  border-radius: 6px;
  display: block;
  word-break: break-all;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
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
</style>
