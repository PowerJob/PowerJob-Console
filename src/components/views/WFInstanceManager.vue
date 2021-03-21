<template>
  <div id="wf_instance_manager">
    <!-- 第一行，搜索区 -->
    <el-row>
      <el-col :span="20">
        <el-form
          :inline="true"
          :model="wfInstanceQueryContent"
          class="el-form--inline">

          <el-form-item :label="$t('message.wfId')">
            <el-input
                    v-model="wfInstanceQueryContent.workflowId"
                    :placeholder="$t('message.wfId')"
            />
          </el-form-item>

          <el-form-item :label="$t('message.wfInstanceId')">
            <el-input
              v-model="wfInstanceQueryContent.wfInstanceId"
              :placeholder="$t('message.wfInstanceId')"
            />
          </el-form-item>

          <el-form-item :label="$t('message.status')">
            <el-select v-model="wfInstanceQueryContent.status" :placeholder="$t('message.status')">
              <el-option
                      v-for="item in wfInstanceStatusOptions"
                      :key="item.key"
                      :label="item.label"
                      :value="item.key">
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="listWfInstances">{{$t('message.query')}}</el-button>
            <el-button type="cancel" @click="onClickRest">{{$t('message.reset')}}</el-button>
          </el-form-item>
        </el-form>
      </el-col>
      <el-col :span="4">
        <div style="float:right;padding-right:10px">
          <el-button type="primary" @click="listWfInstances"
            >{{$t('message.refresh')}}</el-button
          >
        </div>
      </el-col>
    </el-row>

    <!-- 第二行，表单 -->
    <el-row>
      <el-table
        :data="wfInstancePageResult.data"
        
        style="width: 100%"
        :row-class-name="wfInstanceTableRowClassName"
      >
        <el-table-column :show-overflow-tooltip="true" prop="workflowId" :label="$t('message.wfId')" width="110" />
        <el-table-column :show-overflow-tooltip="true" prop="workflowName" :label="$t('message.wfName')" />
        <el-table-column :show-overflow-tooltip="true" prop="wfInstanceId" :label="$t('message.wfInstanceId')" />
        <el-table-column :show-overflow-tooltip="true" prop="status" :label="$t('message.status')" width="160">
          <template slot-scope="scope">
            {{fetchWFStatus(scope.row.status)}}
          </template>
        </el-table-column>
        <el-table-column :show-overflow-tooltip="true" prop="actualTriggerTime" :label="$t('message.triggerTime')" />
        <el-table-column :show-overflow-tooltip="true" prop="finishedTime" :label="$t('message.finishedTime')" />

        <el-table-column :show-overflow-tooltip="true" :label="$t('message.operation')" width="225">
          <template slot-scope="scope">
            <el-button type="primary" size="mini" @click="onClickShowDetail(scope.row)"
              >{{$t('message.detail')}}</el-button
            >
            <el-button type="danger" size="mini" @click="onClickStop(scope.row)"
              >{{$t('message.stop')}}</el-button
            >
            <el-button type="warning" size="mini" @click="restart(scope.row)"
              >{{$t('message.reRun')}}</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </el-row>

    <!-- 第三行，分页插件 -->
    <el-row>
      <el-col :span="24">
        <el-pagination
          :total="this.wfInstancePageResult.totalItems"
          :page-size="this.wfInstancePageResult.pageSize"
          @current-change="onClickChangeInstancePage"
          layout="prev, pager, next"
        />
      </el-col>
    </el-row>
  </div>
</template>

<script>
export default {
  name: "WFInstanceManager",
  data() {
    return {
      // 查询条件
      wfInstanceQueryContent: {
        appId: this.$store.state.appInfo.id,
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
      this.$router.push({
        name: 'WorkflowInstanceDetail',
        params: {
          wfInstanceId: data.wfInstanceId
        }
      })
    },

    // 停止工作流
    onClickStop(data) {
      let that = this;
      let url =
        "/wfInstance/stop?wfInstanceId=" +
        data.wfInstanceId +
        "&appId=" +
        this.$store.state.appInfo.id;
      this.axios.get(url).then(() => {
        that.$message.success(this.$t('message.success'));
        // 重新加载列表
        that.listInstanceInfos();
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
        // 失败
        case 3:
          return "error-row";
        // 成功
        case 4:
          return "success-row";
        case 10:
          return "warning-row";
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
  },
  mounted() {
    this.listWfInstances();
  },
};
</script>

<style>

  svg{
    font-size: 10px;
    border: 1px solid red;
  }

  text {
    font-weight: 300;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 14px;
  }

  .node rect {
    stroke: #999;
    fill: #fff;
    stroke-width: 1.5px;
  }

  .edgePath path {
    stroke: #333;
    stroke-width: 1px;
  }

</style>
