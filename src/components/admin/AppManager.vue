<template>
  <div class="pj-management-page">
    
    <!-- 搜索条件卡片 -->
    <div class="pj-search-card">
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
            active-color="#2563eb" />
        </el-form-item>

        <el-form-item>
          <div class="pj-search-actions">
            <el-button type="primary" @click="listApps" :icon="Search">
              {{$t('message.query')}}
            </el-button>
            <el-button @click="onClickReset" :icon="Refresh">
              {{$t('message.reset')}}
            </el-button>
          </div>
        </el-form-item>
      </el-form>
    </div>

    <!-- 数据表格卡片 -->
    <div class="pj-table-card">
      <div class="pj-table-header">
        <h3 class="pj-table-title">应用列表</h3>
        <div class="pj-table-actions">
          <el-button type="primary" @click="onClickNewApps" :icon="Plus">
            {{$t('message.add')}}
          </el-button>
        </div>
      </div>
      
      <el-table :data="appResult.data" style="width: 100%" v-loading="loading" table-layout="auto">
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="appName" label="应用代码" min-width="180" show-overflow-tooltip>
          <template #default="scope">
            <el-tag size="small" type="info">{{ scope.row.appName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" :label="$t('message.name')" min-width="150" show-overflow-tooltip />
        <el-table-column prop="namespaceName" label="命名空间" min-width="140" show-overflow-tooltip>
          <template #default="scope">
            <el-tag size="small" v-if="scope.row.namespaceName">{{ scope.row.namespaceName }}</el-tag>
            <span v-else class="pj-text-tertiary">未分配</span>
          </template>
        </el-table-column>
        <el-table-column prop="gmtCreateStr" :label="$t('message.createTime')" width="170" />
        <el-table-column prop="gmtModifiedStr" :label="$t('message.modifyTime')" width="170" />
        <el-table-column prop="creatorShowName" :label="$t('message.creator')" min-width="120" show-overflow-tooltip />
        <el-table-column prop="modifierShowName" :label="$t('message.modifier')" min-width="120" show-overflow-tooltip />

        <el-table-column :label="$t('message.operation')" width="140" fixed="right">
          <template #default="scope">
            <div class="pj-action-group">
              <el-button size="small" type="text" @click="onClickModify(scope.row)" :icon="Edit">
                {{$t('message.edit')}}
              </el-button>
              <el-button size="small" type="text" @click="onClickEnter(scope.row)" :icon="Right">
                {{$t('message.enter')}}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pj-table-footer" v-if="appResult.data && appResult.data.length > 0">
        <el-pagination
            layout="total, prev, pager, next, jumper"
            :total="this.appResult.totalItems"
            :page-size="this.appResult.pageSize"
            @current-change="onClickChangePage"
            :hide-on-single-page="false"/>
      </div>
      
      <!-- 空状态 -->
      <div v-if="!loading && (!appResult.data || appResult.data.length === 0)" class="pj-empty-state">
        <el-icon class="pj-empty-icon"><DocumentRemove /></el-icon>
        <div class="pj-empty-text">暂无应用数据</div>
      </div>
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
  DocumentRemove
} from '@element-plus/icons-vue';
import { useAppStore } from '@/stores';

export default {
  name: "AppManager",
  components: {
    UserRole,
    DocumentRemove
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
        index:0,
        pageSize:10
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

/* 组件特定样式 - 仅保留 management-pages.scss 未覆盖的 */
.pj-management-page {
    /* 表格容器样式 */
    .pj-table-card {
        :deep(.el-table) {
            --el-table-border-color: var(--pj-border-color);
            --el-table-text-color: var(--pj-text-primary);
            --el-table-header-text-color: var(--pj-text-primary);
            --el-table-header-bg-color: var(--pj-bg-secondary);
        }

        :deep(.el-table .cell) {
            white-space: nowrap;
        }
    }

    /* 操作按钮组 */
    .pj-action-group {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: nowrap;

        .el-button {
            margin: 0;
            padding: 4px 8px;
        }
    }

    /* 标签样式 */
    :deep(.el-tag) {
        border-radius: var(--pj-border-radius-sm);
    }
}
</style>