<template>
  <div class="user-manager pj-management-page">

    <!-- Search and Action Section -->
    <div class="pj-form-section" style="padding-top: 0; margin-top: 0;">
      <div class="search-container">
        <div class="search-form">
          <el-form :inline="true" :model="queryUserRequest" class="el-form--inline">
            <el-form-item label="用户ID">
              <el-input
                v-model="queryUserRequest.userIdEq"
                placeholder="请输入用户ID"
                style="width: 140px;"
                clearable />
            </el-form-item>

            <el-form-item label="用户昵称">
              <el-input
                v-model="queryUserRequest.nickLike"
                :placeholder="$t('message.fuzzyQuery')"
                style="width: 180px;"
                clearable />
            </el-form-item>

            <el-form-item label="手机号">
              <el-input
                v-model="queryUserRequest.phoneLike"
                :placeholder="$t('message.fuzzyQuery')"
                style="width: 160px;"
                clearable />
            </el-form-item>
          </el-form>
        </div>

        <div class="action-buttons">
          <el-button @click="onClickReset">{{$t('message.reset')}}</el-button>
          <el-button type="primary" @click="listUser">
            <el-icon class="mr-1"><Search /></el-icon>
            {{$t('message.query')}}
          </el-button>
          <el-button type="info" @click="listUser">
            <el-icon class="mr-1"><Refresh /></el-icon>
            {{$t('message.refresh')}}
          </el-button>
        </div>
      </div>
    </div>

    <!-- Table Section -->
    <div class="pj-table" style="margin-top: var(--pj-space-sm);">
      <el-table
        :data="userListResult"
        style="width: 100%"
        v-loading="loading"
        stripe
        table-layout="auto">
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column label="账号类型" width="120">
          <template #default="scope">
            <el-tag
              :type="getAccountTypeStyle(scope.row.accountType).type"
              size="small">
              {{ getAccountTypeText(scope.row.accountType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户名" width="150" show-overflow-tooltip />
        <el-table-column prop="nick" label="昵称" width="150" show-overflow-tooltip />
        <el-table-column prop="phone" label="手机号" width="130" show-overflow-tooltip />
        <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />

        <el-table-column :label="$t('message.status')" width="100" align="center">
          <template #default="scope">
            <el-tooltip
              :content="scope.row.enable ? '点击禁用用户' : '点击启用用户'"
              placement="top">
              <el-switch
                v-model="scope.row.enable"
                :active-color="'var(--pj-success)'"
                :inactive-color="'var(--pj-error)'"
                @change="changeUserStatus(scope.row)"
                :loading="scope.row._switching" />
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && (!userListResult || userListResult.length === 0)" class="pagination-container" style="color: var(--pj-text-tertiary);">
      暂无用户数据
    </div>
  </div>
</template>

<script>
import { ElMessage } from "element-plus";
import {
  User, Search, Refresh
} from '@element-plus/icons-vue';

export default {
  name: "UserManager",
  components: {
    User, Search, Refresh
  },
  data() {
    return {
      // 查询 APP 请求
      queryUserRequest: {
        userIdEq: undefined,
        nickLike: undefined,
        phoneLike: undefined
      },

      // 用户查询结果
      userListResult: [],
      loading: false
    }
  },
  methods: {
    // 点击重置按钮
    onClickReset() {
      this.queryUserRequest.userIdEq = undefined;
      this.queryUserRequest.nickLike = undefined;
      this.queryUserRequest.phoneLike = undefined;
      this.listUser();
    },

    listUser() {
      this.loading = true;
      const that = this;
      this.axios.post("/user/query", this.queryUserRequest).then((res) => {
        that.userListResult = res;
        that.loading = false;
      }).catch(() => {
        that.loading = false;
      });
    },

    changeUserStatus(data) {
      const that = this;
      // 设置当前用户为切换状态
      data._switching = true;

      console.log('user status: ' + data.enable)
      const action = data.enable ? 'enable' : 'disable';
      const url = `/user/${action}?uid=${data.id}`;

      that.axios.post(url).then(() => {
        ElMessage.success(data.enable ? '用户已启用' : '用户已禁用');
        data._switching = false;
      }).catch(error => {
        // 操作失败，还原状态
        data.enable = !data.enable;
        data._switching = false;
        ElMessage.error(this.$t('message.operationFailed') + error);
      });
    },

    // 获取账号类型文本
    getAccountTypeText(accountType) {
      const typeMap = {
        'PWJB': '内部账户',
        'LDAP': 'LDAP',
        'OAUTH': 'OAuth',
        'CAS': 'CAS',
        'SAML': 'SAML'
      };
      return typeMap[accountType] || accountType;
    },

    // 获取账号类型样式
    getAccountTypeStyle(accountType) {
      const styleMap = {
        'PWJB': { type: 'primary' },
        'LDAP': { type: 'success' },
        'OAUTH': { type: 'warning' },
        'CAS': { type: 'info' },
        'SAML': { type: 'danger' }
      };
      return styleMap[accountType] || { type: '' };
    }
  },
  mounted() {

    this.listUser()
  }
}
</script>

<style scoped lang="scss">
@import '../../styles/management-pages.scss';

/* User Manager 页面样式 - 与 JobManager 保持一致 */
.user-manager {
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

/* 开关样式 */
:deep(.el-switch) {
  --el-switch-on-color: var(--pj-success);
  --el-switch-off-color: var(--pj-error);
}
</style>
