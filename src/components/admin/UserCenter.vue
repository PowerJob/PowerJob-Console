<template>
<div class="pj-admin-container">

  <el-row :gutter="24">
    <!-- 个人信息卡片 -->
    <el-col :lg="16" :md="24">
      <div class="pj-table-card">
        <div class="pj-table-header">
          <h3 class="pj-table-title">
            <el-icon style="margin-right: 8px;"><UserFilled /></el-icon>
            {{$t('message.personalInfo')}}
          </h3>
        </div>
        
        <div style="padding: 24px;">
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
                    placeholder="请输入昵称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="手机号" prop="phone">
                  <el-input 
                    v-model="userDetailInfo.phone"
                    placeholder="请输入手机号" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="邮箱" prop="email">
              <el-input 
                v-model="userDetailInfo.email"
                placeholder="请输入邮箱地址" />
            </el-form-item>

            <el-form-item label="Webhook URL">
              <el-input 
                v-model="userDetailInfo.webHook"
                placeholder="请输入Webhook地址用于接收通知" />
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
              <div style="display: flex; gap: 12px;">
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
      <div class="pj-table-card">
        <div class="pj-table-header">
          <h3 class="pj-table-title">
            <el-icon style="margin-right: 8px;"><UserFilled /></el-icon>
            {{$t('message.appAdmin')}}
          </h3>
        </div>
        
        <div style="padding: 24px;">
          <el-form 
            :model="appAssertRequest" 
            :rules="adminRules"
            ref="adminFormRef"
            label-width="80px" 
            label-position="left">
            
            <el-form-item label="应用名" prop="appName">
              <el-input 
                v-model="appAssertRequest.appName"
                placeholder="请输入应用名称" />
            </el-form-item>

            <el-form-item label="应用密码" prop="password">
              <el-input 
                v-model="appAssertRequest.password"
                type="password"
                placeholder="请输入应用密码"
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
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
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
  User, 
  UserFilled
} from '@element-plus/icons-vue';

export default {
  name: 'UserCenter',
  components: {
    User,
    UserFilled
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
        role2NamespaceList: {

        },
        role2AppList: {

        }
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
          { required: true, message: '请输入昵称', trigger: 'blur' }
        ],
        phone: [
          { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
        ],
        email: [
          { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
        ]
      },
      adminRules: {
        appName: [
          { required: true, message: '请输入应用名称', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入应用密码', trigger: 'blur' }
        ]
      },
      passwordRules: {
        oldPassword: [
          { required: true, message: '请输入旧密码', trigger: 'blur' }
        ],
        newPassword: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
        ],
        newPassword2: [
          { required: true, message: '请再次输入新密码', trigger: 'blur' },
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
            ElMessage.success("修改成功");
            that.fetchUserDetail();
            that.saving = false;
          }).catch(e => {
            ElMessage.error('修改失败: ' + e);
            that.saving = false;
          });
        } else {
          ElMessage.warning('请检查表单填写是否正确');
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
            ElMessage.success('密码修改成功，请重新登录');
            
            window.localStorage.removeItem('PowerJwt');
            window.localStorage.removeItem('Power_appId');
            this.$router.push("/");
            
          }).catch(err => {
            ElMessage.error('密码修改失败: ' + err);
            this.changingPassword = false;
          });
        } else {
          ElMessage.warning('请检查表单填写是否正确');
        }
      });
    },

    onClickAuthThenBecomeAdmin() {
      this.$refs.adminFormRef.validate((valid) => {
        if (valid) {
          this.applying = true;
          this.axios.post('/appInfo/becomeAdmin', this.appAssertRequest).then(() => {
            ElMessage.success('成功成为应用管理员');
            // 清空表单
            this.appAssertRequest.appName = undefined;
            this.appAssertRequest.password = undefined;
            this.applying = false;
          }).catch(e => {
            ElMessage.error('申请失败: ' + e);
            this.applying = false;
          });
        } else {
          ElMessage.warning('请检查表单填写是否正确');
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

<style scoped>
@import '../../styles/admin-theme.scss';

/* 组件特定样式 */
.el-tag {
  border-radius: var(--pj-border-radius-sm);
}

.el-alert {
  border-radius: var(--pj-border-radius);
  margin-top: 16px;
}

.el-form-item__label {
  font-weight: 500 !important;
}
</style>