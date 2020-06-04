<template>
<div id="workflow_manager">

    <!--第一行，条件搜索栏-->
    <el-row :gutter="20">

        <!-- 左侧搜索栏，占地面积 20/24 -->
        <el-col :span="20">
            <el-form :inline="true" :model="workflowQueryContent" class="el-form--inline">
                <el-form-item label="工作流ID">
                    <el-input v-model="workflowQueryContent.workflowId" placeholder="工作流ID"/>
                </el-form-item>
                <el-form-item label="关键字">
                    <el-input v-model="workflowQueryContent.keyword" placeholder="关键字"/>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="listWorkflow">查询</el-button>
                    <el-button type="cancel" @click="onClickReset">重置</el-button>
                </el-form-item>
            </el-form>
        </el-col>

        <!-- 右侧新增任务按钮，占地面积 4/24 -->
        <el-col :span="4">
            <div style="float:right;padding-right:10px">
                <el-button type="primary" >新建工作流</el-button>
            </div>
        </el-col>
    </el-row>

    <!--第二行，工作流数据表格-->
    <el-row>
        <el-table :data="workflowPageResult.data" style="width: 100%">
            <el-table-column prop="id" label="工作流ID" width="80"/>
            <el-table-column prop="wfName" label="工作流名称" />
            <el-table-column label="定时信息" >
                <template slot-scope="scope">
                    {{scope.row.timeExpressionType}}  {{scope.row.timeExpression}}
                </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
                <template slot-scope="scope">
                    <el-switch v-model="scope.row.enable" active-color="#13ce66" inactive-color="#ff4949" @change="switchWorkflow(scope.row)"/>
                </template>
            </el-table-column>
            <el-table-column label="操作" width="300">
                <template slot-scope="scope">
                    <el-button size="medium" @click="onClickModifyWorkflow(scope.row)">编辑</el-button>
                    <el-button size="medium" @click="onClickRunWorkflow(scope.row)">运行</el-button>
                    <el-button size="medium" type="danger" @click="onClickDeleteWorkflow(scope.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>
    </el-row>
</div>
</template>

<script>
    export default {
        name: "WorkflowManager",
        data() {
            return {
                // 查询条件
                workflowQueryContent: {
                    appId: this.$store.state.appInfo.id,
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
                // 新建工作流对象
                workflowObj: {

                },
            }
        },
        methods: {
            // 查询工作流
            listWorkflow() {
                const that = this;
                this.axios.post("/workflow/list", this.workflowQueryContent).then((res) => {
                    that.workflowPageResult = res;
                });
            },
            // 点击重置
            onClickReset() {
                this.workflowQueryContent.workflowId = undefined;
                this.workflowQueryContent.keyword = undefined;
            },
            // 开关工作流
            switchWorkflow(data) {
                console.log(data);
            },
            // 编辑工作流
            onClickModifyWorkflow(data) {
                console.log(data)
            },
            // 立即运行工作流
            onClickRunWorkflow(data) {
                let that = this;
                let url = "/workflow/run?appId=" + this.$store.state.appInfo.id + "&workflowId=" + data.id;
                this.axios.get(url).then(() => that.$message.success("触发成功"));
            },
            // 删除工作流
            onClickDeleteWorkflow(data) {
                let that = this;
                let url = "/workflow/delete?appId=" + this.$store.state.appInfo.id + "&workflowId=" + data.id;
                this.axios.get(url).then(() => {
                    that.$message.success("删除成功");
                    that.listWorkflow();
                });
            },
            // 保存工作流
            saveWorkflow() {
                const that = this;
                this.axios.post("/workflow/save", this.workflowObj).then(() => {
                    that.$message.success("保存成功！");
                    // 重新加载数据
                    that.listJobInfos();
                }, () => that.modifiedJobFormVisible = false);
            }

        },
        mounted() {
            this.listWorkflow();
        }
    }
</script>

<style scoped>

</style>
