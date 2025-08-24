<template>
  <div class="pj-admin-container">
    <!-- 页面头部 -->
    <div class="pj-page-header pj-tech-bg">
      <h1 class="pj-page-title">
        <el-icon class="pj-title-icon"><UserFilled /></el-icon>
        用户管理
      </h1>
      <p class="pj-page-description">管理系统用户账号，包括用户状态控制和信息查询</p>
    </div>

    <!-- 搜索条件卡片 -->
    <div class="pj-search-card">
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

        <el-form-item>
          <div class="pj-search-actions">
            <el-button type="primary" @click="listUser" :icon="Search">
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
        <h3 class="pj-table-title">用户列表</h3>
        <div class="pj-table-actions">
          <el-tooltip content="刷新数据" placement="top">
            <el-button @click="listUser" :icon="Refresh" circle></el-button>
          </el-tooltip>
        </div>
      </div>
      
      <el-table :data="userListResult" style="width: 100%" v-loading="loading">
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
                active-color="var(--pj-success)" 
                inactive-color="var(--pj-danger)" 
                @change="changeUserStatus(scope.row)"
                :loading="scope.row._switching" />
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 空状态 -->
      <div v-if="!loading && (!userListResult || userListResult.length === 0)" class="pj-empty-state">
        <el-icon class="pj-empty-icon"><User /></el-icon>
        <div class="pj-empty-text">暂无用户数据</div>
      </div>
    </div>
  </div>
</template>

<script>
import { ElMessage } from "element-plus";
import { 
  UserFilled, 
  User 
} from '@element-plus/icons-vue';

export default {
  name: "UserManager",
  components: {
    UserFilled,
    User
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
      that.$set(data, '_switching', true);
      
      console.log('user status: ' + data.enable)
      const action = data.enable ? 'enable' : 'disable';
      const url = `/user/${action}?uid=${data.id}`;
      
      that.axios.post(url).then(() => {
        ElMessage.success(data.enable ? '用户已启用' : '用户已禁用');
        that.$set(data, '_switching', false);
      }).catch(error => {
        // 操作失败，还原状态
        data.enable = !data.enable;
        that.$set(data, '_switching', false);
        ElMessage.error('操作失败: ' + error);
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

<style scoped>
@import '../../styles/admin-theme.scss';

/* 组件特定样式 */
.el-tag {
  border-radius: var(--pj-border-radius-sm);
}

.el-switch {
  --el-switch-on-color: var(--pj-success);
  --el-switch-off-color: var(--pj-danger);
}
</style>