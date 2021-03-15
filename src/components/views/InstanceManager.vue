<template>
  <div id="instance_manager">
    <!-- 第一行，搜索区 -->
    <el-row>
      <el-col :span="22">
        <el-form :inline="true" :model="instanceQueryContent" class="el-form--inline">
          <el-form-item :label="$t('message.jobId')">
            <el-input v-model="instanceQueryContent.jobId" :placeholder="$t('message.jobId')" />
          </el-form-item>
          <el-form-item :label="$t('message.instanceId')">
            <el-input
              v-model="instanceQueryContent.instanceId"
              :placeholder="$t('message.instanceId')"
            />
          </el-form-item>
          <el-form-item
            v-if="instanceQueryContent.type === 'WORKFLOW'"
            :label="$t('message.wfInstanceId')"
          >
            <el-input
              v-model="instanceQueryContent.wfInstanceId"
              :placeholder="$t('message.wfInstanceId')"
            />
          </el-form-item>
          <el-form-item :label="$t('message.status')">
            <el-select v-model="instanceQueryContent.status" :placeholder="$t('message.status')">
              <el-option
                v-for="item in instanceStatusOptions"
                :key="item.key"
                :label="item.label"
                :value="item.key"
              ></el-option>
            </el-select>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="listInstanceInfos">{{$t('message.query')}}</el-button>
            <el-button type="cancel" @click="onClickRest">{{$t('message.reset')}}</el-button>
          </el-form-item>
        </el-form>
      </el-col>
      <el-col :span="2">
        <div style="float:right;padding-right:10px">
          <el-button type="primary" @click="listInstanceInfos">{{$t('message.refresh')}}</el-button>
        </div>
      </el-col>
    </el-row>

    <!-- 第二行，切换器 -->
    <el-tabs type="card" v-model="instanceQueryContent.type" @tab-click="listInstanceInfos">
      <el-tab-pane :label="$t('message.normalInstance')" name="NORMAL" />
      <el-tab-pane :label="$t('message.wfInstance')" name="WORKFLOW" />
    </el-tabs>

    <!-- 第三行，表单 -->
    <el-row>
      <el-table
        :data="instancePageResult.data"
        style="width: 100%"
        :row-class-name="instanceTableRowClassName"
      >
        <el-table-column :show-overflow-tooltip="true" prop="jobId" :label="$t('message.jobId')" width="80" />
        <el-table-column :show-overflow-tooltip="true" prop="jobName" :label="$t('message.jobName')" />
        <el-table-column
          v-if="instanceQueryContent.type === 'WORKFLOW'"
          :show-overflow-tooltip="true"
          prop="wfInstanceId"
          :label="$t('message.wfInstanceId')"
          width="155"
        />
        <el-table-column :show-overflow-tooltip="true" prop="instanceId" :label="$t('message.instanceId')" />
        <el-table-column prop="status" :label="$t('message.status')" width="160">
          <template slot-scope="scope">{{fetchStatus(scope.row.status)}}</template>
        </el-table-column>
        <el-table-column  prop="actualTriggerTime" :label="$t('message.triggerTime')" width="150"/>
        <el-table-column  prop="finishedTime" :label="$t('message.finishedTime')" width="150"/>

        <el-table-column :label="$t('message.operation')" width="285">
          <template slot-scope="scope">
            <el-button
              size="mini"
              type="primary"
              @click="onClickShowDetail(scope.row)"
            >{{$t('message.detail')}}</el-button>
            <el-button
              size="mini"
              type="success"
              @click="onClickShowLog(scope.row)"
            >{{$t('message.log')}}</el-button>
            <el-button
              size="mini"
              type="warning"
              @click="onClickRetryJob(scope.row)"
            >{{$t('message.reRun')}}</el-button>
            <el-button
              size="mini"
              type="danger"
              @click="onClickStop(scope.row)"
            >{{$t('message.stop')}}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-row>

    <!-- 第四行，分页插件 -->
    <el-row>
      <el-col :span="24">
        <el-pagination
          :total="this.instancePageResult.totalItems"
          :page-size="this.instancePageResult.pageSize"
          @current-change="onClickChangeInstancePage"
          layout="prev, pager, next"
        />
      </el-col>
    </el-row>

    <!--  任务实例详情弹出框 -->
    <el-dialog :visible.sync="instanceDetailVisible" v-if="instanceDetailVisible" width="80%">
      <div class="power-instance-detail-log">
        <InstanceDetail :instance-id="currentInstanceId" :resultAll="true" />
      </div>
    </el-dialog>

    <!-- 任务运行日志弹出框 -->
    <el-dialog :visible.sync="instanceLogVisible" width="80%">
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
export default {
  name: "InstanceManager",
  components: {
    InstanceDetail
  },
  data() {
    return {
      // 实例查询对象
      instanceQueryContent: {
        appId: this.$store.state.appInfo.id,
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
        that.$store.state.appInfo.id;
      this.axios.get(url).then(() => {
        that.$message.success(this.$t("message.success"));
        that.listInstanceInfos();
      });
    },
    // 点击停止实例
    onClickStop(data) {
      let that = this;
      let url = "/instance/stop?instanceId=" +
          data.instanceId +
          "&appId=" +
          that.$store.state.appInfo.id;
      this.axios.get(url).then(() => {
        that.$message.success(this.$t("message.success"));
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
    instanceTableRowClassName({ row }) {
      switch (row.status) {
        // 失败
        case 4:
          return "error-row";
        // 成功
        case 5:
          return "success-row";
        case 9:
        case 10:
          return "warning-row";
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
        that.$store.state.appInfo.id;
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
        this.$store.state.appInfo.id;
      this.axios.get(url).then(res => window.open(res));
    },
    // 获取状态
    fetchStatus(s) {
      return this.common.translateInstanceStatus(s);
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
</style>
