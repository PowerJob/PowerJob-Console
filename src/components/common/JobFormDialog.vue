<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? $t('message.editJob') : $t('message.newJob')"
    width="860px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    class="job-form-dialog"
    append-to-body
    destroy-on-close
  >
    <div class="job-form-container">
      <!-- 基本信息区块 - 始终展开 -->
      <div class="form-section form-section-required">
        <div class="section-header">
          <div class="section-title">
            <el-icon class="section-icon"><Document /></el-icon>
            <span>基本信息</span>
            <el-tag size="small" type="danger" effect="plain">必填</el-tag>
          </div>
        </div>
        <div class="section-content">
          <el-form
            ref="formRef"
            :model="formData"
            :rules="formRules"
            label-width="120px"
            class="job-form"
          >
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="任务名称" prop="jobName">
                  <el-input
                    v-model="formData.jobName"
                    :placeholder="$t('message.jobName')"
                    maxlength="100"
                    show-word-limit
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="任务描述">
                  <el-input
                    v-model="formData.jobDescription"
                    :placeholder="$t('message.jobDescription')"
                    maxlength="255"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="24">
                <el-form-item label="任务参数">
                  <template #label>
                    <span>任务参数</span>
                    <el-tooltip content="支持任意文本；若为合法 JSON 可点击格式化进行美化" placement="top">
                      <el-icon class="label-icon"><QuestionFilled /></el-icon>
                    </el-tooltip>
                  </template>
                  <div class="job-params-row">
                    <el-input
                      v-model="formData.jobParams"
                      type="textarea"
                      :rows="5"
                      :placeholder="$t('message.jobParams')"
                      class="job-params-input"
                    />
                    <el-button type="primary" @click="formatJobParams" class="format-params-btn">
                      <el-icon><MagicStick /></el-icon>
                      <span>格式化</span>
                    </el-button>
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </div>

      <!-- 调度配置区块 - 始终展开 -->
      <div class="form-section form-section-required">
        <div class="section-header">
          <div class="section-title">
            <el-icon class="section-icon"><Clock /></el-icon>
            <span>调度配置</span>
            <el-tag size="small" type="danger" effect="plain">必填</el-tag>
          </div>
        </div>
        <div class="section-content">
          <el-form
            :model="formData"
            :rules="formRules"
            label-width="120px"
            class="job-form"
          >
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="调度类型" prop="timeExpressionType">
                  <el-select
                    v-model="formData.timeExpressionType"
                    placeholder="调度类型"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in timeExpressionTypeOptions"
                      :key="item.key"
                      :label="item.label"
                      :value="item.key"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="16">
                <el-form-item label="时间表达式" prop="timeExpression">
                  <div 
                    v-if="['CRON', 'FIXED_DELAY', 'FIXED_RATE'].includes(formData.timeExpressionType)"
                    style="display: flex; width: 100%; gap: 12px;"
                  >
                    <el-input
                      v-model="formData.timeExpression"
                      :placeholder="$t('message.timeExpressionPlaceHolder')"
                      style="flex: 1;"
                    />
                    <el-button
                      type="primary"
                      @click="onClickValidateTimeExpression"
                    >
                      <el-icon><Check /></el-icon>
                      <span style="margin-left: 4px;">校验</span>
                    </el-button>
                  </div>
                  <el-button
                    v-else-if="formData.timeExpressionType === 'DAILY_TIME_INTERVAL'"
                    type="primary"
                    plain
                    @click="onClickEditTimeExpression"
                    class="edit-expression-btn"
                  >
                    <el-icon><Edit /></el-icon>
                    <span style="margin-left: 4px;">点击编辑</span>
                  </el-button>
                  <el-input
                    v-else
                    v-model="formData.timeExpression"
                    :placeholder="getTimeExpressionPlaceholder()"
                    disabled
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="24">
                <el-form-item :label="$t('message.lifeCycle')">
                  <el-date-picker
                    v-model="formData.lifeCycle"
                    type="datetimerange"
                    :start-placeholder="$t('message.startTime')"
                    :end-placeholder="$t('message.finishedTime')"
                    value-format="timestamp"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </div>

      <!-- 执行配置区块 - 始终展开 -->
      <div class="form-section form-section-required">
        <div class="section-header">
          <div class="section-title">
            <el-icon class="section-icon"><Setting /></el-icon>
            <span>执行配置</span>
            <el-tag size="small" type="danger" effect="plain">必填</el-tag>
          </div>
        </div>
        <div class="section-content">
          <el-form
            :model="formData"
            :rules="formRules"
            label-width="120px"
            class="job-form"
          >
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="执行类型" prop="executeType">
                  <el-select
                    v-model="formData.executeType"
                    placeholder="执行类型"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in executeTypeOptions"
                      :key="item.key"
                      :label="item.label"
                      :value="item.key"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="处理器类型" prop="processorType">
                  <el-select
                    v-model="formData.processorType"
                    placeholder="处理器类型"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in processorTypeOptions"
                      :key="item.key"
                      :label="item.label"
                      :value="item.key"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="24">
                <el-form-item label="处理器配置" prop="processorInfo">
                  <el-input
                    v-model="formData.processorInfo"
                    :placeholder="getProcessorPlaceholder()"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </div>

      <!-- 可选配置区块 - 整合为单层折叠 + 内部 Tabs -->
      <div class="optional-config-container">
        <el-collapse v-model="activeCollapse" class="optional-config-collapse">
          <el-collapse-item name="optional">
            <template #title>
              <div class="collapse-title">
                <el-icon><Tools /></el-icon>
                <span>可选配置</span>
              </div>
            </template>
            <el-tabs v-model="activeTab" class="optional-tabs">
              <!-- 运行配置 -->
              <el-tab-pane label="运行配置" name="runtime">
                <el-form :model="formData" label-width="120px" class="job-form">
                  <el-row :gutter="16">
                    <el-col :span="8">
                      <el-form-item :label="$t('message.dispatchStrategy')">
                        <el-select
                          v-model="formData.dispatchStrategy"
                          :placeholder="$t('message.dispatchStrategy')"
                          style="width: 100%"
                        >
                          <el-option
                            v-for="item in dispatchStrategyOptions"
                            :key="item.key"
                            :label="item.label"
                            :value="item.key"
                          />
                        </el-select>
                      </el-form-item>
                    </el-col>
                    <el-col :span="8">
                      <el-form-item :label="$t('message.maxInstanceNum')">
                        <el-input-number
                          v-model="formData.maxInstanceNum"
                          :min="0"
                          :max="9999"
                          controls-position="right"
                          style="width: 100%"
                        />
                      </el-form-item>
                    </el-col>
                    <el-col :span="8">
                      <el-form-item :label="$t('message.threadConcurrency')">
                        <el-input-number
                          v-model="formData.concurrency"
                          :min="1"
                          :max="9999"
                          controls-position="right"
                          style="width: 100%"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>
                  <el-row :gutter="16">
                    <el-col :span="8">
                      <el-form-item>
                        <template #label>
                          <span>{{ $t('message.timeout') }}</span>
                          <el-tooltip content="单位：毫秒，0表示无限制" placement="top">
                            <el-icon class="label-icon"><QuestionFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        <el-input-number
                          v-model="formData.instanceTimeLimit"
                          :min="0"
                          :max="999999999"
                          controls-position="right"
                          style="width: 100%"
                        />
                      </el-form-item>
                    </el-col>
                    <el-col :span="16" v-if="formData.dispatchStrategy === 'SPECIFY'">
                      <el-form-item :label="$t('message.dispatchStrategyConfig')">
                        <el-input
                          v-model="formData.dispatchStrategyConfig"
                          :placeholder="$t('message.dispatchStrategyConfig')"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>
                </el-form>
              </el-tab-pane>

              <!-- 重试配置 -->
              <el-tab-pane label="重试配置" name="retry">
                <el-form :model="formData" label-width="120px" class="job-form">
                  <el-row :gutter="16">
                    <el-col :span="12">
                      <el-form-item>
                        <template #label>
                          <span>{{ $t('message.taskRetryTimes') }}</span>
                          <el-tooltip content="Server 侧任务重试次数" placement="top">
                            <el-icon class="label-icon"><QuestionFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        <el-input-number
                          v-model="formData.instanceRetryNum"
                          :min="0"
                          :max="100"
                          controls-position="right"
                          style="width: 100%"
                        />
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item>
                        <template #label>
                          <span>{{ $t('message.subTaskRetryTimes') }}</span>
                          <el-tooltip content="Worker 侧任务重试次数" placement="top">
                            <el-icon class="label-icon"><QuestionFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        <el-input-number
                          v-model="formData.taskRetryNum"
                          :min="0"
                          :max="100"
                          controls-position="right"
                          style="width: 100%"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>
                </el-form>
              </el-tab-pane>

              <!-- 资源配置 -->
              <el-tab-pane label="资源配置" name="resource">
                <el-form :model="formData" label-width="120px" class="job-form">
                  <el-row :gutter="16">
                    <el-col :span="8">
                      <el-form-item>
                        <template #label>
                          <span>{{ $t('message.minCPU') }}</span>
                        </template>
                        <el-input-number
                          v-model="formData.minCpuCores"
                          :min="0"
                          :precision="1"
                          controls-position="right"
                          style="width: 100%"
                        />
                      </el-form-item>
                    </el-col>
                    <el-col :span="8">
                      <el-form-item>
                        <template #label>
                          <span>{{ $t('message.minMemory') }}</span>
                          <el-tooltip content="单位：GB" placement="top">
                            <el-icon class="label-icon"><QuestionFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        <el-input-number
                          v-model="formData.minMemorySpace"
                          :min="0"
                          :precision="1"
                          controls-position="right"
                          style="width: 100%"
                        />
                      </el-form-item>
                    </el-col>
                    <el-col :span="8">
                      <el-form-item>
                        <template #label>
                          <span>{{ $t('message.minDisk') }}</span>
                          <el-tooltip content="单位：GB" placement="top">
                            <el-icon class="label-icon"><QuestionFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        <el-input-number
                          v-model="formData.minDiskSpace"
                          :min="0"
                          :precision="1"
                          controls-position="right"
                          style="width: 100%"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>
                </el-form>
              </el-tab-pane>

              <!-- 集群配置 -->
              <el-tab-pane label="集群配置" name="cluster">
                <el-form :model="formData" label-width="120px" class="job-form">
                  <el-row :gutter="16">
                    <el-col :span="16">
                      <el-form-item :label="$t('message.designatedWorkerAddress')">
                        <el-input
                          v-model="formData.designatedWorkers"
                          :placeholder="$t('message.designatedWorkerAddressPLH')"
                        />
                      </el-form-item>
                    </el-col>
                    <el-col :span="8">
                      <el-form-item :label="$t('message.maxWorkerNum')">
                        <el-input-number
                          v-model="formData.maxWorkerCount"
                          :min="0"
                          :max="9999"
                          controls-position="right"
                          style="width: 100%"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>
                </el-form>
              </el-tab-pane>

              <!-- 告警配置 -->
              <el-tab-pane label="告警配置" name="alarm">
                <el-form :model="formData" label-width="120px" class="job-form">
                  <el-row :gutter="16">
                    <el-col :span="24">
                      <el-form-item :label="$t('message.notifyUserIds')">
                        <el-select
                          v-model="formData.notifyUserIds"
                          multiple
                          filterable
                          :placeholder="$t('message.alarmSelectorPLH')"
                          style="width: 100%"
                        >
                          <el-option
                            v-for="user in userList"
                            :key="user.id"
                            :label="user.username"
                            :value="user.id"
                          />
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>
                  <el-row :gutter="16">
                    <el-col :span="8">
                      <el-form-item :label="$t('message.alertThreshold')">
                        <el-input-number
                          v-model="formData.alarmConfig.alertThreshold"
                          :min="0"
                          controls-position="right"
                          style="width: 100%"
                        />
                      </el-form-item>
                    </el-col>
                    <el-col :span="8">
                      <el-form-item>
                        <template #label>
                          <span>{{ $t('message.statisticWindow') }}</span>
                          <el-tooltip content="单位：秒" placement="top">
                            <el-icon class="label-icon"><QuestionFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        <el-input-number
                          v-model="formData.alarmConfig.statisticWindowLen"
                          :min="0"
                          controls-position="right"
                          style="width: 100%"
                        />
                      </el-form-item>
                    </el-col>
                    <el-col :span="8">
                      <el-form-item>
                        <template #label>
                          <span>{{ $t('message.silenceWindow') }}</span>
                          <el-tooltip content="单位：秒" placement="top">
                            <el-icon class="label-icon"><QuestionFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        <el-input-number
                          v-model="formData.alarmConfig.silenceWindowLen"
                          :min="0"
                          controls-position="right"
                          style="width: 100%"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>
                </el-form>
              </el-tab-pane>

              <!-- 日志配置 -->
              <el-tab-pane label="日志配置" name="log">
                <el-form :model="formData" label-width="120px" class="job-form">
                  <el-row :gutter="16">
                    <el-col :span="8">
                      <el-form-item :label="$t('message.logType')">
                        <el-select
                          v-model="formData.logConfig.type"
                          :placeholder="$t('message.logType')"
                          style="width: 100%"
                        >
                          <el-option
                            v-for="item in logTypeOptions"
                            :key="item.key"
                            :label="item.label"
                            :value="item.key"
                          />
                        </el-select>
                      </el-form-item>
                    </el-col>
                    <el-col :span="8">
                      <el-form-item :label="$t('message.logLevel')">
                        <el-select
                          v-model="formData.logConfig.level"
                          :placeholder="$t('message.logLevel')"
                          style="width: 100%"
                        >
                          <el-option
                            v-for="item in logLevelOptions"
                            :key="item.key"
                            :label="item.label"
                            :value="item.key"
                          />
                        </el-select>
                      </el-form-item>
                    </el-col>
                    <el-col :span="8" v-if="[2, 4].includes(formData.logConfig.type)">
                      <el-form-item :label="$t('message.loggerName')">
                        <el-input
                          v-model="formData.logConfig.loggerName"
                          :placeholder="$t('message.loggerName')"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>
                </el-form>
              </el-tab-pane>

              <!-- 高级配置 -->
              <el-tab-pane label="高级配置" name="advanced">
                <el-form :model="formData" label-width="120px" class="job-form">
                  <el-row :gutter="16">
                    <el-col :span="12">
                      <el-form-item :label="$t('message.taskTrackerBehavior')">
                        <el-select
                          v-model="formData.advancedRuntimeConfig.taskTrackerBehavior"
                          :placeholder="$t('message.taskTrackerBehavior')"
                          style="width: 100%"
                        >
                          <el-option
                            v-for="item in taskTrackerBehaviorOptions"
                            :key="item.key"
                            :label="item.label"
                            :value="item.key"
                          />
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>
                </el-form>
              </el-tab-pane>
            </el-tabs>
          </el-collapse-item>
        </el-collapse>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">
          {{ $t('message.cancel') }}
        </el-button>
        <el-button type="primary" @click="handleSave" :loading="saveLoading">
          {{ $t('message.save') }}
        </el-button>
      </div>
    </template>

    <!-- 时间表达式校验弹窗 -->
    <el-dialog
      v-model="timeExpressionValidatorVisible"
      v-if="timeExpressionValidatorVisible"
      :close-on-click-modal="false"
      append-to-body
    >
      <TimeExpressionValidator
        :time-expression="formData.timeExpression"
        :time-expression-type="formData.timeExpressionType"
      />
    </el-dialog>

    <!-- 时间表达式编辑弹窗 -->
    <el-dialog
      v-model="timeExpressionEditorVisible"
      v-if="timeExpressionEditorVisible"
      :close-on-click-modal="false"
      append-to-body
    >
      <DailyTimeIntervalForm
        :timeExpression="formData.timeExpression"
        @contentChanged="handleTimeExpressionChange"
      />
    </el-dialog>

  </el-dialog>
</template>

<script>
import { ref, computed, watch, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Document, Clock, Setting, Cpu, RefreshRight, Coin,
  Monitor, Bell, Tickets, Tools, Check, Edit, QuestionFilled, MagicStick
} from '@element-plus/icons-vue';
import TimeExpressionValidator from './TimeExpressionValidator.vue';
import DailyTimeIntervalForm from './DailyTimeIntervalForm.vue';

export default {
  name: 'JobFormDialog',
  components: {
    TimeExpressionValidator,
    DailyTimeIntervalForm,
    Document, Clock, Setting, Cpu, RefreshRight, Coin,
    Monitor, Bell, Tickets, Tools, Check, Edit, QuestionFilled, MagicStick
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    jobData: {
      type: Object,
      default: null
    },
    userList: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update:modelValue', 'save', 'cancel'],
  setup(props, { emit }) {
    const formRef = ref(null);
    const saveLoading = ref(false);
    const activeCollapse = ref([]);
    const activeTab = ref('runtime');
    const timeExpressionValidatorVisible = ref(false);
    const timeExpressionEditorVisible = ref(false);

    // 表单数据
    const formData = reactive({
      id: undefined,
      jobName: '',
      jobDescription: '',
      appId: window.localStorage.getItem('Power_appId'),
      jobParams: '',
      timeExpressionType: '',
      timeExpression: '',
      executeType: '',
      processorType: '',
      processorInfo: '',
      maxInstanceNum: 0,
      concurrency: 5,
      instanceTimeLimit: 0,
      instanceRetryNum: 0,
      taskRetryNum: 1,
      dispatchStrategy: 'HEALTH_FIRST',
      dispatchStrategyConfig: '',
      minCpuCores: 0,
      minMemorySpace: 0,
      minDiskSpace: 0,
      enable: true,
      designatedWorkers: '',
      maxWorkerCount: 0,
      notifyUserIds: [],
      lifeCycle: null,
      alarmConfig: {
        alertThreshold: 0,
        statisticWindowLen: 0,
        silenceWindowLen: 0
      },
      logConfig: {
        type: 1,
        level: undefined,
        loggerName: undefined
      },
      advancedRuntimeConfig: {
        taskTrackerBehavior: undefined
      }
    });

    // 表单验证规则
    const formRules = {
      jobName: [
        { required: true, message: '请输入任务名称', trigger: 'blur' }
      ],
      timeExpressionType: [
        { required: true, message: '请选择时间表达式类型', trigger: 'change' }
      ],
      timeExpression: [
        { required: true, message: '请输入时间表达式', trigger: 'blur' }
      ],
      executeType: [
        { required: true, message: '请选择执行类型', trigger: 'change' }
      ],
      processorType: [
        { required: true, message: '请选择处理器类型', trigger: 'change' }
      ],
      processorInfo: [
        { required: true, message: '请输入处理器信息', trigger: 'blur' }
      ]
    };

    // 下拉选项
    const timeExpressionTypeOptions = [
      { key: 'API', label: 'API' },
      { key: 'CRON', label: 'CRON' },
      { key: 'FIXED_RATE', label: '固定频率' },
      { key: 'FIXED_DELAY', label: '固定延迟' },
      { key: 'WORKFLOW', label: '工作流' },
      { key: 'DAILY_TIME_INTERVAL', label: '每日固定间隔' }
    ];

    const processorTypeOptions = [
      { key: 'BUILT_IN', label: '内置' },
      { key: 'EXTERNAL', label: '外部' }
    ];

    const executeTypeOptions = [
      { key: 'STANDALONE', label: '单机执行' },
      { key: 'BROADCAST', label: '广播执行' },
      { key: 'MAP', label: 'Map' },
      { key: 'MAP_REDUCE', label: 'MapReduce' }
    ];

    const dispatchStrategyOptions = [
      { key: 'HEALTH_FIRST', label: 'HEALTH_FIRST' },
      { key: 'RANDOM', label: 'RANDOM' },
      { key: 'SPECIFY', label: 'SPECIFY' }
    ];

    const logTypeOptions = [
      { key: 1, label: 'ONLINE' },
      { key: 2, label: 'LOCAL' },
      { key: 3, label: 'STDOUT' },
      { key: 4, label: 'LOCAL_AND_ONLINE' },
      { key: 999, label: 'NULL' }
    ];

    const logLevelOptions = [
      { key: 1, label: 'DEBUG' },
      { key: 2, label: 'INFO' },
      { key: 3, label: 'WARN' },
      { key: 4, label: 'ERROR' },
      { key: 99, label: 'OFF' }
    ];

    const taskTrackerBehaviorOptions = [
      { key: 1, label: 'NORMAL' },
      { key: 11, label: 'PADDLING' }
    ];

    // 计算属性
    const visible = computed({
      get: () => props.modelValue,
      set: (val) => emit('update:modelValue', val)
    });

    const isEdit = computed(() => !!formData.id);

    // 方法
    const getTimeExpressionPlaceholder = () => {
      if (formData.timeExpressionType === 'API') {
        return 'API 触发无需配置';
      }
      if (formData.timeExpressionType === 'WORKFLOW') {
        return '工作流触发无需配置';
      }
      return '请输入时间表达式';
    };

    const getProcessorPlaceholder = () => {
      switch (formData.processorType) {
        case 'BUILT_IN':
          return '请输入完整类名，如: tech.powerjob.example.TestProcessor';
        case 'EXTERNAL':
          return '请输入容器处理器，如: springBeanProcessor,myProcessor';
        default:
          return '请输入处理器信息';
      }
    };

    const formatJobParams = () => {
      const raw = (formData.jobParams || '').trim();
      if (!raw) {
        ElMessage.info('请先输入内容');
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        formData.jobParams = JSON.stringify(parsed, null, 2);
        ElMessage.success('已格式化为 JSON');
      } catch {
        ElMessage.info('当前内容不是合法 JSON，已保留原文');
      }
    };

    const onClickValidateTimeExpression = () => {
      timeExpressionValidatorVisible.value = true;
    };

    const onClickEditTimeExpression = () => {
      timeExpressionEditorVisible.value = true;
    };

    const handleTimeExpressionChange = (content) => {
      formData.timeExpression = content;
      timeExpressionEditorVisible.value = false;
    };

    const resetForm = () => {
      Object.assign(formData, {
        id: undefined,
        jobName: '',
        jobDescription: '',
        appId: window.localStorage.getItem('Power_appId'),
        jobParams: '',
        timeExpressionType: '',
        timeExpression: '',
        executeType: '',
        processorType: '',
        processorInfo: '',
        maxInstanceNum: 0,
        concurrency: 5,
        instanceTimeLimit: 0,
        instanceRetryNum: 0,
        taskRetryNum: 1,
        dispatchStrategy: 'HEALTH_FIRST',
        dispatchStrategyConfig: '',
        minCpuCores: 0,
        minMemorySpace: 0,
        minDiskSpace: 0,
        enable: true,
        designatedWorkers: '',
        maxWorkerCount: 0,
        notifyUserIds: [],
        lifeCycle: null,
        alarmConfig: {
          alertThreshold: 0,
          statisticWindowLen: 0,
          silenceWindowLen: 0
        },
        logConfig: {
          type: 1,
          level: undefined,
          loggerName: undefined
        },
        advancedRuntimeConfig: {
          taskTrackerBehavior: undefined
        }
      });
      activeCollapse.value = [];
      activeTab.value = 'runtime';
    };

    const loadFormData = (data) => {
      if (!data) {
        resetForm();
        return;
      }

      // 处理 lifeCycle 格式
      let lifeCycle = data.lifeCycle;
      if (lifeCycle && lifeCycle.start && lifeCycle.end) {
        lifeCycle = [lifeCycle.start, lifeCycle.end];
      } else {
        lifeCycle = null;
      }

      // 确保 alarmConfig 存在
      const alarmConfig = data.alarmConfig || {
        alertThreshold: 0,
        statisticWindowLen: 0,
        silenceWindowLen: 0
      };

      // 确保 logConfig 存在
      const logConfig = data.logConfig || {
        type: 1,
        level: undefined,
        loggerName: undefined
      };

      // 确保 advancedRuntimeConfig 存在
      const advancedRuntimeConfig = data.advancedRuntimeConfig || {
        taskTrackerBehavior: undefined
      };

      // 确保 notifyUserIds 为数组且项为字符串，避免 el-select 更新时报错
      const notifyUserIds = Array.isArray(data.notifyUserIds)
        ? data.notifyUserIds.map((id) => (id != null ? String(id) : '')).filter(Boolean)
        : [];

      Object.assign(formData, {
        ...data,
        lifeCycle,
        alarmConfig,
        logConfig,
        advancedRuntimeConfig,
        notifyUserIds
      });
    };

    const handleCancel = () => {
      visible.value = false;
      emit('cancel');
    };

    const handleSave = async () => {
      if (!formRef.value) return;

      try {
        await formRef.value.validate();
        saveLoading.value = true;

        // 处理 lifeCycle 格式转换
        const submitData = JSON.parse(JSON.stringify(formData));
        if (submitData.lifeCycle && Array.isArray(submitData.lifeCycle)) {
          submitData.lifeCycle = {
            start: submitData.lifeCycle[0],
            end: submitData.lifeCycle[1]
          };
        }

        emit('save', submitData);
      } catch (error) {
        console.error('表单验证失败:', error);
        ElMessage.warning('请检查必填项是否填写完整');
      } finally {
        saveLoading.value = false;
      }
    };

    // 监听 jobData 变化
    watch(() => props.jobData, (newVal) => {
      loadFormData(newVal);
    }, { immediate: true, deep: true });

    // 监听弹窗显示状态
    watch(visible, (val) => {
      if (val && props.jobData) {
        loadFormData(props.jobData);
      } else if (val) {
        resetForm();
      }
    });

    return {
      formRef,
      formData,
      formRules,
      visible,
      isEdit,
      saveLoading,
      activeCollapse,
      activeTab,
      timeExpressionValidatorVisible,
      timeExpressionEditorVisible,
      timeExpressionTypeOptions,
      processorTypeOptions,
      executeTypeOptions,
      dispatchStrategyOptions,
      logTypeOptions,
      logLevelOptions,
      taskTrackerBehaviorOptions,
      userList: computed(() => (Array.isArray(props.userList) ? props.userList : [])),
      getTimeExpressionPlaceholder,
      getProcessorPlaceholder,
      formatJobParams,
      onClickValidateTimeExpression,
      onClickEditTimeExpression,
      handleTimeExpressionChange,
      handleCancel,
      handleSave,
      resetForm
    };
  }
};
</script>

<style scoped lang="scss">
.job-form-dialog {
  :deep(.el-dialog__body) {
    padding: 0;
    max-height: 70vh;
    overflow-y: auto;
  }

  :deep(.el-dialog__header) {
    padding: 16px 24px;
    border-bottom: 1px solid var(--pj-border-color);
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);

    .el-dialog__title {
      font-size: 18px;
      font-weight: 600;
      color: var(--pj-text-primary);
    }
  }

  :deep(.el-dialog__footer) {
    padding: 16px 24px;
    border-top: 1px solid var(--pj-border-color);
    background: #fafbfc;
  }
}

.job-form-container {
  padding: 20px;
}

/* 表单区块样式 */
.form-section {
  background: var(--pj-bg-white);
  border-radius: 12px;
  margin-bottom: 12px;
  border: 1px solid var(--pj-border-color);
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

.form-section-required {
  border-left: 3px solid var(--pj-primary);
}

.section-header {
  padding: 12px 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid var(--pj-border-color);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--pj-text-primary);

  .section-icon {
    font-size: 18px;
    color: var(--pj-primary);
  }

  .el-tag {
    margin-left: auto;
  }
}

.section-content {
  padding: 12px 16px;
}

/* 折叠面板样式 */
.optional-config-collapse {
  border: none;
  margin-bottom: 12px;

  :deep(.el-collapse-item__header) {
    height: 52px;
    line-height: 52px;
    padding: 0 20px;
    background: var(--pj-bg-white);
    border: 1px solid var(--pj-border-color);
    border-radius: 12px;
    margin-bottom: 8px;
    font-weight: 500;
    transition: all 0.3s ease;

    &:hover {
      background: #f8fafc;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    &.is-active {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      border-bottom-color: transparent;
      margin-bottom: 0;
      background: #f8fafc;
    }
  }

  :deep(.el-collapse-item__wrap) {
    border: 1px solid var(--pj-border-color);
    border-top: none;
    border-radius: 0 0 12px 12px;
    background: var(--pj-bg-white);
  }

  :deep(.el-collapse-item__content) {
    padding: 20px;
  }

  :deep(.el-collapse-item__arrow) {
    margin: 0 0 0 auto;
    font-size: 14px;
    color: var(--pj-text-secondary);
  }
}

.collapse-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--pj-text-primary);

  .el-icon {
    font-size: 16px;
    color: var(--pj-primary);
  }

  .el-tag {
    margin-left: 8px;
  }
}

/* 表单样式 */
.job-form {
  :deep(.el-form-item) {
    margin-bottom: 14px;
  }

  :deep(.el-form-item__label) {
    color: var(--pj-text-secondary);
    font-weight: 500;
    font-size: 13px;
  }

  :deep(.el-input__wrapper),
  :deep(.el-select__wrapper),
  :deep(.el-textarea__inner) {
    border-radius: 8px;
    transition: all 0.3s ease;

    &:hover {
      box-shadow: 0 0 8px rgba(37, 99, 235, 0.15);
    }

    &.is-focus,
    &:focus {
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
  }

  :deep(.el-input-number) {
    width: 100%;

    .el-input__wrapper {
      border-radius: 8px;
    }
  }

  :deep(.el-select) {
    width: 100%;
  }

  :deep(.el-date-editor) {
    width: 100%;
    border-radius: 8px;
  }
}

.label-icon {
  margin-left: 4px;
  color: var(--pj-text-tertiary);
  cursor: help;
  font-size: 14px;
  vertical-align: middle;
}

.optional-tabs {
  :deep(.el-tabs__nav-wrap) {
    padding: 0 20px;
  }
  :deep(.el-tabs__content) {
    padding-top: 10px;
  }
}

.edit-expression-btn {
  width: 100%;
  border-style: dashed;
}

.job-params-row {
  display: flex;
  width: 100%;
  gap: 12px;
  align-items: flex-start;

  .job-params-input {
    flex: 1;
    min-width: 0;

    :deep(.el-textarea__inner) {
      resize: vertical;
      max-height: 280px;
    }
  }

  .format-params-btn {
    flex-shrink: 0;
    margin-top: 0;
  }
}

/* 底部按钮 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;

  .el-button {
    min-width: 100px;
    border-radius: 8px;
    font-weight: 500;
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .job-form-dialog {
    :deep(.el-dialog) {
      width: 95% !important;
      margin: 20px auto !important;
    }
  }

  .job-form-container {
    padding: 12px;
  }

  .section-content {
    padding: 12px;
  }

  :deep(.el-col) {
    margin-bottom: 0;
  }
}

/* 滚动条美化 */
.job-form-dialog :deep(.el-dialog__body)::-webkit-scrollbar {
  width: 6px;
}

.job-form-dialog :deep(.el-dialog__body)::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.job-form-dialog :deep(.el-dialog__body)::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;

  &:hover {
    background: #a8a8a8;
  }
}
</style>
