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
/* ============================
   Dialog 整体 & 头部
   ============================ */
.job-form-dialog {
  :deep(.el-dialog) {
    border-radius: 14px;
    overflow: hidden;
    box-shadow:
      0 24px 64px rgba(0, 0, 0, 0.12),
      0 8px 24px rgba(0, 150, 136, 0.07);
  }

  :deep(.el-dialog__body) {
    padding: 0;
    max-height: 70vh;
    overflow-y: auto;
  }

  :deep(.el-dialog__header) {
    padding: 0 24px 0;
    border-bottom: 1px solid var(--pj-border-color, #e2e8f0);
    background: linear-gradient(135deg, #f0fdf9 0%, #e6f7f5 100%);
    position: relative;
    overflow: hidden;

    /* 顶部主题色细线 */
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(
        90deg,
        var(--pj-primary, #009688) 0%,
        var(--pj-primary-light, #26a69a) 60%,
        rgba(0, 150, 136, 0) 100%
      );
    }

    .el-dialog__title {
      display: block;
      padding: 17px 0 14px;
      font-size: 16px;
      font-weight: 600;
      color: var(--pj-text-primary, #212121);
      letter-spacing: 0.2px;
    }

    .el-dialog__headerbtn {
      top: 14px;

      .el-dialog__close {
        color: var(--pj-text-secondary, #757575);
        transition: color 0.2s ease, transform 0.2s ease;

        &:hover {
          color: var(--pj-primary, #009688);
          transform: rotate(90deg);
        }
      }
    }
  }

  :deep(.el-dialog__footer) {
    padding: 14px 24px;
    border-top: 1px solid var(--pj-border-color, #e2e8f0);
    background: var(--pj-bg-section, #fafafa);
  }
}

/* ============================
   表单容器
   ============================ */
.job-form-container {
  padding: 18px 20px;
}

/* ============================
   表单区块卡片
   ============================ */
.form-section {
  background: var(--pj-bg-white, #ffffff);
  border-radius: 10px;
  margin-bottom: 12px;
  border: 1px solid var(--pj-border-color, #e2e8f0);
  overflow: hidden;
  transition: box-shadow 0.25s ease, border-color 0.25s ease;

  &:hover {
    box-shadow: 0 3px 12px rgba(0, 150, 136, 0.08), 0 1px 4px rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 150, 136, 0.2);
  }
}

.form-section-required {
  border-left: 3px solid var(--pj-primary, #009688);
}

.section-header {
  padding: 11px 20px;
  background: linear-gradient(135deg, #f0fdf9 0%, #f5faf8 60%, #fafbfa 100%);
  border-bottom: 1px solid rgba(0, 150, 136, 0.1);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 14px;
  font-weight: 600;
  color: var(--pj-text-primary, #212121);

  .section-icon {
    font-size: 16px;
    color: var(--pj-primary, #009688);
    opacity: 0.9;
  }

  .el-tag {
    margin-left: auto;
    font-size: 11px;
    padding: 0 6px;
    height: 20px;
    line-height: 18px;
    border-radius: 4px;
  }
}

.section-content {
  padding: 14px 16px 10px;
}

/* ============================
   折叠面板
   ============================ */
.optional-config-collapse {
  border: none;
  margin-bottom: 12px;

  :deep(.el-collapse-item__header) {
    height: 50px;
    line-height: 50px;
    padding: 0 20px;
    background: var(--pj-bg-white, #ffffff);
    border: 1px solid var(--pj-border-color, #e2e8f0);
    border-radius: 10px;
    margin-bottom: 8px;
    font-weight: 500;
    transition: all 0.25s ease;

    &:hover {
      background: #f0fdf9;
      border-color: rgba(0, 150, 136, 0.25);
      box-shadow: 0 2px 8px rgba(0, 150, 136, 0.07);
    }

    &.is-active {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      border-bottom-color: rgba(0, 150, 136, 0.12);
      margin-bottom: 0;
      background: linear-gradient(135deg, #f0fdf9 0%, #e9f7f5 100%);
      border-color: rgba(0, 150, 136, 0.25);
      color: var(--pj-primary, #009688);
    }
  }

  :deep(.el-collapse-item__wrap) {
    border: 1px solid rgba(0, 150, 136, 0.2);
    border-top: none;
    border-radius: 0 0 10px 10px;
    background: var(--pj-bg-white, #ffffff);
  }

  :deep(.el-collapse-item__content) {
    padding: 16px 20px 20px;
  }

  :deep(.el-collapse-item__arrow) {
    margin: 0 0 0 auto;
    font-size: 13px;
    color: var(--pj-text-secondary, #757575);
    transition: transform 0.3s ease, color 0.25s ease;
  }

  :deep(.el-collapse-item__header.is-active .el-collapse-item__arrow) {
    color: var(--pj-primary, #009688);
  }
}

.collapse-title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 14px;
  color: inherit;

  .el-icon {
    font-size: 15px;
    color: var(--pj-primary, #009688);
  }
}

/* ============================
   Tabs 样式
   ============================ */
.optional-tabs {
  :deep(.el-tabs__nav-wrap) {
    padding: 0 4px;

    &::after {
      background-color: var(--pj-border-color, #e2e8f0);
      height: 1px;
    }
  }

  :deep(.el-tabs__item) {
    font-size: 13px;
    color: var(--pj-text-secondary, #757575);
    padding: 0 16px;
    height: 38px;
    line-height: 38px;
    transition: color 0.2s ease;

    &:hover {
      color: var(--pj-primary, #009688);
    }

    &.is-active {
      color: var(--pj-primary, #009688);
      font-weight: 600;
    }
  }

  :deep(.el-tabs__active-bar) {
    background-color: var(--pj-primary, #009688);
    height: 2px;
    border-radius: 1px;
  }

  :deep(.el-tabs__content) {
    padding-top: 12px;
  }
}

/* ============================
   表单通用样式
   ============================ */
.job-form {
  :deep(.el-form-item) {
    margin-bottom: 14px;
  }

  :deep(.el-form-item__label) {
    color: var(--pj-text-secondary, #757575);
    font-weight: 500;
    font-size: 13px;
  }

  :deep(.el-form-item.is-error .el-form-item__error) {
    font-size: 11px;
  }

  :deep(.el-input__wrapper),
  :deep(.el-select__wrapper),
  :deep(.el-textarea__inner) {
    border-radius: 7px;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;

    &:hover {
      box-shadow: 0 0 0 1px rgba(0, 150, 136, 0.35);
    }

    &.is-focus,
    &:focus {
      box-shadow: 0 0 0 3px rgba(0, 150, 136, 0.12), 0 0 0 1px rgba(0, 150, 136, 0.5);
    }
  }

  :deep(.el-input-number) {
    width: 100%;

    .el-input__wrapper {
      border-radius: 7px;
    }
  }

  :deep(.el-select) {
    width: 100%;
  }

  :deep(.el-date-editor) {
    width: 100%;
    border-radius: 7px;
  }
}

/* ============================
   label 旁辅助图标
   ============================ */
.label-icon {
  margin-left: 4px;
  color: var(--pj-text-disabled, #9e9e9e);
  cursor: help;
  font-size: 13px;
  vertical-align: middle;
  transition: color 0.2s ease;

  &:hover {
    color: var(--pj-primary, #009688);
  }
}

/* ============================
   任务参数行
   ============================ */
.edit-expression-btn {
  width: 100%;
  border-style: dashed;
  border-color: rgba(0, 150, 136, 0.4);
  color: var(--pj-primary, #009688);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 150, 136, 0.05);
    border-color: var(--pj-primary, #009688);
  }
}

.job-params-row {
  display: flex;
  width: 100%;
  gap: 10px;
  align-items: flex-start;

  .job-params-input {
    flex: 1;
    min-width: 0;

    :deep(.el-textarea__inner) {
      resize: vertical;
      max-height: 280px;
      font-size: 13px;
      font-family: 'Consolas', 'Monaco', monospace;
      line-height: 1.6;
    }
  }

  .format-params-btn {
    flex-shrink: 0;
    margin-top: 0;
    border-radius: 7px;
  }
}

/* ============================
   底部操作按钮
   ============================ */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;

  .el-button {
    min-width: 96px;
    border-radius: 7px;
    font-weight: 500;
    letter-spacing: 0.2px;
    transition: all 0.2s ease;
  }

  .el-button--primary {
    box-shadow: 0 2px 8px rgba(0, 150, 136, 0.25);

    &:hover {
      box-shadow: 0 4px 14px rgba(0, 150, 136, 0.35);
      transform: translateY(-1px);
    }
  }
}

/* ============================
   滚动条美化
   ============================ */
.job-form-dialog :deep(.el-dialog__body)::-webkit-scrollbar {
  width: 5px;
}

.job-form-dialog :deep(.el-dialog__body)::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 3px;
}

.job-form-dialog :deep(.el-dialog__body)::-webkit-scrollbar-thumb {
  background: rgba(0, 150, 136, 0.28);
  border-radius: 3px;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(0, 150, 136, 0.5);
  }
}

/* ============================
   响应式调整
   ============================ */
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
    padding: 10px 12px;
  }
}
</style>
