<template>
    <div class="job-manager">

        <!-- Search and Action Section -->
        <div class="pj-form-section" style="padding-top: 0; margin-top: 0;">
            <div class="search-container">
                <div class="search-form">
                    <el-form :inline="true" :model="jobQueryContent" class="el-form--inline">
                        <el-form-item :label="$t('message.jobId')">
                            <el-input 
                                v-model="jobQueryContent.jobId" 
                                :placeholder="$t('message.jobId')"
                                clearable
                                style="width: 180px;"
                            />
                        </el-form-item>
                        <el-form-item :label="$t('message.keyword')">
                            <el-input 
                                v-model="jobQueryContent.keyword" 
                                :placeholder="$t('message.keyword')"
                                clearable
                                style="width: 180px;"
                            />
                        </el-form-item>
                    </el-form>
                </div>
                
                <div class="action-buttons">
                    <el-button @click="onClickReset">{{$t('message.reset')}}</el-button>
                    <el-button type="primary" @click="listJobInfos">
                        <el-icon class="mr-1"><Search /></el-icon>
                        {{$t('message.query')}}
                    </el-button>
                    <el-button type="info" @click="listJobInfos">
                        <el-icon class="mr-1"><Refresh /></el-icon>
                        {{$t('message.refresh')}}
                    </el-button>
                    <el-button type="success" @click="onClickJobInputButton">
                        <el-icon class="mr-1"><Upload /></el-icon>
                        {{$t('message.inputJob')}}
                    </el-button>
                    <el-button type="primary" @click="onClickNewJob">
                        <el-icon class="mr-1"><Plus /></el-icon>
                        {{$t('message.newJob')}}
                    </el-button>
                </div>
            </div>
        </div>

        <!-- Table Section -->
        <div class="pj-table" style="margin-top: var(--pj-space-sm);">
            <el-table 
                :data="jobInfoPageResult.data" 
                style="width: 100%"
                stripe
                @sort-change="handleSortChange"
            >
                <el-table-column prop="id" :label="$t('message.jobId')" width="80" sortable/>
                <el-table-column prop="jobName" :label="$t('message.jobName')" min-width="150" show-overflow-tooltip />
                <el-table-column :label="$t('message.scheduleInfo')" min-width="250" show-overflow-tooltip>
                    <template #default="scope">
                        <div class="schedule-info-enhanced">
                            <div class="schedule-type">
                                <el-tag size="small">
                                    {{translateTimeExpressionType(scope.row.timeExpressionType)}}
                                </el-tag>
                            </div>
                            <div class="schedule-expression" :title="scope.row.timeExpression">
                                {{scope.row.timeExpression}}
                            </div>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column :label="$t('message.executeType')" width="140" show-overflow-tooltip>
                    <template #default="scope">
                        <el-tag 
                            size="small" 
                            :type="getExecuteTypeColor(scope.row.executeType)"
                            :title="translateExecuteType(scope.row.executeType)"
                        >
                            {{translateExecuteType(scope.row.executeType)}}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column :label="$t('message.processorType')" width="160" show-overflow-tooltip>
                    <template #default="scope">
                        <el-tag size="small" effect="plain" type="warning" :title="translateProcessorType(scope.row.processorType)">
                            {{translateProcessorType(scope.row.processorType)}}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column :label="$t('message.status')" width="80" align="center">
                    <template #default="scope">
                        <el-switch 
                            v-model="scope.row.enable" 
                            :active-color="'var(--pj-success)'" 
                            :inactive-color="'var(--pj-error)'"
                            @change="changeJobStatus(scope.row)"
                        />
                    </template>
                </el-table-column>
                <el-table-column :label="$t('message.operation')" width="250" align="center" fixed="right">
                    <template #default="scope">
                        <div class="operation-buttons-enhanced">
                            <el-button 
                                size="small" 
                                type="primary" 
                                @click="onClickModify(scope.row)"
                            >
                                <el-icon><Edit /></el-icon>
                                {{$t('message.edit')}}
                            </el-button>
                            <el-button 
                                size="small" 
                                type="success" 
                                @click="onClickRun(scope.row)"
                            >
                                <el-icon><VideoPlay /></el-icon>
                                {{$t('message.run')}}
                            </el-button>
                            <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, scope.row)">
                                <el-button size="small" type="info">
                                    {{$t('message.more')}}
                                    <el-icon class="ml-1"><ArrowDown /></el-icon>
                                </el-button>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item command="runByParameter">
                                            <el-icon><Setting /></el-icon>
                                            {{$t('message.runByParameter')}}
                                        </el-dropdown-item>
                                        <el-dropdown-item command="runHistory">
                                            <el-icon><Clock /></el-icon>
                                            {{$t('message.runHistory')}}
                                        </el-dropdown-item>
                                        <el-dropdown-item command="copy">
                                            <el-icon><CopyDocument /></el-icon>
                                            {{$t('message.copy')}}
                                        </el-dropdown-item>
                                        <el-dropdown-item command="export">
                                            <el-icon><Download /></el-icon>
                                            {{$t('message.export')}}
                                        </el-dropdown-item>
                                        <el-dropdown-item command="delete" divided>
                                            <el-icon><Delete /></el-icon>
                                            <span style="color: var(--pj-error);">{{$t('message.delete')}}</span>
                                        </el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </div>

        <!-- Pagination Section -->
        <div class="pagination-container">
            <el-pagination
                layout="total, sizes, prev, pager, next, jumper"
                :total="this.jobInfoPageResult.totalItems"
                :page-size="this.jobInfoPageResult.pageSize"
                :page-sizes="[10, 20, 50, 100]"
                @current-change="onClickChangePage"
                @size-change="handleSizeChange"
                :hide-on-single-page="false"
                background
            />
        </div>


        <el-drawer 
            v-model="modifiedJobFormVisible"
            direction="rtl"
            size="80%"
            class="job-form-drawer"
            :title="modifiedJobForm.id ? $t('message.editJob') : $t('message.newJob')"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
        >
            <el-form :model="modifiedJobForm" label-width="140px" class="job-form-content">

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
                    <el-row :gutter="16">
                        <el-col :span="6">
                            <el-select 
                                v-model="modifiedJobForm.timeExpressionType" 
                                :placeholder="$t('message.timeExpressionType')"
                                style="width: 300px"
                            >
                                <el-option
                                    v-for="item in timeExpressionTypeOptions"
                                    :key="item.key"
                                    :label="item.label"
                                    :value="item.key">
                                </el-option>
                            </el-select>
                        </el-col>
                        <el-col :span="12">
                            <el-input 
                                v-if="['CRON', 'FIXED_DELAY', 'FIXED_RATE'].includes(modifiedJobForm.timeExpressionType)"
                                v-model="modifiedJobForm.timeExpression" 
                                :placeholder="$t('message.timeExpressionPlaceHolder')" 
                            />
                            <el-button 
                                v-if="['DAILY_TIME_INTERVAL'].includes(modifiedJobForm.timeExpressionType)"
                                type="primary" 
                                @click="onClickEditTimeExpression"
                                style="width: 100%"
                            >
                                点击编辑
                            </el-button>
                        </el-col>
                        <el-col :span="6">
                            <el-button 
                                type="primary" 
                                @click="onClickValidateTimeExpression"
                                style="width: 100%"
                            >
                                {{$t('message.validateTimeExpression')}}
                            </el-button>
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
                    <el-row :gutter="16">
                        <el-col :span="6">
                            <el-select 
                                v-model="modifiedJobForm.executeType" 
                                :placeholder="$t('message.executeType')"
                                style="width: 200px"
                            >
                                <el-option
                                    v-for="item in executeTypeOptions"
                                    :key="item.key"
                                    :label="item.label"
                                    :value="item.key">
                                </el-option>
                            </el-select>
                        </el-col>
                        <el-col :span="6">
                            <el-select 
                                v-model="modifiedJobForm.processorType" 
                                :placeholder="$t('message.processorType')"
                                style="width: 200px"
                            >
                                <el-option
                                    v-for="item in processorTypeOptions"
                                    :key="item.key"
                                    :label="item.label"
                                    :value="item.key">
                                </el-option>
                            </el-select>
                        </el-col>
                        <el-col :span="12">
                            <el-input 
                                v-model="modifiedJobForm.processorInfo" 
                                :placeholder="verifyPlaceholder(modifiedJobForm.processorType)"
                                style="width: 500px"
                            />
                        </el-col>
                    </el-row>
                </el-form-item>
                <el-form-item :label="$t('message.runtimeConfig')">
                    <el-row :gutter="16">
                        <el-col :span="6">
                            <el-select 
                                v-model="modifiedJobForm.dispatchStrategy" 
                                :placeholder="$t('message.dispatchStrategy')"
                                style="width: 100%"
                            >
                                <el-option
                                    v-for="item in dispatchStrategy"
                                    :key="item.key"
                                    :label="item.label"
                                    :value="item.key">
                                </el-option>
                            </el-select>
                        </el-col>
                        <el-col :span="6">
                            <el-input 
                                :placeholder="$t('message.maxInstanceNum')" 
                                v-model="modifiedJobForm.maxInstanceNum"
                            >
                                <template #prepend>{{$t('message.maxInstanceNum')}}</template>
                            </el-input>
                        </el-col>
                        <el-col :span="6">
                            <el-input 
                                :placeholder="$t('message.threadConcurrency')" 
                                v-model="modifiedJobForm.concurrency"
                            >
                                <template #prepend>{{$t('message.threadConcurrency')}}</template>
                            </el-input>
                        </el-col>
                        <el-col :span="6">
                            <el-input 
                                :placeholder="$t('message.timeout')" 
                                v-model="modifiedJobForm.instanceTimeLimit"
                            >
                                <template #prepend>{{$t('message.timeout')}}</template>
                            </el-input>
                        </el-col>
                    </el-row>
                    <el-row :gutter="16" style="margin-top: 16px;" v-if="modifiedJobForm.dispatchStrategy=='SPECIFY'">
                        <el-col :span="12">
                            <el-input 
                                :placeholder="$t('message.dispatchStrategyConfig')" 
                                v-model="modifiedJobForm.dispatchStrategyConfig"
                            >
                                <template #prepend>{{$t('message.dispatchStrategyConfig')}}</template>
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
                    <el-row :gutter="16">
                        <el-col :span="8">
                            <el-select 
                                v-model="modifiedJobForm.notifyUserIds" 
                                multiple 
                                filterable 
                                :placeholder="$t('message.alarmSelectorPLH')"
                                style="width: 100%"
                            >
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
                <el-row style="width: 100%;">
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

              <el-form-item :label="$t('message.advanceConfig')" style="width: 100%;">
                <el-row>
                  <el-col :span="6">
                    <el-select v-model="modifiedJobForm.advancedRuntimeConfig.taskTrackerBehavior" :placeholder="$t('message.taskTrackerBehavior')" style="width: 200px;">
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

            </el-form>
            
            <template #footer>
                <div class="drawer-footer">
                    <el-button @click="modifiedJobFormVisible = false">
                        {{$t('message.cancel')}}
                    </el-button>
                    <el-button type="primary" @click="saveJob" :loading="saveLoading">
                        {{$t('message.save')}}
                    </el-button>
                </div>
            </template>
        </el-drawer>

        <el-dialog :close-on-click-modal="false" v-model="timeExpressionValidatorVisible" v-if='timeExpressionValidatorVisible'>
            <TimeExpressionValidator :time-expression="modifiedJobForm.timeExpression" :time-expression-type="modifiedJobForm.timeExpressionType"/>
        </el-dialog>

        <!-- 时间表达式编辑 -->
        <el-dialog :close-on-click-modal="false" v-model="timeExpressionEditorVisible" v-if='timeExpressionEditorVisible'>
          <DailyTimeIntervalForm :timeExpression="modifiedJobForm.timeExpression" @contentChanged="eventFromDailyTimeIntervalExpress"></DailyTimeIntervalForm>
        </el-dialog>

        <!-- 任务导入导出 -->
        <el-dialog :close-on-click-modal="false" v-model="jobExporterDialogVisible" v-if='jobExporterDialogVisible'>
            <Exporter type="JOB" :mode="jobExporterMode" :target-id="jobExporterTargetId"  @finished="eventFromExporter"></Exporter>
        </el-dialog>

        <el-dialog
            :title="$t('message.runByParameter')"
            v-model="runByParameterVisible"
            width="60%"
            :close-on-click-modal="false"
        >
            <el-form :model="advancedRunForm" label-width="140px" class="advanced-run-form">
                <el-form-item :label="$t('message.instanceParams')">
                    <el-input
                        type="textarea"
                        :rows="4"
                        :placeholder="$t('message.enteringParameter')"
                        v-model="advancedRunForm.instanceParams">
                    </el-input>
                </el-form-item>
                
                <el-form-item :label="$t('message.delay')">
                    <el-input-number
                        v-model="advancedRunForm.delay"
                        :placeholder="$t('message.delayPlaceholder')"
                        :min="0"
                        controls-position="right"
                        style="width: 100%">
                    </el-input-number>
                </el-form-item>
                
                <el-form-item :label="$t('message.outerKey')">
                    <el-input
                        v-model="advancedRunForm.outerKey"
                        :placeholder="$t('message.outerKeyPlaceholder')">
                    </el-input>
                </el-form-item>
                
                <el-form-item :label="$t('message.extendValue')">
                    <el-input
                        v-model="advancedRunForm.extendValue"
                        :placeholder="$t('message.extendValuePlaceholder')">
                    </el-input>
                </el-form-item>
                
                <el-form-item :label="$t('message.designatedWorkersRuntime')">
                    <el-input
                        v-model="advancedRunForm.runtimeConfig.designatedWorkers"
                        :placeholder="$t('message.designatedWorkersRuntimePlaceholder')">
                    </el-input>
                </el-form-item>
            </el-form>
            
            <template #footer class="dialog-footer">
                <el-button @click="onClickAdvancedRunCancel">{{$t('message.cancel')}}</el-button>
                <el-button type="primary" @click="onClickAdvancedRun" :loading="runLoading">{{$t('message.run')}}</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script>
    import TimeExpressionValidator from "../common/TimeExpressionValidator";
    import DailyTimeIntervalForm from "../common/DailyTimeIntervalForm";
    import Exporter from "../common/Exporter";
    import { ElMessage } from 'element-plus';
    import { Search, Upload, Plus, ArrowDown, Edit, VideoPlay, Setting, Clock, CopyDocument, Download, Delete, Refresh } from '@element-plus/icons-vue';
    export default {
        name: "JobManager",
        components: {
            Exporter, 
            TimeExpressionValidator, 
            DailyTimeIntervalForm,
            Search,
            Upload,
            Plus,
            ArrowDown,
            Edit,
            VideoPlay,
            Setting,
            Clock,
            CopyDocument,
            Download,
            Delete,
            Refresh
        },
        data() {
            return {
                modifiedJobFormVisible: false,
                saveLoading: false,
                // 新建任务对象
                modifiedJobForm: {
                    id: undefined,
                    jobName: "",
                    jobDescription: "",
                    appId: window.localStorage.getItem("Power_appId"),
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
                    dispatchStrategy: undefined,
                    dispatchStrategyConfig: undefined,

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
                    },
                    logConfig: {
                        type: 1,
                        level: undefined,
                        loggerName: undefined
                    },
                    advancedRuntimeConfig: {
                      taskTrackerBehavior: undefined,
                    }
                },
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
                timeExpressionTypeOptions: [{key: "API", label: "API"}, {key: "CRON", label: "CRON"}, {key: "FIXED_RATE", label: this.$t('message.fixRate')}, {key: "FIXED_DELAY", label: this.$t('message.fixDelay')}, {key: "WORKFLOW", label: this.$t('message.workflow')}, {key: "DAILY_TIME_INTERVAL", label: this.$t('message.dailyTimeInterval')} ],
                // 处理器类型
                processorTypeOptions: [{key: "BUILT_IN", label: this.$t('message.builtIn')}, {key: "EXTERNAL", label: this.$t('message.external')}], // {key: "SHELL", label: "SHELL"}, {key: "PYTHON", label: "PYTHON"}
                // 执行方式类型
                executeTypeOptions: [{key: "STANDALONE", label: this.$t('message.standalone')}, {key: "BROADCAST", label: this.$t('message.broadcast')},  {key: "MAP", label: this.$t('message.map')}, {key: "MAP_REDUCE", label: this.$t('message.mapReduce')}],
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
                // 参数运行对话框可见性
                runByParameterVisible: false,
                // 高级运行表单
                advancedRunForm: {
                    jobId: null,
                    instanceParams: '',
                    delay: null,
                    outerKey: '',
                    extendValue: '',
                  runtimeConfig: {
                        designatedWorkers: ''
                    }
                },

                // 任务导入导出相关功能
                jobExporterMode: undefined,
                jobExporterTargetId: undefined,
                jobExporterDialogVisible: false,
            }
        },
        methods: {
            // 保存变更，包括新增和修改
            async saveJob() {
                this.saveLoading = true;
                try {
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
                    ElMessage.success(this.$t('message.success'));
                    this.listJobInfos();
                } catch (error) {
                    console.error('保存任务失败:', error);
                    ElMessage.error(this.$t('message.saveFailedRetry'));
                } finally {
                    this.saveLoading = false;
                }
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
                let url = "/job/run?jobId=" + data.id + "&appId=" + window.localStorage.getItem("Power_appId");
                if (this.temporaryRowData && this.runParameter) {
                    url += `&instanceParams=${encodeURIComponent(this.runParameter)}`
                }
                this.runLoading = true;
                this.axios.get(url).then(() => {
                    ElMessage.success(this.$t('message.success'));
                    this.temporaryRowData = null;
                    this.runParameter = null;
                    this.runByParameterVisible = false;
                    this.runLoading = false
                }).catch(() => {
                    this.runLoading = false
                });
            },
            // 参数运行
            onClickRunByParameter(data) {
                this.temporaryRowData = data;
                this.advancedRunForm = {
                    jobId: data.id,
                    instanceParams: '',
                    delay: null,
                    outerKey: '',
                    extendValue: '',
                  runtimeConfig: {
                        designatedWorkers: ''
                    }
                };
                // 为了兼容性，保留原有逻辑
                this.runParameter = '';
                this.runByParameterVisible = true;
            },
            // 取消参数运行
            onClickRunCancel() {
                this.temporaryRowData = null;
                this.runParameter = null;
                this.runByParameterVisible = false;
            },
            // 取消高级运行
            onClickAdvancedRunCancel() {
                this.temporaryRowData = null;
                this.advancedRunForm = {
                    jobId: null,
                    instanceParams: '',
                    delay: null,
                    outerKey: '',
                    extendValue: '',
                  runtimeConfig: {
                        designatedWorkers: ''
                    }
                };
                this.runByParameterVisible = false;
            },
            // 高级运行
            async onClickAdvancedRun() {
                try {
                    this.runLoading = true;
                    const payload = {
                        ...this.advancedRunForm,
                        jobId: this.temporaryRowData.id
                    };
                    
                    // 过滤空值
                    if (!payload.delay) {
                        delete payload.delay;
                    }
                    if (!payload.outerKey) {
                        delete payload.outerKey;
                    }
                    if (!payload.extendValue) {
                        delete payload.extendValue;
                    }
                    if (!payload.runtimeConfig.designatedWorkers) {
                        delete payload.runtimeConfig;
                    }
                    
                    await this.axios.post("/job/runPlus", payload);
                    ElMessage.success(this.$t('message.success'));
                    this.onClickAdvancedRunCancel();
                } catch (error) {
                    console.error('高级运行失败:', error);
                    ElMessage.error('运行失败，请重试');
                } finally {
                    this.runLoading = false;
                }
            },
            // 点击 删除任务
            onClickDeleteJob(data) {
                let that = this;
                let url = "/job/delete?jobId=" + data.id;
                this.axios.get(url).then(() => {
                    ElMessage.success(this.$t('message.success'));
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
            // 翻译时间表达式类型
            translateTimeExpressionType(timeExpressionType) {
                switch (timeExpressionType) {
                    case "API": return "API";
                    case "CRON": return "CRON";
                    case "FIXED_RATE": return this.$t('message.fixRate');
                    case "FIXED_DELAY": return this.$t('message.fixDelay');
                    case "WORKFLOW": return this.$t('message.workflow');
                    case "DAILY_TIME_INTERVAL": return this.$t('message.dailyTimeInterval');
                    default: return timeExpressionType;
                }
            },
            // 获取执行类型标签颜色
            getExecuteTypeColor(executeType) {
                switch (executeType) {
                    case "STANDALONE": return "success"; // 蓝色 - 单机执行
                    case "BROADCAST": return "danger";  // 绿色 - 广播执行
                    case "MAP": return "primary";        // 黄色 - Map处理
                    case "MAP_REDUCE": return "warning";  // 红色 - MapReduce处理
                    default: return "info";
                }
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
                console.log("event from dailyTimeIntervalExpress: " + content);
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
                console.log('receive callback from Exporter: ' + content)
                this.jobExporterDialogVisible = false;
                if (this.jobExporterMode === 'INPUT') {
                    this.listJobInfos();
                }
            },
            // Enhanced methods for better UX
            handleSortChange(sort) {
                console.log('Sort changed:', sort);
            },
            handleSizeChange(newSize) {
                this.jobQueryContent.pageSize = newSize;
                this.jobQueryContent.index = 0;
                this.listJobInfos();
            },
            handleCommand(command, row) {
                switch (command) {
                    case 'runByParameter':
                        this.onClickRunByParameter(row);
                        break;
                    case 'runHistory':
                        this.onClickRunHistory(row);
                        break;
                    case 'copy':
                        this.onClickCopyJob(row);
                        break;
                    case 'export':
                        this.onClickJobExportButton(row);
                        break;
                    case 'delete':
                        this.$confirm(this.$t('message.deleteConfirm'), this.$t('message.warning'), {
                            confirmButtonText: this.$t('message.confirm'),
                            cancelButtonText: this.$t('message.cancel'),
                            type: 'warning'
                        }).then(() => {
                            this.onClickDeleteJob(row);
                        });
                        break;
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
            });
            // 加载任务信息
            this.listJobInfos();
        }
    }
</script>

<style scoped lang="scss">
/* Modern Job Manager Styles */
.job-manager {
    padding: 0;
    background: transparent;
}

/* Compact spacing */
:deep(.pj-form-section) {
  margin-bottom: var(--pj-space-sm) !important;
  padding: var(--pj-space-sm) !important;
}

/* Search Section */
.search-container {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: var(--pj-space-lg);
}

.search-form {
    flex: 1;
    min-width: 500px;
}

.search-form :deep(.el-form--inline .el-form-item) {
  margin-bottom: var(--pj-space-xs);
}

.action-buttons {
    display: flex;
    gap: var(--pj-space-sm);
    flex-shrink: 0;
}

/* Enhanced Schedule Info Styling */
.schedule-info-enhanced {
    display: flex;
    flex-direction: column;
    gap: var(--pj-space-xs);
    min-width: 0;
}

.schedule-info-enhanced .schedule-type {
    flex-shrink: 0;
}

.schedule-info-enhanced .schedule-expression {
    font-size: 12px;
    color: var(--pj-text-secondary);
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: help;
}

/* Legacy support */
.schedule-info {
    display: flex;
    flex-direction: column;
    gap: var(--pj-space-xs);
}

.schedule-info .expression {
    font-size: 12px;
    color: var(--pj-text-secondary);
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

/* Enhanced Operation Buttons */
.operation-buttons-enhanced {
    display: flex;
    align-items: center;
    gap: var(--pj-space-sm);
    justify-content: center;
    flex-wrap: wrap;
}

.operation-buttons-enhanced .el-button {
    border-radius: var(--pj-radius-sm);
    font-weight: 500;
    transition: all 0.3s ease;
    margin: 0;
}

.operation-buttons-enhanced .el-button .el-icon {
    margin-right: 4px;
}

.operation-buttons-enhanced .el-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Dropdown menu enhancements */
.operation-buttons-enhanced :deep(.el-dropdown-menu) {
    .el-dropdown-menu__item {
        display: flex;
        align-items: center;
        gap: var(--pj-space-sm);
        
        .el-icon {
            width: 16px;
            height: 16px;
        }
    }
}

/* Legacy Operation Buttons */
.operation-buttons {
    display: flex;
    align-items: center;
    gap: var(--pj-space-xs);
    flex-wrap: wrap;
}

/* Pagination */
.pagination-container {
    display: flex;
    justify-content: center;
    padding: var(--pj-space-lg) 0;
    background: var(--pj-bg-white);
    border-radius: var(--pj-radius-lg);
    margin-top: var(--pj-space-md);
    box-shadow: var(--pj-shadow-card);
}

/* Utility Classes */
.mr-1 {
    margin-right: var(--pj-space-xs);
}

.ml-1 {
    margin-left: var(--pj-space-xs);
}

/* Enhanced Form Styles */
:deep(.el-form--inline .el-form-item) {
    margin-right: var(--pj-space-lg);
    margin-bottom: var(--pj-space-md);
}

:deep(.el-form-item__label) {
    color: var(--pj-text-secondary);
    font-weight: 500;
}

:deep(.el-input__wrapper) {
    border-radius: var(--pj-radius-sm);
    transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
    box-shadow: 0 0 8px rgba(0, 150, 136, 0.2);
}

/* Table Enhancements */
:deep(.el-table) {
    .el-table__header-wrapper th {
        background: #fafbfc;
        color: var(--pj-text-secondary);
        font-weight: 600;
        border-bottom: 2px solid #e4e7ed;
    }
    
    .el-table__body-wrapper tr:hover {
        background: var(--pj-bg-hover);
    }
    
    .el-button--link {
        padding: 4px 8px;
        margin: 0 2px;
        border-radius: var(--pj-radius-sm);
        
        &:hover {
            background: rgba(0, 150, 136, 0.1);
        }
    }
}

/* Tag Enhancements */
:deep(.el-tag) {
    border-radius: var(--pj-radius-sm);
    font-weight: 500;
}

/* Switch Styling */
:deep(.el-switch) {
    --el-switch-on-color: var(--pj-success);
    --el-switch-off-color: var(--pj-error);
}

/* Dialog Enhancements */
:deep(.el-dialog) {
    border-radius: var(--pj-radius-lg);
    box-shadow: var(--pj-shadow-hover);
    
    .el-dialog__header {
        padding: var(--pj-space-lg);
        background: #fafbfc;
        border-bottom: 1px solid #e4e7ed;
        border-radius: var(--pj-radius-lg) var(--pj-radius-lg) 0 0;
        
        .el-dialog__title {
            font-weight: 600;
            color: var(--pj-text-primary);
        }
    }
    
    .el-dialog__body {
        padding: var(--pj-space-lg);
        max-height: 70vh;
        overflow-y: auto;
    }
    
    .el-dialog__footer {
        padding: var(--pj-space-lg);
        background: #fafbfc;
        border-top: 1px solid #e4e7ed;
        border-radius: 0 0 var(--pj-radius-lg) var(--pj-radius-lg);
    }
}

/* Job Form Drawer Specific Styles */
.job-form-drawer {
    :deep(.el-drawer__body) {
        padding: var(--pj-space-lg) var(--pj-space-md);
        overflow-y: auto;
    }

    :deep(.el-drawer__header) {
        padding: var(--pj-space-md) var(--pj-space-lg);
        border-bottom: 1px solid #e4e7ed;
        margin-bottom: 0;
        min-height: auto;

        .el-drawer__title {
            font-size: 16px;
            font-weight: 600;
            color: var(--pj-text-primary);
            margin: 0;
        }
        
        .el-drawer__close-btn {
            top: 50%;
            transform: translateY(-50%);
        }
    }
}

.drawer-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--pj-space-md);
    padding: var(--pj-space-lg) var(--pj-space-xl);
    border-top: 1px solid #e4e7ed;
    background: #fafbfc;
}

.drawer-footer .el-button {
    min-width: 100px;
}

.job-form-content {
    max-width: 100%;
    
    .el-form-item {
        margin-bottom: var(--pj-space-lg);
        
        .el-form-item__label {
            font-weight: 500;
            color: var(--pj-text-primary);
            line-height: 1.6;
        }
        
        .el-form-item__content {
            .el-input,
            .el-select,
            .el-date-picker {
                .el-input__wrapper {
                    border-radius: var(--pj-radius-sm);
                    transition: all 0.3s ease;
                    
                    &:hover {
                        border-color: var(--pj-primary-light);
                    }
                    
                    &.is-focus {
                        border-color: var(--pj-primary);
                        box-shadow: 0 0 8px rgba(0, 150, 136, 0.2);
                    }
                }
            }
            
            .el-select {
                .el-select__wrapper {
                    border-radius: var(--pj-radius-sm);
                    
                    &:hover {
                        border-color: var(--pj-primary-light);
                    }
                    
                    &.is-focused {
                        border-color: var(--pj-primary);
                        box-shadow: 0 0 8px rgba(0, 150, 136, 0.2);
                    }
                }
            }
        }
    }
    
    // 改善 textarea 的样式
    :deep(.el-textarea) {
        .el-textarea__inner {
            border-radius: var(--pj-radius-sm);
            min-height: 80px;
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            
            &:focus {
                border-color: var(--pj-primary);
                box-shadow: 0 0 8px rgba(0, 150, 136, 0.2);
            }
        }
    }
    
    // 优化按钮组
    .el-form-item:last-child {
        margin-bottom: 0;
        text-align: center;
        padding-top: var(--pj-space-lg);
        border-top: 1px solid #f0f0f0;
        
        .el-button {
            margin: 0 var(--pj-space-sm);
            min-width: 100px;
        }
    }
}

/* Table responsive enhancements */
:deep(.el-table) {
    .el-table__header-wrapper th {
        white-space: nowrap;
        padding: 12px 8px;
    }
    
    .el-table__body-wrapper td {
        padding: 12px 8px;
    }
    
    .el-table__fixed-right {
        box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
    }
}

/* Tag enhancements for better readability */
:deep(.el-tag) {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
    border-radius: 12px;
    padding: 4px 12px;
    font-size: 12px;
    line-height: 1.2;
    transition: all 0.3s ease;
}

/* Enhanced schedule type tags */
.schedule-info-enhanced .schedule-type .el-tag {
    min-width: fit-content;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.schedule-info-enhanced .schedule-type .el-tag:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* Custom colors for schedule types */
:deep(.el-tag.el-tag--success.el-tag--light) {
    background-color: #f0f9ff;
    border-color: #b5f5ec;
    color: #08979c;
}

:deep(.el-tag.el-tag--primary.el-tag--dark) {
    background-color: #1890ff;
    border-color: #1890ff;
    color: #ffffff;
    font-weight: 600;
}

:deep(.el-tag.el-tag--warning.el-tag--light) {
    background-color: #fffbe6;
    border-color: #ffe58f;
    color: #d46b08;
}

:deep(.el-tag.el-tag--info.el-tag--plain) {
    background-color: #fafafa;
    border-color: #d9d9d9;
    color: #595959;
}

:deep(.el-tag.el-tag--danger.el-tag--light) {
    background-color: #fff2f0;
    border-color: #ffccc7;
    color: #cf1322;
}

:deep(.el-tag.el-tag--dark) {
    background-color: #262626;
    border-color: #262626;
    color: #ffffff;
    font-weight: 600;
}

/* Custom colors for execute types */
:deep(.el-tag.el-tag--primary.el-tag--light) {
    background-color: #e6f7ff;
    border-color: #91d5ff;
    color: #096dd9;
}

:deep(.el-tag.el-tag--success.el-tag--dark) {
    background-color: #52c41a;
    border-color: #52c41a;
    color: #ffffff;
    font-weight: 600;
}

:deep(.el-tag.el-tag--danger.el-tag--dark) {
    background-color: #ff4d4f;
    border-color: #ff4d4f;
    color: #ffffff;
    font-weight: 600;
}

/* Responsive Design */
@media (max-width: 1200px) {
    .operation-buttons-enhanced {
        gap: var(--pj-space-xs);
    }
    
    .operation-buttons-enhanced .el-button {
        font-size: 12px;
        padding: 6px 12px;
    }
}

@media (max-width: 1024px) {
    .search-container {
        flex-direction: column;
        align-items: stretch;
    }
    
    .search-form {
        min-width: auto;
    }
    
    .action-buttons {
        justify-content: flex-end;
    }
    
    .schedule-info-enhanced .schedule-expression {
        max-width: 180px;
    }
}

@media (max-width: 768px) {
    .action-buttons {
        flex-direction: column;
        width: 100%;
    }
    
    .operation-buttons {
        justify-content: center;
    }
    
    .pagination-container {
        :deep(.el-pagination) {
            flex-wrap: wrap;
            justify-content: center;
        }
    }
}

/* Advanced Run Form Styles */
.advanced-run-form {
    .el-form-item {
        margin-bottom: var(--pj-space-lg);
        
        .el-form-item__label {
            font-weight: 500;
            color: var(--pj-text-primary);
        }
        
        .el-input,
        .el-input-number {
            .el-input__wrapper {
                border-radius: var(--pj-radius-sm);
                transition: all 0.3s ease;
                
                &:hover {
                    border-color: var(--pj-primary-light);
                }
                
                &.is-focus {
                    border-color: var(--pj-primary);
                    box-shadow: 0 0 8px rgba(0, 150, 136, 0.2);
                }
            }
        }
        
        .el-textarea {
            .el-textarea__inner {
                border-radius: var(--pj-radius-sm);
                font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
                
                &:focus {
                    border-color: var(--pj-primary);
                    box-shadow: 0 0 8px rgba(0, 150, 136, 0.2);
                }
            }
        }
    }
}

/* Legacy styles (kept for compatibility) */
.job-editor-number {
    display: flex;
}

.job-input-number {
    background-color: #F5F7FA;
    color: #909399;
    position: relative;
    border: 1px solid #DCDFE6;
    border-radius: 4px;
    padding: 0 20px;
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
