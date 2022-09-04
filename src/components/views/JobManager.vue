<template>
    <div id="job_manager">

        <!--第一行，条件搜索栏（row布局：gutter代表栅格间隔，span代表占用格数）-->
        <el-row :gutter="20">

            <!-- 左侧搜索栏，占地面积 20/24 -->
            <el-col :span="20">
                <el-form :inline="true" :model="jobQueryContent" class="el-form--inline">
                    <el-form-item :label="$t('message.jobId')">
                        <el-input v-model="jobQueryContent.jobId" :placeholder="$t('message.jobId')"/>
                    </el-form-item>
                    <el-form-item :label="$t('message.keyword')">
                        <el-input v-model="jobQueryContent.keyword" :placeholder="$t('message.keyword')"/>
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" @click="listJobInfos">{{$t('message.query')}}</el-button>
                        <el-button type="cancel" @click="onClickReset">{{$t('message.reset')}}</el-button>
                    </el-form-item>
                </el-form>
            </el-col>

            <!-- 右侧新增任务按钮，占地面积 4/24 -->
            <el-col :span="4">
                <div style="float:right;padding-right:10px">
                <el-button type="primary" @click="onClickNewJob">{{$t('message.newJob')}}</el-button>
                </div>
            </el-col>
        </el-row>

        <!--第二行，任务数据表格-->
        <el-row>
            <el-table :data="jobInfoPageResult.data" style="width: 100%">
                <el-table-column prop="id" :label="$t('message.jobId')" width="80"/>
                <el-table-column prop="jobName" :label="$t('message.jobName')" />
                <el-table-column :label="$t('message.scheduleInfo')" >
                    <template slot-scope="scope">
                        {{scope.row.timeExpressionType}}  {{scope.row.timeExpression}}
                    </template>
                </el-table-column>
                <el-table-column :label="$t('message.executeType')">
                    <template slot-scope="scope">
                        {{translateExecuteType(scope.row.executeType)}}
                    </template>
                </el-table-column>
                <el-table-column :label="$t('message.processorType')">
                    <template slot-scope="scope">
                        {{translateProcessorType(scope.row.processorType)}}
                    </template>
                </el-table-column>
                <el-table-column :label="$t('message.status')" width="80">
                    <template slot-scope="scope">
                        <el-switch v-model="scope.row.enable" active-color="#13ce66" inactive-color="#ff4949" @change="changeJobStatus(scope.row)"/>
                    </template>
                </el-table-column>
                <el-table-column :label="$t('message.operation')" width="150">
                    <template slot-scope="scope">
                        <el-button size="mini" type="text" @click="onClickModify(scope.row)">{{$t('message.edit')}}</el-button>
                        <el-button size="mini" type="text" @click="onClickRun(scope.row)">{{$t('message.run')}}</el-button>
                        <el-dropdown trigger="click">
                            <el-button size="mini" type="text">{{$t('message.more')}}</el-button>
                            <el-dropdown-menu slot="dropdown">
                                <el-dropdown-item>
                                    <el-button size="mini" type="text" @click="onClickRunByParameter(scope.row)">{{$t('message.runByParameter')}}</el-button>
                                </el-dropdown-item>
                                <el-dropdown-item>
                                    <el-button size="mini" type="text" @click="onClickRunHistory(scope.row)">{{$t('message.runHistory')}}</el-button>
                                </el-dropdown-item>
                                <el-dropdown-item>
                                  <el-button size="mini" type="text" @click="onClickCopyJob(scope.row)">{{$t('message.copy')}}</el-button>
                                </el-dropdown-item>
                                <el-dropdown-item>
                                    <el-button size="mini" type="text" @click="onClickDeleteJob(scope.row)">{{$t('message.delete')}}</el-button>
                                </el-dropdown-item>
                            </el-dropdown-menu>
                        </el-dropdown>
                    </template>
                </el-table-column>
            </el-table>
        </el-row>

        <!-- 第三行，分页插件 -->
        <el-row>
            <el-pagination
                    layout="prev, pager, next"
                    :total="this.jobInfoPageResult.totalItems"
                    :page-size="this.jobInfoPageResult.pageSize"
                    @current-change="onClickChangePage"
                    :hide-on-single-page="true"/>
        </el-row>


        <el-dialog :close-on-click-modal="false" :visible.sync="modifiedJobFormVisible" width="80%">
            <el-form :model="modifiedJobForm" label-width="120px">

                <el-form-item :label="$t('message.jobName')">
                    <el-input v-model="modifiedJobForm.jobName"/>
                </el-form-item>
                <el-form-item :label="$t('message.jobDescription')">
                    <el-input v-model="modifiedJobForm.jobDescription"/>
                </el-form-item>
                <el-form-item :label="$t('message.jobParams')">
                    <el-input v-model="modifiedJobForm.jobParams" type="textarea"/>
                </el-form-item>
                <el-form-item :label="$t('message.scheduleInfo')">
                    <el-row>
                        <el-col :span="8">
                            <el-select v-model="modifiedJobForm.timeExpressionType" :placeholder="$t('message.timeExpressionType')">
                                <el-option
                                        v-for="item in timeExpressionTypeOptions"
                                        :key="item.key"
                                        :label="item.label"
                                        :value="item.key">
                                </el-option>
                            </el-select>
                        </el-col>
                        <el-col :span="12">
                            <el-input v-model="modifiedJobForm.timeExpression" :placeholder="$t('message.timeExpressionPlaceHolder')" />
                        </el-col>
                        <el-col :span="4">
                            <el-button type="text" @click="onClickValidateTimeExpression" style="padding-left: 10px">{{$t('message.validateTimeExpression')}}</el-button>
                        </el-col>
                    </el-row>
                </el-form-item>
              <el-form-item :label="$t('message.lifeCycle')">
                <el-date-picker
                    v-model="modifiedJobForm.lifeCycle"
                    type="datetimerange"
                    :start-placeholder="$t('message.startTime')"
                    :end-placeholder="$t('message.finishedTime')"
                    value-format="timestamp"
                >
                </el-date-picker>
              </el-form-item>
                <el-form-item :label="$t('message.executeConfig')">
                    <el-row>
                        <el-col :span="5">
                            <el-select v-model="modifiedJobForm.executeType" :placeholder="$t('message.executeType')">
                                <el-option
                                        v-for="item in executeTypeOptions"
                                        :key="item.key"
                                        :label="item.label"
                                        :value="item.key">
                                </el-option>
                            </el-select>
                        </el-col>

                        <el-col :span="6">
                            <el-select v-model="modifiedJobForm.processorType" :placeholder="$t('message.processorType')">
                                <el-option
                                        v-for="item in processorTypeOptions"
                                        :key="item.key"
                                        :label="item.label"
                                        :value="item.key">
                                </el-option>
                            </el-select>
                        </el-col>

                        <el-col :span="13">
                            <el-input v-model="modifiedJobForm.processorInfo" :placeholder="verifyPlaceholder(modifiedJobForm.processorType)" />
                        </el-col>
                    </el-row>
                </el-form-item>
                <el-form-item :label="$t('message.runtimeConfig')">
                    <el-row>
                        <el-col :span="8">
                            <el-input :placeholder="$t('message.maxInstanceNum')" v-model="modifiedJobForm.maxInstanceNum" class="ruleContent">
                                <template slot="prepend">{{$t('message.maxInstanceNum')}}</template>
                            </el-input>
                        </el-col>
                        <el-col :span="8">
                            <el-input :placeholder="$t('message.threadConcurrency')" v-model="modifiedJobForm.concurrency" class="ruleContent">
                                <template slot="prepend">{{$t('message.threadConcurrency')}}</template>
                            </el-input>
                        </el-col>
                        <el-col :span="8">
                            <el-input :placeholder="$t('message.timeout')" v-model="modifiedJobForm.instanceTimeLimit" class="ruleContent">
                                <template slot="prepend">{{$t('message.timeout')}}</template>
                            </el-input>
                        </el-col>
                    </el-row>
                </el-form-item>
                <el-form-item :label="$t('message.retryConfig')">
                    <el-row>
                        <el-col :span="12">
                            <el-input :placeholder="$t('message.taskRetryTimes')" v-model="modifiedJobForm.instanceRetryNum" class="ruleContent">
                                <template slot="prepend">{{$t('message.taskRetryTimes')}}</template>
                            </el-input>
                        </el-col>
                        <el-col :span="12">
                            <el-input :placeholder="$t('message.subTaskRetryTimes')" v-model="modifiedJobForm.taskRetryNum" class="ruleContent">
                                <template slot="prepend">{{$t('message.subTaskRetryTimes')}}</template>
                            </el-input>
                        </el-col>
                    </el-row>
                </el-form-item>
                <el-form-item :label="$t('message.workerConfig')">
                    <el-row>
                        <el-col :span="8">
                            <el-input :placeholder="$t('message.minCPU')" v-model="modifiedJobForm.minCpuCores" class="ruleContent">
                                <template slot="prepend">{{$t('message.minCPU')}}</template>
                            </el-input>
                        </el-col>
                        <el-col :span="8">
                            <el-input :placeholder="$t('message.minMemory')" v-model="modifiedJobForm.minMemorySpace" class="ruleContent">
                                <template slot="prepend">{{$t('message.minMemory')}}</template>
                            </el-input>
                        </el-col>
                        <el-col :span="8">
                            <el-input :placeholder="$t('message.minDisk')" v-model="modifiedJobForm.minDiskSpace" class="ruleContent">
                                <template slot="prepend">{{$t('message.minDisk')}}</template>
                            </el-input>
                        </el-col>
                    </el-row>
                </el-form-item>
                <el-form-item :label="$t('message.clusterConfig')">
                    <el-row>
                        <el-col :span="16">
                            <el-input :placeholder="$t('message.designatedWorkerAddressPLH')" v-model="modifiedJobForm.designatedWorkers" class="ruleContent">
                                <template slot="prepend">{{$t('message.designatedWorkerAddress')}}</template>
                            </el-input>
                        </el-col>
                        <el-col :span="8">
                            <el-input :placeholder="$t('message.maxWorkerNumPLH')" v-model="modifiedJobForm.maxWorkerCount" class="ruleContent">
                                <template slot="prepend">{{$t('message.maxWorkerNum')}}</template>
                            </el-input>
                        </el-col>
                    </el-row>
                </el-form-item>
                <el-form-item :label="$t('message.alarmConfig')">
                    <el-row>
                        <el-col :span="6">
                            <el-select :style="{width: '100%'}" v-model="modifiedJobForm.notifyUserIds" multiple filterable :placeholder="$t('message.alarmSelectorPLH')">
                                <el-option
                                    v-for="user in userList"
                                    :key="user.id"
                                    :label="user.username"
                                    :value="user.id">
                                </el-option>
                            </el-select>
                        </el-col>
                        <el-col :span="6">
                            <el-input v-model="modifiedJobForm.alarmConfig.alertThreshold">
                                <template slot="prepend">{{$t('message.alertThreshold')}}</template>
                            </el-input>
                            <!-- <div class="job-editor-number">
                                <div class="job-input-number">{{$t('message.alertThreshold')}}</div>
                                <el-input-number v-model="modifiedJobForm.alarmConfig.alertThreshold" :placeholder="$t('message.alertThreshold')" controls-position="right" :min="0"></el-input-number>
                            </div> -->
                        </el-col>
                        <el-col :span="6">
                            <el-input v-model="modifiedJobForm.alarmConfig.statisticWindowLen">
                                <template slot="prepend">{{$t('message.statisticWindow') + '(s)'}}</template>
                            </el-input>
                            <!-- <el-input-number v-model="modifiedJobForm.alarmConfig.statisticWindowLen" :placeholder="$t('message.statisticWindow') + '(s)'" controls-position="right" :min="0"></el-input-number> -->
                        </el-col>
                        <el-col :span="6">
                            <el-input v-model="modifiedJobForm.alarmConfig.silenceWindowLen">
                                <template slot="prepend">{{$t('message.silenceWindow') + '(s)'}}</template>
                            </el-input>
                            <!-- <el-input-number v-model="modifiedJobForm.alarmConfig.silenceWindowLen" :placeholder="$t('message.silenceWindow') + '(s)'" controls-position="right" :min="0"></el-input-number> -->
                        </el-col>
                    </el-row>
                </el-form-item>

                <el-form-item>
                    <el-button type="primary" @click="saveJob">{{$t('message.save')}}</el-button>
                    <el-button @click="modifiedJobFormVisible = false">{{$t('message.cancel')}}</el-button>
                </el-form-item>

            </el-form>
        </el-dialog>

        <el-dialog :close-on-click-modal="false" :visible.sync="timeExpressionValidatorVisible" v-if='timeExpressionValidatorVisible'>
            <TimeExpressionValidator :time-expression="modifiedJobForm.timeExpression" :time-expression-type="modifiedJobForm.timeExpressionType"/>
        </el-dialog>
        <el-dialog
            :title="$t('message.runByParameter')"
            :visible="!!temporaryRowData"
            width="50%"
        >
            <el-input
                type="textarea"
                :rows="4"
                :placeholder="$t('message.enteringParameter')"
                v-model="runParameter">
            </el-input>
            <span slot="footer" class="dialog-footer">
                <el-button @click="onClickRunCancel">{{$t('message.cancel')}}</el-button>
                <el-button type="primary" @click="onClickRun(temporaryRowData)" :loading="runLoading">{{$t('message.run')}}</el-button>
            </span>
        </el-dialog>
    </div>
</template>

<script>
    import TimeExpressionValidator from "../common/TimeExpressionValidator";
    export default {
        name: "JobManager",
        components: {TimeExpressionValidator},
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
                    maxInstanceNum: 0,
                    concurrency: 5,
                    instanceTimeLimit: 0,
                    instanceRetryNum: 0,
                    taskRetryNum: 1,

                    minCpuCores: 0,
                    minMemorySpace: 0,
                    minDiskSpace: 0,

                    enable: true,
                    designatedWorkers: "",
                    maxWorkerCount: 0,
                    notifyUserIds: [],
                    lifeCycle: null,
                    alarmConfig: {
                        alertThreshold: undefined,
                        statisticWindowLen: undefined,
                        silenceWindowLen: undefined
                    }
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
                timeExpressionTypeOptions: [{key: "API", label: "API"}, {key: "CRON", label: "CRON"}, {key: "FIXED_RATE", label: this.$t('message.fixRate')}, {key: "FIXED_DELAY", label: this.$t('message.fixDelay')}, {key: "WORKFLOW", label: this.$t('message.workflow')} ],
                // 处理器类型
                processorTypeOptions: [{key: "BUILT_IN", label: this.$t('message.builtIn')}, {key: "EXTERNAL", label: this.$t('message.external')}], // {key: "SHELL", label: "SHELL"}, {key: "PYTHON", label: "PYTHON"}
                // 执行方式类型
                executeTypeOptions: [{key: "STANDALONE", label: this.$t('message.standalone')}, {key: "BROADCAST", label: this.$t('message.broadcast')},  {key: "MAP", label: this.$t('message.map')}, {key: "MAP_REDUCE", label: this.$t('message.mapReduce')}],
                // 用户列表
                userList: [],
                // 时间表达式校验窗口
                timeExpressionValidatorVisible: false,
                // 临时存储的行数据
                temporaryRowData: null,
                // 运行参数
                runParameter: null,
                // 运行loading
                runLoading: false
            }
        },
        methods: {
            // 保存变更，包括新增和修改
            async saveJob() {
                const { lifeCycle, alarmConfig } = this.modifiedJobForm;
                if (lifeCycle && Array.isArray(lifeCycle)) {
                    const start = lifeCycle[0];
                    const end = lifeCycle[1];
                    this.modifiedJobForm.lifeCycle = {
                        start,
                        end
                    }
                }
                if (!alarmConfig.alertThreshold) {
                    alarmConfig.alertThreshold = 0;
                }
                if (!alarmConfig.statisticWindowLen) {
                    alarmConfig.statisticWindowLen = 0;
                }
                if (!alarmConfig.silenceWindowLen) {
                    alarmConfig.silenceWindowLen = 0;
                }
                this.modifiedJobForm.alarmConfig = alarmConfig;
                await this.axios.post("/job/save", this.modifiedJobForm);
                this.modifiedJobFormVisible = false;
                this.$message.success(this.$t('message.success'));
                this.listJobInfos();
            },
            // 列出符合当前搜索条件的任务
            listJobInfos() {
                const that = this;
                this.axios.post("/job/list", this.jobQueryContent).then((res) => {
                    console.log(res);
                    if (res && res.data) {
                        res.data = res.data.map(item => {
                            const lifeCycle = item.lifeCycle;
                            if (lifeCycle && lifeCycle.start && lifeCycle.end) {
                                item.lifeCycle = [lifeCycle.start, lifeCycle.end];
                            } else {
                                item.lifeCycle = null;
                            }
                            return item;
                        })
                    }

                    that.jobInfoPageResult = res;
                });
            },
            // 修改任务状态
            changeJobStatus(data) {
                // switch 会自动更改 enable 的值
                let that = this;
                if (data.enable === false) {
                    // 仅有，有特殊逻辑（关闭秒级任务），走单独接口
                    that.axios.get("/job/disable?jobId=" + data.id).then(() => that.listJobInfos());
                }else {
                    // 启用，则发起正常的保存操作
                    this.modifiedJobForm = data;
                    this.saveJob();
                }
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
                this.modifiedJobForm.lifeCycle = null;
                this.modifiedJobForm.alarmConfig = {
                    alertThreshold: undefined,
                    statisticWindowLen: undefined,
                    silenceWindowLen: undefined
                }
                this.modifiedJobFormVisible = true;
            },
            // 点击 编辑按钮
            onClickModify(data) {
                // 修复点击编辑后再点击新增 行数据被清空 的问题
                if (!data.alarmConfig) {
                    data.alarmConfig = {
                        alertThreshold: undefined,
                        statisticWindowLen: undefined,
                        silenceWindowLen: undefined
                    }
                }
                if (!data.lifeCycle) {
                    data.lifeCycle = null;
                }
                this.modifiedJobForm = JSON.parse(JSON.stringify(data));
                this.modifiedJobFormVisible = true;
            },
            // 点击 立即运行按钮
            onClickRun(data) {
                let that = this;
                let url = "/job/run?jobId=" + data.id + "&appId=" + that.$store.state.appInfo.id;
                if (this.temporaryRowData && this.runParameter) {
                    url += `&instanceParams=${encodeURIComponent(this.runParameter)}`
                }
                this.runLoading = true;
                this.axios.get(url).then(() => {
                    that.$message.success(this.$t('message.success'));
                    this.temporaryRowData = null;
                    this.runLoading = false
                }).catch(() => {
                    this.runLoading = false
                });
            },
            // 参数运行
            onClickRunByParameter(data) {
                this.temporaryRowData = data;
            },
            // 取消参数运行
            onClickRunCancel() {
                this.temporaryRowData = null;
                this.runParameter = null;
            },
            // 点击 删除任务
            onClickDeleteJob(data) {
                let that = this;
                let url = "/job/delete?jobId=" + data.id;
                this.axios.get(url).then(() => {
                    that.$message.success(this.$t('message.success'));
                    that.listJobInfos();
                });
            },
            // 点击 复制任务
            onClickCopyJob(data) {
              let url = "/job/copy?jobId=" + data.id;
              let that = this;
              this.axios.post(url).then(res => {
                that.modifiedJobForm = res
                that.modifiedJobFormVisible = true;
              });
            },
            // 点击 历史记录
            onClickRunHistory(data) {
                console.log(JSON.stringify(data));
                this.$router.push({
                    name: 'instanceManager',
                    params: {
                        jobId: data.id,
                    }
                })
            },
            // 点击 换页
            onClickChangePage(index) {
                // 后端从0开始，前端从1开始
                this.jobQueryContent.index = index - 1;
                this.listJobInfos();
            },
            // 点击重置按钮
            onClickReset() {
                this.jobQueryContent.keyword = undefined;
                this.jobQueryContent.jobId = undefined;
                this.listJobInfos();
            },
            verifyPlaceholder(processorType) {
                let res;
                switch(processorType){
                    case "BUILT_IN": res = this.$t('message.javaProcessorInfoPLH');break;
                    case "EXTERNAL": res =  this.$t('message.containerProcessorInfoPLH');break;
                    case "SHELL": res =  this.$t('message.shellProcessorInfoPLH');break;
                    case "PYTHON" : res = this.$t('message.pythonProcessorInfoPLH');
                }
                return  res;
            },
            // 翻译执行类型
            translateExecuteType(executeType) {
                switch (executeType) {
                    case "STANDALONE": return this.$t('message.standalone');
                    case "BROADCAST": return this.$t('message.broadcast');
                    case "MAP_REDUCE": return this.$t('message.mapReduce');
                    case "MAP": return this.$t('message.map');
                    default: return "UNKNOWN";
                }
            },
            // 翻译处理器类型
            translateProcessorType(processorType) {
                if (processorType === "EXTERNAL") {
                    return this.$t('message.external');
                }
                return this.$t('message.builtIn');
            },
            // 点击校验
            onClickValidateTimeExpression() {
                this.timeExpressionValidatorVisible = true;
            }
        },
        mounted() {
            // 加载用户信息
            let that = this;
            that.axios.get("/user/list").then(res => {
                const data = res || [];
                that.userList = data.map(item => {
                    return {
                        ...item,
                        id: `${item.id}`
                    }
                })
            });
            // 加载任务信息
            this.listJobInfos();
        }
    }
</script>

<style scoped>
.job-editor-number {
    display: flex;
}
.job-input-number {
    background-color: #F5F7FA;
    color: #909399;
    /* vertical-align: middle; */
    /* display: table-cell; */
    position: relative;
    border: 1px solid #DCDFE6;
    border-radius: 4px;
    padding: 0 20px;
    /* width: 1px; */
    white-space: nowrap;
    display: block;
    border-top-right-radius: 0px;
    border-bottom-right-radius: 0px;
    line-height: 38px;
    width: auto;
}
.el-input-number {
    width: 100px;
}

.el-input-number .el-input {
    width: 1000px;
}

</style>
