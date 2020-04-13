<template>
    <div id="job_manager">

        <!--第一行，条件搜索栏（row布局：gutter代表栅格间隔，span代表占用格数）-->
        <el-row :gutter="20">

            <!-- 左侧搜索栏，占地面积 20/24 -->
            <el-col :span="20">
                <el-form :inline="true" :model="jobQueryContent" class="el-form--inline">
                    <el-form-item label="任务ID">
                        <el-input v-model="jobQueryContent.jobId" placeholder="任务ID"/>
                    </el-form-item>
                    <el-form-item label="关键字">
                        <el-input v-model="jobQueryContent.keyword" placeholder="关键字"/>
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" @click="listJobInfos">查询</el-button>
                        <el-button type="cancel">重置</el-button>
                    </el-form-item>
                </el-form>
            </el-col>

            <!-- 右侧新增任务按钮，占地面积 4/24 -->
            <el-col :span="4">
                <el-row>
                    <el-button type="success" @click="onClickNewJob">新建任务</el-button>
                </el-row>
            </el-col>
        </el-row>

        <!--第二行，任务数据表格-->
        <el-row>
            <el-table :data="jobInfoPageResult.data" style="width: 100%">
                <el-table-column prop="id" label="任务ID"/>
                <el-table-column prop="jobName" label="任务名称"/>
                <el-table-column prop="timeExpressionType" label="定时类型"/>
                <el-table-column prop="executeType" label="执行类型"/>
                <el-table-column prop="processorType" label="处理器类型"/>
                <el-table-column label="状态">
                    <template slot-scope="scope">
                        <el-switch v-model="scope.row.enable" active-color="#13ce66" inactive-color="#ff4949" @change="changeJobStatus(scope.row)"/>
                    </template>
                </el-table-column>
                <el-table-column label="操作">
                    <template slot-scope="scope">
                        <el-button size="mini" @click="onClickModify(scope.row)">编辑</el-button>
                        <el-button size="mini" @click="onClickRun(scope.row)">运行</el-button>
                        <el-button size="mini" type="danger" @click="onClickDeleteJob(scope.row)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-row>

        <!-- 第三行，分页插件 -->
        <el-row>
            <el-pagination layout="prev, pager, next" :total="this.jobInfoPageResult.totalItems" :page-size="this.jobInfoPageResult.pageSize"/>
        </el-row>


        <el-dialog title="新建/修改任务" :visible="modifiedJobFormVisible">
            <el-form :model="modifiedJobForm" label-width="80px">

                <el-form-item label="任务名称">
                    <el-input v-model="modifiedJobForm.jobName"/>
                </el-form-item>
                <el-form-item label="任务描述">
                    <el-input v-model="modifiedJobForm.jobDescription"/>
                </el-form-item>
                <el-form-item label="任务参数">
                    <el-input v-model="modifiedJobForm.jobParams"/>
                </el-form-item>
                <el-form-item label="定时信息">
                    <el-row>
                        <el-col :span="5">
                            <el-select v-model="modifiedJobForm.timeExpressionType" placeholder="时间表达式类型">
                                <el-option
                                        v-for="item in timeExpressionTypeOptions"
                                        :key="item.key"
                                        :label="item.label"
                                        :value="item.key">
                                </el-option>
                            </el-select>
                        </el-col>
                        <el-col :span="19">
                            <el-input v-model="modifiedJobForm.timeExpression" placeholder="CRON填写CRON表达式，秒级任务填写整数，API无需填写" />
                        </el-col>
                    </el-row>
                </el-form-item>
                <el-form-item label="执行配置">
                    <el-row>
                        <el-col :span="5">
                            <el-select v-model="modifiedJobForm.executeType" placeholder="执行类型">
                                <el-option
                                        v-for="item in executeTypeOptions"
                                        :key="item.key"
                                        :label="item.label"
                                        :value="item.key">
                                </el-option>
                            </el-select>
                        </el-col>

                        <el-col :span="5">
                            <el-select v-model="modifiedJobForm.processorType" placeholder="处理器类型">
                                <el-option
                                        v-for="item in processorTypeOptions"
                                        :key="item.key"
                                        :label="item.label"
                                        :value="item.key">
                                </el-option>
                            </el-select>
                        </el-col>

                        <el-col :span="14">
                            <el-input v-model="modifiedJobForm.processorInfo" placeholder="内置Java填写处理器的全限定类名" />
                        </el-col>
                    </el-row>
                </el-form-item>
                <el-form-item label="运行配置">
                    <el-row>
                        <el-col :span="8">
                            <el-input placeholder="最大实例数" v-model="modifiedJobForm.maxInstanceNum" class="ruleContent">
                                <template slot="prepend">最大实例数</template>
                            </el-input>
                        </el-col>
                        <el-col :span="8">
                            <el-input placeholder="单机线程并发度" v-model="modifiedJobForm.concurrency" class="ruleContent">
                                <template slot="prepend">单机线程并发度</template>
                            </el-input>
                        </el-col>
                        <el-col :span="8">
                            <el-input placeholder="运行时间限制" v-model="modifiedJobForm.instanceTimeLimit" class="ruleContent">
                                <template slot="prepend">运行时间限制</template>
                            </el-input>
                        </el-col>
                    </el-row>
                </el-form-item>
                <el-form-item label="重试配置">
                    <el-row>
                        <el-col :span="12">
                            <el-input placeholder="任务重试次数" v-model="modifiedJobForm.instanceRetryNum" class="ruleContent">
                                <template slot="prepend">任务重试次数</template>
                            </el-input>
                        </el-col>
                        <el-col :span="12">
                            <el-input placeholder="仅MR和广播执行模式下生效" v-model="modifiedJobForm.taskRetryNum" class="ruleContent">
                                <template slot="prepend">子任务重试次数</template>
                            </el-input>
                        </el-col>
                    </el-row>
                </el-form-item>
                <el-form-item label="机器配置">
                    <el-row>
                        <el-col :span="8">
                            <el-input placeholder="最低CPU核心数" v-model="modifiedJobForm.minCpuCores" class="ruleContent">
                                <template slot="prepend">最低CPU核心数</template>
                            </el-input>
                        </el-col>
                        <el-col :span="8">
                            <el-input placeholder="最低内存(GB)" v-model="modifiedJobForm.minMemorySpace" class="ruleContent">
                                <template slot="prepend">最低内存（GB</template>
                            </el-input>
                        </el-col>
                        <el-col :span="8">
                            <el-input placeholder="最低磁盘空间(GB)" v-model="modifiedJobForm.minDiskSpace" class="ruleContent">
                                <template slot="prepend">最低磁盘空间</template>
                            </el-input>
                        </el-col>
                    </el-row>
                </el-form-item>
                <el-form-item label="集群配置">
                    <el-row>
                        <el-col :span="16">
                            <el-input placeholder="执行机器地址（可选，不指定代表全部；多值英文逗号分割）" v-model="modifiedJobForm.designatedWorkers" class="ruleContent">
                                <template slot="prepend">执行机器地址</template>
                            </el-input>
                        </el-col>
                        <el-col :span="8">
                            <el-input placeholder="最大执行机器数量（0代表不限）" v-model="modifiedJobForm.maxWorkerCount" class="ruleContent">
                                <template slot="prepend">最大执行机器数量</template>
                            </el-input>
                        </el-col>
                    </el-row>
                </el-form-item>
                <el-form-item label="报警配置">
                    <label>TODO: 开发中（先完成核心功能再说）</label>
                </el-form-item>

                <el-form-item>
                    <el-button type="primary" @click="saveJob">保存</el-button>
                    <el-button @click="modifiedJobFormVisible = false">取消</el-button>
                </el-form-item>

            </el-form>
        </el-dialog>
    </div>
</template>

<script>
    export default {
        name: "JobManager",
        data() {
            return {
                modifiedJobFormVisible: false,
                // 新建任务对象
                modifiedJobForm: {
                    id: undefined,
                    jobName: "",
                    jobDescription: "",
                    appId: this.$store.state.appInfo.id,
                    jobParams: "",
                    timeExpressionType: "",
                    timeExpression: "",
                    executeType: "",
                    processorType: "",
                    processorInfo: "",
                    maxInstanceNum: 1,
                    concurrency: 5,
                    instanceTimeLimit: 0,
                    instanceRetryNum: 1,
                    taskRetryNum: 1,

                    minCpuCores: 0,
                    minMemorySpace: 0,
                    minDiskSpace: 0,

                    enable: true,
                    designatedWorkers: "",
                    maxWorkerCount: 0

                },
                // 任务查询请求对象
                jobQueryContent: {
                    appId: this.$store.state.appInfo.id,
                    index: 0,
                    pageSize: 10,
                    jobId: undefined,
                    keyword: undefined
                },
                // 任务列表（查询结果），包含index、pageSize、totalPages、totalItems、data（List类型）
                jobInfoPageResult: {
                    pageSize: 10,
                    totalItems: 0,
                    data: []
                },
                // 时间表达式选择类型
                timeExpressionTypeOptions: [{key: "API", label: "API"}, {key: "CRON", label: "CRON"}, {key: "FIX_RATE", label: "固定频率（单位毫秒）"}, {key: "FIX_DELAY", label: "固定延迟（单位毫秒）"} ],
                // 处理器类型
                processorTypeOptions: [{key: "EMBEDDED_JAVA", label: "内置JAVA处理器"}],
                // 执行方式类型
                executeTypeOptions: [{key: "STANDALONE", label: "单机执行"}, {key: "BROADCAST", label: "广播执行"}, {key: "MAP_REDUCE", label: "MAP_REDUCE"}]

            }
        },
        methods: {
            // 保存变更，包括新增和修改
            saveJob() {
                const that = this;
                this.axios.post("/job/save", this.modifiedJobForm).then(() => {
                    that.modifiedJobFormVisible = false;
                    that.$message.success("保存成功！");

                    // 重新加载数据
                    that.listJobInfos();

                }, () => that.modifiedJobFormVisible = false);
            },
            // 列出符合当前搜索条件的任务
            listJobInfos() {
                const that = this;
                this.axios.post("/job/list", this.jobQueryContent).then((res) => {
                    that.jobInfoPageResult = res;
                });
            },
            // 修改任务状态
            changeJobStatus(data) {
                // switch 会自动更改 enable 的值
                this.modifiedJobForm = data;
                this.saveJob();
            },
            // 新增任务，去除旧数据
            onClickNewJob() {
                this.modifiedJobForm.id = undefined;
                this.modifiedJobForm.jobName = undefined;
                this.modifiedJobForm.jobDescription = undefined;
                this.modifiedJobForm.jobParams = undefined;
                this.modifiedJobForm.timeExpression = undefined;
                this.modifiedJobForm.timeExpressionType = undefined;
                this.modifiedJobForm.processorInfo = undefined;
                this.modifiedJobForm.processorType = undefined;
                this.modifiedJobForm.executeType = undefined;

                this.modifiedJobFormVisible = true;
            },
            // 点击 编辑按钮
            onClickModify(data) {
                this.modifiedJobForm = data;
                this.modifiedJobFormVisible = true;
            },
            // 点击 立即运行按钮
            onClickRun(data) {
                let that = this;
                let url = "/job/run?jobId=" + data.id;
                this.axios.get(url).then(() => that.$message.success("触发成功"));
            },
            // 点击 删除任务
            onClickDeleteJob(data) {
                let that = this;
                let url = "/job/delete?jobId=" + data.id;
                this.axios.get(url).then(() => {
                    that.$message.success("删除成功");
                    that.listJobInfos();
                });
            }
        }
    }
</script>

<style scoped>

</style>
