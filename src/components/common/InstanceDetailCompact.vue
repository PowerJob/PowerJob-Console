<template>
  <div class="instance-compact">
    <!-- 状态头部 -->
    <div class="status-header" :class="statusClass">
      <div class="status-icon">
        <el-icon size="16">
          <SuccessFilled v-if="instanceDetail.status === 5" />
          <CircleCloseFilled v-else-if="instanceDetail.status === 4" />
          <Loading v-else-if="instanceDetail.status === 3" />
          <Clock v-else />
        </el-icon>
      </div>
      <div class="time-info">
        <div class="time-row">
          <span class="time-label">开始</span>
          <span class="time-value">{{ instanceDetail.actualTriggerTime || instanceDetail.startTime || '-' }}</span>
        </div>
        <div class="time-row" v-if="instanceDetail.finishedTime">
          <span class="time-label">结束</span>
          <span class="time-value">{{ instanceDetail.finishedTime }}</span>
        </div>
      </div>
      <span class="retry-badge" v-if="instanceDetail.runningTimes > 1">x{{ instanceDetail.runningTimes }}</span>
    </div>

    <!-- 执行结果 -->
    <div class="result-card" v-if="instanceDetail.result || instanceDetail.taskDetail">
      <div class="card-header">
        <span class="card-title">执行结果</span>
        <div class="tab-switch" v-if="instanceDetail.taskDetail && instanceDetail.nodeType != 2">
          <button :class="{ active: activeTab === 'result' }" @click="activeTab = 'result'">结果</button>
          <button :class="{ active: activeTab === 'detail' }" @click="activeTab = 'detail'">详情</button>
        </div>
      </div>
      <div class="card-body">
        <pre class="code-block" v-if="activeTab === 'result'">{{ instanceDetail.result || '无' }}</pre>
        <pre class="code-block" v-else>{{ instanceDetail.taskDetail }}</pre>
      </div>
    </div>

    <!-- 插槽区域 -->
    <div class="slot-section" v-if="$slots.default">
      <slot></slot>
    </div>

    <!-- 参数配置（折叠） -->
    <div class="collapse-section" v-if="instanceDetail.nodeType != 2 && instanceDetail.nodeType != 3 && hasParams">
      <button class="collapse-toggle" @click="showParams = !showParams">
        <el-icon><Setting /></el-icon>
        <span>参数配置</span>
        <el-icon class="arrow" :class="{ open: showParams }"><ArrowDown /></el-icon>
      </button>
      <transition name="collapse">
        <div class="collapse-content" v-show="showParams">
          <div class="param-row" v-if="instanceDetail.jobParams || instanceDetail.nodeParams">
            <span class="param-label">任务参数</span>
            <pre class="param-value">{{ instanceDetail.jobParams || instanceDetail.nodeParams }}</pre>
          </div>
          <div class="param-row" v-if="instanceDetail.instanceParams">
            <span class="param-label">实例参数</span>
            <pre class="param-value">{{ instanceDetail.instanceParams }}</pre>
          </div>
          <div class="param-row" v-if="instanceDetail.runtimeConfig">
            <span class="param-label">运行时配置</span>
            <pre class="param-value">{{ instanceDetail.runtimeConfig }}</pre>
          </div>
        </div>
      </transition>
    </div>

    <!-- 高级信息（折叠） -->
    <div class="collapse-section" v-if="hasAdvancedInfo">
      <button class="collapse-toggle" @click="showAdvanced = !showAdvanced">
        <el-icon><InfoFilled /></el-icon>
        <span>高级信息</span>
        <el-icon class="arrow" :class="{ open: showAdvanced }"><ArrowDown /></el-icon>
      </button>
      <transition name="collapse">
        <div class="collapse-content" v-show="showAdvanced">
          <div class="info-row" v-if="instanceDetail.taskTrackerAddress">
            <span class="info-label">执行器地址</span>
            <span class="info-value">{{ instanceDetail.taskTrackerAddress }}</span>
          </div>
          <div class="info-row" v-if="instanceDetail.expectedTriggerTime">
            <span class="info-label">预期触发</span>
            <span class="info-value">{{ instanceDetail.expectedTriggerTime }}</span>
          </div>
          <div class="param-row" v-if="instanceDetail.outerKey">
            <span class="param-label">业务外键</span>
            <span class="param-value text">{{ instanceDetail.outerKey }}</span>
          </div>
          <div class="param-row" v-if="instanceDetail.extendValue">
            <span class="param-label">扩展数据</span>
            <pre class="param-value">{{ instanceDetail.extendValue }}</pre>
          </div>
          <div class="param-row" v-if="instanceDetail.meta">
            <span class="param-label">调度元信息</span>
            <pre class="param-value">{{ instanceDetail.meta }}</pre>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script>
import { SuccessFilled, CircleCloseFilled, Clock, Loading, Setting, ArrowDown, InfoFilled } from '@element-plus/icons-vue';

export default {
  name: "InstanceDetailCompact",
  components: { SuccessFilled, CircleCloseFilled, Clock, Loading, Setting, ArrowDown, InfoFilled },
  props: ["instanceId", "nodeDetail"],
  computed: {
    statusClass() {
      const s = this.instanceDetail.status;
      if (s === 5) return 'status-success';
      if (s === 4) return 'status-failed';
      if (s === 3) return 'status-running';
      if (s === 1 || s === 2) return 'status-waiting';
      return 'status-stopped';
    },
    hasParams() {
      const d = this.instanceDetail || {};
      return d.jobParams || d.nodeParams || d.instanceParams || d.runtimeConfig;
    },
    hasAdvancedInfo() {
      const d = this.instanceDetail || {};
      const has = (v) => v != null && String(v).trim() !== '';
      return has(d.taskTrackerAddress) || has(d.expectedTriggerTime) || has(d.outerKey) || has(d.extendValue) || has(d.meta);
    }
  },
  data() {
    return {
      activeTab: 'result',
      showParams: false,
      showAdvanced: false,
      instanceDetail: {}
    };
  },
  methods: {
    fetchInstanceDetail() {
      const isNestedWorkflow = this.nodeDetail?.nodeType === 3 || this.nodeDetail?.type === 'NESTED_WORKFLOW';
      if (isNestedWorkflow && this.nodeDetail) {
        this.instanceDetail = this.nodeDetail;
        return;
      }
      if (this.instanceId) {
        this.axios.post('/instance/detailPlus', { instanceId: this.instanceId }).then(ret => {
          this.instanceDetail = ret;
        });
      } else if (this.nodeDetail) {
        this.instanceDetail = this.nodeDetail;
      }
    }
  },
  mounted() {
    this.fetchInstanceDetail();
  },
  watch: {
    instanceId() {
      this.fetchInstanceDetail();
    },
    nodeDetail() {
      if (!this.instanceId && this.nodeDetail) {
        this.instanceDetail = this.nodeDetail;
      }
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Outfit:wght@400;500;600;700&display=swap');

.instance-compact {
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
}

/* 状态头部 */
.status-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 10px;
}

.status-header.status-success { background: #dcfce7; color: #166534; }
.status-header.status-failed { background: #fee2e2; color: #991b1b; }
.status-header.status-running { background: #dbeafe; color: #1e40af; }
.status-header.status-waiting { background: #fef3c7; color: #92400e; }
.status-header.status-stopped { background: #f1f5f9; color: #475569; }

.status-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.5);
  border-radius: 6px;
  flex-shrink: 0;
}

.time-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.time-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-label {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.5);
  font-weight: 500;
  width: 24px;
  flex-shrink: 0;
}

.time-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.status-text {
  font-size: 14px;
  font-weight: 700;
}

.status-time {
  font-size: 11px;
  opacity: 0.8;
  font-family: 'JetBrains Mono', monospace;
}

.retry-badge {
  padding: 2px 8px;
  background: rgba(255,255,255,0.5);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

/* 结果卡片 */
.result-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 10px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.card-title {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.tab-switch {
  display: flex;
  gap: 2px;
}

.tab-switch button {
  padding: 3px 10px;
  border: none;
  background: transparent;
  font-size: 11px;
  color: #64748b;
  cursor: pointer;
  border-radius: 4px;
}

.tab-switch button.active {
  background: #3b82f6;
  color: white;
}

.card-body {
  background: white;
}

.code-block {
  margin: 0;
  padding: 10px;
  background: #1e293b;
  color: #a5f3fc;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  line-height: 1.5;
  max-height: 150px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 插槽区域 */
.slot-section {
  margin-bottom: 10px;
}

/* 折叠区域 */
.collapse-section {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 10px;
  overflow: hidden;
}

.collapse-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f8fafc;
  border: none;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
}

.collapse-toggle:hover {
  background: #f1f5f9;
}

.collapse-toggle .arrow {
  margin-left: auto;
  transition: transform 0.2s;
}

.collapse-toggle .arrow.open {
  transform: rotate(180deg);
}

.collapse-content {
  padding: 10px 12px;
  background: white;
}

/* 信息行 */
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px dashed #f1f5f9;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

.info-value {
  font-size: 12px;
  color: #1e293b;
  word-break: break-all;
  text-align: right;
  max-width: 200px;
}

/* 参数行 */
.param-row {
  margin-bottom: 8px;
}

.param-row:last-child {
  margin-bottom: 0;
}

.param-label {
  display: block;
  font-size: 10px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.param-value {
  background: #f8fafc;
  border-radius: 4px;
  padding: 8px;
  margin: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 80px;
  overflow: auto;
}

.param-value.text {
  white-space: normal;
  max-height: none;
}

/* 折叠动画 */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
