<template>
    <div id="job_manager">
    <div class="page-heading"><h1>{{$t('message.tabJobManage')}}</h1><p>{{$t('message.jobsDescription')}}</p></div>

        <!--第一行，条件搜索栏（row布局：gutter代表栅格间隔，span代表占用格数）-->
        <el-row :gutter="20">

            <!-- 左侧搜索栏，占地面积 16/24 -->
            <el-col :span="16">
                <el-form :inline="true" :model="jobQueryContent" class="el-form--inline">
                    <el-form-item :label="$t('message.jobId')">
                        <el-input v-model="jobQueryContent.jobId" :placeholder="$t('message.jobId')"/>
                    </el-form-item>
                    <el-form-item :label="$t('message.keyword')">
                        <el-input v-model="jobQueryContent.keyword" :placeholder="$t('message.keyword')"/>
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" @click="searchJobs">{{$t('message.query')}}</el-button>
                        <el-button type="default" @click="onClickReset">{{$t('message.reset')}}</el-button>
                    </el-form-item>
                </el-form>
            </el-col>

            <!-- 右侧新增任务按钮，占地面积 4/24 -->
            <el-col :span="4">
                <div style="float:right;">
                    <el-button type="success" @click="onClickJobInputButton">{{$t('message.inputJob')}}</el-button>
                </div>
            </el-col>
            <el-col :span="4">
                <div style="float:right;padding-right:10px">
                <el-button type="primary" @click="onClickNewJob">{{$t('message.newJob')}}</el-button>
                </div>
            </el-col>
        </el-row>

        <!--第二行，任务数据表格-->
        <el-row>
            <el-table v-loading="listLoading" :data="jobInfoPageResult.data" style="width: 100%">
                <el-table-column prop="id" :label="$t('message.jobId')" width="80"/>
                <el-table-column prop="jobName" :label="$t('message.jobName')" />
                <el-table-column :label="$t('message.scheduleInfo')" >
                    <template #default="scope">
                        {{scope.row.timeExpressionType}}  {{scope.row.timeExpression}}
                    </template>
                </el-table-column>
                <el-table-column :label="$t('message.executeType')">
                    <template #default="scope">
                        {{translateExecuteType(scope.row.executeType)}}
                    </template>
                </el-table-column>
                <el-table-column :label="$t('message.processorType')">
                    <template #default="scope">
                        {{translateProcessorType(scope.row.processorType)}}
                    </template>
                </el-table-column>
                <el-table-column :label="$t('message.status')" width="80">
                    <template #default="scope">
                        <el-switch v-model="scope.row.enable" active-color="#13ce66" inactive-color="#ff4949" @change="changeJobStatus(scope.row)"/>
                    </template>
                </el-table-column>
                <el-table-column :label="$t('message.operation')" width="150">
                    <template #default="scope">
                        <el-button size="small" type="text" @click="onClickModify(scope.row)">{{$t('message.edit')}}</el-button>
                        <el-button size="small" type="text" @click="onClickRun(scope.row)">{{$t('message.run')}}</el-button>
                        <el-dropdown trigger="click">
                            <el-button size="small" type="text">{{$t('message.more')}}</el-button>
                            <template #dropdown><el-dropdown-menu>
                                <el-dropdown-item>
                                    <el-button size="small" type="text" @click="onClickRunByParameter(scope.row)">{{$t('message.runByParameter')}}</el-button>
                                </el-dropdown-item>
                                <el-dropdown-item>
                                    <el-button size="small" type="text" @click="onClickRunHistory(scope.row)">{{$t('message.runHistory')}}</el-button>
                                </el-dropdown-item>
                                <el-dropdown-item>
                                  <el-button size="small" type="text" @click="onClickCopyJob(scope.row)">{{$t('message.copy')}}</el-button>
                                </el-dropdown-item>
                                <el-dropdown-item>
                                    <el-button size="small" type="text" @click="onClickJobExportButton(scope.row)">{{$t('message.export')}}</el-button>
                                </el-dropdown-item>
                                <el-dropdown-item>
                                    <el-button size="small" type="text" @click="onClickDeleteJob(scope.row)">{{$t('message.delete')}}</el-button>
                                </el-dropdown-item>
                            </el-dropdown-menu></template>
                        </el-dropdown>
                    </template>
                </el-table-column>
            </el-table>
        </el-row>

        <!-- 第三行，分页插件 -->
        <el-row>
            <el-pagination
                    layout="prev, pager, next" :current-page="jobQueryContent.index + 1"
                    :total="jobInfoPageResult.totalItems"
                    :page-size="jobInfoPageResult.pageSize"
                    @current-change="onClickChangePage"
                    :hide-on-single-page="true"/>
        </el-row>


        <el-dialog :close-on-click-modal="false" v-model="modifiedJobFormVisible" :title="$t(modifiedJobForm.id ? 'message.edit' : 'message.newJob')" width="960px">
            <el-form :model="modifiedJobForm" label-width="120px" class="job-editor">

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
                            <el-input v-model="modifiedJobForm.timeExpression" :placeholder="$t('message.timeExpressionPlaceHolder')" v-if="['CRON', 'FIXED_DELAY', 'FIXED_RATE'].includes(modifiedJobForm.timeExpressionType)" />
                            <el-button type="primary" @click="onClickEditTimeExpression"  v-if="['DAILY_TIME_INTERVAL'].includes(modifiedJobForm.timeExpressionType)">{{$t('message.edit')}}</el-button>
                        </el-col>
                        <el-col :span="4">
                            <el-button type="text" @click="onClickValidateTimeExpression" style="padding-left: 10px">{{$t('message.validateTimeExpression')}}</el-button>
                        </el-col>
                    </el-row>
                </el-form-item>
              <el-form-item :label="$t('message.lifeCycle')">
                <LifeCycleFields v-model="modifiedJobForm.lifeCycle"/>
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
                        <el-col :span="4">
                            <el-select v-model="modifiedJobForm.dispatchStrategy" :placeholder="$t('message.dispatchStrategy')">
                                <el-option
                                    v-for="item in dispatchStrategy"
                                    :key="item.key"
                                    :label="item.label"
                                    :value="item.key">
                                </el-option>
                            </el-select>
                        </el-col>

                      <el-col :span="5">
                        <el-input v-if="modifiedJobForm.dispatchStrategy=='SPECIFY'" :placeholder="$t('message.dispatchStrategyConfig')" v-model="modifiedJobForm.dispatchStrategyConfig" class="ruleContent">
                          <template #prepend>{{$t('message.dispatchStrategyConfig')}}</template>
                        </el-input>
                      </el-col>

                        <el-col :span="5">
                            <el-input :placeholder="$t('message.maxInstanceNum')" v-model="modifiedJobForm.maxInstanceNum" class="ruleContent">
                                <template #prepend>{{$t('message.maxInstanceNum')}}</template>
                            </el-input>
                        </el-col>
                        <el-col :span="5">
                            <el-input :placeholder="$t('message.threadConcurrency')" v-model="modifiedJobForm.concurrency" class="ruleContent">
                                <template #prepend>{{$t('message.threadConcurrency')}}</template>
                            </el-input>
                        </el-col>
                        <el-col :span="5">
                            <el-input :placeholder="$t('message.timeout')" v-model="modifiedJobForm.instanceTimeLimit" class="ruleContent">
                                <template #prepend>{{$t('message.timeout')}}</template>
                            </el-input>
                        </el-col>
                    </el-row>
                </el-form-item>
                <el-form-item :label="$t('message.retryConfig')">
                    <el-row>
                        <el-col :span="12">
                            <el-input :placeholder="$t('message.taskRetryTimes')" v-model="modifiedJobForm.instanceRetryNum" class="ruleContent">
                                <template #prepend>{{$t('message.taskRetryTimes')}}</template>
                            </el-input>
                        </el-col>
                        <el-col :span="12">
                            <el-input :placeholder="$t('message.subTaskRetryTimes')" v-model="modifiedJobForm.taskRetryNum" class="ruleContent">
                                <template #prepend>{{$t('message.subTaskRetryTimes')}}</template>
                            </el-input>
                        </el-col>
                    </el-row>
                </el-form-item>
                <el-form-item :label="$t('message.workerConfig')">
                    <el-row>
                        <el-col :span="8">
                            <el-input :placeholder="$t('message.minCPU')" v-model="modifiedJobForm.minCpuCores" class="ruleContent">
                                <template #prepend>{{$t('message.minCPU')}}</template>
                            </el-input>
                        </el-col>
                        <el-col :span="8">
                            <el-input :placeholder="$t('message.minMemory')" v-model="modifiedJobForm.minMemorySpace" class="ruleContent">
                                <template #prepend>{{$t('message.minMemory')}}</template>
                            </el-input>
                        </el-col>
                        <el-col :span="8">
                            <el-input :placeholder="$t('message.minDisk')" v-model="modifiedJobForm.minDiskSpace" class="ruleContent">
                                <template #prepend>{{$t('message.minDisk')}}</template>
                            </el-input>
                        </el-col>
                    </el-row>
                </el-form-item>
                <el-form-item :label="$t('message.clusterConfig')">
                    <el-row>
                        <el-col :span="16">
                            <el-input :placeholder="$t('message.designatedWorkerAddressPLH')" v-model="modifiedJobForm.designatedWorkers" class="ruleContent">
                                <template #prepend>{{$t('message.designatedWorkerAddress')}}</template>
                            </el-input>
                        </el-col>
                        <el-col :span="8">
                            <el-input :placeholder="$t('message.maxWorkerNumPLH')" v-model="modifiedJobForm.maxWorkerCount" class="ruleContent">
                                <template #prepend>{{$t('message.maxWorkerNum')}}</template>
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
                                <template #prepend>{{$t('message.alertThreshold')}}</template>
                            </el-input>
                            <!-- <div class="job-editor-number">
                                <div class="job-input-number">{{$t('message.alertThreshold')}}</div>
                                <el-input-number v-model="modifiedJobForm.alarmConfig.alertThreshold" :placeholder="$t('message.alertThreshold')" controls-position="right" :min="0"></el-input-number>
                            </div> -->
                        </el-col>
                        <el-col :span="6">
                            <el-input v-model="modifiedJobForm.alarmConfig.statisticWindowLen">
                                <template #prepend>{{$t('message.statisticWindow') + '(s)'}}</template>
                            </el-input>
                            <!-- <el-input-number v-model="modifiedJobForm.alarmConfig.statisticWindowLen" :placeholder="$t('message.statisticWindow') + '(s)'" controls-position="right" :min="0"></el-input-number> -->
                        </el-col>
                        <el-col :span="6">
                            <el-input v-model="modifiedJobForm.alarmConfig.silenceWindowLen">
                                <template #prepend>{{$t('message.silenceWindow') + '(s)'}}</template>
                            </el-input>
                            <!-- <el-input-number v-model="modifiedJobForm.alarmConfig.silenceWindowLen" :placeholder="$t('message.silenceWindow') + '(s)'" controls-position="right" :min="0"></el-input-number> -->
                        </el-col>
                    </el-row>
                </el-form-item>

              <el-form-item :label="$t('message.logConfig')">
                <el-row>
                  <el-col :span="6">
                      <el-select v-model="modifiedJobForm.logConfig.type" :placeholder="$t('message.logType')">
                          <el-option
                              v-for="item in logType"
                              :key="item.key"
                              :label="item.label"
                              :value="item.key">
                          </el-option>
                      </el-select>
                  </el-col>
                    <el-col :span="6">
                        <el-select v-model="modifiedJobForm.logConfig.level" :placeholder="$t('message.logLevel')">
                            <el-option
                                v-for="item in logLevel"
                                :key="item.key"
                                :label="item.label"
                                :value="item.key">
                            </el-option>
                        </el-select>
                    </el-col>
                    <el-col :span="12">
                        <el-input v-if="[2, 4].includes(modifiedJobForm.logConfig.type)" v-model="modifiedJobForm.logConfig.loggerName">
                            <template #prepend>{{$t('message.loggerName')}}</template>
                        </el-input>
                    </el-col>
                </el-row>
              </el-form-item>

              <el-form-item :label="$t('message.advanceConfig')">
                <el-row>
                  <el-col :span="6">
                    <el-select v-model="modifiedJobForm.advancedRuntimeConfig.taskTrackerBehavior" :placeholder="$t('message.taskTrackerBehavior')">
                      <el-option
                          v-for="item in taskTrackerBehavior"
                          :key="item.key"
                          :label="item.label"
                          :value="item.key">
                      </el-option>
                    </el-select>
                  </el-col>
                </el-row>
              </el-form-item>

                <el-form-item>
                    <el-button type="primary" @click="saveJob" :loading="saveLoading">{{$t('message.save')}}</el-button>
                    <el-button @click="modifiedJobFormVisible = false">{{$t('message.cancel')}}</el-button>
                </el-form-item>

            </el-form>
        </el-dialog>

        <el-dialog :close-on-click-modal="false" v-model="timeExpressionValidatorVisible" destroy-on-close v-if='timeExpressionValidatorVisible'>
            <TimeExpressionValidator :time-expression="modifiedJobForm.timeExpression" :time-expression-type="modifiedJobForm.timeExpressionType"/>
        </el-dialog>

        <!-- 时间表达式编辑 -->
        <el-dialog :close-on-click-modal="false" v-model="timeExpressionEditorVisible" destroy-on-close v-if='timeExpressionEditorVisible'>
          <DailyTimeIntervalForm :timeExpression="modifiedJobForm.timeExpression" @contentChanged="eventFromDailyTimeIntervalExpress"></DailyTimeIntervalForm>
        </el-dialog>

        <!-- 任务导入导出 -->
        <el-dialog :close-on-click-modal="false" v-model="jobExporterDialogVisible" destroy-on-close v-if='jobExporterDialogVisible'>
            <Exporter type="JOB" :mode="jobExporterMode" :target-id="jobExporterTargetId"  @finished="eventFromExporter"></Exporter>
        </el-dialog>

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
                <el-button type="primary" @click="onClickRun(temporaryRowData)" :loading="runLoading">{{$t('message.run')}}</el-button>
            </span></template>
        </el-dialog>
    </div>
</template>

<script>
    import { newJob, jobForEditor, jobForSave, validJob } from "../../services/jobs.js";
    import TimeExpressionValidator from "../common/TimeExpressionValidator.vue";
    import DailyTimeIntervalForm from "../common/DailyTimeIntervalForm.vue";
    import LifeCycleFields from "../common/LifeCycleFields.vue";
    import Exporter from "../common/Exporter.vue";
    export default {
        name: "JobManager",
        components: {LifeCycleFields, Exporter, TimeExpressionValidator, DailyTimeIntervalForm},
        data() {
            return {
      listGeneration: 0, listLoading: false,
                modifiedJobFormVisible: false,
                // 新建任务对象
                modifiedJobForm: newJob(window.localStorage.getItem('Power_appId')),
                saveLoading: false,
                // 任务查询请求对象
                jobQueryContent: {
                    appId: window.localStorage.getItem("Power_appId"),
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
                // 处理器类型
                // 执行方式类型
                // 日志级别
                logLevel: [{key: 1, label: 'DEBUG'}, {key: 2, label: 'INFO'}, {key: 3, label: 'WARN'}, {key: 4, label: 'ERROR'}, {key: 99, label: 'OFF'}],
                // 日志类型
                logType: [{key: 1, label: 'ONLINE'}, {key: 2, label: 'LOCAL'}, {key: 3, label: 'STDOUT'}, {key: 4, label: 'LOCAL_AND_ONLINE'}, {key: 999, label: 'NULL'}],
                // 分发类型
                dispatchStrategy: [{key: 'HEALTH_FIRST', label: 'HEALTH_FIRST'}, {key: 'RANDOM', label: 'RANDOM'}, {key: 'SPECIFY', label: 'SPECIFY'}],
                // TaskTracker 表现
                taskTrackerBehavior: [{key: 1, label: 'NORMAL'}, {key: 11, label: 'PADDLING'}],
                // 用户列表
                userList: [],
                // 时间表达式校验窗口
                timeExpressionValidatorVisible: false,
                // 时间表达式编辑窗口
                timeExpressionEditorVisible: false,
                // 临时存储的行数据
                temporaryRowData: null,
                // 运行参数
                runParameter: null,
                // 运行loading
                runLoading: false,
                copyLoading: false,

                // 任务导入导出相关功能
                jobExporterMode: undefined,
                jobExporterTargetId: undefined,
                jobExporterDialogVisible: false,
            }
        },
        computed: {
            timeExpressionTypeOptions() { return [{key: "API", label: "API"}, {key: "CRON", label: "CRON"}, {key: "FIXED_RATE", label: this.$t('message.fixRate')}, {key: "FIXED_DELAY", label: this.$t('message.fixDelay')}, {key: "WORKFLOW", label: this.$t('message.workflow')}, {key: "DAILY_TIME_INTERVAL", label: this.$t('message.dailyTimeInterval')} ]; },
            processorTypeOptions() { return [{key: "BUILT_IN", label: this.$t('message.builtIn')}, {key: "EXTERNAL", label: this.$t('message.external')}]; },
            executeTypeOptions() { return [{key: "STANDALONE", label: this.$t('message.standalone')}, {key: "BROADCAST", label: this.$t('message.broadcast')},  {key: "MAP", label: this.$t('message.map')}, {key: "MAP_REDUCE", label: this.$t('message.mapReduce')}]; },
        },
        methods: {
            searchJobs() { this.jobQueryContent.index = 0; return this.listJobInfos(); },
            // 保存变更，包括新增和修改
            async saveJob() {
                if (this.saveLoading) return;
                if (!validJob(this.modifiedJobForm)) { this.$message.warning(this.$t('message.requiredField')); return; }
                let payload;
                try { payload = jobForSave(this.modifiedJobForm); } catch { this.$message.warning(this.$t('message.lifeCycleInvalid')); return; }
                this.saveLoading = true;
                try {
                    await this.axios.post('/job/save', payload);
                    this.modifiedJobFormVisible = false;
                    this.$message.success(this.$t('message.success'));
                    await this.listJobInfos();
                } catch { /* The HTTP layer displays the request error. Keep the form open. */ }
                finally { this.saveLoading = false; }
            },
            // 列出符合当前搜索条件的任务
            async listJobInfos() {
                const generation = ++this.listGeneration; this.listLoading = true;
      try { const response = await this.axios.post('/job/list', { ...this.jobQueryContent }); if (generation === this.listGeneration) this.jobInfoPageResult = response; } catch { /* Keep current data for retry. */ } finally { if (generation === this.listGeneration) this.listLoading = false; }
            },
            // 修改任务状态
            async changeJobStatus(data) {
                const previous = !data.enable;
                try {
                    if (!data.enable) await this.axios.get('/job/disable', { params: { jobId: data.id } });
                    else await this.axios.post('/job/save', jobForSave(jobForEditor(data)));
                    await this.listJobInfos();
                } catch { data.enable = previous; }
            },
            onClickNewJob() {
                this.modifiedJobForm = newJob(window.localStorage.getItem('Power_appId'));
                this.modifiedJobFormVisible = true;
            },
            onClickModify(data) {
                this.modifiedJobForm = jobForEditor(data);
                this.modifiedJobFormVisible = true;
            },
            // 点击 立即运行按钮
            onClickRun(data) {
                if (this.runLoading) return;
                let that = this;
                let url = "/job/run?jobId=" + data.id + "&appId=" + window.localStorage.getItem("Power_appId");
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
                this.runParameter = '';
                this.temporaryRowData = data;
            },
            // 取消参数运行
            onClickRunCancel() {
                this.temporaryRowData = null;
                this.runParameter = null;
            },
            // 点击 删除任务
            async onClickDeleteJob(data) {
                try { await this.$confirm(this.$t('message.deleteConfirmation', { name: data.jobName }), this.$t('message.confirmTitle'), { type: 'warning' }); } catch { return; }
                let that = this;
                let url = "/job/delete?jobId=" + data.id;
                this.axios.get(url).then(() => {
                    that.$message.success(this.$t('message.success'));
                    that.listJobInfos();
                }).catch(() => {});
            },
            // 点击 复制任务
            onClickCopyJob(data) {
              if (this.copyLoading) return;
              this.copyLoading = true;
              let url = "/job/copy?jobId=" + data.id;
              let that = this;
              this.axios.post(url).then(res => {
                that.modifiedJobForm = jobForEditor(res)
                that.modifiedJobFormVisible = true;
              }).catch(() => {}).finally(() => { this.copyLoading = false; });
            },
            // 点击 历史记录
            onClickRunHistory(data) {
                this.$router.push({
                    name: 'instanceManager',
                    query: {
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
                this.jobQueryContent.index = 0;
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
            },
            // 点击编辑
            onClickEditTimeExpression() {
                this.timeExpressionEditorVisible = true;
            },
            // 每日固定间隔策略的组件回调
            eventFromDailyTimeIntervalExpress(content) {
                this.modifiedJobForm.timeExpression = content;
                this.timeExpressionEditorVisible = false;
            },

            // 任务导出按钮
            onClickJobExportButton(row) {
                this.jobExporterMode = 'EXPORT';
                this.jobExporterTargetId = row.id;
                this.jobExporterDialogVisible = true;
            },
            // 任务导入按钮
            onClickJobInputButton() {
                this.jobExporterMode = 'INPUT';
                this.jobExporterTargetId = undefined;
                this.jobExporterDialogVisible = true;
            },
            // 任务导出组件的回调
            eventFromExporter(content) {
                this.jobExporterDialogVisible = false;
                if (this.jobExporterMode === 'INPUT') {
                    this.listJobInfos();
                }
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
            }).catch(() => {});
            // 加载任务信息
            this.listJobInfos();
        },
  beforeUnmount() { this.listGeneration++ },
}
</script>

<style scoped>
.job-editor :deep(.el-form-item__content) { min-width: 0; }
.job-editor :deep(.el-row) { width: 100%; gap: 12px; }
.job-editor :deep(.el-col) { min-width: 0; max-width: 100%; flex: 1 1 220px; }
.job-editor :deep(.el-select) { width: 100%; }
.job-editor :deep(.el-input-group) { display: flex; flex-direction: column; }
.job-editor :deep(.el-input-group__prepend) { width: 100%; justify-content: flex-start; white-space: normal; line-height: 1.5; padding: 6px 10px; box-shadow: none; border: 1px solid var(--pj-border); border-bottom: 0; border-radius: 7px 7px 0 0; font-size: 12px; }
.job-editor :deep(.el-input-group > .el-input__wrapper) { width: 100%; border-radius: 0 0 7px 7px; }
@media (max-width: 760px) {
  .job-editor :deep(.el-form-item) { display: block; }
  .job-editor :deep(.el-form-item__label) { width: auto !important; height: auto; display: block; text-align: left; line-height: 1.5; padding: 0 0 7px; }
  .job-editor :deep(.el-form-item__content) { margin-left: 0 !important; }
}
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
