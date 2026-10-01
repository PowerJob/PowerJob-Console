<template>
  <div id="instance_manager" class="list-page">
    <div class="page-heading list-heading"><div><h1>{{$t('message.tabJobInstance')}}</h1><p>{{$t('message.instancesDescription')}}</p></div><el-button :loading="listLoading" @click="listInstanceInfos"><PjIcon name="refresh"/>{{$t('message.refresh')}}</el-button></div>
    <div class="list-toolbar">
        <el-form :inline="true" :model="instanceQueryContent" class="filter-form">
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

          <el-form-item class="filter-actions">
            <el-button type="primary" @click="searchInstances">{{$t('message.query')}}</el-button>
            <el-button type="default" @click="onClickRest">{{$t('message.reset')}}</el-button>
          </el-form-item>
        </el-form>
    </div>

    <section class="list-surface">
    <!-- 第二行，切换器 -->
    <el-tabs class="instance-tabs" v-model="instanceQueryContent.type" @tab-change="changeInstanceTab">
      <el-tab-pane :label="$t('message.normalInstance')" name="NORMAL" />
      <el-tab-pane :label="$t('message.wfInstance')" name="WORKFLOW" />
    </el-tabs>

    <!-- 第三行，表单 -->
      <el-table
        v-loading="listLoading" :data="instancePageResult.data"
        style="width: 100%"
        :row-class-name="instanceTableRowClassName"
      >
        <el-table-column :show-overflow-tooltip="true" prop="jobId" :label="$t('message.jobId')" width="80" />
        <el-table-column :show-overflow-tooltip="true" prop="jobName" :label="$t('message.jobName')"  min-width="170"/>
        <el-table-column
          v-if="instanceQueryContent.type === 'WORKFLOW'"
          :show-overflow-tooltip="true"
          prop="wfInstanceId"
          :label="$t('message.wfInstanceId')"
          width="155"
        />
        <el-table-column :show-overflow-tooltip="true" prop="instanceId" :label="$t('message.instanceId')"  min-width="190"/>
        <el-table-column prop="status" :label="$t('message.status')" width="160">
          <template #default="scope">{{fetchStatus(scope.row.status)}}</template>
        </el-table-column>
        <el-table-column  prop="actualTriggerTime" :label="$t('message.triggerTime')" width="150"/>
        <el-table-column  prop="finishedTime" :label="$t('message.finishedTime')" width="150"/>

        <el-table-column :label="$t('message.operation')" width="285">
          <template #default="scope">
            <el-button link
              size="small"
              type="primary"
              @click="onClickShowDetail(scope.row)"
            >{{$t('message.detail')}}</el-button>
            <el-button link
              size="small"
              type="success"
              @click="onClickShowLog(scope.row)"
            >{{$t('message.log')}}</el-button>
            <el-button link
              size="small"
              type="warning"
              @click="onClickRetryJob(scope.row)"
            >{{$t('message.reRun')}}</el-button>
            <el-button link
              size="small"
              type="danger"
              @click="onClickStop(scope.row)"
            >{{$t('message.stop')}}</el-button>
          </template>
        </el-table-column>
      </el-table>

    <div class="list-footer">
        <el-pagination
          :total="instancePageResult.totalItems"
          :page-size="instancePageResult.pageSize"
          @current-change="onClickChangeInstancePage"
          layout="total, prev, pager, next" :current-page="instanceQueryContent.index + 1"
        />
    </div>
    </section>

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
              size="small"
              @click="onclickDownloadLog()"

            >{{$t('message.download')}}</el-button>
          </el-col>
        </el-row>
      <div class="power-instance-log-dialog">
        <el-row>
          <el-col :span="24">
            <pre class="log-output">{{this.paginableInstanceLog.data}}</pre>
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
import { downloadInstanceLog } from '../dag/instance-log.js';
import InstanceDetail from "../common/InstanceDetail.vue";
export default {
  name: "InstanceManager",
  components: {
    InstanceDetail
  },
  data() {
    return {
      listGeneration: 0, listLoading: false,
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
    searchInstances() { this.instanceQueryContent.index = 0; return this.listInstanceInfos(); },
    changeInstanceTab() { this.instanceQueryContent.index = 0; this.listInstanceInfos(); },
    // 查询任务实例信息
    async listInstanceInfos() {
      const generation = ++this.listGeneration; this.listLoading = true;
      try { const response = await this.axios.post('/instance/list', { ...this.instanceQueryContent }); if (generation === this.listGeneration) this.instancePageResult = response; } catch { /* Keep the last loaded page for retry. */ } finally { if (generation === this.listGeneration) this.listLoading = false; }
    },
    // 点击重置按钮
    onClickRest() {
      this.instanceQueryContent.index = 0;
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
        that.$message.success(this.$t("message.success"));
        that.listInstanceInfos();
      }).catch(() => {});
    },
    // 点击停止实例
    async onClickStop(data) {
      try { await this.$confirm(this.$t('message.stopConfirmation', { id: data.instanceId }), this.$t('message.confirmTitle'), { type: 'warning' }); } catch { return; }
      let that = this;
      let url = "/instance/stop?instanceId=" +
          data.instanceId +
          "&appId=" +
          window.localStorage.getItem("Power_appId");
      this.axios.get(url).then(() => {
        that.$message.success(this.$t("message.success"));
        // 重新加载列表
        that.listInstanceInfos();
      }).catch(() => {});
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
          window.localStorage.getItem("Power_appId");
      this.axios.get(url).then(res => {
        that.paginableInstanceLog = res;
        that.instanceLogVisible = true;
      }).catch(() => {});
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
    async onclickDownloadLog() {
      try { await downloadInstanceLog(this.axios, this.logQueryContent.instanceId); } catch (error) { this.$message.error(error.message); }
    },
    // 获取状态
    fetchStatus(s) {
      return this.common.translateInstanceStatus(s);
    }
  },
  watch: {
    '$route.query.jobId'(jobId) {
      this.instanceQueryContent.jobId = jobId;
      this.instanceQueryContent.index = 0;
      this.listInstanceInfos();
    }
  },
  mounted() {
    // 读取传递的参数
    let jobId = this.$route.query.jobId;
    if (jobId !== undefined) {
      this.instanceQueryContent.jobId = jobId;
    }

    this.listInstanceInfos();
  },
  beforeUnmount() { this.listGeneration++ },
};
</script>

<style scoped src="./page-layout.css"></style>
<style scoped>
.log-output { white-space: pre-wrap; overflow-wrap:anywhere; background:var(--pj-log-bg); color:var(--pj-log-text); padding:16px; border-radius:4px; font:12px/1.8 ui-monospace,SFMono-Regular,monospace; }
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
