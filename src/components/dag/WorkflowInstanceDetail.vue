<template>
  <div class="workflow-instance-detail">
    <!-- 顶部操作栏 -->
    <el-row>
      <div class="power-toolbtn">
        <div>
          <el-button type="primary" @click="back">{{ $t('message.back') }}</el-button>
        </div>
        <div>
          <el-button @click="fetchWfInstanceInfo">{{ $t('message.refresh') }}</el-button>
          <el-button type="warning" @click="restart">{{ $t('message.reRun') }}</el-button>
          <el-button type="danger" @click="stop">{{ $t('message.stop') }}</el-button>
        </div>
      </div>
    </el-row>

    <!-- 工作流实例信息 -->
    <el-row class="power-work-info-item">
      <el-col :span="24">
        {{ $t('message.status') }}：
        <span class="title">{{ common.translateWfInstanceStatus(wfInstanceDetail.status) }}</span>
      </el-col>
    </el-row>

    <el-row class="power-work-info-item">
      <el-col :span="8">
        {{ $t('message.wfId') }}：
        <span class="title">{{ wfInstanceDetail.workflowId }}</span>
      </el-col>
      <el-col :span="16">
        {{ $t('message.wfInstanceId') }}：
        <span class="title">{{ wfInstanceDetail.wfInstanceId }}</span>
      </el-col>
    </el-row>

    <el-row class="power-work-info-item">
      <el-col :span="8">
        {{ $t('message.expectedTriggerTime') }}：
        <span class="title">{{ wfInstanceDetail.expectedTriggerTime }}</span>
      </el-col>
      <el-col :span="8">
        {{ $t('message.triggerTime') }}：
        <span class="title">{{ wfInstanceDetail.actualTriggerTime }}</span>
      </el-col>
      <el-col :span="8">
        {{ $t('message.finishedTime') }}：
        <span class="title">{{ wfInstanceDetail.finishedTime }}</span>
      </el-col>
    </el-row>

    <el-row class="power-work-info-item">
      <el-col :span="24">
        {{ $t('message.wfInitParams') }}：
        <span class="title">{{ wfInstanceDetail.wfInitParams }}</span>
      </el-col>
    </el-row>

    <el-row v-if="wfInstanceDetail.wfContext" class="power-work-info-item">
      <div>
        <el-col :span="24">
          {{ $t('message.wfContext') }}：
          <el-popover width="400" placement="top" trigger="click">
            <div class="power-work-info-item-content">
              <JsonViewer :value="JSON.parse(wfInstanceDetail.wfContext)" />
            </div>
            <template #reference>
              <span class="power-work-info-item-context">{{ wfInstanceDetail.wfContext }}</span>
            </template>
          </el-popover>
        </el-col>
      </div>
    </el-row>

    <el-row class="power-work-info-item">
      <el-col :span="24">
        {{ $t('message.result') }}（{{ $t('message.wfTips') }}）：
        <span class="title">{{ wfInstanceDetail.result }}</span>
      </el-col>
    </el-row>

    <!-- 工作流画布（view 模式） -->
    <el-row>
      <div class="workflow-canvas-wrapper">
        <ReactWorkflowBridge
          v-if="peworkflowDAG.nodes.length > 0"
          ref="workflowBridge"
          :nodes="peworkflowDAG.nodes"
          :edges="peworkflowDAG.edges"
          mode="view"
          :showToolbar="true"
          :showMinimap="false"
          @node-selected="handleNodeSelected"
          @selection-cleared="handleSelectionCleared"
        />

        <!-- 节点详情侧边栏 -->
        <div class="node-detail-panel" v-if="selectedNode">
          <div class="node-detail-header">
            <span class="node-detail-title">{{ nodeDetail?.nodeName || '节点详情' }}</span>
            <el-button type="text" @click="selectedNode = null">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>

          <div class="node-detail-content">
            <!-- 任务节点详情 -->
            <template v-if="nodeDetail && nodeDetail.nodeType !== 2">
              <InstanceDetail
                :instance-id="currentInstanceId"
                :fixedWidth="380"
                :nodeDetail="nodeDetail"
              >
                <template>
                  <el-row class="job-detail-text">
                    <el-col :span="24">
                      <span class="power-job-text">{{ $t('message.enable') }}:</span>
                      <span class="title">{{ currentNodeInfo.enable ? $t('message.yes') : $t('message.no') }}</span>
                    </el-col>
                  </el-row>
                  <el-row class="job-detail-text">
                    <el-col :span="24">
                      <span class="power-job-text">{{ $t('message.skipWhenFailed') }}:</span>
                      <span class="title">{{ currentNodeInfo.skipWhenFailed ? $t('message.yes') : $t('message.no') }}</span>
                    </el-col>
                  </el-row>
                </template>
              </InstanceDetail>
            </template>

            <!-- 判断节点详情 -->
            <template v-if="nodeDetail && nodeDetail.nodeType === 2">
              <el-row class="job-detail-text">
                <el-col :span="24">
                  <span class="power-job-text" style="width: 64px">{{ $t('message.nodeParams') }}:</span>
                  <div style="padding-top: 10px">
                    <JSEditor :code="nodeDetail.nodeParams" key="nodeParams" :editorOptions="{ readOnly: true }" />
                  </div>
                </el-col>
              </el-row>
            </template>
          </div>

          <!-- 标记成功按钮（仅失败节点可点击） -->
          <div class="node-detail-footer" v-if="canMarkSuccess">
            <el-button type="success" @click="markedSuccess" size="small">
              {{ $t('message.markerSuccess') }}
            </el-button>
          </div>
        </div>
      </div>
    </el-row>
  </div>
</template>

<script>
import InstanceDetail from "../common/InstanceDetail";
import ReactWorkflowBridge from "./ReactWorkflowBridge.vue";
import JsonViewer from 'vue-json-viewer';
import JSEditor from "./JSEditor";
import { ElMessage } from 'element-plus';
import { Close } from '@element-plus/icons-vue';

export default {
  name: "WorkflowInstanceDetail",
  components: {
    InstanceDetail,
    ReactWorkflowBridge,
    JsonViewer,
    JSEditor,
    Close,
  },
  data() {
    return {
      wfInstanceDetail: {},
      currentInstanceId: undefined,
      selectedNode: null,
      currentNodeInfo: {},
      peworkflowDAG: {
        nodes: [],
        edges: []
      },
      nodeDetail: null
    };
  },
  computed: {
    wfInstanceId() {
      return this.$route.params.wfInstanceId;
    },
    canMarkSuccess() {
      // 只有失败的节点才能标记成功
      return this.nodeDetail && this.nodeDetail.status === 4;
    }
  },
  methods: {
    /** 获取数据 */
    async fetchWfInstanceInfo() {
      this.peworkflowDAG = {
        nodes: [],
        edges: []
      };

      const wfInstanceId = this.wfInstanceId;

      if (!wfInstanceId) {
        ElMessage.error('工作流实例ID不能为空');
        this.$router.push('/oms/wfinstance');
        return;
      }

      const url = "/wfInstance/info?appId=" + window.localStorage.getItem("Power_appId") + "&wfInstanceId=" + wfInstanceId;
      try {
        const res = await this.axios.get(url);
        this.wfInstanceDetail = res;
        this.peworkflowDAG = res.peworkflowDAG;
      } catch (error) {
        ElMessage.error('获取工作流实例详情失败');
        console.error('Failed to fetch workflow instance detail:', error);
      }
    },

    /** 标记成功 */
    async markedSuccess() {
      if (!this.selectedNode || !this.canMarkSuccess) return;

      const data = {
        appId: window.localStorage.getItem("Power_appId"),
        wfInstanceId: this.wfInstanceId,
        nodeId: this.selectedNode.id
      };

      await this.axios.get('/wfInstance/markNodeAsSuccess', {
        params: data
      });

      // 更新本地状态
      if (this.nodeDetail) {
        this.nodeDetail.status = 5; // SUCCESS
      }

      ElMessage.success(this.$t("message.success"));
      await this.fetchWfInstanceInfo();
    },

    /** 重试 */
    async restart() {
      const data = {
        appId: window.localStorage.getItem("Power_appId"),
        wfInstanceId: this.wfInstanceId,
      };
      await this.axios.get('/wfInstance/retry', {
        params: data
      });
      this.fetchWfInstanceInfo();
    },

    /** 停止实例 */
    async stop() {
      const url = "/wfInstance/stop?wfInstanceId=" + this.wfInstanceId +
        "&appId=" + window.localStorage.getItem("Power_appId");
      await this.axios.get(url);
      ElMessage.success(this.$t('message.success'));
      await this.fetchWfInstanceInfo();
    },

    /** 节点选中处理 */
    handleNodeSelected(node) {
      this.selectedNode = node;
      this.nodeDetail = node.data || null;
      this.currentNodeInfo = {
        enable: node.data?.enable,
        skipWhenFailed: node.data?.skip,
        nodeType: node.data?.type === 'DECISION' ? 2 : (node.data?.type === 'NESTED_WORKFLOW' ? 3 : 1),
      };

      // 设置实例 ID
      this.currentInstanceId = node.data?.instanceId;

      // 如果是任务节点但没有实例 ID，提示用户
      if (node.data?.type !== 'DECISION' && !node.data?.instanceId) {
        ElMessage.warning(this.$t('message.ntfClickNoInstanceNode'));
      }
    },

    /** 取消选中 */
    handleSelectionCleared() {
      this.selectedNode = null;
      this.nodeDetail = null;
      this.currentInstanceId = undefined;
    },

    back() {
      this.$router.go(-1);
    }
  },
  mounted() {
    console.log("Welcome to WorkflowInstanceDetail!");
    this.fetchWfInstanceInfo();
  }
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
  font-size: 14px;
  font-weight: bold;
}

.power-toolbtn {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.power-work-info-item {
  margin: 10px;
}

.power-work-info-item-content {
  max-height: 300px;
  overflow-y: scroll;
}

.power-work-info-item-context {
  max-width: 600px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
}

.workflow-canvas-wrapper {
  width: 100%;
  height: 600px;
  display: flex;
  position: relative;
}

.node-detail-panel {
  width: 420px;
  height: 100%;
  border-left: 1px solid #e0e0e0;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.node-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #e0e0e0;
}

.node-detail-title {
  font-size: 16px;
  font-weight: bold;
}

.node-detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.node-detail-footer {
  padding: 10px 15px;
  border-top: 1px solid #e0e0e0;
  text-align: center;
}

.power-job-text {
  display: inline-block;
  width: 148px;
  text-align: right;
  margin-right: 4px;
  font-size: 14px;
}

.job-detail-text {
  padding: 5px 0;
}
</style>

<style>
.jv-container .jv-code {
  padding: 8px;
}
</style>
