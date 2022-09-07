<template>
  <div class="power-job-panl">
    <el-row>
      <div class="power-job-button">
        <el-button type="primary" @click="fetchInstanceDetail">{{
          $t("message.refresh")
        }}</el-button>
        <el-button @click="handleToDetail">{{
          $t("message.detail")
        }}</el-button>
      </div>
    </el-row>
    <div
      class="power-job-info"
      :style="{ width: fixedWidth ? fixedWidth : '100%' }"
    >
      <el-card>
        <el-row class="job-detail-text" v-if="instanceDetail.nodeType != 2">
          <el-col :span="24">
            <span class="power-job-text">{{ $t("message.instanceId") }}:</span>
            <span class="title">{{ instanceId }}</span>
          </el-col>
        </el-row>
        <el-row class="job-detail-text">
          <el-col :span="24">
            <span class="power-job-text" :style="{width: instanceDetail.nodeType == 2 ? '64px' : ''}">{{ $t("message.status") }}:</span>
            <span class="title">{{
              this.common.translateInstanceStatus(instanceDetail.status)
            }}</span>
          </el-col>
        </el-row>
        <el-row class="job-detail-text" v-if="instanceDetail.nodeType != 2 && instanceDetail.nodeType != 3">
          <el-col :span="24">
            <span class="power-job-text"
              >{{ $t("message.runningTimes") }}:</span
            >
            <span class="title">{{ instanceDetail.runningTimes }}</span>
          </el-col>
        </el-row>
        <el-row class="job-detail-text" v-if="instanceDetail.nodeType != 2 && instanceDetail.nodeType != 3">
          <el-col :span="24">
            <span class="power-job-text"
              >{{ $t("message.taskTrackerAddress") }}:</span
            >
            <span class="title">{{ instanceDetail.taskTrackerAddress }}</span>
          </el-col>
        </el-row>
        <el-row class="job-detail-text" v-if="instanceDetail.nodeType != 2 && instanceDetail.nodeType != 3">
          <el-col :span="24">
            <span class="power-job-text"
              >{{ $t("message.expectedTriggerTime") }}:</span
            >
            <span class="title">{{ instanceDetail.expectedTriggerTime }}</span>
          </el-col>
        </el-row>
        <el-row class="job-detail-text">
          <el-col :span="24">
            <span class="power-job-text" :style="{width: instanceDetail.nodeType == 2 ? '64px' : ''}">{{ $t("message.startTime") }}:</span>
            <span class="title">{{ instanceDetail.actualTriggerTime || instanceDetail.startTime }}</span>
          </el-col>
        </el-row>
        <el-row class="job-detail-text">
          <el-col :span="24">
            <span class="power-job-text" :style="{width: instanceDetail.nodeType == 2 ? '64px' : ''}"
              >{{ $t("message.finishedTime") }}:</span
            >
            <span class="title">{{ instanceDetail.finishedTime }}</span>
          </el-col>
        </el-row>
        <el-row class="job-detail-text" v-if="instanceDetail.nodeType != 2 && instanceDetail.nodeType != 3">
          <el-col :span="24">
            <span class="power-job-text">{{ $t("message.nodeParams") }}:</span>
            <span class="title">{{ instanceDetail.jobParams ? instanceDetail.jobParams : instanceDetail.nodeParams }}</span>
          </el-col>
        </el-row>
        <el-row class="job-detail-text" v-if="instanceDetail.nodeType != 2 && instanceDetail.nodeType != 3">
          <el-col :span="24">
            <span class="power-job-text"
              >{{ $t("message.instanceParams") }}:</span
            >
            <span class="title">{{ instanceDetail.instanceParams }}</span>
          </el-col>
        </el-row>
        <el-row class="job-detail-text">
          <el-col :span="24">
            <div
              :class="{
                'power-job-result': true,
                'power-job-result-detail': resultAll,
              }"
            >
              <span class="power-job-text" :style="{width: instanceDetail.nodeType == 2 ? '64px' : ''}">{{ $t("message.result") }}:</span>
              <el-popover
                width="400"
                placement="right"
                trigger="click"
                v-if="!resultAll"
              >
                <div class="power-job-content-slot">
                  {{ instanceDetail.result }}
                </div>
                <span
                  class="power-job-content"
                  slot="reference"
                  :style="{
                    width: fixedWidth ? `${fixedWidth - 200}px` : '400px',
                  }"
                  >{{ instanceDetail.result }}</span
                >
                <!-- <i class="el-icon-chat-dot-square result" slot="reference"></i> -->
              </el-popover>
              <span v-if="resultAll" class="title">{{
                instanceDetail.result
              }}</span>
            </div>
          </el-col>
        </el-row>
        <slot></slot>
        <el-row
          class="job-detail-text"
          id="taskDetail"
          v-if="instanceDetail.taskDetail && instanceDetail.nodeType != 2"
        >
          <span class="power-job-text">{{ $t("message.subTaskInfo") }}:</span>
          <span class="title">{{ instanceDetail.taskDetail }}</span>
        </el-row>
      </el-card>
    </div>

    <el-divider
      content-position="center"
      v-if="instanceDetail.subInstanceDetails"
      >{{ $t("message.secondlyJobHistory") }}</el-divider
    >
    <div
      class="power-job-info"
      v-if="instanceDetail.subInstanceDetails"
      :style="{ width: fixedWidth ? fixedWidth : '100%' }"
    >
      <el-card>
        <el-row>
          <el-table
            :data="instanceDetail.subInstanceDetails"
            style="width: 100%"
          >
            <el-table-column
              :show-overflow-tooltip="true"
              prop="subInstanceId"
              :label="$t('message.subInstanceId')"
              width="120"
            />
            <el-table-column
              :show-overflow-tooltip="true"
              prop="startTime"
              :label="$t('message.startTime')"
              width="160"
            />
            <el-table-column
              :show-overflow-tooltip="true"
              prop="finishedTime"
              :label="$t('message.finishedTime')"
              width="160"
            />
            <el-table-column
              :show-overflow-tooltip="true"
              :label="$t('message.status')"
              width="140"
            >
              <template slot-scope="scope">{{
                common.translateInstanceStatus(scope.row.status)
              }}</template>
            </el-table-column>
            <el-table-column
              :show-overflow-tooltip="true"
              prop="result"
              :label="$t('message.result')"
            />
          </el-table>
        </el-row>
      </el-card>
    </div>
  </div>
</template>

<script>
export default {
  name: "InstanceDetail",
  // 数据传递
  props: ["instanceId", "fixedWidth", "resultAll", "nodeDetail"],
  data() {
    return {
      instanceDetail: {},
    };
  },
  methods: {
    fetchInstanceDetail() {
      if (this.nodeDetail) {
        this.instanceDetail = this.nodeDetail;
      } else {
        let that = this;
        let url = "/instance/detail?instanceId=" + this.instanceId;
        this.axios.get(url).then((res) => (that.instanceDetail = res));
      }
    },
    /** 查看详情 */
    handleToDetail() {
      this.$router.push({
        path: '/oms/wfinstance',
      })
      setTimeout(() => {
        this.$router.push({
          name: 'WorkflowInstanceDetail',
          params: {
            wfInstanceId: this.nodeDetail.instanceId
          }
        })
      }, 20)
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
  },
};
</script>

<style scoped>
*,
*::after,
*::before {
  box-sizing: border-box;
}
.title {
  display: inline-block;
  /* margin: 5px 0; */
  font-size: 14px;
  font-weight: bold;
  flex: 1;
}
.power-job-button {
  display: flex;
  width: 100%;
  justify-content: flex-end;
  padding-top: 5px;
  padding-right: 5px;
}
.power-job-info {
  padding: 5px 5px;
}
.power-job-text {
  display: inline-block;
  width: 148px;
  text-align: right;
  margin-right: 4px;
  font-size: 14px;
  word-break: break-all;
  /* flex-basis: 148px; */
}
.result:hover {
  transition: 0.5s;
  color: #52aeff;
}
.power-job-result {
  display: flex;
  align-items: center;
}
.power-job-result.power-job-result-detail {
  align-items: flex-start;
}
.power-job-content-slot {
  max-height: 300px;
  overflow-y: scroll;
}
.power-job-content {
  /* width: 205px; */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  font-size: 14px;
  /* line-height: 20px; */
}
</style>
<style>
.el-tooltip__popper.is-dark {
  max-width: 50%;
  word-wrap: break-word;
  white-space: normal;
  word-break: break-all;
}
</style>
