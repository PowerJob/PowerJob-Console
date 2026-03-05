<template>
  <div class="namespace-manager pj-management-page">

    <!-- Search and Action Section -->
    <div class="pj-form-section" style="padding-top: 0; margin-top: 0;">
      <div class="search-container">
        <div class="search-form">
          <el-form :inline="true" :model="queryNamespaceRequest" class="el-form--inline">
            <el-form-item label="namespace">
              <el-input
                v-model="queryNamespaceRequest.codeLike"
                placeholder="namespace"
                style="width: 160px;"
                clearable />
            </el-form-item>

            <el-form-item label="空间名称">
              <el-input
                v-model="queryNamespaceRequest.nameLike"
                :placeholder="$t('message.name')"
                style="width: 180px;"
                clearable />
            </el-form-item>

            <el-form-item label="标签">
              <el-input
                v-model="queryNamespaceRequest.tagLike"
                placeholder="请输入标签"
                style="width: 160px;"
                clearable />
            </el-form-item>
          </el-form>
        </div>

        <div class="action-buttons">
          <el-button @click="onClickReset">{{$t('message.reset')}}</el-button>
          <el-button type="primary" @click="listNamespaces">
            <el-icon class="mr-1"><Search /></el-icon>
            {{$t('message.query')}}
          </el-button>
          <el-button type="info" @click="listNamespaces">
            <el-icon class="mr-1"><Refresh /></el-icon>
            {{$t('message.refresh')}}
          </el-button>
          <el-button type="primary" @click="onClickNewNamespace">
            <el-icon class="mr-1"><Plus /></el-icon>
            {{$t('message.add')}}
          </el-button>
        </div>
      </div>
    </div>

    <!-- Table Section -->
    <div class="pj-table" style="margin-top: var(--pj-space-sm);">
      <el-table
        :data="namespaceResult.data"
        style="width: 100%"
        v-loading="loading"
        stripe
        table-layout="auto">
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="code" label="code" min-width="180" show-overflow-tooltip>
          <template #default="scope">
            <el-tag size="small" type="info">{{ scope.row.code }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" :label="$t('message.name')" min-width="150" show-overflow-tooltip />
        <el-table-column prop="gmtCreateStr" :label="$t('message.createTime')" width="170" />
        <el-table-column prop="gmtModifiedStr" :label="$t('message.modifyTime')" width="170" />
        <el-table-column :label="$t('message.status')" width="100" align="center">
          <template #default="scope">
            <el-tag
              :type="scope.row.statusStr === 'ENABLE' ? 'success' : 'danger'"
              size="small">
              {{ scope.row.statusStr }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creatorShowName" :label="$t('message.creator')" min-width="120" show-overflow-tooltip />
        <el-table-column prop="modifierShowName" :label="$t('message.modifier')" min-width="120" show-overflow-tooltip />

        <el-table-column :label="$t('message.operation')" width="200" align="center" fixed="right">
          <template #default="scope">
            <div class="operation-buttons-enhanced">
              <el-button size="small" type="primary" @click="onClickModify(scope.row)">
                <el-icon><Edit /></el-icon>
                {{$t('message.edit')}}
              </el-button>
              <el-popconfirm
                title="确认删除此命名空间？"
                @confirm="onClickDeleteNamespace(scope.row)">
                <template #reference>
                  <el-button size="small" type="danger">
                    <el-icon><Delete /></el-icon>
                    {{$t('message.delete')}}
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Pagination Section -->
    <div class="pagination-container" v-if="namespaceResult.data && namespaceResult.data.length > 0">
      <el-pagination
        layout="total, sizes, prev, pager, next, jumper"
        :total="namespaceResult.totalItems"
        :page-size="namespaceResult.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        @current-change="onClickChangePage"
        @size-change="handleSizeChange"
        :hide-on-single-page="false"
        background
      />
    </div>

    <!-- Empty State -->
    <div v-if="!loading && (!namespaceResult.data || namespaceResult.data.length === 0)" class="pagination-container" style="color: var(--pj-text-tertiary);">
      暂无命名空间数据
    </div>

    <!-- 命名空间编辑对话框 -->
    <el-dialog
      :title="modifiedNamespaceForm.id ? '编辑命名空间' : '新建命名空间'"
      v-model="modifiedNamespaceFormVisible"
      width="800px"
      :close-on-click-modal="false"
      destroy-on-close>
      <el-form
        :model="modifiedNamespaceForm"
        :rules="formRules"
        ref="namespaceFormRef"
        label-width="120px">

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="namespace" prop="code">
              <el-input
                v-model="modifiedNamespaceForm.code"
                placeholder="code"
                :disabled="modifiedNamespaceForm.id != null" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item :label="$t('message.name')" prop="name">
              <el-input
                v-model="modifiedNamespaceForm.name"
                placeholder="name" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="访问令牌" v-if="modifiedNamespaceForm.id != null">
          <el-input
            :disabled="true"
            v-model="modifiedNamespaceForm.token"
            placeholder="保存后自动生成">
            <template #append>
              <el-button
                @click="copyToken"
                :icon="DocumentCopy"
                v-if="modifiedNamespaceForm.token">
                复制
              </el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item :label="$t('message.tag')">
          <el-input
            v-model="modifiedNamespaceForm.tags"
            placeholder="请输入标签，多个标签用逗号分隔" />
        </el-form-item>

        <el-form-item :label="$t('message.extra')">
          <el-input
            v-model="modifiedNamespaceForm.extra"
            type="textarea"
            :rows="3"
            placeholder="请输入额外配置信息" />
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
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <el-button @click="modifiedNamespaceFormVisible = false" :icon="Close">
              {{$t('message.cancel')}}
            </el-button>
            <el-button
              type="primary"
              @click="onClickSaveNamespace"
              :loading="saving"
              :icon="Check">
              {{$t('message.save')}}
            </el-button>
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
  Search, Refresh, Plus, Edit, Delete, Close, Check, DocumentCopy
} from '@element-plus/icons-vue';

export default {
  name: "NamespaceManager",
  components: {
    UserRole,
    Search, Refresh, Plus, Edit, Delete, Close, Check, DocumentCopy
  },
  data() {
    return {

      // 查询命名空间
      queryNamespaceRequest: {
        codeLike: undefined,
        nameLike: undefined,
        tagLike: undefined,
        index: 0,
        pageSize: 10
      },

      // 创建or修改表单
      modifiedNamespaceForm: {
        id: undefined,
        code: undefined,
        name: undefined,
        tags: undefined,
        status: undefined,
        extra: undefined
      },

      user_rule_form: {
        observer: [],
        qa: [],
        developer: [],
        admin: [],
      },

      namespaceResult: [],

      // 显示变量
      modifiedNamespaceFormVisible: false,
      loading: false,
      saving: false,

      // 表单验证规则
      formRules: {
        code: [
          { required: true, message: '请输入空间代码', trigger: 'blur' },
          { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
        ],
        name: [
          { required: true, message: '请输入空间名称', trigger: 'blur' }
        ]
      }
    }
  },
  methods: {
    // 点击重置按钮
    onClickReset() {
      this.queryNamespaceRequest.codeLike = undefined;
      this.queryNamespaceRequest.nameLike = undefined;
      this.queryNamespaceRequest.tagLike = undefined;
      this.queryNamespaceRequest.index = 0;
      this.listNamespaces();
    },

    // 查询 namespace
    listNamespaces() {
      this.loading = true;
      const that = this;
      this.axios.post("/namespace/list", this.queryNamespaceRequest).then((res) => {
        that.namespaceResult = res;
        that.loading = false;
      }).catch(() => {
        that.loading = false;
      });
    },

    // 点击 换页
    onClickChangePage(index) {
      // 后端从0开始，前端从1开始
      this.queryNamespaceRequest.index = index - 1;
      this.listNamespaces();
    },

    // 每页条数变更
    handleSizeChange(newSize) {
      this.queryNamespaceRequest.pageSize = newSize;
      this.queryNamespaceRequest.index = 0;
      this.listNamespaces();
    },

    // 新增 namespace
    onClickNewNamespace() {
      // 清空之前填写的脏数据
      this.modifiedNamespaceForm = {
        id: undefined,
        code: undefined,
        name: undefined,
        tags: undefined,
        status: undefined,
        extra: undefined
      }
      this.user_rule_form.observer = []
      this.user_rule_form.qa = []
      this.user_rule_form.developer = []
      this.user_rule_form.admin = []

      this.modifiedNamespaceFormVisible = true;
    },

    // 保存
    onClickSaveNamespace() {
      this.$refs.namespaceFormRef.validate((valid) => {
        if (valid) {
          this.saving = true;
          let that = this;
          this.modifiedNamespaceForm['componentUserRoleInfo'] = this.user_rule_form;

          console.log("modifiedNamespaceForm: " + JSON.stringify(this.modifiedNamespaceForm))
          this.axios.post("/namespace/save", this.modifiedNamespaceForm, {
            'headers': {
              'Content-Type': 'application/json',
              'NamespaceId': that.modifiedNamespaceForm.id
            }
          }).then(() => {
            ElMessage.success(that.$t('message.success'));
            this.listNamespaces();
            this.modifiedNamespaceFormVisible = false;
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

    // 点击 编辑按钮
    onClickModify(data) {
      this.modifiedNamespaceForm = JSON.parse(JSON.stringify(data));
      this.user_rule_form = JSON.parse(JSON.stringify(data.componentUserRoleInfo));
      this.modifiedNamespaceFormVisible = true;
    },

    // 点击 删除命名空间
    onClickDeleteNamespace(data) {
      const url = '/namespace/delete?id=' + data.id
      console.log('delete url:' + url)
      this.axios.delete(url, {
        'headers': {
          'Content-Type': 'application/json',
          'NamespaceId': data.id
        }
      }).then(ret => {
        console.log('delete ret: ' + ret)
        ElMessage.success(this.$t('message.deleteSuccess'));
        this.listNamespaces();
      }).catch(e => {
        ElMessage.error(this.$t('message.deleteFailed') + ': ' + e);
      });
    },

    // 复制Token
    copyToken() {
      if (this.modifiedNamespaceForm.token) {
        navigator.clipboard.writeText(this.modifiedNamespaceForm.token).then(() => {
          ElMessage.success(this.$t('message.tokenCopied'));
        }).catch(() => {
          ElMessage.error(this.$t('message.copyFailed'));
        });
      }
    },

    // 处理用户权限更新
    handleUserRoleUpdate(newUserRoleData) {
      this.user_rule_form = { ...newUserRoleData };
    }
  },
  mounted() {
    this.listNamespaces()
  }
}
</script>

<style scoped lang="scss">
@import '../../styles/management-pages.scss';

/* Namespace Manager 页面样式 - 与 JobManager 保持一致 */
.namespace-manager {
  padding: 0;
  background: transparent;
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
