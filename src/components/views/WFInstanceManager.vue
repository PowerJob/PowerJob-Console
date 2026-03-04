<template>
  <div class="wf-instance-manager pj-management-page">

    <!-- Search Section -->
    <div class="pj-form-section" style="padding-top: 0; margin-top: 0;">
      <div class="search-container">
        <div class="search-form">
          <el-form :inline="true" :model="wfInstanceQueryContent" class="el-form--inline">
            <el-form-item :label="$t('message.wfId')">
              <el-input
                v-model="wfInstanceQueryContent.workflowId"
                :placeholder="$t('message.wfId')"
                clearable
                style="width: 180px;"
              />
            </el-form-item>

            <el-form-item :label="$t('message.wfInstanceId')">
              <el-input
                v-model="wfInstanceQueryContent.wfInstanceId"
                :placeholder="$t('message.wfInstanceId')"
                clearable
                style="width: 200px;"
              />
            </el-form-item>

            <el-form-item :label="$t('message.status')">
              <el-select 
                v-model="wfInstanceQueryContent.status" 
                :placeholder="$t('message.status')"
                clearable
                style="width: 140px;"
              >
                <el-option
                  v-for="item in wfInstanceStatusOptions"
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
          <el-button type="primary" @click="listWfInstances">
            <el-icon class="mr-1"><Search /></el-icon>
            {{$t('message.query')}}
          </el-button>
          <el-button type="info" @click="listWfInstances">
            <el-icon class="mr-1"><Refresh /></el-icon>
            {{$t('message.refresh')}}
          </el-button>
        </div>
      </div>
    </div>

    <!-- Table Section -->
    <div class="pj-table" style="margin-top: var(--pj-space-sm);">
      <el-table
        :data="wfInstancePageResult.data"
        style="width: 100%"
        :row-class-name="wfInstanceTableRowClassName"
        stripe
      >
        <el-table-column :show-overflow-tooltip="true" prop="workflowId" :label="$t('message.wfId')" width="200" />
        <el-table-column :show-overflow-tooltip="true" prop="workflowName" :label="$t('message.wfName')" min-width="84" />
        <el-table-column :show-overflow-tooltip="true" prop="wfInstanceId" :label="$t('message.wfInstanceId')" width="200" />
        <el-table-column prop="status" :label="$t('message.status')" width="100">
          <template #default="scope">
            {{fetchWFStatus(scope.row.status)}}
          </template>
        </el-table-column>
        <el-table-column prop="actualTriggerTime" :label="$t('message.triggerTime')" width="176" />
        <el-table-column prop="finishedTime" :label="$t('message.finishedTime')" width="176" />

        <el-table-column :label="$t('message.operation')" width="220" align="center" fixed="right">
          <template #default="scope">
            <div class="operation-buttons-group">
              <el-button
                size="small"
                type="primary"
                @click="onClickShowDetail(scope.row)"
              >{{$t('message.detail')}}</el-button>
              <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, scope.row)">
                <el-button size="small" type="info">
                  更多<el-icon class="ml-1"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="restart">
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
        :total="this.wfInstancePageResult.totalItems"
        :page-size="this.wfInstancePageResult.pageSize"
        :current-page="this.wfInstanceQueryContent.index + 1"
        @current-change="onClickChangeInstancePage"
        @size-change="handleSizeChange"
        layout="total, sizes, prev, pager, next, jumper"
        :page-sizes="[10, 20, 50, 100]"
        :hide-on-single-page="false"
        background
      />
    </div>
  </div>
</template>

<script>
import { ElMessage } from 'element-plus';
import { ArrowDown, Search, Refresh } from '@element-plus/icons-vue';
export default {
  name: "WFInstanceManager",
  components: {
    ArrowDown,
    Search,
    Refresh
  },
  data() {
    return {
      // 查询条件
      wfInstanceQueryContent: {
        appId: window.localStorage.getItem("Power_appId"),
        index: 0,
        pageSize: 10,
        wfInstanceId: undefined,
        workflowId: undefined,
        status: ""
      },
      // 查询结果
      wfInstancePageResult: {
        pageSize: 10,
        totalItems: 0,
        data: [],
      },
      // 工作流实例状态选择
      wfInstanceStatusOptions: [
        {key: "", label: this.$t('message.all')},
        {key: "WAITING", label: this.$t('message.waitingDispatch')},
        {key: "RUNNING", label: this.$t('message.running')},
        {key: "FAILED", label: this.$t('message.failed')},
        {key: "SUCCEED", label: this.$t('message.success')},
        {key: "STOPPED", label: this.$t('message.stopped')}
      ]
    };
  },
  methods: {
    listWfInstances() {
      let that = this;
      this.axios
        .post("/wfInstance/list", this.wfInstanceQueryContent)
        .then((res) => (that.wfInstancePageResult = res));
    },
    // 重置搜索条件
    onClickRest() {
      this.wfInstanceQueryContent.wfInstanceId = undefined;
      this.wfInstanceQueryContent.workflowId = undefined;
      this.wfInstanceQueryContent.status = "";
      this.listWfInstances();
    },
    // 查看工作流详情
    onClickShowDetail(data) {
      this.$router.push(`/oms/wfInstanceDetail/${data.wfInstanceId}`)
    },

    // 停止工作流
    onClickStop(data) {
      let that = this;
      let url =
        "/wfInstance/stop?wfInstanceId=" +
        data.wfInstanceId +
        "&appId=" +
        window.localStorage.getItem("Power_appId");
      this.axios.get(url).then(() => {
        ElMessage.success(this.$t('message.success'));
        // 重新加载列表
        that.listWfInstances();
      });
    },
    // 换页
    onClickChangeInstancePage(index) {
      // 后端从0开始，前端从1开始
      this.wfInstanceQueryContent.index = index - 1;
      this.listWfInstances();
    },
    // 表单颜色
    wfInstanceTableRowClassName({ row }) {
      switch (row.status) {
        // 等待派发
        case 1:
          return "waiting-dispatch-row";
        // 运行中
        case 2:
          return "running-row";
        // 失败
        case 3:
          return "failed-row";
        // 成功
        case 4:
          return "success-row";
        // 停止
        case 5:
          return "stopped-row";
        default:
          return "";
      }
    },
    fetchWFStatus(status) {
      return this.common.translateWfInstanceStatus(status);
    },
    // 重试
    async restart(row) {
      const data = {
          appId: this.wfInstanceQueryContent.appId,
          wfInstanceId: row.wfInstanceId,
      };
      await this.axios.get('/wfInstance/retry', {
        params: data
      });
      this.listWfInstances();
    },
    // 改变页面大小
    handleSizeChange(newSize) {
      this.wfInstanceQueryContent.pageSize = newSize;
      this.wfInstanceQueryContent.index = 0;
      this.listWfInstances();
    },
    // 处理下拉菜单命令
    handleCommand(command, row) {
      switch (command) {
        case 'restart':
          this.restart(row);
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
    },
  },
  mounted() {
    this.listWfInstances();
  },
};
</script>

<style scoped lang="scss">
@import '../../styles/management-pages.scss';

/* 工作流实例页（表格/搜索/分页等已抽到 management-pages.scss） */
.wf-instance-manager {
  padding: 0;
  background: transparent;
}

/* 工作流实例状态行字体颜色样式 */
:deep(.el-table .waiting-dispatch-row) {
  color: #ea580c !important;  /* 橙色 - 等待派发 */
  font-weight: 500;
}

:deep(.el-table .running-row) {
  color: #0891b2 !important;  /* 青色 - 运行中 */
  font-weight: 600;
  animation: pulse-text 2s infinite;
}

:deep(.el-table .success-row) {
  color: #16a34a !important;  /* 绿色 - 成功 */
  font-weight: 600;
}

:deep(.el-table .failed-row) {
  color: #dc2626 !important;  /* 红色 - 失败 */
  font-weight: 600;
}

:deep(.el-table .stopped-row) {
  color: #d97706 !important;  /* 黄色 - 停止 */
  font-weight: 500;
}

/* 运行中状态的文字闪烁动画效果 */
@keyframes pulse-text {
  0% {
    color: #0891b2;
    opacity: 1;
  }
  50% {
    color: #0284c7;
    opacity: 0.8;
  }
  100% {
    color: #0891b2;
    opacity: 1;
  }
}
</style>
