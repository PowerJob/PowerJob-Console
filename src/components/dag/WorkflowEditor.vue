<template>
  <div>
    <el-row style="margin-left: 0px; margin-bottom: 20px; margin-right: 25px">
      <el-col :span="1">
        <el-button type="primary" @click="back">{{$t('message.back')}}</el-button>
      </el-col>
      <el-col :span="1" :offset="22">
        <el-button
          type="success"
          :loading="saveLoading"
          @click="saveWorkflow"
        >{{$t('message.save')}}</el-button>
      </el-col>
    </el-row>

    <el-row>
      <el-form ref="form" :model="workflowInfo" label-width="100px">
        <el-form-item :label="$t('message.wfName')">
          <el-input v-model="workflowInfo.wfName" />
        </el-form-item>
        <el-form-item :label="$t('message.wfDescription')">
          <el-input v-model="workflowInfo.wfDescription" />
        </el-form-item>

        <el-form-item :label="$t('message.scheduleInfo')">
          <el-row>
            <el-col :span="6">
              <el-select
                v-model="workflowInfo.timeExpressionType"
                :placeholder="$t('message.timeExpressionType')"
              >
                <el-option
                  v-for="item in timeExpressionTypeOptions"
                  :key="item.key"
                  :label="item.label"
                  :value="item.key"
                ></el-option>
              </el-select>
            </el-col>
            <el-col :span="12">
              <el-input
                v-model="workflowInfo.timeExpression"
                :placeholder="$t('message.wfTimeExpressionPLH')"
              />
            </el-col>
            <el-col :span="4">
              <el-button
                type="text"
                @click="onClickValidateTimeExpression"
              >{{$t('message.validateTimeExpression')}}</el-button>
            </el-col>
          </el-row>
        </el-form-item>

        <el-form-item :label="$t('message.maxInstanceNum')">
          <el-input-number v-model="workflowInfo.maxWfInstanceNum" />
        </el-form-item>

        <el-form-item :label="$t('message.alarmConfig')">
          <el-select
            v-model="workflowInfo.notifyUserIds"
            multiple
            filterable
            :placeholder="$t('message.alarmSelectorPLH')"
          >
            <el-option
              v-for="user in userList"
              :key="user.id"
              :label="user.username"
              :value="user.id"
            ></el-option>
          </el-select>
        </el-form-item>
      </el-form>
    </el-row>

    <el-row>
      <div class="power-flow" v-if="workflowInfo.id">
        <div class="power-dag" id="fullInc">
          <PowerWorkflow
            @onSelectedNode="handleSelectedNode"
            @getDag="getDag"
            :onClickImportNode="onClickImportNode"
            :selectNode="selectNode"
            :nodes="peworkflowDAG.nodes"
            :edges="peworkflowDAG.edges"
            :defaultWidthInc="234"
            fullInc="fullInc"
          >
            <template v-slot:tool>
              <div @click="saveNodeInfo">
                <el-tooltip :content="$t('message.saveDAG')" placement="top" effect="light">
                  <i class="el-icon-collection"></i>
                </el-tooltip>
              </div>
            </template>
            <div class="job-panl" v-if="selectNode !== null">
              <el-form ref="form" :model="nodeInfo">
                <el-form-item :label="$t('message.nodeAliasName')">
                  <el-input v-model="nodeInfo.nodeAlias" @input="handleNodeAlias" />
                </el-form-item>
                <el-form-item :label="$t('message.nodeParamsName')">
                  <el-input v-model="nodeInfo.nodeParams" />
                </el-form-item>
                <el-form-item :label="$t('message.enableName')">
                  <el-switch v-model="nodeInfo.enable"></el-switch>
                </el-form-item>
                <el-form-item :label="$t('message.skipWhenFailedName')">
                  <el-switch v-model="nodeInfo.skipWhenFailed"></el-switch>
                </el-form-item>
              </el-form>
              <div class="job-panl-btn">
                <el-button type="success" @click="handleNodeSave">{{$t('message.save')}}</el-button>
              </div>
            </div>
          </PowerWorkflow>
          <el-drawer
            :title="$t('message.importJobTitle')"
            :visible.sync="importDrawerVisible"
            direction="rtl"
            size="60%"
          >
            <div class="power-import-body">
              <el-row>
                <el-form :inline="true" :model="jobQueryContent" class="el-form--inline">
                  <el-form-item :label="$t('message.jobId')">
                    <el-input v-model="jobQueryContent.jobId" :placeholder="$t('message.jobId')" />
                  </el-form-item>
                  <el-form-item :label="$t('message.keyword')">
                    <el-input
                      v-model="jobQueryContent.keyword"
                      :placeholder="$t('message.keyword')"
                    />
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" @click="listJobInfos">{{$t('message.query')}}</el-button>
                    <el-button type="cancel" @click="onClickReset">{{$t('message.reset')}}</el-button>
                    <el-button type="cancel" @click="onBulkImport">{{$t('message.bulkImport')}}</el-button>
                  </el-form-item>
                </el-form>
              </el-row>
              <el-table class="power-import-table" :data="jobInfoPageResult.data" @selection-change="handleSelectionChange">
                <el-table-column type="selection" width="55" />
                <el-table-column property="id" :label="$t('message.jobId')" />
                <el-table-column property="jobName" :label="$t('message.jobName')" />
                <el-table-column :label="$t('message.operation')">
                  <template slot-scope="scope">
                    <el-button
                      size="medium"
                      @click="importTask([scope.row])"
                    >{{$t('message.import')}}</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <el-row>
                <el-pagination
                  layout="prev, pager, next"
                  :total="this.jobInfoPageResult.totalItems"
                  :page-size="this.jobInfoPageResult.pageSize"
                  @current-change="onClickChangePage"
                />
              </el-row>
            </div>
          </el-drawer>
        </div>
      </div>
    </el-row>
    <el-dialog :visible.sync="timeExpressionValidatorVisible" v-if="timeExpressionValidatorVisible">
      <TimeExpressionValidator
        :time-expression="workflowInfo.timeExpression"
        :time-expression-type="workflowInfo.timeExpressionType"
      />
    </el-dialog>
  </div>
</template>

<script>
import TimeExpressionValidator from "../common/TimeExpressionValidator";
import PowerWorkflow from "./PowerWorkflow";
export default {
  name: "WorkflowEditor",
  components: { TimeExpressionValidator, PowerWorkflow },
  data() {
    return {
      workflowInfo: {
        id: "",
        appId: this.$store.state.appInfo.id,
        enable: true,
        maxWfInstanceNum: 1,
        notifyUserIds: [],
        timeExpression: undefined,
        timeExpressionType: undefined,
        wfDescription: undefined,
        wfName: undefined
      },
      nodeInfo: {
        nodeAlias: "",
        nodeParams: "",
        enable: true,
        skipWhenFailed: true
      },
      timeExpressionTypeOptions: [
        { key: "API", label: "API" },
        { key: "CRON", label: "CRON" }
      ],
      userList: [],

      // 导入任务相关
      importDrawerVisible: false,
      jobQueryContent: {
        appId: this.$store.state.appInfo.id,
        index: 0,
        pageSize: 8,
        jobId: undefined,
        keyword: undefined
      },
      jobInfoPageResult: {
        pageSize: 20,
        totalItems: 0,
        data: []
      },

      // 事件（1：新增起点，2：新增终点，3：删除节点；4：删除边）
      event: undefined,
      from: undefined,

      // 时间表达式校验窗口
      timeExpressionValidatorVisible: false,
      /** DAG信息 */
      peworkflowDAG: {
        nodes: [],
        edges: []
      },
      /** 保存按钮loading */
      saveLoading: false,
      /** 流程图实例 */
      poverFlow: null,
      /** 选中的数据 */
      multipleSelection: [],
      /** 当前的节点信息 */
      taskList: [],
      /** 当前选中的节点 */
      selectNode: null,
      /** 重置节点方法 */
      resetNodes: null
    };
  },
  methods: {
    // 返回上一页
    back: function() {
      this.$router.go(-1);
    },
    /* ******** 导入任务相关，所有函数与 JobManager 重复，需要前端大佬重构！ ******** */
    // 点击重置按钮
    onClickReset() {
      this.jobQueryContent.keyword = undefined;
      this.jobQueryContent.jobId = undefined;
      this.listJobInfos();
    },
    // 列出符合当前搜索条件的任务
    listJobInfos() {
      const that = this;
      this.axios.post("/job/list", this.jobQueryContent).then(res => {
        that.jobInfoPageResult = res;
      });
    },
    // 点击 换页
    onClickChangePage(index) {
      // 后端从0开始，前端从1开始
      this.jobQueryContent.index = index - 1;
      this.listJobInfos();
    },
    onClickImportNode() {
      this.listJobInfos();
      this.importDrawerVisible = true;
    },
    onClickDAGNode(nodeId, g) {
      switch (this.event) {
        case 3: {
          g.removeNode(nodeId);
          let nodesArr = this.workflowInfo.peworkflowDAG.nodes;
          let oldEdges = this.workflowInfo.peworkflowDAG.edges;
          this.workflowInfo.peworkflowDAG.edges = [];
          // 删除节点
          nodesArr.splice(
            nodesArr.findIndex(item => item.jobId == nodeId),
            1
          );
          // 删除节点相关的所有边
          oldEdges.forEach(edge => {
            if (edge.from == nodeId || edge.to == nodeId) {
              console.log("remove edge: " + JSON.stringify(edge));
            } else {
              this.workflowInfo.peworkflowDAG.edges.push(edge);
            }
          });

          this.draw();
          break;
        }
        case 1: {
          this.from = nodeId;
          break;
        }
        case 2: {
          let to = nodeId;
          if (this.from === undefined) {
            this.$message.warning(this.$t("message.ntfAddStartPointFirst"));
            break;
          }
          if (this.from === to) {
            this.$message.warning(this.$t("message.ntfInvalidEdge"));
            break;
          }

          let canSave = true;
          this.workflowInfo.peworkflowDAG.edges.forEach(edge => {
            if (edge.from === this.from && edge.to === to) {
              canSave = false;
              console.log("edge(%o -> %o) already exists!", this.from, to);
            }
          });

          if (canSave) {
            this.workflowInfo.peworkflowDAG.edges.push({
              from: this.from,
              to: to
            });
            console.log("new edge(%o -> %o)", this.from, to);
          }
          this.draw();
          break;
        }
      }
    },
    onClickValidateTimeExpression() {
      this.timeExpressionValidatorVisible = true;
    },
    /** 选中节点 */
    handleSelectedNode(item) {
      this.selectNode = item;

      // 从节点列表找到节点
      let index = this.getNodeIndexById(item.get("model").nodeId);

      let node = this.taskList[index];

      this.nodeInfo = {
        nodeAlias: item.get("model").titleText,
        nodeParams: node.jobParams,
        enable: node.enable,
        skipWhenFailed: node.skipWhenFailed,
        id: item.get("model").nodeId || item.get("model").id
      };
    },
    /** 多选节点 */
    handleSelectionChange(val) {
      this.multipleSelection = val;
    },
    /** 修改别名 */
    handleNodeAlias(value) {
      const nodeItem = this.poverFlow.graph.get("selectedItem");
      const group = nodeItem.getContainer();
      const current = group.getChildByIndex(2);
      current.attr("text", value);
    },
    /** 获取工作流程图实例 */
    getDag(poverFlow, { resetNodes }) {
      this.poverFlow = poverFlow;
      this.resetNodes = resetNodes;
    },
    /** 根据nodeId找任务节点索引 */
    getNodeIndexById(nodeId) {
      return this.taskList.findIndex(item => item.nodeId == nodeId);
    },
    /** 获取工作流信息 */
    async getWorkflowInfo(fit) {
      const res = await this.axios.get("/workflow/fetch", {
        params: {
          workflowId: this.workflowInfo.id,
          appId: this.workflowInfo.appId
        }
      });
      this.workflowInfo = { ...this.workflowInfo, ...res };
      if (res.peworkflowDAG) {
        this.taskList = res.peworkflowDAG.nodes;
        this.peworkflowDAG = res.peworkflowDAG;
        this.$nextTick(() => {
          this.resetNodes();
          if (fit) {
            this.poverFlow.graph.fitView(20);
          }
        });
      }
      // this.taskList = res.peworkflowDAG.nodes;
      // this.peworkflowDAG = res.peworkflowDAG;
    },
    /** 保存工作流全局信息 */
    async saveWorkflow() {
      // this.saveLoading = true;
      if (!this.workflowInfo.id) {
        await this.saveWorkflowForm();
      } else {
        await this.saveWorkflowForm();
        await this.saveDagInfo();
        this.back();
      }
      // this.saveLoading = false;
    },
    /** 保存工作流节点信息 */
    async saveNodeInfo() {
      await this.saveDagInfo();
      this.$message.success(this.$t("message.success"));
    },
    /** 保存工作流描述信息 */
    async saveWorkflowForm() {
      const res = await this.axios.post("/workflow/save", this.workflowInfo);
      this.$message.success(this.$t("message.success"));
      if (!this.workflowInfo.id) this.workflowInfo.id = res;
    },
    /** 保存dag信息 */
    async saveDagInfo() {
      // 获取节点连接信息
      const flowData = this.poverFlow.graph.save();
      console.log(flowData);
      const data = {
        id: this.workflowInfo.id,
        appId: this.workflowInfo.appId,
        dag: {
          nodes: flowData.nodes.map(item => ({ nodeId: item.id })),
          edges: flowData.edges.map(item => ({
            from: item.source,
            to: item.target
          }))
        }
      };

      const res = await this.axios.post("/workflow/saveDAG", data);
      console.log(res);
    },
    /** 导入任务节点数据 */
    async importTask(taskList) {
      let repeatNodes = [];
      if (repeatNodes.length > 0) {
        this.$message.warning(this.$t("message.repeatNode"));
      }
      if (taskList.length === 0) {
        return;
      }

      let data = taskList.map(item => {
        return {
          appId: item.appId,
          enable: item.enable,
          skipWhenFailed: item.skipWhenFailed,
          nodeAlias: item.jobName,
          jobId: item.id,
          nodeParams: item.jobParams,
          workflowId: this.workflowInfo.id
        };
      });
      let res = await this.axios.post("/workflow/addNode", data);
      // 先移动视口一个节点点的位置
      // 获取缩放比例
      const zoom = this.poverFlow.graph.getZoom();
      this.poverFlow.graph.translate(260 * zoom, 0);
      const viewPointEnd = this.poverFlow.graph.getPointByCanvas(0, 0);
      res.forEach((item, index) => {
        this.poverFlow.graph.add("node", {
          ...item,
          nodeId: `${item.id}`,
          type: "flow-node",
          size: [240, 70],
          x: viewPointEnd.x + 20,
          y: viewPointEnd.y + 70 * index + 20 + index * 10,
          leftText: item.jobId,
          titleText: item.nodeAlias
        });
      });
      this.taskList = [
        ...this.taskList,
        ...res.map(item => ({ ...item,jobParams: item.nodeParams, nodeId: item.id }))
      ];
      await this.saveDagInfo();
    },
    /** 保存单个节点 */
    async handleNodeSave() {
      let data = {
        ...this.nodeInfo,
        appId: this.workflowInfo.appId,
        workflowId: this.workflowInfo.id
      };
      await this.axios.post("/workflow/modifyNode", data);

      let index = this.getNodeIndexById(this.nodeInfo.id);

      this.taskList[index] = {
        ...this.taskList[index],
        nodeAlias: this.nodeInfo.nodeAlias,
        jobParams: this.nodeInfo.nodeParams,
        enable: this.nodeInfo.enable,
        skipWhenFailed: this.nodeInfo.skipWhenFailed
      };

      this.$message.success(this.$t("message.success"));
    },
    /** 批量导入工作流 */
    async onBulkImport() {
      if (this.multipleSelection.length === 0) {
        this.$message.warning(this.$t("message.noSelect"));
        return;
      }
      this.importTask(this.multipleSelection);
    }
  },
  mounted() {
    // 加载用户信息
    let that = this;
    that.axios.get("/user/list").then(res => (that.userList = res));

    // 读取传递数据，如果是修改，需要先将数据绘制上去
    let modify = this.$route.params.modify;
    if (modify) {
      this.workflowInfo = this.$route.params.workflowInfo;
      this.workflowInfo.appId = this.$store.state.appInfo.id;
      this.getWorkflowInfo(true);
    }
  }
};
</script>

<style scoped>
.el-input {
  width: 80%;
}
.title {
  display: inline-block;
  margin: 5px 0;
  font-size: 16px;
  font-weight: bold;
}
.power-dag {
  width: 100%;
  display: flex;
  justify-content: space-between;
}
.job-panl {
  /* border: 1px solid red; */
  flex: 1;
  position: relative;
  border-radius: 10px;
  box-shadow: 0 10px 10px 1px #c0c0c0;
  border-top-right-radius: 0px;
  box-sizing: border-box;
  margin: 0 10px;
  padding: 10px;
  height: 100%;
}
.job-panl-btn {
  /* position: absolute;
        bottom: 0; */
  display: flex;
  justify-content: flex-end;
  width: 100%;
  /* margin-right: 12px; */
  box-sizing: border-box;
  padding: 12px;
  border-top: 1px solid #f0f0f0;
}
.job-tools {
  width: calc(100% - 10px);
  box-sizing: border-box;
  border: 1px solid #d0d0d0;
  /* box-shadow: 0 0 10px 1px #c0c0c0; */
  border-radius: 10px;
  margin-right: 10px;
  border-bottom-left-radius: 0px;
  border-bottom-right-radius: 0px;
  display: flex;
  padding: 8px 10px;
}
.job-tools > div {
  box-sizing: border-box;
  height: 30px;
  width: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}
.job-tools div:hover {
  border: 1px solid #f0f0f0;
}
.job-tools > div + div {
  margin-left: 24px;
}
.job-tools i {
  font-size: 20px;
  /* color: #aaaaaa; */
}
.power-import-body {
  padding: 0px 20px;
}
/* .el-drawer__body {
  padding: 0 20px;
} */

</style>
<!-- can't use scope, or dag will be the black block, maybe this is the bug of d3.js -->
<style>
svg {
  font-size: 16px;
  border: 1px solid red;
}

.power-flow {
  background: #fff;
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
.power-import-table .el-table-column--selection > .cell {
  padding-left: 15px;
}
</style>
