<template>
  <div class="workflow-editor">
    <!-- 顶部操作栏 -->
    <el-row style="margin-left: 0px; margin-bottom: 20px; margin-right: 25px">
      <el-col :span="1">
        <el-button type="primary" @click="back">{{ $t("message.back") }}</el-button>
      </el-col>
      <el-col :span="1" :offset="22">
        <el-button type="success" :loading="saveLoading" @click="saveWorkflow">
          {{ $t("message.save") }}
        </el-button>
      </el-col>
    </el-row>

    <!-- 工作流元数据表单 -->
    <el-row>
      <el-form ref="form" :model="workflowInfo" label-width="100px">
        <el-form-item :label="$t('message.wfName')">
          <el-input v-model="workflowInfo.wfName" />
        </el-form-item>
        <el-form-item :label="$t('message.wfDescription')">
          <el-input v-model="workflowInfo.wfDescription" />
        </el-form-item>
        <el-form-item :label="$t('message.scheduleInfo')">
          <el-row style="width: 100%">
            <el-col :span="6">
              <el-select v-model="workflowInfo.timeExpressionType" :placeholder="$t('message.timeExpressionType')">
                <el-option v-for="item in timeExpressionTypeOptions" :key="item.key" :label="item.label" :value="item.key"></el-option>
              </el-select>
            </el-col>
            <el-col :span="12">
              <el-input v-model="workflowInfo.timeExpression" :placeholder="$t('message.wfTimeExpressionPLH')" />
            </el-col>
            <el-col :span="4">
              <el-button type="text" @click="onClickValidateTimeExpression">
                {{ $t("message.validateTimeExpression") }}
              </el-button>
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item :label="$t('message.lifeCycle')">
          <el-date-picker
            v-model="workflowInfo.lifeCycle"
            type="datetimerange"
            :start-placeholder="$t('message.startTime')"
            :end-placeholder="$t('message.finishedTime')"
            value-format="x"
            format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item :label="$t('message.maxInstanceNum')">
          <el-input-number v-model="workflowInfo.maxWfInstanceNum" />
        </el-form-item>
        <el-form-item :label="$t('message.alarmConfig')">
          <el-select v-model="workflowInfo.notifyUserIds" multiple filterable :placeholder="$t('message.alarmSelectorPLH')">
            <el-option v-for="user in userList" :key="user.id" :label="user.username" :value="user.id"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
    </el-row>

    <!-- 工作流画布区域 -->
    <el-row>
      <div class="power-flow">
        <div class="power-dag" id="fullInc">
          <ReactWorkflowBridge
            ref="workflowBridge"
            :nodes="peworkflowDAG.nodes"
            :edges="peworkflowDAG.edges"
            mode="edit"
            :jobOptions="jobOptions"
            :workflowOptions="workflowOptions"
            :showToolbar="true"
            :showMinimap="false"
            @node-selected="handleNodeSelected"
            @selection-cleared="handleSelectionCleared"
            @node-data-change="handleNodeDataChange"
            @nodes-change="handleNodesChange"
            @edges-change="handleEdgesChange"
          />
        </div>
      </div>
    </el-row>

    <!-- 时间表达式校验弹窗 -->
    <el-dialog v-model="timeExpressionValidatorVisible" v-if="timeExpressionValidatorVisible">
      <TimeExpressionValidator
        :time-expression="workflowInfo.timeExpression"
        :time-expression-type="workflowInfo.timeExpressionType"
      />
    </el-dialog>

    <!-- 导入任务抽屉 -->
    <el-drawer :title="$t('message.importJobTitle')" v-model="importDrawerVisible" direction="rtl" size="60%">
      <div class="power-import-body">
        <el-row>
          <el-form :inline="true" :model="jobQueryContent" class="el-form--inline">
            <el-form-item :label="$t('message.jobId')">
              <el-input v-model="jobQueryContent.jobId" :placeholder="$t('message.jobId')" />
            </el-form-item>
            <el-form-item :label="$t('message.keyword')">
              <el-input v-model="jobQueryContent.keyword" :placeholder="$t('message.keyword')" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="listJobInfos">{{ $t("message.query") }}</el-button>
              <el-button type="cancel" @click="onClickReset">{{ $t("message.reset") }}</el-button>
              <el-button type="cancel" @click="onBulkImport">{{ $t("message.bulkImport") }}</el-button>
            </el-form-item>
          </el-form>
        </el-row>
        <el-table class="power-import-table" :data="jobInfoPageResult.data" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55" />
          <el-table-column property="id" :label="$t('message.jobId')" />
          <el-table-column property="jobName" :label="$t('message.jobName')" />
          <el-table-column :label="$t('message.operation')">
            <template #default="scope">
              <el-button size="medium" @click="importTask([scope.row])">{{ $t("message.import") }}</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-row>
          <el-pagination
            layout="prev, pager, next"
            :total="jobInfoPageResult.totalItems"
            :page-size="jobInfoPageResult.pageSize"
            @current-change="onClickChangePage"
          />
        </el-row>
      </div>
    </el-drawer>

    <!-- 导入工作流抽屉 -->
    <el-drawer :title="$t('message.importWorkflowTitle')" v-model="workflowVisible" direction="rtl" size="60%">
      <WorkflowManager :isWorkflow="true" @onImportNode="onImportChildWorkflowNode" />
    </el-drawer>
  </div>
</template>

<script>
import TimeExpressionValidator from "../common/TimeExpressionValidator";
import ReactWorkflowBridge from "./ReactWorkflowBridge.vue";
import WorkflowManager from "../views/WorkflowManager";
import { ElMessage } from 'element-plus';

export default {
  name: "WorkflowEditor",
  components: {
    TimeExpressionValidator,
    ReactWorkflowBridge,
    WorkflowManager,
  },
  data() {
    return {
      workflowInfo: {
        id: "",
        appId: window.localStorage.getItem("Power_appId"),
        enable: true,
        maxWfInstanceNum: 1,
        notifyUserIds: [],
        timeExpression: undefined,
        timeExpressionType: undefined,
        wfDescription: undefined,
        wfName: undefined,
        lifeCycle: null,
      },
      timeExpressionTypeOptions: [
        { key: "API", label: "API" },
        { key: "CRON", label: "CRON" },
      ],
      userList: [],

      // 导入任务相关
      importDrawerVisible: false,
      jobQueryContent: {
        appId: window.localStorage.getItem("Power_appId"),
        index: 0,
        pageSize: 8,
        jobId: undefined,
        keyword: undefined,
      },
      jobInfoPageResult: {
        pageSize: 20,
        totalItems: 0,
        data: [],
      },

      // 时间表达式校验窗口
      timeExpressionValidatorVisible: false,

      /** DAG信息 */
      peworkflowDAG: {
        nodes: [],
        edges: [],
      },

      /** 保存按钮loading */
      saveLoading: false,

      /** 当前的节点信息（用于后端同步） */
      taskList: [],

      /** 当前选中的节点 */
      selectedNodeId: null,

      /** 多选节点 */
      multipleSelection: [],

      /** 任务/工作流选项（供 React 组件使用） */
      jobOptions: [],
      workflowOptions: [],

      /** 工作流引入显隐控制 */
      workflowVisible: false,
    };
  },
  methods: {
    // 返回上一页
    back() {
      this.$router.go(-1);
    },

    // 点击重置按钮
    onClickReset() {
      this.jobQueryContent.keyword = undefined;
      this.jobQueryContent.jobId = undefined;
      this.listJobInfos();
    },

    // 列出符合当前搜索条件的任务
    listJobInfos() {
      this.axios.post("/job/list", this.jobQueryContent).then((res) => {
        this.jobInfoPageResult = res;
        // 同时更新 jobOptions 供 React 组件使用
        this.jobOptions = res.data.map(item => ({
          value: item.id,
          label: item.jobName,
        }));
      });
    },

    // 点击换页
    onClickChangePage(index) {
      this.jobQueryContent.index = index - 1;
      this.listJobInfos();
    },

    onClickValidateTimeExpression() {
      this.timeExpressionValidatorVisible = true;
    },

    /** 节点选中处理 */
    handleNodeSelected(node) {
      this.selectedNodeId = node.id;
    },

    /** 取消选中处理 */
    handleSelectionCleared() {
      this.selectedNodeId = null;
    },

    /** 节点数据变化处理 */
    handleNodeDataChange({ nodeId, data }) {
      // 更新 taskList 中的节点数据
      const index = this.taskList.findIndex(item => item.nodeId == nodeId);
      if (index !== -1) {
        this.taskList[index] = {
          ...this.taskList[index],
          nodeName: data.label,
          nodeParams: data.params || data.condition || '',
          enable: data.enable,
          skipWhenFailed: data.skip,
          jobId: data.jobId || data.targetWorkflowId,
        };
      }
    },

    /** 节点变化处理 */
    handleNodesChange(changes) {
      // React 组件内部已经管理了 nodes 状态
      // 这里主要用于调试或额外处理
      console.log('Nodes changed:', changes);
    },

    /** 连线变化处理 */
    handleEdgesChange(changes) {
      console.log('Edges changed:', changes);
    },

    /** 根据nodeId找任务节点索引 */
    getNodeIndexById(nodeId) {
      return this.taskList.findIndex(item => item.nodeId == nodeId);
    },

    /** 获取工作流信息 */
    async getWorkflowInfo() {
      const res = await this.axios.get("/workflow/fetch", {
        params: {
          workflowId: this.workflowInfo.id,
          appId: this.workflowInfo.appId,
        },
      });

      this.workflowInfo = { ...this.workflowInfo, ...res };

      // 处理lifeCycle数据格式
      if (res.lifeCycle && typeof res.lifeCycle === 'object' && res.lifeCycle.start && res.lifeCycle.end) {
        this.workflowInfo.lifeCycle = [res.lifeCycle.start, res.lifeCycle.end];
      } else {
        this.workflowInfo.lifeCycle = null;
      }

      if (res.peworkflowDAG) {
        this.taskList = res.peworkflowDAG.nodes;
        this.peworkflowDAG = res.peworkflowDAG;
      }

      // 加载任务选项
      this.listJobInfos();
      // 加载工作流选项
      this.loadWorkflowOptions();
    },

    /** 加载工作流选项 */
    async loadWorkflowOptions() {
      const res = await this.axios.post("/workflow/list", {
        appId: this.workflowInfo.appId,
        index: 0,
        pageSize: 1000,
      });
      this.workflowOptions = res.data.map(item => ({
        value: item.id,
        label: item.wfName,
      }));
    },

    /** 保存工作流 */
    async saveWorkflow() {
      // 从 Bridge 获取最新的 DAG 数据
      const { vueNodes, vueEdges } = this.$refs.workflowBridge.getWorkflowData();

      const dagInfo = {
        nodes: vueNodes.map(item => ({ nodeId: item.nodeId })),
        edges: vueEdges.map(item => {
          const property = {};
          if (item.property) {
            property.property = item.property;
          }
          return {
            from: item.from,
            to: item.to,
            ...property,
          };
        }),
      };

      // 处理生命周期时间范围
      let processedWorkflowInfo = { ...this.workflowInfo };
      const { lifeCycle } = processedWorkflowInfo;

      if (lifeCycle && Array.isArray(lifeCycle) && lifeCycle.length === 2) {
        const [start, end] = lifeCycle;
        if (start && end && !isNaN(start) && !isNaN(end)) {
          processedWorkflowInfo.lifeCycle = {
            start: parseInt(start),
            end: parseInt(end)
          };
        } else {
          processedWorkflowInfo.lifeCycle = null;
        }
      } else {
        processedWorkflowInfo.lifeCycle = null;
      }

      await this.axios.post("/workflow/save", {
        ...processedWorkflowInfo,
        dag: dagInfo,
      });

      ElMessage.success(this.$t("message.success"));
      if (!this.workflowInfo.id) {
        // 新建成功后需要获取返回的 ID
        // 暂时不处理，因为后端可能返回 ID
      }
    },

    /** 导入任务节点数据 */
    async importTask(taskList) {
      if (taskList.length === 0) return;

      const type = taskList[0].type ? Number(taskList[0].type) : 1;
      const data = taskList.map(item => ({
        appId: item.appId,
        enable: item.enable !== false,
        skipWhenFailed: item.skipWhenFailed || false,
        nodeName: item.jobName || item.wfName,
        jobId: item.id,
        nodeParams: item.jobParams || '',
        workflowId: this.workflowInfo.id,
        type: type,
      }));

      const res = await this.axios.post("/workflow/saveNode", data);

      // 更新 taskList
      const newNodes = res.map(item => ({
        ...item,
        nodeType: item.type,
        nodeParams: item.nodeParams,
        nodeId: item.id,
      }));

      this.taskList = [...this.taskList, ...newNodes];

      // 更新 peworkflowDAG 触发 React 组件重新渲染
      this.peworkflowDAG = {
        nodes: this.taskList,
        edges: this.peworkflowDAG.edges,
      };
    },

    /** 多选节点 */
    handleSelectionChange(val) {
      this.multipleSelection = val;
    },

    /** 批量导入工作流 */
    async onBulkImport() {
      if (this.multipleSelection.length === 0) {
        ElMessage.warning(this.$t("message.noSelect"));
        return;
      }
      await this.importTask(this.multipleSelection);
    },

    /** 引入嵌套工作流节点 */
    onImportChildWorkflowNode(data) {
      this.importTask([
        {
          appId: this.workflowInfo.appId,
          nodeName: data.wfName,
          enable: data.enable,
          id: data.id,
          nodeParams: "",
          type: 3,
          workflowId: this.workflowInfo.id,
          jobName: data.wfName,
        },
      ]);
      this.workflowVisible = false;
    },
  },
  mounted() {
    // 加载用户信息
    this.axios.get("/user/list").then(res => this.userList = res);

    // 读取传递数据
    const modify = this.$route.query.modify === 'true';
    const workflowId = this.$route.query.workflowId;

    if (modify && workflowId) {
      this.workflowInfo.id = workflowId;
      this.workflowInfo.appId = window.localStorage.getItem("Power_appId");
      this.getWorkflowInfo();
    } else if (modify) {
      let routeWorkflowInfo = this.$route.params.workflowInfo;
      if (routeWorkflowInfo) {
        this.workflowInfo = routeWorkflowInfo;
        if (this.workflowInfo.lifeCycle) {
          const { start, end } = this.workflowInfo.lifeCycle;
          this.workflowInfo.lifeCycle = [start, end];
        } else {
          this.workflowInfo.lifeCycle = null;
        }
        this.workflowInfo.appId = window.localStorage.getItem("Power_appId");
        this.getWorkflowInfo();
      }
    }
  },
};
</script>

<style scoped>
.el-input {
  width: 80%;
}
.power-dag {
  width: 100%;
  height: 600px;
  display: flex;
}
.power-flow {
  background: #fff;
  width: 100%;
}
.power-import-body {
  padding: 0px 20px;
}
.power-import-table .el-table-column--selection > .cell {
  padding-left: 15px;
}
</style>
