<template>
  <div class="power-job-panel" :class="{ 'is-narrow': !!fixedWidth }">
    <div class="power-job-info" :style="{ width: fixedWidth ? fixedWidth + 'px' : '100%' }">
      
      <!-- 基础信息与时间信息 -->
      <el-card shadow="never" class="info-card">
        <el-descriptions :column="fixedWidth ? 1 : 2" border size="small">
          <el-descriptions-item v-if="instanceDetail.nodeType != 2" :label="$t('message.instanceId')">
            {{ instanceId || instanceDetail.instanceId }}
          </el-descriptions-item>
          
          <el-descriptions-item :label="$t('message.status')">
            <el-tag :type="getStatusType(instanceDetail.status)" size="small" effect="light">
              {{ common.translateInstanceStatus(instanceDetail.status) }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item v-if="instanceDetail.nodeType != 2 && instanceDetail.nodeType != 3" :label="$t('message.runningTimes')">
            {{ instanceDetail.runningTimes }}
          </el-descriptions-item>

          <el-descriptions-item v-if="instanceDetail.nodeType != 2 && instanceDetail.nodeType != 3" :label="$t('message.taskTrackerAddress')">
            {{ instanceDetail.taskTrackerAddress }}
          </el-descriptions-item>

          <el-descriptions-item v-if="instanceDetail.nodeType != 2 && instanceDetail.nodeType != 3" :label="$t('message.expectedTriggerTime')">
            {{ instanceDetail.expectedTriggerTime }}
          </el-descriptions-item>

          <el-descriptions-item :label="$t('message.startTime')">
            {{ instanceDetail.actualTriggerTime || instanceDetail.startTime }}
          </el-descriptions-item>

          <el-descriptions-item :label="$t('message.finishedTime')">
            {{ instanceDetail.finishedTime }}
          </el-descriptions-item>
        </el-descriptions>
        
        <!-- 插槽区域，一般放启用/跳过状态 -->
        <div v-if="$slots.default" class="slot-container">
          <slot></slot>
        </div>
      </el-card>

      <!-- 结果与详情 -->
      <el-card shadow="never" class="info-card mt-3">
        <template #header>
          <span class="section-title">{{ $t('message.result') }}</span>
        </template>
        <div class="code-like-block">
          {{ instanceDetail.result || '无' }}
        </div>
        
        <template v-if="instanceDetail.taskDetail && instanceDetail.nodeType != 2">
          <div class="mt-3">
            <span class="section-title" style="font-size: 13px;">{{ $t('message.taskDetail') }}</span>
            <div class="code-like-block mt-2">
              {{ instanceDetail.taskDetail }}
            </div>
          </div>
        </template>
      </el-card>

      <!-- 折叠面板：参数和高级信息 -->
      <el-card shadow="never" class="info-card collapse-card mt-3" v-if="instanceDetail.nodeType != 2 && instanceDetail.nodeType != 3">
        <el-collapse v-model="activeNames">
          <el-collapse-item name="params">
            <template #title>
              <span class="collapse-title">参数配置</span>
            </template>
            <el-descriptions :column="1" border size="small" direction="vertical">
              <el-descriptions-item :label="$t('message.nodeParams')">
                <div class="code-like-block">{{ instanceDetail.jobParams ? instanceDetail.jobParams : (instanceDetail.nodeParams || '无') }}</div>
              </el-descriptions-item>
              <el-descriptions-item :label="$t('message.instanceParams')">
                <div class="code-like-block">{{ instanceDetail.instanceParams || '无' }}</div>
              </el-descriptions-item>
              <el-descriptions-item label="运行时配置">
                <div class="code-like-block">{{ instanceDetail.runtimeConfig || '无' }}</div>
              </el-descriptions-item>
            </el-descriptions>
          </el-collapse-item>

          <el-collapse-item name="advanced" v-if="hasAdvancedInfo">
            <template #title>
              <span class="collapse-title">高级信息</span>
            </template>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="业务外键">
                {{ instanceDetail.outerKey || '无' }}
              </el-descriptions-item>
              <el-descriptions-item label="业务扩展数据">
                {{ instanceDetail.extendValue || '无' }}
              </el-descriptions-item>
              <el-descriptions-item label="调度元信息">
                <div class="code-like-block">{{ instanceDetail.meta || '无' }}</div>
              </el-descriptions-item>
            </el-descriptions>
          </el-collapse-item>
        </el-collapse>
      </el-card>
    </div>

    <!-- 子实例历史 -->
    <template v-if="instanceDetail.subInstanceDetails && instanceDetail.subInstanceDetails.length > 0">
      <el-divider content-position="center">{{ $t("message.secondlyJobHistory") }}</el-divider>
      <div class="power-job-info" :style="{ width: fixedWidth ? fixedWidth + 'px' : '100%' }">
        <el-card shadow="never" class="info-card">
          <el-table :data="instanceDetail.subInstanceDetails" style="width: 100%" stripe>
            <el-table-column :show-overflow-tooltip="true" prop="subInstanceId" :label="$t('message.subInstanceId')" width="120" />
            <el-table-column :show-overflow-tooltip="true" prop="startTime" :label="$t('message.startTime')" width="160" />
            <el-table-column :show-overflow-tooltip="true" prop="finishedTime" :label="$t('message.finishedTime')" width="160" />
            <el-table-column :show-overflow-tooltip="true" :label="$t('message.status')" width="140">
              <template #default="scope">
                <el-tag :type="getStatusType(scope.row.status)" size="small" effect="light">
                  {{ common.translateInstanceStatus(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :show-overflow-tooltip="true" prop="result" :label="$t('message.result')" />
          </el-table>
        </el-card>
      </div>
    </template>

    <!-- MR任务 -->
    <template v-if="showQueriedTaskDetailInfoList">
      <el-divider content-position="center">{{ $t("message.queriedTaskDetailInfoList") }}</el-divider>
      <div class="power-job-info" :style="{ width: fixedWidth ? fixedWidth + 'px' : '100%' }">
        <div class="mr-query-bar mb-3">
          <el-input v-model="queryInstanceDetailRequest.customQuery">
            <template #prepend>select * from task_info where</template>
            <template #append>limit 10</template>
          </el-input>
          <el-button type="primary" @click="fetchInstanceDetail" class="ml-2">{{$t('message.query')}}</el-button>
        </div>
        
        <el-card shadow="never" class="info-card">
          <el-table :data="instanceDetail.queriedTaskDetailInfoList" style="width: 100%" stripe>
            <el-table-column :show-overflow-tooltip="true" prop="taskId" label="taskId" width="80" />
            <el-table-column :show-overflow-tooltip="true" prop="taskName" label="taskName" />
            <el-table-column :show-overflow-tooltip="true" prop="taskContent" label="taskContent" />
            <el-table-column :show-overflow-tooltip="true" prop="processorAddress" label="processorAddress" />
            <el-table-column :show-overflow-tooltip="true" prop="failedCnt" :label="$t('message.failedCnt')" width="80" />
            <el-table-column :show-overflow-tooltip="true" prop="statusStr" :label="$t('message.status')" width="80">
              <template #default="scope">
                <el-tag :type="getStatusType(scope.row.status)" size="small" effect="light">
                  {{ scope.row.statusStr }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :show-overflow-tooltip="true" prop="createdTimeStr" :label="$t('message.createdTime')" />
            <el-table-column :show-overflow-tooltip="true" prop="lastModifiedTimeStr" :label="$t('message.lastModifiedTime')" />
            <el-table-column :show-overflow-tooltip="true" prop="lastReportTimeStr" :label="$t('message.lastReportTime')" />
            <el-table-column :show-overflow-tooltip="true" prop="result" :label="$t('message.result')" />
          </el-table>
        </el-card>
      </div>
    </template>
  </div>
</template>

<script>
export default {
  name: "InstanceDetail",
  props: ["instanceId", "fixedWidth", "resultAll", "nodeDetail"],
  computed: {
    /** 高级信息面板是否展示：仅当业务外键、扩展数据、调度元信息至少有一项有值时才显示 */
    hasAdvancedInfo() {
      const d = this.instanceDetail || {};
      const has = (v) => v != null && String(v).trim() !== '';
      return has(d.outerKey) || has(d.extendValue) || has(d.meta);
    },
  },
  data() {
    return {
      activeNames: [], // 控制折叠面板
      instanceDetail: {
        queriedTaskDetailInfoList: undefined
      },
      showQueriedTaskDetailInfoList: false,
      queryInstanceDetailRequest: {
        instanceId: this.instanceId,
        customQuery: "status in (5, 6) order by last_modified_time desc"
      },
    };
  },
  methods: {
    fetchInstanceDetail() {
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
    // 状态颜色映射
    getStatusType(status) {
      // 1: 等待派发, 2: 等待Worker接收, 3: 运行中, 4: 失败, 5: 成功, 9: 取消, 10: 手动停止
      switch (status) {
        case 1:
          return 'warning';
        case 2:
          return 'primary';
        case 3:
          return '';
        case 4:
          return 'danger';
        case 5:
          return 'success';
        case 9:
          return 'info';
        case 10:
          return 'warning';
        default:
          return 'info';
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
.power-job-panel {
  width: 100%;
}

.power-job-info {
  padding: 5px;
  box-sizing: border-box;
}

/* 卡片样式优化 */
.info-card {
  border-radius: 8px;
  border: 1px solid #ebeef5;
  background-color: #fff;
  transition: .3s;
}

:deep(.info-card > .el-card__header) {
  padding: 10px 15px;
  background-color: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

:deep(.info-card > .el-card__body) {
  padding: 15px;
}

.section-title {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
}

/* 预格式化文本框 */
.code-like-block {
  background-color: #f8f9fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 10px;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 250px;
  overflow-y: auto;
}

/* 折叠面板样式优化 */
.collapse-card :deep(.el-card__body) {
  padding: 0 15px;
}

:deep(.el-collapse) {
  border-top: none;
  border-bottom: none;
}

:deep(.el-collapse-item__header) {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

:deep(.el-collapse-item:last-child .el-collapse-item__header) {
  border-bottom: none;
}
:deep(.el-collapse-item:last-child.is-active .el-collapse-item__header) {
  border-bottom: 1px solid #ebeef5;
}

.collapse-title {
  font-size: 14px;
  font-weight: bold;
}

/* 描述列表样式优化：全屏时 label 适中宽度 */
:deep(.el-descriptions__label) {
  width: 96px;
  min-width: 96px;
  justify-content: flex-end;
  color: #606266;
  font-weight: 500;
}

/* 侧边栏窄屏时缩小 label 以多留内容区 */
.power-job-panel.is-narrow :deep(.el-descriptions__label) {
  width: 72px;
  min-width: 72px;
}

:deep(.el-descriptions__content) {
  color: #303133;
}

/* 插槽容器 */
.slot-container {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px dashed #ebeef5;
}

/* 辅助类 */
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 15px; }
.mb-3 { margin-bottom: 15px; }
.ml-2 { margin-left: 8px; }

/* MR查询栏 */
.mr-query-bar {
  display: flex;
  align-items: center;
}
</style>
