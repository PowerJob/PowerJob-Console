<template>
<div class="pj-admin-container">

  <!-- 全局管理员设置卡片 -->
  <div class="pj-table-card">
    <div class="pj-table-header">
      <h3 class="pj-table-title">
        <el-icon style="margin-right: 8px;"><UserFilled /></el-icon>
        {{$t('message.globalAdmin')}}
      </h3>
      <div class="pj-table-actions">
        <el-tooltip content="刷新用户列表" placement="top">
          <el-button @click="listUser" :icon="Refresh" circle :loading="loadingUsers"></el-button>
        </el-tooltip>
      </div>
    </div>
    
    <div style="padding: 24px;">
      <el-row :gutter="24">
        <!-- 管理员选择 -->
        <el-col :lg="16" :md="24">
          <div style="margin-bottom: 16px;">
            <el-text type="info" style="font-size: 14px;">
              选择系统全局管理员，具有最高权限
            </el-text>
          </div>
          
          <el-select 
            multiple 
            v-model="adminUserIds" 
            placeholder="请选择全局管理员" 
            style="width: 100%;"
            filterable
            :loading="loadingUsers">
            <el-option
                v-for="item in user_list"
                :key="item.id"
                :label="item.showName"
                :value="item.id">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>{{ item.showName }}</span>
                <el-tag size="small" type="info" v-if="item.username">{{ item.username }}</el-tag>
              </div>
            </el-option>
          </el-select>
          
          <div style="margin-top: 16px;">
            <el-button 
              type="primary" 
              @click="saveGlobalAdmins"
              :loading="saving"
              :disabled="!hasChanges"
              :icon="Check">
              {{$t('message.save')}}
            </el-button>
            <el-button 
              @click="resetChanges"
              :disabled="!hasChanges"
              :icon="Refresh">
              重置
            </el-button>
          </div>
        </el-col>
        
        <!-- 当前管理员列表 -->
        <el-col :lg="8" :md="24">
          <div class="admin-list-card">
            <div style="margin-bottom: 16px;">
              <el-text type="primary" style="font-weight: 600;">
                当前管理员 ({{ selectedAdmins.length }})
              </el-text>
            </div>
            
            <div v-if="selectedAdmins.length === 0" class="pj-empty-state" style="padding: 32px 16px;">
              <el-icon class="pj-empty-icon" style="font-size: 32px;"><UserFilled /></el-icon>
              <div class="pj-empty-text">暂无管理员</div>
            </div>
            
            <div v-else>
              <div 
                v-for="admin in selectedAdmins" 
                :key="admin.id" 
                class="admin-item">
                <div class="admin-info">
                  <div class="admin-name">{{ admin.showName }}</div>
                  <div class="admin-username">{{ admin.username }}</div>
                </div>
                <el-button 
                  size="small" 
                  type="text" 
                  @click="removeAdmin(admin.id)"
                  style="color: var(--pj-danger);">
                  移除
                </el-button>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</div>
</template>

<script>
import { ElMessage } from "element-plus";
import {
  UserFilled,
} from '@element-plus/icons-vue';

export default {
  name: 'Settings',
  components: {
    UserFilled,
  },
  data() {
    return {
      user_list: [],
      adminUserIds: [],
      originalAdminIds: [], // 原始管理员ID列表，用于检查是否有变化
      loadingUsers: false,
      saving: false
    };
  },
  computed: {
    // 当前选中的管理员信息
    selectedAdmins() {
      return this.user_list.filter(user => this.adminUserIds.includes(user.id));
    },
    
    // 是否有变化
    hasChanges() {
      const adminIds = [...this.adminUserIds].sort();
      const originalIds = [...this.originalAdminIds].sort();
      return JSON.stringify(adminIds) !== JSON.stringify(originalIds);
    }
  },
  
  methods: {

    listUser() {
      this.loadingUsers = true;
      let that = this;
      that.axios.get("/user/list").then(res => {
        that.user_list = res;
        that.loadingUsers = false;
      }).catch(() => {
        that.loadingUsers = false;
        ElMessage.error('加载用户列表失败');
      });
    },

    listGlobalAdmins() {
      let that = this;
      this.axios.get('/auth/listGlobalAdmin').then(ret => {
        that.adminUserIds = ret || [];
        that.originalAdminIds = [...(ret || [])]; // 保存原始状态
      }).catch(() => {
        ElMessage.error('加载管理员列表失败');
      });
    },

    saveGlobalAdmins() {
      this.saving = true;
      const param = {
        admin: this.adminUserIds
      };
      
      this.axios.post('/auth/saveGlobalAdmin', param).then(() => {
        ElMessage.success('管理员设置保存成功');
        this.originalAdminIds = [...this.adminUserIds]; // 更新原始状态
        this.saving = false;
      }).catch(e => {
        ElMessage.error('保存失败: ' + e);
        this.saving = false;
      });
    },
    
    // 重置变化
    resetChanges() {
      this.adminUserIds = [...this.originalAdminIds];
      ElMessage.info('已重置修改');
    },
    
    // 移除管理员
    removeAdmin(userId) {
      const index = this.adminUserIds.indexOf(userId);
      if (index > -1) {
        this.adminUserIds.splice(index, 1);
      }
    }
  },
  mounted() {
    this.listUser()
    this.listGlobalAdmins()
  }
}

</script>

<style scoped>
@import '../../styles/admin-theme.scss';

/* 管理员列表样式 */
.admin-list-card {
  background: var(--pj-bg-tertiary);
  border-radius: var(--pj-border-radius);
  padding: 16px;
}

.admin-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: var(--pj-bg-card);
  border-radius: var(--pj-border-radius-sm);
  border: 1px solid var(--pj-border-color);
  transition: all 0.2s ease;
}

.admin-item:hover {
  box-shadow: var(--pj-shadow-sm);
  transform: translateY(-1px);
}

.admin-item:last-child {
  margin-bottom: 0;
}

.admin-info {
  flex: 1;
}

.admin-name {
  font-weight: 500;
  color: var(--pj-text-primary);
  font-size: 14px;
}

.admin-username {
  color: var(--pj-text-secondary);
  font-size: 12px;
  margin-top: 2px;
}
</style>