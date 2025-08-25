<template>
  <div class="instance-manager">

    <!-- Tab Section -->
    <div class="tabs-section">
      <el-tabs type="card" v-model="instanceQueryContent.type" @tab-click="listInstanceInfos">
        <el-tab-pane :label="$t('message.normalInstance')" name="NORMAL" />
        <el-tab-pane :label="$t('message.wfInstance')" name="WORKFLOW" />
      </el-tabs>
    </div>

    <!-- Search Section -->
    <div class="pj-form-section" style="padding-top: 0; margin-top: 0;">
      <div class="search-container">
        <div class="search-form">
          <el-form :inline="true" :model="instanceQueryContent" class="el-form--inline">
            <el-form-item :label="$t('message.jobId')">
              <el-input 
                v-model="instanceQueryContent.jobId" 
                :placeholder="$t('message.jobId')" 
                clearable
                style="width: 180px;"
              />
            </el-form-item>
            <el-form-item :label="$t('message.instanceId')">
              <el-input
                v-model="instanceQueryContent.instanceId"
                :placeholder="$t('message.instanceId')"
                clearable
                style="width: 200px;"
              />
            </el-form-item>
            <el-form-item
              v-if="instanceQueryContent.type === 'WORKFLOW'"
              :label="$t('message.wfInstanceId')"
            >
              <el-input
                v-model="instanceQueryContent.wfInstanceId"
                :placeholder="$t('message.wfInstanceId')"
                clearable
                style="width: 200px;"
              />
            </el-form-item>
            <el-form-item :label="$t('message.status')">
              <el-select 
                v-model="instanceQueryContent.status" 
                :placeholder="$t('message.status')"
                clearable
                style="width: 140px;"
              >
                <el-option
                  v-for="item in instanceStatusOptions"
                  :key="item.key"
                  :label="item.label"
                  :value="item.key"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </div>
        
        <div class="action-buttons">
          <el-button @click="onClickRest">{{$t('message.reset')}}</el-button>
          <el-button type="primary" @click="listInstanceInfos">
            <el-icon class="mr-1"><Search /></el-icon>
            {{$t('message.query')}}
          </el-button>
          <el-button type="info" @click="listInstanceInfos">
            <el-icon class="mr-1"><Refresh /></el-icon>
            {{$t('message.refresh')}}
          </el-button>
        </div>
      </div>
    </div>

    <!-- Table Section -->
    <div class="pj-table" style="margin-top: var(--pj-space-sm);">
      <el-table
        :data="instancePageResult.data"
        style="width: 100%"
        :row-class-name="instanceTableRowClassName"
        stripe
      >
        <el-table-column :show-overflow-tooltip="true" prop="jobId" :label="$t('message.jobId')" width="80" />
        <el-table-column :show-overflow-tooltip="true" prop="jobName" :label="$t('message.jobName')" min-width="120" />
        <el-table-column
          v-if="instanceQueryContent.type === 'WORKFLOW'"
          :show-overflow-tooltip="true"
          prop="wfInstanceId"
          :label="$t('message.wfInstanceId')"
          width="180"
        />
        <el-table-column :show-overflow-tooltip="true" prop="instanceId" :label="$t('message.instanceId')" width="200" />
        <el-table-column prop="status" :label="$t('message.status')" width="100">
          <template #default="scope">{{fetchStatus(scope.row.status)}}</template>
        </el-table-column>
        <el-table-column  prop="actualTriggerTime" :label="$t('message.triggerTime')" width="160"/>
        <el-table-column  prop="finishedTime" :label="$t('message.finishedTime')" width="160"/>

        <el-table-column :label="$t('message.operation')" width="220" fixed="right">
          <template #default="scope">
            <div class="operation-buttons-group">
              <el-button
                size="small"
                type="primary"
                @click="onClickShowDetail(scope.row)"
              >{{$t('message.detail')}}</el-button>
              <el-button
                size="small"
                type="success"
                @click="onClickShowLog(scope.row)"
              >{{$t('message.log')}}</el-button>
              <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, scope.row)">
                <el-button size="small" type="info">
                  更多<el-icon class="ml-1"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="retry">
                      <span style="color: var(--pj-warning);">{{$t('message.reRun')}}</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="stop" divided>
                      <span style="color: var(--pj-error);">{{$t('message.stop')}}</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Pagination Section -->
    <div class="pagination-container">
      <el-pagination
        :total="this.instancePageResult.totalItems"
        :page-size="this.instancePageResult.pageSize"
        :current-page="this.instanceQueryContent.index + 1"
        @current-change="onClickChangeInstancePage"
        @size-change="handleSizeChange"
        layout="total, sizes, prev, pager, next, jumper"
        :page-sizes="[10, 20, 50, 100]"
        :hide-on-single-page="false"
        background
      />
    </div>

    <!--  任务实例详情弹出框 -->
    <el-dialog v-model="instanceDetailVisible" v-if="instanceDetailVisible" width="80%">
      <div class="power-instance-detail-log">
        <InstanceDetail :instance-id="currentInstanceId" :resultAll="true" />
      </div>
    </el-dialog>

    <!-- 任务运行日志弹出框 -->
    <el-dialog v-model="instanceLogVisible" width="80%">
      <el-row>
          <el-col :span="24" class="power-instance-log-download" style="margin-bottom:20px">
            <el-button
              type="primary"
              size="mini"
              @click="onclickDownloadLog()"
              icon="el-icon-download"
            >{{$t('message.download')}}</el-button>
          </el-col>
        </el-row>
      <div class="power-instance-log-dialog">
        <el-row>
          <el-col :span="24">
            <h4 style="white-space: pre-line;">{{this.paginableInstanceLog.data}}</h4>
          </el-col>
        </el-row>
      </div>
      <el-row>
          <el-col :span="24">
            <el-pagination
              :page-count="paginableInstanceLog.totalPages"
              @current-change="onClickChangeLogPage"
              layout="prev, pager, next"
            />
          </el-col>
        </el-row>
    </el-dialog>
  </div>
</template>

<script>
import InstanceDetail from "../common/InstanceDetail";
import { ElMessage } from 'element-plus';
import { ArrowDown, Search, Refresh } from '@element-plus/icons-vue';
export default {
  name: "InstanceManager",
  components: {
    InstanceDetail,
    ArrowDown,
    Search,
    Refresh
  },
  data() {
    return {
      // 实例查询对象
      instanceQueryContent: {
        appId: window.localStorage.getItem("Power_appId"),
        index: 0,
        pageSize: 10,
        instanceId: undefined,
        wfInstanceId: undefined,
        status: "",
        jobId: undefined,
        type: "NORMAL"
      },
      // 实例查询结果
      instancePageResult: {
        pageSize: 10,
        totalItems: 0,
        data: []
      },
      // 详细信息弹出框是否可见
      instanceDetailVisible: false,
      // 日志查询对象
      logQueryContent: {
        instanceId: undefined,
        index: 0
      },
      // 日志对象
      paginableInstanceLog: {
        index: 0,
        totalPages: 0,
        data: ""
      },
      // 日志弹出框是否可见
      instanceLogVisible: false,
      currentInstanceId: undefined,
      // 任务实例状态选择
      instanceStatusOptions: [
        { key: "", label: this.$t("message.all") },
        { key: "WAITING_DISPATCH", label: this.$t("message.waitingDispatch") },
        {
          key: "WAITING_WORKER_RECEIVE",
          label: this.$t("message.waitingWorkerReceive")
        },
        { key: "RUNNING", label: this.$t("message.running") },
        { key: "FAILED", label: this.$t("message.failed") },
        { key: "SUCCEED", label: this.$t("message.success") },
        { key: "CANCELED", label: this.$t("message.canceled") },
        { key: "STOPPED", label: this.$t("message.stopped") }
      ]
    };
  },
  methods: {
    // 查询任务实例信息
    listInstanceInfos() {
      let that = this;
      that.axios.post("/instance/list", that.instanceQueryContent).then(res => {
        that.instancePageResult = res;
      });
    },
    // 点击重置按钮
    onClickRest() {
      this.instanceQueryContent.jobId = undefined;
      this.instanceQueryContent.instanceId = undefined;
      this.instanceQueryContent.wfInstanceId = undefined;
      this.instanceQueryContent.status = "";
      this.listInstanceInfos();
    },
    // 点击查询详情
    onClickShowDetail(data) {
      this.instanceDetailVisible = true;
      this.currentInstanceId = data.instanceId;
    },
    // 点击重跑
    onClickRetryJob(data) {
      let that = this;
      let url =
        "/instance/retry?instanceId=" +
        data.instanceId +
        "&appId=" +
          window.localStorage.getItem("Power_appId");
      this.axios.get(url).then(() => {
        ElMessage.success(this.$t("message.success"));
        that.listInstanceInfos();
      });
    },
    // 点击停止实例
    onClickStop(data) {
      let that = this;
      let url = "/instance/stop?instanceId=" +
          data.instanceId +
          "&appId=" +
          window.localStorage.getItem("Power_appId");
      this.axios.get(url).then(() => {
        ElMessage.success(this.$t("message.success"));
        // 重新加载列表
        that.listInstanceInfos();
      });
    },
    // 换页
    onClickChangeInstancePage(index) {
      // 后端从0开始，前端从1开始
      this.instanceQueryContent.index = index - 1;
      this.listInstanceInfos();
    },
    // 改变页面大小
    handleSizeChange(newSize) {
      this.instanceQueryContent.pageSize = newSize;
      this.instanceQueryContent.index = 0;
      this.listInstanceInfos();
    },
    instanceTableRowClassName({ row }) {
      switch (row.status) {
        // 等待派发
        case 1:
          return "waiting-dispatch-row";
        // 等待Worker接收  
        case 2:
          return "waiting-worker-row";
        // 运行中
        case 3:
          return "running-row";
        // 失败
        case 4:
          return "failed-row";
        // 成功
        case 5:
          return "success-row";
        // 取消
        case 9:
          return "canceled-row";
        // 手动停止
        case 10:
          return "stopped-row";
        default:
          return "";
      }
    },
    // 查看日志
    queryLog() {
      let that = this;
      let url =
        "/instance/log?instanceId=" +
        this.logQueryContent.instanceId +
        "&index=" +
        this.logQueryContent.index +
        "&appId=" +
          window.localStorage.getItem("Power_appId");
      this.axios.get(url).then(res => {
        that.paginableInstanceLog = res;
        that.instanceLogVisible = true;
      });
    },
    // 查看在线日志
    onClickShowLog(data) {
      this.logQueryContent.instanceId = data.instanceId;
      this.logQueryContent.index = 0;
      this.queryLog();
    },
    // 查看其它页的在线日志
    onClickChangeLogPage(index) {
      this.logQueryContent.index = index - 1;
      this.queryLog();
    },
    // 下载日志
    onclickDownloadLog() {
      let url =
        "/instance/downloadLogUrl?instanceId=" +
        this.logQueryContent.instanceId +
        "&appId=" +
        window.localStorage.getItem("Power_appId");
      this.axios.get(url).then(res => window.open(res));
    },
    // 获取状态
    fetchStatus(s) {
      return this.common.translateInstanceStatus(s);
    },
    // 处理下拉菜单命令
    handleCommand(command, row) {
      switch (command) {
        case 'retry':
          this.onClickRetryJob(row);
          break;
        case 'stop':
          this.$confirm(this.$t('message.confirmStop'), this.$t('message.warning'), {
            confirmButtonText: this.$t('message.confirm'),
            cancelButtonText: this.$t('message.cancel'),
            type: 'warning'
          }).then(() => {
            this.onClickStop(row);
          });
          break;
      }
    }
  },
  mounted() {
    // 读取传递的参数
    let jobId = this.$route.params.jobId;
    if (jobId !== undefined) {
      this.instanceQueryContent.jobId = jobId;
    }

    this.listInstanceInfos();
  }
};
</script>

<style scoped>
.title {
  display: inline-block;
  margin: 5px 0;
  font-size: 16px;
  font-weight: bold;
}
.power-instance-log-download {
  display: flex;
  justify-content: flex-end;
}
.power-instance-log-dialog {
  max-height: 400px;
  overflow-y: scroll;
}
.power-instance-detail-log {
  max-height: 500px;
  overflow-y: scroll;
}

/* Modern Instance Manager Styles */
.instance-manager {
  padding: 0;
  background: transparent;
}

/* Compact spacing */
:deep(.pj-form-section) {
  margin-bottom: var(--pj-space-sm) !important;
  padding: var(--pj-space-sm) !important;
}

/* Search Section */
.search-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: var(--pj-space-lg);
}

.search-form {
  flex: 1;
  min-width: 500px;
}

.search-form :deep(.el-form--inline .el-form-item) {
  margin-bottom: var(--pj-space-xs);
}

.action-buttons {
  display: flex;
  gap: var(--pj-space-sm);
  flex-shrink: 0;
}

/* Tabs Section */
.tabs-section {
  margin: var(--pj-space-sm) 0 var(--pj-space-xs);
}

.tabs-section :deep(.el-tabs__header) {
  margin-bottom: var(--pj-space-xs);
}

.tabs-section :deep(.el-tabs__nav) {
  border: 1px solid #e4e7ed;
  border-radius: var(--pj-radius-lg);
  padding: 2px;
  background: #f5f7fa;
}

.tabs-section :deep(.el-tabs__item) {
  border-radius: var(--pj-radius-sm);
  transition: all 0.3s ease;
  
  &.is-active {
    background: var(--pj-bg-white);
    color: var(--pj-primary);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
}

/* Pagination */
.pagination-container {
  display: flex;
  justify-content: center;
  padding: var(--pj-space-lg) 0;
  background: var(--pj-bg-white);
  border-radius: var(--pj-radius-lg);
  margin-top: var(--pj-space-md);
  box-shadow: var(--pj-shadow-card);
}

/* Utility Classes */
.mr-1 {
  margin-right: var(--pj-space-xs);
}

/* Operation Buttons Group */
.operation-buttons-group {
  display: flex;
  align-items: center;
  gap: var(--pj-space-xs, 6px);
  flex-wrap: nowrap;
  white-space: nowrap;
  justify-content: center;
}

.operation-buttons-group .el-button {
  margin: 0;
  padding: 4px 10px;
  border-radius: var(--pj-radius-sm, 4px);
  font-size: 12px;
  min-width: auto;
  font-weight: 500;
  transition: all 0.3s ease;
}

.operation-buttons-group .el-button + .el-button {
  margin-left: 0;
}

.operation-buttons-group .el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Utility class for margin-left */
.ml-1 {
  margin-left: var(--pj-space-xs, 4px);
}

/* Enhanced table styling */
:deep(.el-table) {
  .el-table__fixed-right {
    box-shadow: -1px 0 8px rgba(0, 0, 0, 0.1);
  }
}

/* Dropdown menu styling */
:deep(.el-dropdown-menu) {
  .el-dropdown-menu__item {
    padding: 8px 16px;
    
    &:hover {
      background: var(--pj-bg-hover, #f5f5f5);
    }
  }
}

/* Responsive design for operation buttons */
@media (max-width: 1200px) {
  .operation-buttons-group {
    justify-content: flex-start;
    gap: 2px;
  }
}

@media (max-width: 768px) {
  .operation-buttons-group {
    flex-wrap: wrap;
    gap: 2px;
  }
  
  .operation-buttons-group .el-button {
    font-size: 11px;
    padding: 2px 6px;
  }
}
</style>
