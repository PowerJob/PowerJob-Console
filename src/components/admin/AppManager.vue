<template>
  <div class="app-manager pj-management-page">

    <!-- Search and Action Section -->
    <div class="pj-form-section" style="padding-top: 0; margin-top: 0;">
      <div class="search-container">
        <div class="search-form">
          <el-form :inline="true" :model="queryAppRequest" class="el-form--inline">
            <el-form-item label="应用ID">
              <el-input
                v-model="queryAppRequest.appId"
                :placeholder="$t('message.pleaseEnterAppId')"
                style="width: 140px;"
                clearable />
            </el-form-item>

            <el-form-item label="应用名称">
              <el-input
                v-model="queryAppRequest.appNameLike"
                :placeholder="$t('message.fuzzyQuery')"
                style="width: 180px;"
                clearable />
            </el-form-item>

            <el-form-item label="标签">
              <el-input
                v-model="queryAppRequest.tagLike"
                :placeholder="$t('message.fuzzyQuery')"
                style="width: 160px;"
                clearable />
            </el-form-item>

            <el-form-item label="命名空间">
              <el-select
                v-model="queryAppRequest.namespaceId"
                :placeholder="$t('message.pleaseSelectNamespace')"
                style="width: 180px;"
                clearable>
                <el-option
                  v-for="item in namespaceList"
                  :key="item.id"
                  :label="item.showName"
                  :value="item.id">
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item :label="$t('message.showMyRelated')">
              <el-switch
                v-model="queryAppRequest.showMyRelated"
                @change="listApps"
                :active-color="'var(--pj-success)'"
                :inactive-color="'var(--pj-error)'" />
            </el-form-item>
          </el-form>
        </div>

        <div class="action-buttons">
          <el-button @click="onClickReset">{{$t('message.reset')}}</el-button>
          <el-button type="primary" @click="listApps">
            <el-icon class="mr-1"><Search /></el-icon>
            {{$t('message.query')}}
          </el-button>
          <el-button type="info" @click="listApps">
            <el-icon class="mr-1"><Refresh /></el-icon>
            {{$t('message.refresh')}}
          </el-button>
          <el-button type="primary" @click="onClickNewApps">
            <el-icon class="mr-1"><Plus /></el-icon>
            {{$t('message.add')}}
          </el-button>
        </div>
      </div>
    </div>

    <!-- Table Section -->
    <div class="pj-table" style="margin-top: var(--pj-space-sm);">
      <el-table
        :data="appResult.data"
        style="width: 100%"
        v-loading="loading"
        stripe
        table-layout="auto">
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="appName" label="应用代码" min-width="90" show-overflow-tooltip>
          <template #default="scope">
            <el-tag size="small" type="info">{{ scope.row.appName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="namespaceName" label="命名空间" min-width="140" show-overflow-tooltip>
          <template #default="scope">
            <el-tag size="small" v-if="scope.row.namespaceName">{{ scope.row.namespaceName }}</el-tag>
            <span v-else class="text-placeholder">未分配</span>
          </template>
        </el-table-column>
        <el-table-column prop="gmtCreateStr" :label="$t('message.createTime')" width="255" />
        <el-table-column prop="gmtModifiedStr" :label="$t('message.modifyTime')" width="170" />
        <el-table-column prop="creatorShowName" :label="$t('message.creator')" min-width="120" show-overflow-tooltip />
        <el-table-column prop="modifierShowName" :label="$t('message.modifier')" min-width="120" show-overflow-tooltip />

        <el-table-column :label="$t('message.operation')" width="180" align="center" fixed="right">
          <template #default="scope">
            <div class="operation-buttons-enhanced">
              <el-button size="small" type="primary" @click="onClickModify(scope.row)">
                <el-icon><Edit /></el-icon>
                {{$t('message.edit')}}
              </el-button>
              <el-button size="small" type="success" @click="onClickEnter(scope.row)">
                <el-icon><Right /></el-icon>
                {{$t('message.enter')}}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Pagination Section -->
    <div class="pagination-container" v-if="appResult.data && appResult.data.length > 0">
      <el-pagination
        layout="total, sizes, prev, pager, next, jumper"
        :total="appResult.totalItems"
        :page-size="appResult.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        @current-change="onClickChangePage"
        @size-change="handleSizeChange"
        :hide-on-single-page="false"
        background
      />
    </div>

    <!-- Empty State -->
    <div v-if="!loading && (!appResult.data || appResult.data.length === 0)" class="pagination-container" style="color: var(--pj-text-tertiary);">
      暂无应用数据
    </div>

    <!-- 应用编辑对话框 -->
    <el-dialog 
      :title="modifiedAppForm.id ? '编辑应用' : '新建应用'" 
      v-model="modifiedAppFormVisible" 
      width="800px"
      :close-on-click-modal="false"
      destroy-on-close>
      <el-form 
        :model="modifiedAppForm" 
        :rules="formRules"
        ref="appFormRef"
        label-width="120px">

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="命名空间" prop="namespaceId">
              <el-select 
                v-model="modifiedAppForm.namespaceId" 
                :placeholder="$t('message.pleaseSelectNamespace')"
                style="width: 100%;"
                clearable>
                <el-option
                    v-for="item in namespaceList"
                    :key="item.id"
                    :label="item.showName"
                    :value="item.id">
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="应用代码" prop="appName">
              <el-input 
                v-model="modifiedAppForm.appName"
                :placeholder="$t('message.pleaseEnterAppCode')"
                :disabled="modifiedAppForm.id != null" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item :label="$t('message.name')" prop="title">
              <el-input 
                v-model="modifiedAppForm.title"
                :placeholder="$t('message.pleaseEnterAppName')" />
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item :label="$t('message.password')" prop="password">
              <el-input 
                v-model="modifiedAppForm.password"
                type="password"
                :placeholder="$t('message.pleaseEnterAppPassword')"
                show-password />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item :label="$t('message.tag')">
          <el-input 
            v-model="modifiedAppForm.tags"
            :placeholder="$t('message.pleaseEnterTags')" />
        </el-form-item>
        
        <el-form-item :label="$t('message.extra')">
          <el-input 
            v-model="modifiedAppForm.extra"
            type="textarea"
            :rows="3"
            :placeholder="$t('message.pleaseEnterExtraConfig')" />
        </el-form-item>

        <el-divider content-position="left">
          <span style="font-weight: 600; color: var(--pj-text-secondary);">{{$t('message.permissionManage')}}</span>
        </el-divider>
        
        <el-form-item>
          <user-role 
            :user-rule-form="user_rule_form" 
            @update:userRuleForm="handleUserRoleUpdate"
            style="width: 100%;" />
        </el-form-item>

        <el-form-item style="margin-top: 32px;">
          <div style="display: flex; justify-content: space-between; width: 100%;">
            <el-button 
              v-if="modifiedAppForm.id!=null" 
              type="danger" 
              @click="onClickDeleteApp"
              :icon="Delete">
              {{$t('message.delete')}}
            </el-button>
            <div style="display: flex; gap: 12px; margin-left: auto;">
              <el-button @click="modifiedAppFormVisible = false" :icon="Close">
                {{$t('message.cancel')}}
              </el-button>
              <el-button 
                type="primary" 
                @click="onClickSaveApp"
                :loading="saving"
                :icon="Check">
                {{$t('message.save')}}
              </el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script>
import UserRole from "../common/UserRole.vue";
import { ElMessage } from 'element-plus';
import {
  Search, Refresh, Plus, Edit, Right, Close, Check, Delete
} from '@element-plus/icons-vue';
import { useAppStore } from '@/stores';

export default {
  name: "AppManager",
  components: {
    UserRole,
    Search, Refresh, Plus, Edit, Right, Close, Check, Delete
  },
  setup() {
    const appStore = useAppStore();
    return { appStore };
  },
  data() {
    return {
      // 查询 APP 请求
      queryAppRequest: {
        appId: undefined,
        namespaceId: undefined,
        appNameLike: undefined,
        tagLike: undefined,
        showMyRelated: true,
        index: 0,
        pageSize: 10
      },

      // 创建or修改表单
      modifiedAppForm: {
        id: undefined,
        appName: undefined,
        namespaceId: undefined,
        password: undefined,
        title: undefined,
        tags: undefined,
        extra: undefined
      },

      user_rule_form: {
        observer: [],
        qa: [],
        developer: [],
        admin: [],
      },

      appResult: [],

      // 显示变量
      modifiedAppFormVisible: false,
      loading: false,
      saving: false,

      // namespace，用于驱动下拉列表
      namespaceList: [],
      
      // 表单验证规则
      formRules: {
        appName: [
          { required: true, message: this.$t('message.pleaseEnterAppCode'), trigger: 'blur' },
          { min: 2, max: 50, message: this.$t('message.lengthBetween2And50'), trigger: 'blur' }
        ],
        title: [
          { required: true, message: this.$t('message.pleaseEnterAppName'), trigger: 'blur' }
        ],
        password: [
          { required: true, message: this.$t('message.pleaseEnterAppPassword'), trigger: 'blur' },
          { min: 6, message: this.$t('message.passwordMinLength6'), trigger: 'blur' }
        ]
      }
    }
  },
  methods: {
    // 点击重置按钮
    onClickReset() {
      this.queryAppRequest.appId = undefined;
      this.queryAppRequest.namespaceId = undefined;
      this.queryAppRequest.appNameLike = undefined;
      this.queryAppRequest.tagLike = undefined;
      this.queryAppRequest.showMyRelated = true;
      this.queryAppRequest.index = 0;
      this.listApps();
    },

    // 查询 app
    listApps() {
      this.loading = true;
      const that = this;
      this.axios.post("/appInfo/list", this.queryAppRequest).then((res) => {
        that.appResult = res;
        that.loading = false;
      }).catch(() => {
        that.loading = false;
      });
    },

    // 点击 换页
    onClickChangePage(index) {
      // 后端从0开始，前端从1开始
      this.queryAppRequest.index = index - 1;
      this.listApps();
    },

    // 每页条数变更
    handleSizeChange(newSize) {
      this.queryAppRequest.pageSize = newSize;
      this.queryAppRequest.index = 0;
      this.listApps();
    },

    // 点击新增按钮
    onClickNewApps() {
      // 清空之前填写的脏数据
      this.modifiedAppForm = {
        id: undefined,
        appName: undefined,
        password: undefined,
        title: undefined,
        tags: undefined,
        extra: undefined
      }

      this.user_rule_form.observer = []
      this.user_rule_form.qa = []
      this.user_rule_form.developer = []
      this.user_rule_form.admin = []

      this.modifiedAppFormVisible = true;
    },

    onClickSaveApp() {
      this.$refs.appFormRef.validate((valid) => {
        if (valid) {
          this.saving = true;
          let that = this;
          this.modifiedAppForm['componentUserRoleInfo'] = this.user_rule_form;

          console.log("modifiedAppForm: " + JSON.stringify(this.modifiedAppForm))
          this.axios.post("/appInfo/save", this.modifiedAppForm, {
            'headers': {
              'Content-Type': 'application/json',
              'AppId': that.modifiedAppForm.id
            }
          }).then(() => {
            ElMessage.success(that.$t('message.success'));
            this.listApps();
            this.modifiedAppFormVisible = false;
            this.saving = false;
          }).catch(e => {
            ElMessage.error(e);
            this.saving = false;
          });
        } else {
          ElMessage.warning(this.$t('message.checkFormCorrect'));
        }
      });
    },

    onClickDeleteApp() {
      let that = this;
      this.axios.post('/appInfo/delete?appId=' + that.modifiedAppForm.id, {}, {
        'headers': {
          'Content-Type': 'application/json',
          'AppId': that.modifiedAppForm.id
        }
      }).then(() => {
        ElMessage.success(that.$t('message.success'));
        this.listApps();
        this.modifiedAppFormVisible = false;
      })
    },

    // 点击 编辑按钮
    onClickModify(data) {
      this.modifiedAppForm = JSON.parse(JSON.stringify(data));
      this.user_rule_form = JSON.parse(JSON.stringify(data.componentUserRoleInfo));
      this.modifiedAppFormVisible = true;
    },

    // 进入任务管理界面
    onClickEnter(data) {
      const appInfo = {
        id: data.id,
        appName: data.appName
      };
      // 将 appId 存储到 Pinia Store
      this.appStore.setAppInfo(appInfo);

      // 同步存储一份到 localStorage（后续主要使用 localStorage，鉴权全部在服务端，本地无脑存即可）
      window.localStorage.setItem('Power_appId', appInfo.id)

      // 跳转到 APP 主界面
      this.$router.push("/oms/home")
    },

    // 自动登录 APP，缩短绝大部分用户的操作路径
    autoEnterApp() {
      const appId = window.localStorage.getItem('Power_appId')
      if (appId == undefined || appId == null || appId == '') {
        return
      }
      console.log('Detect the existence of appId and enter automatically: ' + appId)
      this.$router.push("/oms/home")
    },

    listNamespaces() {
      const that = this;
      this.axios.post("/namespace/listAll", this.queryAppRequest).then((res) => {
        that.namespaceList = res;
      });
    },
    
    // 处理用户权限更新
    handleUserRoleUpdate(newUserRoleData) {
      this.user_rule_form = { ...newUserRoleData };
    }
  },

  mounted() {

    this.autoEnterApp()

    this.listApps()
    this.listNamespaces()
  }
}
</script>

<style scoped lang="scss">
@import '../../styles/management-pages.scss';

/* App Manager 页面样式 - 与 JobManager 保持一致 */
.app-manager {
  padding: 0;
  background: transparent;
}

/* 文本占位符 */
.text-placeholder {
  color: var(--pj-text-disabled);
  font-style: italic;
}

/* 图标间距 */
.mr-1 {
  margin-right: 4px;
}

/* 表格内标签样式 */
:deep(.el-tag) {
  font-family: 'Outfit', -apple-system, sans-serif;
  font-weight: 500;
  font-size: 12px;
  border-radius: 12px;
  padding: 4px 12px;
}

/* 信息标签颜色 */
:deep(.el-tag.el-tag--info.el-tag--light) {
  background-color: #f0f5ff;
  border-color: #adc6ff;
  color: #2f54eb;
}
</style>