<template>
<div id="workflow_manager" class="list-page">
    <div class="page-heading list-heading"><div><h1>{{$t('message.tabWorkflowManage')}}</h1><p>{{$t('message.workflowsDescription')}}</p></div><el-button v-if="!isWorkflow" type="primary" @click="onClickNewWorkflow"><PjIcon name="plus"/>{{$t('message.newWorkflow')}}</el-button></div>

    <div class="list-toolbar">
        <el-form :inline="true" :model="workflowQueryContent" class="filter-form">
            <el-form-item :label="$t('message.wfId')"><el-input v-model="workflowQueryContent.workflowId" :placeholder="$t('message.wfId')"/></el-form-item>
            <el-form-item :label="$t('message.keyword')"><el-input v-model="workflowQueryContent.keyword" :placeholder="$t('message.keyword')"/></el-form-item>
            <el-form-item class="filter-actions">
                <el-button type="primary" @click="searchWorkflows">{{$t('message.query')}}</el-button>
                <el-button @click="onClickReset">{{$t('message.reset')}}</el-button>
            </el-form-item>
        </el-form>
    </div>

    <!--第二行，工作流数据表格-->
    <section class="list-surface">
        <el-table v-loading="listLoading" :data="workflowPageResult.data" style="width: 100%" :type="isWorkflow ? 'selection' : null">
            <el-table-column :show-overflow-tooltip="true" prop="id" :label="$t('message.wfId')" width="120"/>
            <el-table-column :show-overflow-tooltip="true" prop="wfName" :label="$t('message.wfName')" min-width="180"/>
            <el-table-column :show-overflow-tooltip="true" :label="$t('message.scheduleInfo')" min-width="180" >
                <template #default="scope">
                    {{scope.row.timeExpressionType}}  {{scope.row.timeExpression}}
                </template>
            </el-table-column>
            <el-table-column :show-overflow-tooltip="true" :label="$t('message.status')" width="80" v-if="!isWorkflow">
                <template #default="scope">
                    <el-switch v-model="scope.row.enable" @change="switchWorkflow(scope.row)"/>
                </template>
            </el-table-column>
            <el-table-column :show-overflow-tooltip="true" :label="$t('message.operation')" :width="isWorkflow ? 100 : 300">
                <template #default="scope">
                    <div v-if="!isWorkflow">
                        <el-button link size="small" @click="onClickModifyWorkflow(scope.row)">{{$t('message.edit')}}</el-button>
                        <el-button link size="small" @click="onClickCopy(scope.row)" :loading="copyLoading">{{$t('message.copy')}}</el-button>
                        <el-dropdown>
                            <el-button link :style="{marginRight: '10px', marginLeft: '10px'}" size="small" @click="onClickRunWorkflow(scope.row)">{{$t('message.run')}}</el-button>
                            <template #dropdown><el-dropdown-menu>
                                <el-dropdown-item>
                                    <el-button link size="small" type="text" @click="onClickRunByParameter(scope.row)">{{$t('message.runByParameter')}}</el-button>
                                </el-dropdown-item>
                            </el-dropdown-menu></template>
                        </el-dropdown>
                        <el-button link size="small" type="danger" @click="onClickDeleteWorkflow(scope.row)">{{$t('message.delete')}}</el-button>
                    </div>
                    <div v-if="isWorkflow">
                        <el-button link size="small" @click="onImportNode(scope.row)">引入</el-button>
                    </div>
                </template>
            </el-table-column>
        </el-table>

    <!-- 第三行，分页插件 -->
    <div class="list-footer">
        <el-pagination
                layout="total, prev, pager, next" :current-page="workflowQueryContent.index + 1"
                :total="workflowPageResult.totalItems"
                :page-size="workflowPageResult.pageSize"
                @current-change="onClickChangePage"
                :hide-on-single-page="true"/>
    </div>
    </section>
    <el-dialog
            :title="$t('message.runByParameter')"
            :model-value="!!temporaryRowData" @close="onClickRunCancel"
            width="50%"
        >
            <el-input
                type="textarea"
                :rows="4"
                :placeholder="$t('message.enteringParameter')"
                v-model="runParameter">
            </el-input>
            <template #footer><span class="dialog-footer">
                <el-button @click="onClickRunCancel">{{$t('message.cancel')}}</el-button>
                <el-button type="primary" @click="onClickRunWorkflow(temporaryRowData)" :loading="runLoading">{{$t('message.run')}}</el-button>
            </span></template>
        </el-dialog>
</div>
</template>

<script>
    export default {
        name: "WorkflowManager",
        props: ['isWorkflow'],
        data() {
            return {
      listGeneration: 0, listLoading: false,
                // 查询条件
                workflowQueryContent: {
                    appId: window.localStorage.getItem("Power_appId"),
                    index: 0,
                    pageSize: 10,
                    workflowId: undefined,
                    keyword: undefined
                },
                // 工作流查询结果
                workflowPageResult: {
                    pageSize: 10,
                    totalItems: 0,
                    data: []
                },
                // 复制loading
                copyLoading: false,
                // 新建工作流对象
                workflowObj: {

                },
                temporaryRowData: null,
                // 运行参数
                runParameter: null,
                // 运行loading
                runLoading: false
            }
        },
        methods: {
            searchWorkflows() { this.workflowQueryContent.index = 0; return this.listWorkflow(); },
            // 查询工作流
            async listWorkflow() {
                const generation = ++this.listGeneration; this.listLoading = true;
      try { const response = await this.axios.post('/workflow/list', { ...this.workflowQueryContent }); if (generation === this.listGeneration) this.workflowPageResult = response; } catch { /* Keep the last loaded page for retry. */ } finally { if (generation === this.listGeneration) this.listLoading = false; }
            },
            /** 引入嵌套工作流节点 */
            onImportNode(data) {
                this.$emit('onImportNode', data)
            },
            // 点击重置
            onClickReset() {
                this.workflowQueryContent.index = 0;
                this.workflowQueryContent.workflowId = undefined;
                this.workflowQueryContent.keyword = undefined;
                this.listWorkflow();
            },
            // 开关工作流
            switchWorkflow(data) {
                const previousEnable = !data.enable;
                let path = data.enable ? "enable" : "disable";
                let url = "/workflow/" + path + "?appId=" + window.localStorage.getItem("Power_appId") + "&workflowId=" + data.id;
                this.axios.get(url).then(() => {
                    this.listWorkflow();
                }, () => {
                    data.enable = previousEnable;
                });
            },
            // 编辑工作流
            onClickModifyWorkflow(data) {
                this.$router.push({
                    name: 'workflowEditor',
                    query: {
                        workflowId: data.id
                    }
                })
            },
            // 立即运行工作流
            onClickRunWorkflow(data) {
                if (this.runLoading) return;
                let that = this;
                let url = "/workflow/run?appId=" + window.localStorage.getItem("Power_appId") + "&workflowId=" + data.id;
                if (this.temporaryRowData && this.runParameter) {
                    url += `&initParams=${encodeURIComponent(this.runParameter)}`
                }
                this.runLoading = true;
                this.axios.get(url).then(() => {
                    that.$message.success(this.$t('message.success'))
                    this.temporaryRowData = null;
                    this.runLoading = false
                }).catch(() => {
                    this.runLoading = false
                });
            },
            // 参数运行
            onClickRunByParameter(data) {
                this.runParameter = '';
                this.temporaryRowData = data;
            },
            // 取消参数运行
            onClickRunCancel() {
                this.temporaryRowData = null;
                this.runParameter = null;
            },
            // 删除工作流
            async onClickDeleteWorkflow(data) {
                try { await this.$confirm(this.$t('message.deleteConfirmation', { name: data.wfName }), this.$t('message.confirmTitle'), { type: 'warning' }); } catch { return; }
                let that = this;
                let url = "/workflow/delete?appId=" + window.localStorage.getItem("Power_appId") + "&workflowId=" + data.id;
                this.axios.get(url).then(() => {
                    that.$message.success(this.$t('message.success'));
                    that.listWorkflow();
                }).catch(() => {});
            },
            // 新建工作流
            onClickNewWorkflow() {
                this.$router.push({
                    name: 'workflowEditor',
                    query: {
                        modify: 'false'
                    }
                })
            },
            // 点击换页
            onClickChangePage(index) {
                // 后端从0开始，前端从1开始
                this.workflowQueryContent.index = index - 1;
                this.listWorkflow();
            },
            /** 复制工作流 */
            onClickCopy(data) {
                if (this.copyLoading) return;
                this.copyLoading = true
                this.axios.post(`/workflow/copy?workflowId=${data.id}&appId=${this.workflowQueryContent.appId}`).then(res => {
                    this.$router.push({
                        name: 'workflowEditor',
                        query: {
                            workflowId: res
                        }
                    });
                    this.copyLoading = false;
                    this.$message.success(this.$t('message.success'));
                }).catch(() => {
                    this.copyLoading = false;
                })
            }
        },
        mounted() {
            this.listWorkflow();
        },
  beforeUnmount() { this.listGeneration++ },
}
</script>

<style scoped src="./page-layout.css"></style>
