<template>
<div class="user-center pj-management-page">

  <el-row :gutter="24">
    <!-- 个人信息卡片 -->
    <el-col :lg="16" :md="24">
      <div class="pj-form-section" style="padding-top: 0; margin-top: 0;">
        <div class="section-header">
          <div class="section-title">
            <el-icon class="mr-1"><UserFilled /></el-icon>
            {{$t('message.personalInfo')}}
          </div>
        </div>
      </div>

      <div class="pj-table" style="margin-top: var(--pj-space-sm);">
        <div class="form-content">
          <el-form
            :model="userDetailInfo"
            :rules="personalInfoRules"
            ref="personalInfoRef"
            label-width="120px"
            label-position="left">

            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="用户ID">
                  <el-input disabled v-model="userDetailInfo.id" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="用户名">
                  <el-input disabled v-model="userDetailInfo.username" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="账号类型">
                  <el-tag :type="getAccountTypeStyle(userDetailInfo.accountType).type" size="large">
                    {{ getAccountTypeText(userDetailInfo.accountType) }}
                  </el-tag>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="原始用户名">
                  <el-input disabled v-model="userDetailInfo.originUsername" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="昵称" prop="nick">
                  <el-input
                    v-model="userDetailInfo.nick"
                    :placeholder="$t('message.pleaseEnterNickname')" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="手机号" prop="phone">
                  <el-input
                    v-model="userDetailInfo.phone"
                    :placeholder="$t('message.pleaseEnterPhone')" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="邮箱" prop="email">
              <el-input
                v-model="userDetailInfo.email"
                :placeholder="$t('message.pleaseEnterEmail')" />
            </el-form-item>

            <el-form-item label="Webhook URL">
              <el-input
                v-model="userDetailInfo.webHook"
                :placeholder="$t('message.pleaseEnterWebhook')" />
            </el-form-item>

            <el-form-item label="全局角色">
              <div v-if="userDetailInfo.globalRoles && userDetailInfo.globalRoles.length > 0">
                <el-tag
                  v-for="role in userDetailInfo.globalRoles"
                  :key="role"
                  type="success"
                  style="margin-right: 8px;">
                  {{ role }}
                </el-tag>
              </div>
              <span v-else style="color: var(--pj-text-tertiary);">无全局角色</span>
            </el-form-item>

            <el-form-item style="margin-top: 32px;">
              <div class="action-buttons">
                <el-button
                  type="primary"
                  @click="onClickSaveNewUserInfo"
                  :loading="saving"
                  :icon="Check">
                  {{$t('message.save')}}
                </el-button>
                <el-button
                  type="danger"
                  v-if="userDetailInfo.accountType=='PWJB'"
                  @click="onClickChangePassword"
                  :icon="Key">
                  {{$t('message.changePassword')}}
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </el-col>

    <!-- 应用管理员申请卡片 -->
    <el-col :lg="8" :md="24">
      <div class="pj-form-section" style="padding-top: 0; margin-top: 0;">
        <div class="section-header">
          <div class="section-title">
            <el-icon class="mr-1"><UserFilled /></el-icon>
            {{$t('message.appAdmin')}}
          </div>
        </div>
      </div>

      <div class="pj-table" style="margin-top: var(--pj-space-sm);">
        <div class="form-content">
          <el-form
            :model="appAssertRequest"
            :rules="adminRules"
            ref="adminFormRef"
            label-width="80px"
            label-position="left">

            <el-form-item label="应用名" prop="appName">
              <el-input
                v-model="appAssertRequest.appName"
                :placeholder="$t('message.pleaseEnterAppName')" />
            </el-form-item>

            <el-form-item label="应用密码" prop="password">
              <el-input
                v-model="appAssertRequest.password"
                type="password"
                :placeholder="$t('message.pleaseEnterAppPassword')"
                show-password />
            </el-form-item>

            <el-form-item style="margin-top: 24px;">
              <el-button
                type="primary"
                @click="onClickAuthThenBecomeAdmin"
                :loading="applying"
                :icon="Shield"
                style="width: 100%;">
                {{$t('message.authThenBecomeAdmin')}}
              </el-button>
            </el-form-item>

            <el-alert
              type="info"
              :closable="false"
              show-icon>
              <template #default>
                <div style="font-size: 12px; line-height: 1.5;">
                  通过应用密码验证成为该应用的管理员，获得应用管理权限。
                </div>
              </template>
            </el-alert>
          </el-form>
        </div>
      </div>
    </el-col>
  </el-row>

  <!-- 修改密码对话框 -->
  <el-dialog
    :title="$t('message.changePassword')"
    v-model="changePasswordFormVisible"
    width="450px"
    :close-on-click-modal="false">
    <el-form
      :model="changePasswordRequest"
      :rules="passwordRules"
      ref="passwordFormRef"
      label-width="100px">

      <el-form-item label="用户名">
        <el-input disabled v-model="changePasswordRequest.username" />
      </el-form-item>

      <el-form-item :label="$t('message.oldPassword')" prop="oldPassword">
        <el-input
          v-model="changePasswordRequest.oldPassword"
          type="password"
          placeholder="请输入旧密码"
          show-password />
      </el-form-item>

      <el-form-item :label="$t('message.newPassword')" prop="newPassword">
        <el-input
          v-model="changePasswordRequest.newPassword"
          type="password"
          placeholder="请输入新密码"
          show-password />
      </el-form-item>

      <el-form-item :label="$t('message.newPassword2')" prop="newPassword2">
        <el-input
          v-model="changePasswordRequest.newPassword2"
          type="password"
          placeholder="请再次输入新密码"
          show-password />
      </el-form-item>

      <el-form-item style="margin-top: 32px;">
        <div class="action-buttons" style="justify-content: flex-end;">
          <el-button @click="changePasswordFormVisible = false" :icon="Close">
            {{$t('message.cancel')}}
          </el-button>
          <el-button
            type="primary"
            @click="submitChangePasswordRequest"
            :loading="changingPassword"
            :icon="Check">
            {{$t('message.confirm')}}
          </el-button>
        </div>
      </el-form-item>
    </el-form>
  </el-dialog>
</div>
</template>

<script>
import { ElMessage } from "element-plus";
import {
  UserFilled, Check, Key, Shield, Close
} from '@element-plus/icons-vue';

export default {
  name: 'UserCenter',
  components: {
    UserFilled, Check, Key, Shield, Close
  },
  data() {
    return {

      // 用户详细信息
      userDetailInfo: {
        id: undefined,
        username: undefined,
        nick: undefined,
        accountType: undefined,
        password: undefined,
        phone: undefined,
        email: undefined,
        webHook: undefined,
        originUsername: undefined,
        extra: undefined,
        globalRoles: [],
        role2NamespaceList: {},
        role2AppList: {}
      },
      // 修改密码
      changePasswordRequest: {
        username: undefined,
        oldPassword: undefined,
        newPassword: undefined,
        newPassword2: undefined
      },
      changePasswordFormVisible: false,

      // 使用 APP 账户密码成为管理员
      appAssertRequest: {
        appName: undefined,
        password: undefined
      },

      // 加载状态
      saving: false,
      applying: false,
      changingPassword: false,

      // 表单验证规则
      personalInfoRules: {
        nick: [
          { required: true, message: this.$t('message.pleaseEnterNickname'), trigger: 'blur' }
        ],
        phone: [
          { pattern: /^1[3-9]\d{9}$/, message: this.$t('message.pleaseEnterCorrectPhone'), trigger: 'blur' }
        ],
        email: [
          { type: 'email', message: this.$t('message.pleaseEnterCorrectEmail'), trigger: 'blur' }
        ]
      },
      adminRules: {
        appName: [
          { required: true, message: this.$t('message.pleaseEnterAppName'), trigger: 'blur' }
        ],
        password: [
          { required: true, message: this.$t('message.pleaseEnterAppPassword'), trigger: 'blur' }
        ]
      },
      passwordRules: {
        oldPassword: [
          { required: true, message: this.$t('message.pleaseEnterOldPassword'), trigger: 'blur' }
        ],
        newPassword: [
          { required: true, message: this.$t('message.pleaseEnterNewPassword'), trigger: 'blur' },
          { min: 6, message: this.$t('message.passwordMinLength6'), trigger: 'blur' }
        ],
        newPassword2: [
          { required: true, message: this.$t('message.pleaseEnterNewPasswordAgain'), trigger: 'blur' },
          { validator: this.validatePassword2, trigger: 'blur' }
        ]
      }
    }
  },

  methods: {

    fetchUserDetail() {
      const that = this;
      this.axios.get('/user/detail').then(ret => that.userDetailInfo = ret)
    },

    onClickSaveNewUserInfo() {
      this.$refs.personalInfoRef.validate((valid) => {
        if (valid) {
          this.saving = true;
          const that = this;
          this.axios.post('/user/modify', that.userDetailInfo).then(() => {
            ElMessage.success(this.$t('message.modifySuccess'));
            that.fetchUserDetail();
            that.saving = false;
          }).catch(e => {
            ElMessage.error(this.$t('message.modifyFailed') + e);
            that.saving = false;
          });
        } else {
          ElMessage.warning(this.$t('message.checkFormCorrect'));
        }
      });
    },

    // 修改密码
    onClickChangePassword() {
      this.changePasswordRequest.username = this.userDetailInfo.originUsername
      this.changePasswordFormVisible = true
    },

    submitChangePasswordRequest() {
      this.$refs.passwordFormRef.validate((valid) => {
        if (valid) {
          this.changingPassword = true;
          this.axios.post('/pwjbUser/changePassword', this.changePasswordRequest).then(() => {
            ElMessage.success(this.$t('message.passwordModifySuccess'));

            window.localStorage.removeItem('PowerJwt');
            window.localStorage.removeItem('Power_appId');
            this.$router.push("/");

          }).catch(err => {
            ElMessage.error(this.$t('message.passwordModifyFailed') + err);
            this.changingPassword = false;
          });
        } else {
          ElMessage.warning(this.$t('message.checkFormCorrect'));
        }
      });
    },

    onClickAuthThenBecomeAdmin() {
      this.$refs.adminFormRef.validate((valid) => {
        if (valid) {
          this.applying = true;
          this.axios.post('/appInfo/becomeAdmin', this.appAssertRequest).then(() => {
            ElMessage.success(this.$t('message.becomeAdminSuccess'));
            // 清空表单
            this.appAssertRequest.appName = undefined;
            this.appAssertRequest.password = undefined;
            this.applying = false;
          }).catch(e => {
            ElMessage.error(this.$t('message.applyFailed') + e);
            this.applying = false;
          });
        } else {
          ElMessage.warning(this.$t('message.checkFormCorrect'));
        }
      });
    },

    // 验证确认密码
    validatePassword2(rule, value, callback) {
      if (value === '') {
        callback(new Error('请再次输入密码'));
      } else if (value !== this.changePasswordRequest.newPassword) {
        callback(new Error('两次输入密码不一致!'));
      } else {
        callback();
      }
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
    this.fetchUserDetail()
  }
}
</script>

<style scoped lang="scss">
@import '../../styles/management-pages.scss';

/* User Center 页面样式 - 与 JobManager 保持一致 */
.user-center {
  padding: 0;
  background: transparent;
}

/* 图标间距 */
.mr-1 {
  margin-right: 4px;
}

/* 标题样式 */
.section-header {
  margin-bottom: var(--pj-space-sm);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--pj-text-primary);
  display: flex;
  align-items: center;
}

/* 表单内容区 */
.form-content {
  background: var(--pj-bg-white);
  border-radius: var(--pj-radius-lg);
  padding: var(--pj-space-lg);
  box-shadow: var(--pj-shadow-card);
}

/* 操作按钮组 */
.action-buttons {
  display: flex;
  gap: var(--pj-space-sm);
}

/* 标签样式 */
:deep(.el-tag) {
  font-family: 'Outfit', -apple-system, sans-serif;
  font-weight: 500;
  font-size: 12px;
  border-radius: 12px;
  padding: 4px 12px;
}

/* 提示框样式 */
:deep(.el-alert) {
  border-radius: var(--pj-radius-lg);
  margin-top: var(--pj-space-md);
}

/* 表单标签 */
:deep(.el-form-item__label) {
  font-weight: 500 !important;
}
</style>
