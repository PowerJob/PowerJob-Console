<template>
    <div id="instance_manager">
        <!-- 第一行，搜索区 -->
        <el-row>
            <el-col :span="20">
                <el-form :inline="true" :model="instanceQueryContent" class="el-form--inline">
                    <el-form-item label="实例ID">
                        <el-input v-model="instanceQueryContent.instanceId" placeholder="实例ID"/>
                    </el-form-item>
                    <el-form-item label="任务ID">
                        <el-input v-model="instanceQueryContent.jobId" placeholder="任务ID"/>
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" @click="listInstanceInfos">查询</el-button>
                        <el-button type="cancel" @click = "onClickRest">重置</el-button>
                    </el-form-item>
                </el-form>
            </el-col>
            <el-col :span="4">
                <el-button type="primary" @click="listInstanceInfos">刷新</el-button>
            </el-col>
        </el-row>

        <!-- 第二行，表单 -->
        <el-row>
            <el-table :data="instancePageResult.data" style="width: 100%" :row-class-name="instanceTableRowClassName">
                <el-table-column prop="jobId" label="任务ID"/>
                <el-table-column prop="jobName" label="任务名称"/>
                <el-table-column prop="instanceId" label="实例ID"/>
                <el-table-column prop="statusStr" label="状态"/>
                <el-table-column prop="actualTriggerTime" label="触发时间"/>
                <el-table-column prop="finishedTime" label="结束时间"/>

                <el-table-column label="操作">
                    <template slot-scope="scope">
                        <el-button size="mini" @click="onClickShowDetail(scope.row)">详情</el-button>
                        <el-button size="mini" @click="onClickStop(scope.row)">停止</el-button>
                    </template>
                </el-table-column>

            </el-table>
        </el-row>

        <!-- 第三行，分页插件 -->
        <el-row>
            <el-col :span="24">
                <el-pagination
                        :hide-on-single-page="true"
                        :total="this.instancePageResult.totalItems"
                        :page-size="this.instancePageResult.pageSize"
                        @current-change="onClickChangePage"
                        layout="prev, pager, next"/>
            </el-col>
        </el-row>

        <!--  任务实例详情弹出框，暂时简单显示 String... -->
        <el-dialog title="任务详情" :visible.sync="instanceDetailVisible">
            <el-row>
                <el-col :span="8">
                    状态: {{instanceDetail.status}}
                </el-col>
                <el-col :span="16">
                    运行次数：{{instanceDetail.runningTimes}}
                </el-col>
            </el-row>
            <el-row>
                <el-col :span="24">
                    TaskTracker地址: {{instanceDetail.taskTrackerAddress}}
                </el-col>
            </el-row>
            <el-row>
                <el-col :span="8">
                    开始时间: {{this.common.timestamp2Str(instanceDetail.actualTriggerTime)}}
                </el-col>
                <el-col :span="8">
                    结束时间: {{this.common.timestamp2Str(instanceDetail.finishedTime)}}
                </el-col>
            </el-row>
            <el-row>
                <el-col :span="24">
                    运行结果: {{instanceDetail.result}}
                </el-col>
            </el-row>
            <el-row id="taskDetail">
                子任务数据: {{instanceDetail.taskDetail}}
            </el-row>
            <el-row>
                最近10条秒级任务历史记录
                <el-table  :data="instanceDetail.subInstanceDetails" style="width: 100%">
                    <el-table-column prop="subInstanceId" label="子实例ID" width="100"/>
                    <el-table-column prop="startTime" label="开始时间" width="160"/>
                    <el-table-column prop="finishedTime" label="结束时间" width="160"/>
                    <el-table-column prop="status" label="运行状态" width="100"/>
                    <el-table-column prop="result" label="运行结果"/>
                </el-table>
            </el-row>
        </el-dialog>
    </div>
</template>

<script>
    export default {
        name: "InstanceManager",
        data () {
            return {
                // 实例查询对象
                instanceQueryContent: {
                    appId: this.$store.state.appInfo.id,
                    index: 0,
                    pageSize: 10,
                    instanceId: undefined,
                    jobId: undefined
                },
                // 实例查询结果
                instancePageResult: {
                    pageSize: 10,
                    totalItems: 0,
                    data: []
                },
                // 某个任务的详细信息
                instanceDetail: {},
                // 详细信息弹出框是否可见
                instanceDetailVisible: false
            }
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
                this.listInstanceInfos();
            },
            // 点击查询详情
            onClickShowDetail(data) {
                let that = this;
                let url = "/instance/status?instanceId=" + data.instanceId;
                this.axios.get(url).then((res) => {
                    that.instanceDetail = res;
                    that.instanceDetailVisible = true;
                });
            },
            // 点击停止实例
            onClickStop(data) {
                let that = this;
                let url = "/instance/stop?instanceId=" + data.instanceId;
                this.axios.get(url).then(() => {
                    that.$message.success("停止成功");
                    // 重新加载列表
                    that.listInstanceInfos();
                });
            },
            // 换页
            onClickChangePage(index) {
                // 后端从0开始，前端从1开始
                this.instanceQueryContent.index = index - 1;
                this.listInstanceInfos();
            },
            instanceTableRowClassName({row}) {
                switch (row.status) {
                    // 失败
                    case 4: return 'error-row';
                    // 成功
                    case 5: return 'success-row';
                    case 10: return 'warning-row';
                }
            }
        },
        mounted() {
            this.listInstanceInfos();
        }
    }
</script>

<style scoped>

</style>
