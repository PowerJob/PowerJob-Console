<template>
  <div class="workflow-editor">
    <!-- 顶部操作栏 -->
    <div class="wf-header">
      <div class="header-left">
        <button class="back-btn" @click="back">
          <el-icon><ArrowLeft /></el-icon>
          <span>{{ $t("message.back") }}</span>
        </button>
      </div>
      <div class="header-actions">
        <button class="action-btn save-btn" :disabled="saveLoading" @click="saveWorkflow">
          <el-icon><DocumentCopy /></el-icon>
          <span>{{ $t("message.save") }}</span>
        </button>
      </div>
    </div>

    <!-- 工作流元数据表单 - 紧凑卡片式 -->
    <div class="wf-info-section">
      <div class="info-card">
        <el-form ref="form" :model="workflowInfo" class="compact-form">
          <!-- 第一行：工作流名称 + 描述 -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ $t('message.wfName') }}</label>
              <el-input 
                v-model="workflowInfo.wfName" 
                :placeholder="$t('message.wfName')"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('message.wfDescription') }}</label>
              <el-input 
                v-model="workflowInfo.wfDescription" 
                :placeholder="$t('message.wfDescription')"
                class="form-input"
              />
            </div>
          </div>

          <!-- 第二行：调度信息 -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ $t('message.timeExpressionType') }}</label>
              <el-select 
                v-model="workflowInfo.timeExpressionType" 
                :placeholder="$t('message.timeExpressionType')"
                class="form-input"
              >
                <el-option v-for="item in timeExpressionTypeOptions" :key="item.key" :label="item.label" :value="item.key"></el-option>
              </el-select>
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('message.wfTimeExpressionPLH') }}</label>
              <div class="input-group">
                <el-input 
                  v-model="workflowInfo.timeExpression" 
                  :placeholder="$t('message.wfTimeExpressionPLH')"
                  class="form-input"
                />
                <button class="validate-btn" @click="onClickValidateTimeExpression">
                  <el-icon><Check /></el-icon>
                </button>
              </div>
            </div>
          </div>

          <!-- 第三行：生命周期 + 最大实例数 -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ $t('message.lifeCycle') }}</label>
              <el-date-picker
                v-model="workflowInfo.lifeCycle"
                type="datetimerange"
                :start-placeholder="$t('message.startTime')"
                :end-placeholder="$t('message.finishedTime')"
                value-format="x"
                format="YYYY-MM-DD HH:mm:ss"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('message.maxInstanceNum') }}</label>
              <el-input-number 
                v-model="workflowInfo.maxWfInstanceNum"
                :min="0"
                class="form-input compact-number"
              />
            </div>
          </div>

          <!-- 第四行：告警配置 -->
          <div class="form-row full-width">
            <div class="form-group">
              <label class="form-label">{{ $t('message.alarmConfig') }}</label>
              <el-select 
                v-model="workflowInfo.notifyUserIds" 
                multiple 
                filterable 
                :placeholder="$t('message.alarmSelectorPLH')"
                class="form-input"
              >
                <el-option v-for="user in userList" :key="user.id" :label="user.username" :value="user.id"></el-option>
              </el-select>
            </div>
          </div>
        </el-form>
      </div>
    </div>

    <!-- 工作流画布区域 -->
    <el-row class="canvas-row">
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
            @editor-panel-save="handleEditorPanelSave"
            @nodes-change="handleNodesChange"
            @edges-change="handleEdgesChange"
            @add-node="handleAddNode"
            @auto-layout-applied="handleAutoLayoutApplied"
            @connect="handleConnect"
            @pane-context-menu="handlePaneContextMenu"
            @export="handleWorkflowExport"
            @import="handleWorkflowImport"
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
import { ArrowLeft, DocumentCopy, Check } from '@element-plus/icons-vue';

export default {
  name: "WorkflowEditor",
  components: {
    TimeExpressionValidator,
    ReactWorkflowBridge,
    WorkflowManager,
    ArrowLeft,
    DocumentCopy,
    Check,
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

      /** 添加节点后跳过下一次从 React 的同步，避免被 getWorkflowData 旧状态覆盖 */
      _skipNextSyncFromReact: false,

      /** 自动持久化并发保护 */
      _autoPersistInFlight: false,
      _pendingAutoPersist: null,
    };
  },
  methods: {
    /** 边 ID 生成（与 ReactWorkflowBridge.toEdgeId 规则一致） */
    toEdgeId(source, target, sourceHandle, targetHandle) {
      const s = source ?? '';
      const t = target ?? '';
      if (sourceHandle == null && targetHandle == null) return `e${s}-${t}`;
      return `e${s}-${t}-${sourceHandle ?? 's'}-${targetHandle ?? 't'}`;
    },

    /** 是否为前端临时节点 ID */
    isTempNodeId(nodeId) {
      return (typeof nodeId === 'number' && nodeId < 0) || String(nodeId).startsWith('temp-');
    },

    /** 节点配置是否完整（用于临时节点入库前校验） */
    isNodeConfigComplete(node) {
      const nodeType = Number(node.nodeType);
      if (nodeType === 1 || nodeType === 3) {
        return !!node.jobId;
      }
      if (nodeType === 2) {
        return !!String(node.nodeParams || '').trim();
      }
      return true;
    },

    /** 从 /workflow/save 响应中提取 workflowId（axios 拦截器成功后返回 response.data.data，即 Long 型 id） */
    extractWorkflowIdFromSaveResponse(res) {
      if (res != null && typeof res === 'number') return res;
      return res?.id ?? res?.workflowId ?? res?.data?.id ?? res?.data?.workflowId ?? null;
    },

    /** 将生命周期字段转换为后端要求格式 */
    buildProcessedWorkflowInfo() {
      const processedWorkflowInfo = { ...this.workflowInfo };
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
      return processedWorkflowInfo;
    },

    /** 构建保存 DAG（过滤临时节点及其相关边，避免上传虚拟 ID） */
    buildPersistableDagInfo(vueNodes, vueEdges) {
      const persistedNodes = vueNodes.filter((item) => !this.isTempNodeId(item.nodeId));
      const persistedNodeIds = new Set(persistedNodes.map((item) => String(item.nodeId)));
      return {
        nodes: persistedNodes.map(item => ({ nodeId: item.nodeId })),
        edges: vueEdges
          .filter((item) => persistedNodeIds.has(String(item.from)) && persistedNodeIds.has(String(item.to)))
          .map(item => {
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
    },

    /** 临时节点保存到后端（后端 saveNode 不要求 workflowId，节点可由 saveWorkflow 时再关联） */
    async saveTempNode(node) {
      const payload = [
        {
          appId: this.workflowInfo.appId,
          enable: node.enable !== false,
          skipWhenFailed: node.skipWhenFailed || false,
          nodeName: node.nodeName,
          jobId: node.jobId,
          nodeParams: node.nodeParams || '',
          type: Number(node.nodeType) || 1,
        },
      ];
      const res = await this.axios.post("/workflow/saveNode", payload);
      const created = Array.isArray(res) ? res[0] : (Array.isArray(res?.data) ? res.data[0] : res);
      if (!created || !created.id) {
        throw new Error('SAVE_NODE_RESPONSE_INVALID');
      }
      this.replaceNodeId(node.nodeId, created.id);
    },

    /** 单独保存单个节点到后端（新建或更新），不检查其他节点状态 */
    async saveSingleNode(node) {
      const isUpdate = !this.isTempNodeId(node.nodeId);
      const payload = [
        {
          appId: this.workflowInfo.appId,
          enable: node.enable !== false,
          skipWhenFailed: node.skipWhenFailed || false,
          nodeName: node.nodeName,
          jobId: node.jobId,
          nodeParams: node.nodeParams || '',
          type: Number(node.nodeType) || 1,
        },
      ];
      if (isUpdate) {
        payload[0].id = node.nodeId;
      }
      const res = await this.axios.post("/workflow/saveNode", payload);
      const saved = Array.isArray(res) ? res[0] : (Array.isArray(res?.data) ? res.data[0] : res);
      if (!saved || !saved.id) {
        throw new Error('SAVE_NODE_RESPONSE_INVALID');
      }
      if (!isUpdate) {
        this.replaceNodeId(node.nodeId, saved.id);
      }
    },

    /** 将临时节点 ID 替换为真实节点 ID，并同步修正边引用 */
    replaceNodeId(oldId, newId) {
      this.taskList = this.taskList.map((node) => {
        if (String(node.nodeId) !== String(oldId)) return node;
        return {
          ...node,
          nodeId: newId,
        };
      });
      const nextEdges = (this.peworkflowDAG.edges || []).map((edge) => ({
        ...edge,
        from: String(edge.from) === String(oldId) ? Number(newId) : edge.from,
        to: String(edge.to) === String(oldId) ? Number(newId) : edge.to,
      }));
      this.peworkflowDAG = {
        nodes: this.taskList,
        edges: nextEdges,
      };
      if (String(this.selectedNodeId) === String(oldId)) {
        this.selectedNodeId = String(newId);
      }
    },

    /** 确保所有临时节点都已完成配置并持久化 */
    async persistAllTempNodes() {
      const tempNodes = this.taskList.filter((node) => this.isTempNodeId(node.nodeId));
      if (tempNodes.length === 0) return true;

      const unconfigured = tempNodes.filter((node) => !this.isNodeConfigComplete(node));
      if (unconfigured.length > 0) {
        ElMessage.warning('存在未完成配置的新节点，请先完成目标任务配置后再保存');
        return false;
      }

      for (const node of tempNodes) {
        if (this.isTempNodeId(node.nodeId)) {
          await this.saveTempNode(node);
        }
      }
      await this.$nextTick();
      return true;
    },

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

    /** 节点选中处理（节点属性由 power-workflow-next 自带 EditorPanel 展示） */
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

    /** 节点编辑面板保存：仅保存当前节点，不检查其他节点状态 */
    async handleEditorPanelSave({ nodeId }) {
      if (this._autoPersistInFlight) {
        this._pendingAutoPersist = { nodeId };
        return;
      }
      this._autoPersistInFlight = true;
      try {
        const currentNode = this.taskList.find((item) => String(item.nodeId) === String(nodeId));
        if (!currentNode) return;
        if (this.isTempNodeId(currentNode.nodeId) && !this.isNodeConfigComplete(currentNode)) {
          ElMessage.warning('请先完成该节点配置后再保存');
          return;
        }
        await this.saveSingleNode(currentNode);
      } catch (error) {
        ElMessage.error('节点保存失败，请稍后重试');
      } finally {
        this._autoPersistInFlight = false;
        if (this._pendingAutoPersist) {
          const pending = this._pendingAutoPersist;
          this._pendingAutoPersist = null;
          await this.handleEditorPanelSave(pending);
        }
      }
    },

    /** 节点变化处理：从 React 画布同步节点/边到 Vue（拖拽、删除等） */
    handleNodesChange(changes) {
      if (this._skipNextSyncFromReact) {
        this._skipNextSyncFromReact = false;
        return;
      }
      const transientTypes = new Set(['select', 'dimensions', 'position']);
      const onlyTransient = Array.isArray(changes) && changes.length > 0 && changes.every((item) => transientTypes.has(item.type));
      if (onlyTransient) {
        return;
      }
      const state = this.$refs.workflowBridge?.getWorkflowData();
      if (state && state.vueNodes && state.vueEdges) {
        const stateIds = new Set(state.vueNodes.map((n) => n.nodeId));
        const tempNodes = this.taskList.filter(
          (n) => (typeof n.nodeId === 'number' && n.nodeId < 0) || String(n.nodeId).startsWith('temp-')
        );
        const removedIds = new Set(
          (changes || []).filter((c) => c.type === 'remove').map((c) => String(c.id))
        );
        const preserved = tempNodes.filter(
          (n) => !stateIds.has(n.nodeId) && !removedIds.has(String(n.nodeId))
        );
        const fromState = state.vueNodes.map((n) => ({
          nodeId: n.nodeId,
          nodeType: n.nodeType,
          nodeName: n.nodeName,
          jobId: n.jobId,
          nodeParams: n.nodeParams,
          positionX: n.positionX,
          positionY: n.positionY,
          enable: n.enable !== false,
          skipWhenFailed: n.skipWhenFailed || false,
        }));
        this.taskList = [...preserved, ...fromState];
        this.peworkflowDAG = {
          nodes: this.taskList,
          edges: state.vueEdges,
        };
      }
    },

    /** 连线变化处理 */
    handleEdgesChange(changes) {
      const transientTypes = new Set(['select']);
      const onlyTransient = Array.isArray(changes) && changes.length > 0 && changes.every((item) => transientTypes.has(item.type));
      if (onlyTransient) return;
      if (this._skipNextSyncFromReact) return;
      const state = this.$refs.workflowBridge?.getWorkflowData();
      if (state && state.vueNodes && state.vueEdges) {
        const stateIds = new Set(state.vueNodes.map((n) => n.nodeId));
        const tempNodes = this.taskList.filter(
          (n) => (typeof n.nodeId === 'number' && n.nodeId < 0) || String(n.nodeId).startsWith('temp-')
        );
        const preserved = tempNodes.filter((n) => !stateIds.has(n.nodeId));
        const fromState = state.vueNodes.map((n) => ({
          nodeId: n.nodeId,
          nodeType: n.nodeType,
          nodeName: n.nodeName,
          jobId: n.jobId,
          nodeParams: n.nodeParams,
          positionX: n.positionX,
          positionY: n.positionY,
          enable: n.enable !== false,
          skipWhenFailed: n.skipWhenFailed || false,
        }));
        this.taskList = [...preserved, ...fromState];
        this.peworkflowDAG = {
          nodes: this.taskList,
          edges: state.vueEdges,
        };
      }
    },

    /** 工具栏：添加节点 */
    handleAddNode({ type, position }) {
      this._skipNextSyncFromReact = true;
      const typeMap = { JOB: 1, DECISION: 2, NESTED_WORKFLOW: 3 };
      const nodeType = typeMap[type] ?? 1;
      const tempId = -Date.now();
      const newNode = {
        nodeId: tempId,
        nodeType,
        nodeName: type === 'JOB' ? this.$t('message.newJobNode') || '新任务' : type === 'DECISION' ? this.$t('message.decision') || '判断' : this.$t('message.nestedWorkflow') || '子工作流',
        jobId: type === 'JOB' || type === 'NESTED_WORKFLOW' ? undefined : undefined,
        nodeParams: '',
        positionX: typeof position?.x === 'number' ? position.x : undefined,
        positionY: typeof position?.y === 'number' ? position.y : undefined,
        enable: true,
        skipWhenFailed: false,
      };
      this.taskList = [...this.taskList, newNode];
      this.peworkflowDAG = {
        nodes: this.taskList,
        edges: this.peworkflowDAG.edges,
      };
    },

    /** 工具栏：应用自动布局后的节点/边 */
    handleAutoLayoutApplied({ vueNodes, vueEdges }) {
      this.taskList = vueNodes.map((n) => ({
        nodeId: n.nodeId,
        nodeType: n.nodeType,
        nodeName: n.nodeName,
        jobId: n.jobId,
        nodeParams: n.nodeParams,
        positionX: n.positionX,
        positionY: n.positionY,
        enable: n.enable !== false,
        skipWhenFailed: n.skipWhenFailed || false,
      }));
      this.peworkflowDAG = { nodes: this.taskList, edges: vueEdges };
    },

    /** 画布空白区域右键 */
    handlePaneContextMenu() {
      ElMessage.info('已触发画布右键事件，可继续接入右键菜单能力');
    },

    /** 画布连线：新建连线时同步到 peworkflowDAG（edge id 规则与 ReactWorkflowBridge.toEdgeId 一致） */
    handleConnect(connection) {
      const edgeId = this.toEdgeId(connection.source, connection.target, connection.sourceHandle, connection.targetHandle);
      const exists = (this.peworkflowDAG.edges || []).some((edge) => {
        return String(edge.from) === String(connection.source) &&
          String(edge.to) === String(connection.target) &&
          (edge.sourceHandle || undefined) === (connection.sourceHandle || undefined) &&
          (edge.targetHandle || undefined) === (connection.targetHandle || undefined);
      });
      if (!exists) {
        const nextEdges = [
          ...(this.peworkflowDAG.edges || []),
          {
            id: edgeId,
            from: Number(connection.source),
            to: Number(connection.target),
            sourceHandle: connection.sourceHandle || undefined,
            targetHandle: connection.targetHandle || undefined,
            property: '',
          },
        ];
        this.peworkflowDAG = {
          nodes: this.peworkflowDAG.nodes,
          edges: nextEdges,
        };
      }
    },

    /** 工具栏：导出工作流 JSON */
    handleWorkflowExport() {
      const { vueNodes, vueEdges } = this.$refs.workflowBridge?.getWorkflowData() || {};
      if (!vueNodes || !vueEdges) return;
      const json = JSON.stringify({ nodes: vueNodes, edges: vueEdges }, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow-${this.workflowInfo.wfName || 'export'}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    /** 工具栏：导入工作流（打开导入任务抽屉） */
    handleWorkflowImport() {
      this.importDrawerVisible = true;
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
    async saveWorkflow(options = {}) {
      const { skipTempNodeCheck = false } = options;
      if (this.saveLoading) return;
      this.saveLoading = true;
      try {
        if (!skipTempNodeCheck) {
          const tempOk = await this.persistAllTempNodes();
          if (!tempOk) return;
        }

        // 从 Bridge 获取最新的 DAG 数据（临时节点已在 persistAllTempNodes 中落库并替换为真实 ID）
        const { vueNodes, vueEdges } = this.$refs.workflowBridge.getWorkflowData();
        const dagInfo = this.buildPersistableDagInfo(vueNodes, vueEdges);
        if (!dagInfo.nodes?.length) {
          ElMessage.warning('请至少添加并配置一个节点后再保存工作流');
          return;
        }
        const savePayload = {
          ...this.buildProcessedWorkflowInfo(),
          dag: dagInfo,
        };

        const saveRes = await this.axios.post("/workflow/save", savePayload);
        const workflowId = this.extractWorkflowIdFromSaveResponse(saveRes);
        if (!this.workflowInfo.id && workflowId) {
          this.workflowInfo.id = workflowId;
        }

        ElMessage.success(this.$t("message.success"));
      } catch (error) {
        ElMessage.error('工作流保存失败，请稍后重试');
        throw error;
      } finally {
        this.saveLoading = false;
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

    // 无论新建或编辑，进入页面即加载任务/工作流选项，供编辑面板「目标任务」下拉使用
    this.listJobInfos();
    this.loadWorkflowOptions();
  },
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700&display=swap');

*,
*::after,
*::before {
  box-sizing: border-box;
}

.workflow-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  font-family: 'Outfit', -apple-system, sans-serif;
  background: #fafbfc;
}

/* ========== 顶部操作栏 ========== */
.wf-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Outfit', sans-serif;
}

.back-btn:hover {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  color: #334155;
  transform: translateX(-2px);
}

.back-btn:active {
  transform: translateX(0);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Outfit', sans-serif;
}

.action-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #334155;
}

.action-btn.save-btn {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  border-color: #22c55e;
  color: white;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.2);
}

.action-btn.save-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  transform: translateY(-1px);
}

.action-btn.save-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.action-btn:active:not(:disabled) {
  transform: translateY(0);
}

/* ========== 信息区域 ========== */
.wf-info-section {
  padding: 0 16px 12px 16px;
}

.info-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.compact-form {
  padding: 16px;
  width: 66.666%;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.form-row.full-width {
  grid-template-columns: 1fr;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-family: 'Outfit', sans-serif;
}

.form-input {
  width: 100%;
}

.form-input :deep(.el-input__wrapper) {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.form-input :deep(.el-input__wrapper:hover) {
  border-color: #cbd5e1;
  background: #f1f5f9;
}

.form-input :deep(.el-input__wrapper.is-focus) {
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input :deep(.el-input__inner) {
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  color: #1e293b;
}

.form-input :deep(.el-input__inner::placeholder) {
  color: #cbd5e1;
}

.form-input :deep(.el-select__wrapper) {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.form-input :deep(.el-select__wrapper:hover) {
  border-color: #cbd5e1;
  background: #f1f5f9;
}

.form-input :deep(.el-select__wrapper.is-focused) {
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input :deep(.el-date-editor__wrapper) {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.form-input :deep(.el-date-editor__wrapper:hover) {
  border-color: #cbd5e1;
  background: #f1f5f9;
}

.form-input :deep(.el-date-editor__wrapper.is-active) {
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input :deep(.el-input-number__wrapper) {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.form-input :deep(.el-input-number__wrapper:hover) {
  border-color: #cbd5e1;
  background: #f1f5f9;
}

.form-input :deep(.el-input-number__wrapper.is-focus) {
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input.compact-number :deep(.el-input-number__wrapper) {
  width: 100px;
}

.input-group {
  display: flex;
  gap: 6px;
  align-items: center;
}

.input-group .form-input {
  flex: 1;
}

.validate-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
  font-weight: 500;
}

.validate-btn:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.validate-btn:active {
  transform: scale(0.98);
}

/* ========== 画布区域 ========== */
.canvas-row {
  flex: 1;
  min-height: 400px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.power-dag {
  width: 100%;
  height: 100%;
  display: flex;
  min-height: 0;
}

.power-flow {
  background: #fff;
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.power-import-body {
  padding: 0px 20px;
}

.power-import-table .el-table-column--selection > .cell {
  padding-left: 15px;
}
</style>
