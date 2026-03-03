<template>
  <div class="instance-detail-panel" :class="{ 'is-narrow': !!fixedWidth }">
    <div class="instance-info" :style="{ width: fixedWidth ? fixedWidth + 'px' : '100%' }">

      <!-- 基础信息网格 -->
      <div class="info-card">
        <div class="info-grid">
          <!-- 第一排：ID + 状态 -->
          <div class="info-item" v-if="instanceDetail.nodeType != 2">
            <span class="info-label">{{ $t('message.instanceId') }}</span>
            <span class="info-value mono">{{ instanceId || instanceDetail.instanceId || '-' }}</span>
          </div>

          <div class="info-item">
            <span class="info-label">{{ $t('message.status') }}</span>
            <span class="info-value">
              <span class="status-tag" :class="statusTagClass">
                <span class="status-dot"></span>
                {{ common.translateInstanceStatus(instanceDetail.status) }}
              </span>
            </span>
          </div>

          <div class="info-item" v-if="instanceDetail.nodeType != 2 && instanceDetail.nodeType != 3">
            <span class="info-label">{{ $t('message.runningTimes') }}</span>
            <span class="info-value mono">{{ instanceDetail.runningTimes || '-' }}</span>
          </div>

          <!-- 第二排：时间信息 -->
          <div class="info-item" v-if="instanceDetail.nodeType != 2 && instanceDetail.nodeType != 3">
            <span class="info-label">{{ $t('message.expectedTriggerTime') }}</span>
            <span class="info-value">{{ instanceDetail.expectedTriggerTime || '-' }}</span>
          </div>

          <div class="info-item">
            <span class="info-label">{{ $t('message.startTime') }}</span>
            <span class="info-value">{{ instanceDetail.actualTriggerTime || instanceDetail.startTime || '-' }}</span>
          </div>

          <div class="info-item">
            <span class="info-label">{{ $t('message.finishedTime') }}</span>
            <span class="info-value">{{ instanceDetail.finishedTime || '-' }}</span>
          </div>

          <!-- 任务追踪地址 (full-width) -->
          <div class="info-item full-width" v-if="instanceDetail.nodeType != 2 && instanceDetail.nodeType != 3 && instanceDetail.taskTrackerAddress">
            <span class="info-label">{{ $t('message.taskTrackerAddress') }}</span>
            <span class="info-value mono">{{ instanceDetail.taskTrackerAddress }}</span>
          </div>
        </div>

        <!-- 插槽区域 -->
        <div v-if="$slots.default" class="slot-container">
          <slot></slot>
        </div>
      </div>

      <!-- 结果展示 -->
      <div class="info-card" v-if="instanceDetail.result">
        <div class="card-header">
          <span class="card-title">
            <el-icon><Document /></el-icon>
            {{ $t('message.result') }}
          </span>
          <button class="view-btn" @click="openDetailDialog('result', $t('message.result'), instanceDetail.result)">
            <el-icon><View /></el-icon>
            <span>查看详情</span>
          </button>
        </div>
        <div class="card-body">
          <code class="preview-code">{{ truncateText(instanceDetail.result, 120) }}</code>
        </div>
      </div>

      <!-- 任务详情 -->
      <div class="info-card" v-if="instanceDetail.taskDetail && instanceDetail.nodeType != 2">
        <div class="card-header">
          <span class="card-title">
            <el-icon><List /></el-icon>
            {{ $t('message.taskDetail') }}
          </span>
          <button class="view-btn" @click="openDetailDialog('taskDetail', $t('message.taskDetail'), instanceDetail.taskDetail)">
            <el-icon><View /></el-icon>
            <span>查看详情</span>
          </button>
        </div>
        <div class="card-body">
          <code class="preview-code">{{ truncateText(instanceDetail.taskDetail, 120) }}</code>
        </div>
      </div>

      <!-- 折叠区域：参数配置和高级信息 -->
      <div class="info-card collapse-card" v-if="instanceDetail.nodeType != 2 && instanceDetail.nodeType != 3">
        <el-collapse v-model="activeNames">
          <!-- 参数配置 -->
          <el-collapse-item name="params">
            <template #title>
              <span class="collapse-title">
                <el-icon><Setting /></el-icon>
                参数配置
              </span>
            </template>
            <div class="params-grid">
              <div class="param-item">
                <span class="param-label">{{ $t('message.nodeParams') }}</span>
                <div class="param-value">
                  <code class="param-code">{{ instanceDetail.jobParams || instanceDetail.nodeParams || '无' }}</code>
                  <button
                    v-if="instanceDetail.jobParams || instanceDetail.nodeParams"
                    class="inline-view-btn"
                    @click.stop="openDetailDialog('nodeParams', $t('message.nodeParams'), instanceDetail.jobParams || instanceDetail.nodeParams)"
                  >
                    <el-icon><View /></el-icon>
                  </button>
                </div>
              </div>
              <div class="param-item">
                <span class="param-label">{{ $t('message.instanceParams') }}</span>
                <div class="param-value">
                  <code class="param-code">{{ instanceDetail.instanceParams || '无' }}</code>
                  <button
                    v-if="instanceDetail.instanceParams"
                    class="inline-view-btn"
                    @click.stop="openDetailDialog('instanceParams', $t('message.instanceParams'), instanceDetail.instanceParams)"
                  >
                    <el-icon><View /></el-icon>
                  </button>
                </div>
              </div>
              <div class="param-item">
                <span class="param-label">运行时配置</span>
                <div class="param-value">
                  <code class="param-code">{{ instanceDetail.runtimeConfig || '无' }}</code>
                  <button
                    v-if="instanceDetail.runtimeConfig"
                    class="inline-view-btn"
                    @click.stop="openDetailDialog('runtimeConfig', '运行时配置', instanceDetail.runtimeConfig)"
                  >
                    <el-icon><View /></el-icon>
                  </button>
                </div>
              </div>
            </div>
          </el-collapse-item>

          <!-- 高级信息 -->
          <el-collapse-item name="advanced" v-if="hasAdvancedInfo">
            <template #title>
              <span class="collapse-title">
                <el-icon><InfoFilled /></el-icon>
                高级信息
              </span>
            </template>
            <div class="params-grid">
              <div class="param-item">
                <span class="param-label">业务外键</span>
                <span class="param-value text">{{ instanceDetail.outerKey || '无' }}</span>
              </div>
              <div class="param-item">
                <span class="param-label">业务扩展数据</span>
                <span class="param-value text">{{ instanceDetail.extendValue || '无' }}</span>
              </div>
              <div class="param-item">
                <span class="param-label">调度元信息</span>
                <div class="param-value">
                  <code class="param-code">{{ instanceDetail.meta || '无' }}</code>
                  <button
                    v-if="instanceDetail.meta"
                    class="inline-view-btn"
                    @click.stop="openDetailDialog('meta', '调度元信息', instanceDetail.meta)"
                  >
                    <el-icon><View /></el-icon>
                  </button>
                </div>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </div>

    <!-- 子实例历史 -->
    <template v-if="instanceDetail.subInstanceDetails && instanceDetail.subInstanceDetails.length > 0">
      <div class="section-divider">
        <span>{{ $t("message.secondlyJobHistory") }}</span>
      </div>
      <div class="instance-info" :style="{ width: fixedWidth ? fixedWidth + 'px' : '100%' }">
        <div class="info-card table-card">
          <el-table :data="instanceDetail.subInstanceDetails" style="width: 100%" stripe size="small">
            <el-table-column :show-overflow-tooltip="true" prop="subInstanceId" :label="$t('message.subInstanceId')" width="120" />
            <el-table-column :show-overflow-tooltip="true" prop="startTime" :label="$t('message.startTime')" width="160" />
            <el-table-column :show-overflow-tooltip="true" prop="finishedTime" :label="$t('message.finishedTime')" width="160" />
            <el-table-column :show-overflow-tooltip="true" :label="$t('message.status')" width="100">
              <template #default="scope">
                <span class="status-tag small" :class="getStatusTagClass(scope.row.status)">
                  <span class="status-dot"></span>
                  {{ common.translateInstanceStatus(scope.row.status) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column :show-overflow-tooltip="true" prop="result" :label="$t('message.result')" />
          </el-table>
        </div>
      </div>
    </template>

    <!-- MR任务 -->
    <template v-if="showQueriedTaskDetailInfoList">
      <div class="section-divider">
        <span>{{ $t("message.queriedTaskDetailInfoList") }}</span>
      </div>
      <div class="instance-info" :style="{ width: fixedWidth ? fixedWidth + 'px' : '100%' }">
        <div class="mr-query-bar">
          <el-input v-model="queryInstanceDetailRequest.customQuery" size="small">
            <template #prepend>select * from task_info where</template>
            <template #append>limit 10</template>
          </el-input>
          <el-button type="primary" size="small" @click="fetchInstanceDetail" class="query-btn">
            {{ $t('message.query') }}
          </el-button>
        </div>

        <div class="info-card table-card">
          <el-table :data="instanceDetail.queriedTaskDetailInfoList" style="width: 100%" stripe size="small">
            <el-table-column :show-overflow-tooltip="true" prop="taskId" label="taskId" width="80" />
            <el-table-column :show-overflow-tooltip="true" prop="taskName" label="taskName" />
            <el-table-column :show-overflow-tooltip="true" prop="taskContent" label="taskContent" />
            <el-table-column :show-overflow-tooltip="true" prop="processorAddress" label="processorAddress" />
            <el-table-column :show-overflow-tooltip="true" prop="failedCnt" :label="$t('message.failedCnt')" width="80" />
            <el-table-column :show-overflow-tooltip="true" :label="$t('message.status')" width="100">
              <template #default="scope">
                <span class="status-tag small" :class="getStatusTagClass(scope.row.status)">
                  <span class="status-dot"></span>
                  {{ scope.row.statusStr }}
                </span>
              </template>
            </el-table-column>
            <el-table-column :show-overflow-tooltip="true" prop="createdTimeStr" :label="$t('message.createdTime')" />
            <el-table-column :show-overflow-tooltip="true" prop="lastModifiedTimeStr" :label="$t('message.lastModifiedTime')" />
            <el-table-column :show-overflow-tooltip="true" prop="lastReportTimeStr" :label="$t('message.lastReportTime')" />
            <el-table-column :show-overflow-tooltip="true" prop="result" :label="$t('message.result')" />
          </el-table>
        </div>
      </div>
    </template>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="detailDialogTitle"
      width="680px"
      class="instance-detail-dialog"
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
  </div>
</template>

<script>
import JsonViewer from 'vue-json-viewer';
import { Document, View, List, Setting, InfoFilled, CopyDocument } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

export default {
  name: "InstanceDetail",
  components: {
    JsonViewer,
    Document,
    View,
    List,
    Setting,
    InfoFilled,
    CopyDocument
  },
  props: ["instanceId", "fixedWidth", "resultAll", "nodeDetail"],
  computed: {
    /** 高级信息面板是否展示 */
    hasAdvancedInfo() {
      const d = this.instanceDetail || {};
      const has = (v) => v != null && String(v).trim() !== '';
      return has(d.outerKey) || has(d.extendValue) || has(d.meta);
    },
    /** 状态标签样式 */
    statusTagClass() {
      return this.getStatusTagClass(this.instanceDetail.status);
    },
    /** 是否可以格式化为 JSON */
    canFormatAsJson() {
      if (!this.detailDialogContent) return false;
      try {
        JSON.parse(this.detailDialogContent);
        return true;
      } catch {
        return false;
      }
    },
    /** 解析后的 JSON 内容 */
    parsedDetailContent() {
      try {
        return JSON.parse(this.detailDialogContent);
      } catch {
        return this.detailDialogContent;
      }
    }
  },
  data() {
    return {
      activeNames: [],
      instanceDetail: {
        queriedTaskDetailInfoList: undefined
      },
      showQueriedTaskDetailInfoList: false,
      queryInstanceDetailRequest: {
        instanceId: this.instanceId,
        customQuery: "status in (5, 6) order by last_modified_time desc"
      },
      // 详情弹窗
      detailDialogVisible: false,
      detailDialogTitle: '',
      detailDialogContent: '',
      viewMode: 'raw'
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
        const that = this;
        const request = {
          instanceId: this.instanceId,
          customQuery: this.queryInstanceDetailRequest.customQuery
        };
        this.axios.post('/instance/detailPlus', request).then(ret => {
          that.instanceDetail = ret;
          if (that.instanceDetail.queriedTaskDetailInfoList !== undefined && that.instanceDetail.queriedTaskDetailInfoList.length !== 0) {
            that.showQueriedTaskDetailInfoList = true;
          }
        });
      } else if (this.nodeDetail) {
        this.instanceDetail = this.nodeDetail;
      }
    },
    /** 重试实例 */
    async retry() {
      if (!this.instanceId) return;
      const url = '/instance/retry?instanceId=' + this.instanceId +
        '&appId=' + window.localStorage.getItem('Power_appId');
      await this.axios.get(url);
      ElMessage.success(this.$t('message.success'));
      this.fetchInstanceDetail();
    },
    /** 停止实例 */
    async stop() {
      if (!this.instanceId) return;
      const url = '/instance/stop?instanceId=' + this.instanceId +
        '&appId=' + window.localStorage.getItem('Power_appId');
      await this.axios.get(url);
      ElMessage.success(this.$t('message.success'));
      this.fetchInstanceDetail();
    },
    /** 获取当前状态，用于判断按钮是否可用 */
    getCurrentStatus() {
      return this.instanceDetail?.status;
    },
    /** 状态样式映射 */
    getStatusTagClass(status) {
      switch (status) {
        case 1: return 'tag-waiting';
        case 2: return 'tag-receiving';
        case 3: return 'tag-running';
        case 4: return 'tag-failed';
        case 5: return 'tag-success';
        case 9: return 'tag-canceled';
        case 10: return 'tag-stopped';
        default: return '';
      }
    },
    /** 截断文本 */
    truncateText(text, maxLength) {
      if (!text) return '-';
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    },
    /** 打开详情弹窗 */
    openDetailDialog(type, title, content) {
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
  mounted() {
    console.log("using InstanceId: " + this.instanceId);
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
  },
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700&display=swap');

*,
*::after,
*::before {
  box-sizing: border-box;
}

.instance-detail-panel {
  width: 100%;
  font-family: 'Outfit', -apple-system, sans-serif;
}

.instance-info {
  padding: 0;
}

/* ========== 信息卡片 ========== */
.info-card {
  background: white;
  border-radius: 12px;
  margin-bottom: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

/* 信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px 16px;
  padding: 14px 16px;
}

.instance-detail-panel.is-narrow .info-grid {
  grid-template-columns: repeat(2, 1fr);
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
}

.info-value.mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}

/* ========== 状态标签 ========== */
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
}

.status-tag.small {
  padding: 2px 8px;
  font-size: 11px;
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
.status-tag.tag-waiting .status-dot { background: #eab308; }

.status-tag.tag-receiving {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #0369a1;
}
.status-tag.tag-receiving .status-dot {
  background: #0ea5e9;
  animation: pulse-dot 1.5s infinite;
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
.status-tag.tag-success .status-dot { background: #22c55e; }

.status-tag.tag-failed {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #991b1b;
}
.status-tag.tag-failed .status-dot { background: #ef4444; }

.status-tag.tag-canceled {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #64748b;
}
.status-tag.tag-canceled .status-dot { background: #94a3b8; }

.status-tag.tag-stopped {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
}
.status-tag.tag-stopped .status-dot { background: #f59e0b; }

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ========== 卡片头部 ========== */
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

.view-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-btn:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
}

.card-body {
  padding: 12px 16px;
}

.preview-code {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  background: #f8fafc;
  padding: 10px 12px;
  border-radius: 6px;
  color: #475569;
  white-space: pre-wrap;
  word-break: break-all;
  border: 1px solid #e2e8f0;
  max-height: 80px;
  overflow: hidden;
}

/* ========== 折叠面板 ========== */
.collapse-card {
  padding: 0;
}

.collapse-card :deep(.el-collapse) {
  border: none;
}

.collapse-card :deep(.el-collapse-item__header) {
  height: 44px;
  line-height: 44px;
  padding: 0 16px;
  background: transparent;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.collapse-card :deep(.el-collapse-item__wrap) {
  border-bottom: none;
  background: transparent;
}

.collapse-card :deep(.el-collapse-item__content) {
  padding: 0;
}

.collapse-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 参数网格 */
.params-grid {
  padding: 12px 16px;
}

.param-item {
  display: flex;
  align-items: flex-start;
  padding: 10px 0;
  border-bottom: 1px dashed #f1f5f9;
}

.param-item:last-child {
  border-bottom: none;
}

.param-label {
  min-width: 90px;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
}

.param-value {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.param-value.text {
  font-size: 13px;
  color: #1e293b;
}

.param-code {
  flex: 1;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  background: #f8fafc;
  padding: 6px 10px;
  border-radius: 4px;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: 1px solid #e2e8f0;
}

.inline-view-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.inline-view-btn:hover {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

/* ========== 插槽容器 ========== */
.slot-container {
  padding: 12px 16px;
  border-top: 1px dashed #e2e8f0;
}

/* ========== 分隔线 ========== */
.section-divider {
  display: flex;
  align-items: center;
  margin: 20px 0 12px;
}

.section-divider::before,
.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
}

.section-divider span {
  padding: 0 16px;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ========== MR查询栏 ========== */
.mr-query-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.mr-query-bar :deep(.el-input-group) {
  flex: 1;
}

.query-btn {
  flex-shrink: 0;
}

/* ========== 表格卡片 ========== */
.table-card {
  padding: 12px;
}

.table-card :deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}

.table-card :deep(.el-table th) {
  background: #f8fafc !important;
  font-weight: 600;
  color: #475569;
  font-size: 12px;
}

.table-card :deep(.el-table td) {
  font-size: 12px;
}

/* ========== 详情弹窗 ========== */
.instance-detail-dialog :deep(.el-dialog__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  margin-right: 0;
}

.instance-detail-dialog :deep(.el-dialog__title) {
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
  color: #1e293b;
}

.instance-detail-dialog :deep(.el-dialog__body) {
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
</style>

<style>
.jv-container .jv-code {
  padding: 8px;
}
</style>
