<template>
<div class="settings-page pj-management-page">

  <!-- Settings Section -->
  <div class="pj-form-section" style="padding-top: 0; margin-top: 0;">
    <div class="search-container">
      <div class="section-title">
        <el-icon class="mr-1"><UserFilled /></el-icon>
        {{$t('message.globalAdmin')}}
      </div>

      <div class="action-buttons">
        <el-button type="info" @click="listUser" :loading="loadingUsers">
          <el-icon class="mr-1"><Refresh /></el-icon>
          {{$t('message.refresh')}}
        </el-button>
      </div>
    </div>
  </div>

  <!-- Content Section -->
  <div class="pj-table" style="margin-top: var(--pj-space-sm);">
    <div class="settings-content">
      <el-row :gutter="24">
        <!-- 管理员选择 -->
        <el-col :lg="16" :md="24">
          <div class="settings-info-text">
            选择系统全局管理员，具有最高权限
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

          <div class="settings-actions">
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
            <div class="admin-list-header">
              当前管理员 ({{ selectedAdmins.length }})
            </div>

            <div v-if="selectedAdmins.length === 0" class="empty-admin-list">
              暂无管理员
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
                  type="danger"
                  @click="removeAdmin(admin.id)">
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
  UserFilled, Refresh, Check
} from '@element-plus/icons-vue';

export default {
  name: 'Settings',
  components: {
    UserFilled, Refresh, Check
  },
  data() {
    return {
      user_list: [],
      adminUserIds: [],
      originalAdminIds: [],
      loadingUsers: false,
      saving: false
    };
  },
  computed: {
    selectedAdmins() {
      return this.user_list.filter(user => this.adminUserIds.includes(user.id));
    },

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
        that.originalAdminIds = [...(ret || [])];
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
        this.originalAdminIds = [...this.adminUserIds];
        this.saving = false;
      }).catch(e => {
        ElMessage.error('保存失败: ' + e);
        this.saving = false;
      });
    },

    resetChanges() {
      this.adminUserIds = [...this.originalAdminIds];
      ElMessage.info('已重置修改');
    },

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

<style scoped lang="scss">
@import '../../styles/management-pages.scss';

/* Settings 页面样式 - 与 JobManager 保持一致 */
.settings-page {
  padding: 0;
  background: transparent;
}

/* 图标间距 */
.mr-1 {
  margin-right: 4px;
}

/* 标题样式 */
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--pj-text-primary);
  display: flex;
  align-items: center;
}

/* 设置内容区 */
.settings-content {
  background: var(--pj-bg-white);
  border-radius: var(--pj-radius-lg);
  padding: var(--pj-space-lg);
  box-shadow: var(--pj-shadow-card);
}

.settings-info-text {
  color: var(--pj-text-secondary);
  font-size: 14px;
  margin-bottom: var(--pj-space-md);
}

.settings-actions {
  margin-top: var(--pj-space-lg);
  display: flex;
  gap: var(--pj-space-sm);
}

/* 管理员列表卡片 */
.admin-list-card {
  background: var(--pj-bg-secondary);
  border-radius: var(--pj-radius-lg);
  padding: var(--pj-space-md);
}

.admin-list-header {
  font-weight: 600;
  color: var(--pj-primary);
  margin-bottom: var(--pj-space-md);
}

.empty-admin-list {
  color: var(--pj-text-tertiary);
  text-align: center;
  padding: var(--pj-space-xl);
  font-size: 14px;
}

.admin-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--pj-space-sm) var(--pj-space-md);
  margin-bottom: var(--pj-space-xs);
  background: var(--pj-bg-white);
  border-radius: var(--pj-radius-md);
  border: 1px solid var(--pj-border-color);
  transition: all 0.2s ease;

  &:hover {
    box-shadow: var(--pj-shadow-sm);
    transform: translateY(-1px);
  }

  &:last-child {
    margin-bottom: 0;
  }
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
