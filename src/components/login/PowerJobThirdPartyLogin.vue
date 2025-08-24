<template>
  <div class="modern-powerjob-login">
    <!-- 背景动画元素 -->
    <div class="bg-animation">
      <div class="floating-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
        <div class="shape shape-4"></div>
        <div class="shape shape-5"></div>
      </div>
    </div>

    <div class="login-container">
      <!-- Logo和标题区域 -->
      <div class="login-header">
        <div class="logo-section">
          <div class="tech-logo">
            <div class="logo-ring"></div>
            <div class="logo-center">PJ</div>
          </div>
        </div>
        <h2>Login to PowerJob</h2>
        <p class="subtitle">Distributed Job Scheduling & Computing Platform</p>
      </div>

      <!-- 登录表单 -->
      <el-form ref="login_info" :model="login_info" label-width="0" class="modern-form">
        <el-form-item class="modern-form-item">
          <div class="input-wrapper">
            <el-input 
              v-model="login_info.username" 
              placeholder="Username"
              class="modern-input">
            </el-input>
          </div>
        </el-form-item>
        
        <el-form-item class="modern-form-item">
          <div class="input-wrapper">
            <el-input 
              v-model="login_info.password" 
              placeholder="Password" 
              show-password
              type="password"
              class="modern-input">
            </el-input>
          </div>
        </el-form-item>
        
        <el-form-item class="actions-section">
          <div class="button-group">
            <button 
              type="button"
              class="modern-btn register-btn"
              @click="userRegisterFormVisible = true">
              <span class="btn-text">{{$t('message.userRegister')}}</span>
              <div class="btn-glow"></div>
            </button>
            <button 
              type="button"
              class="modern-btn login-btn"
              @click="doLogin">
              <span class="btn-text">{{$t('message.login')}}</span>
              <div class="btn-glow"></div>
            </button>
          </div>
        </el-form-item>
      </el-form>

      <!-- 科技感装饰元素 -->
      <div class="tech-decoration">
        <div class="circuit-line line-1"></div>
        <div class="circuit-line line-2"></div>
        <div class="data-dot dot-1"></div>
        <div class="data-dot dot-2"></div>
        <div class="data-dot dot-3"></div>
      </div>
    </div>

    <!-- 用户注册对话框 -->
    <el-dialog 
      :title="$t('message.userRegister')" 
      v-model="userRegisterFormVisible" 
      width="480px"
      class="modern-dialog">
      <div class="dialog-content">
        <el-form :model="userRegisterForm" label-width="120px" class="register-form">
          <el-form-item label="Username" class="modern-form-item">
            <el-input v-model="userRegisterForm.username" placeholder="Unique identifier, use English" class="modern-input"></el-input>
          </el-form-item>
          <el-form-item :label="$t('message.nick')" class="modern-form-item">
            <el-input v-model="userRegisterForm.nick" class="modern-input"></el-input>
          </el-form-item>
          <el-form-item :label="$t('message.phone')" class="modern-form-item">
            <el-input v-model="userRegisterForm.phone" class="modern-input"></el-input>
          </el-form-item>
          <el-form-item :label="$t('message.email')" class="modern-form-item">
            <el-input v-model="userRegisterForm.email" class="modern-input"></el-input>
          </el-form-item>
          <el-form-item :label="$t('message.webhook')" class="modern-form-item">
            <el-input v-model="userRegisterForm.webHook" class="modern-input"></el-input>
          </el-form-item>
          <el-form-item :label="$t('message.newPassword')" class="modern-form-item">
            <el-input type="password" v-model="userRegisterForm.password" show-password class="modern-input"></el-input>
          </el-form-item>
          <el-form-item :label="$t('message.newPassword2')" class="modern-form-item">
            <el-input type="password" v-model="userRegisterForm.password2" show-password class="modern-input"></el-input>
          </el-form-item>
          <el-form-item class="dialog-actions">
            <div class="dialog-button-group">
              <button type="button" class="modern-btn register-confirm-btn" @click="registerUser">
                <span class="btn-text">{{$t('message.register')}}</span>
                <div class="btn-glow"></div>
              </button>
              <button type="button" class="modern-btn cancel-btn" @click="userRegisterFormVisible = false">
                <span class="btn-text">{{$t('message.cancel')}}</span>
                <div class="btn-glow"></div>
              </button>
            </div>
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>
  </div>
</template>


<script>
import { ElMessage } from "element-plus";

export default {
  name: 'PowerJobThirdPartyLogin',
  data() {
    return {
      login_info: {
        username: '',
        password: '',
      },

      // 用户注册表单是否可见
      userRegisterFormVisible: false,
      // 用户注册表单对象
      userRegisterForm: {
        username: '',
        nick: '',
        phone: '',
        email: '',
        webHook: '',
        password: '',
        password2: ''
      },

    };
  },
  methods: {
    doLogin() {
      this.innerDoLogin(this.login_info.username, this.login_info.password, true)
    },

    innerDoLogin(name, pwd, real_login) {
      let s_info = {
        username: name,
        password: pwd,
        // 出于前端成本考虑暂不实现，有需求可在此扩展
        encryption: 'none'
      }

      let login_request = {
        loginType: 'PWJB',
        originParams: JSON.stringify(s_info)
      }

      this.axios.post('/auth/thirdPartyLoginDirect', login_request).then(ret => {

        if (real_login) {
          const jwtToken = ret.jwtToken
          window.localStorage.setItem('PowerJwt', jwtToken);

          this.$router.push("/admin/app")
        }
      })
    },

    // 注册用户
    registerUser() {

      if (this.userRegisterForm.password !== this.userRegisterForm.password2) {
        alert('两次输入密码不一致!')
        return
      }

      const that = this;
      this.axios.post("/pwjbUser/create", this.userRegisterForm).then(() => {
        that.userRegisterFormVisible = false;

        that.innerDoLogin(that.userRegisterForm.username, that.userRegisterForm.password, false)

        // 直接登录一次，创建 PowerJob 的 USER 对象
        ElMessage.success(this.$t('message.success'));

      }, err => {
        ElMessage.error(err);
        that.userRegisterFormVisible = false
      });
    }
  },

  mounted() {
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

/* 全局样式覆盖 */
:deep(body) {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.modern-powerjob-login {
  min-height: 100vh;
  position: relative;
  background: linear-gradient(135deg, 
    #0f172a 0%, 
    #1e293b 25%, 
    #334155 50%, 
    #1e293b 75%, 
    #0f172a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* 背景动画效果 */
.bg-animation {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
}

.floating-shapes {
  position: absolute;
  width: 100%;
  height: 100%;
}

.shape {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
  animation: float 6s ease-in-out infinite;
  backdrop-filter: blur(1px);
}

.shape-1 {
  width: 80px;
  height: 80px;
  top: 20%;
  left: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 120px;
  height: 120px;
  top: 60%;
  right: 15%;
  animation-delay: -2s;
}

.shape-3 {
  width: 60px;
  height: 60px;
  bottom: 30%;
  left: 20%;
  animation-delay: -4s;
}

.shape-4 {
  width: 100px;
  height: 100px;
  top: 10%;
  right: 30%;
  animation-delay: -1s;
}

.shape-5 {
  width: 90px;
  height: 90px;
  bottom: 20%;
  right: 40%;
  animation-delay: -3s;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  33% { transform: translateY(-20px) rotate(120deg); }
  66% { transform: translateY(20px) rotate(240deg); }
}

/* 主登录容器 */
.login-container {
  position: relative;
  z-index: 10;
  max-width: 480px;
  width: 90%;
  padding: 50px 40px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 
              0 0 80px rgba(59, 130, 246, 0.1);
  text-align: center;
  animation: slideInUp 0.8s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(60px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Logo 区域 */
.logo-section {
  margin-bottom: 20px;
}

.tech-logo {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-radius: 50%;
  background: linear-gradient(45deg, #3b82f6, #8b5cf6, #06b6d4) border-box;
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: subtract;
  mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  mask-composite: subtract;
  animation: rotate 3s linear infinite;
}

.logo-center {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
  z-index: 1;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 标题和描述 */
.login-header h2 {
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #ffffff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  letter-spacing: -0.5px;
}

.subtitle {
  font-size: 14px;
  margin-bottom: 40px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 400;
  line-height: 1.6;
}

/* 表单样式 */
.modern-form {
  margin-bottom: 30px;
}

.modern-form-item {
  margin-bottom: 24px;
  width: 100%;
}

.input-wrapper {
  position: relative;
  width: 100%;
}

:deep(.modern-form-item .el-form-item__content) {
  width: 100% !important;
}

/* Element Plus Input 样式覆盖 */
:deep(.modern-input) {
  width: 100% !important;
}

:deep(.modern-input .el-input__wrapper) {
  width: 100% !important;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

:deep(.modern-input .el-input__wrapper:hover) {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.2);
}

:deep(.modern-input .el-input__wrapper.is-focus) {
  border-color: #3b82f6;
  box-shadow: 0 4px 24px rgba(59, 130, 246, 0.3);
}

:deep(.modern-input .el-input__inner) {
  color: #ffffff;
  font-weight: 500;
  font-size: 16px;
}

:deep(.modern-input .el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.6);
}

/* 按钮样式 */
.button-group {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.modern-btn {
  position: relative;
  padding: 16px 32px;
  font-size: 16px;
  font-weight: 500;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
  min-width: 140px;
  backdrop-filter: blur(10px);
}

.login-btn {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
}

.register-btn {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(21, 128, 61, 0.8));
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(34, 197, 94, 0.2);
}

.btn-text {
  position: relative;
  z-index: 2;
}

.btn-glow {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.6s ease;
  z-index: 1;
}

.modern-btn:hover {
  transform: translateY(-2px);
}

.login-btn:hover {
  box-shadow: 0 12px 40px rgba(59, 130, 246, 0.4);
  background: linear-gradient(135deg, #2563eb, #1e40af);
}

.register-btn:hover {
  box-shadow: 0 12px 40px rgba(34, 197, 94, 0.3);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.9), rgba(21, 128, 61, 0.9));
}

.modern-btn:hover .btn-glow {
  left: 100%;
}

.modern-btn:active {
  transform: translateY(0);
}

/* 科技装饰元素 */
.tech-decoration {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: -1;
}

.circuit-line {
  position: absolute;
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent);
  height: 1px;
}

.line-1 {
  top: 30%;
  left: 0;
  right: 0;
  animation: pulse 2s ease-in-out infinite;
}

.line-2 {
  bottom: 40%;
  left: 0;
  right: 0;
  animation: pulse 2s ease-in-out infinite reverse;
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

.data-dot {
  position: absolute;
  width: 6px;
  height: 6px;
  background: #3b82f6;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
  animation: blink 1.5s ease-in-out infinite;
}

.dot-1 {
  top: 20%;
  left: 20%;
  animation-delay: 0s;
}

.dot-2 {
  top: 70%;
  right: 25%;
  animation-delay: 0.5s;
}

.dot-3 {
  bottom: 30%;
  left: 60%;
  animation-delay: 1s;
}

@keyframes blink {
  0%, 50% { opacity: 0.3; }
  25% { opacity: 1; }
}

/* 对话框遮罩样式 */
:deep(.el-overlay) {
  background-color: rgba(0, 0, 0, 0.7) !important;
  backdrop-filter: blur(4px);
}

/* 对话框样式 */
:deep(.el-dialog) {
  background: rgba(15, 23, 42, 0.95) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 20px !important;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5) !important;
  margin: 0 auto !important;
}

:deep(.el-dialog__header) {
  padding: 30px 30px 0 !important;
  border-bottom: none !important;
  background: transparent !important;
}

:deep(.el-dialog__title) {
  color: #ffffff !important;
  font-size: 24px !important;
  font-weight: 600 !important;
  text-align: center !important;
}

:deep(.el-dialog__headerbtn) {
  top: 20px !important;
  right: 20px !important;
}

:deep(.el-dialog__close) {
  color: rgba(255, 255, 255, 0.7) !important;
  font-size: 18px !important;
}

:deep(.el-dialog__close:hover) {
  color: #ffffff !important;
}

:deep(.el-dialog__body) {
  padding: 20px 30px 30px !important;
  background: transparent !important;
}

/* 注册表单样式 */
.register-form :deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.8) !important;
  font-weight: 500 !important;
}

/* 对话框中的输入框样式 */
:deep(.el-dialog .modern-input .el-input__wrapper) {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 8px !important;
  padding: 12px 16px !important;
}

:deep(.el-dialog .modern-input .el-input__wrapper:hover) {
  border-color: rgba(59, 130, 246, 0.5) !important;
}

:deep(.el-dialog .modern-input .el-input__wrapper.is-focus) {
  border-color: #3b82f6 !important;
}

.dialog-button-group {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 20px;
}

.register-confirm-btn {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
}

.cancel-btn {
  background: linear-gradient(135deg, rgba(100, 116, 139, 0.8), rgba(71, 85, 105, 0.8));
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(100, 116, 139, 0.2);
}

.register-confirm-btn:hover {
  box-shadow: 0 12px 40px rgba(59, 130, 246, 0.4);
  background: linear-gradient(135deg, #2563eb, #1e40af);
}

.cancel-btn:hover {
  box-shadow: 0 12px 40px rgba(100, 116, 139, 0.3);
  background: linear-gradient(135deg, rgba(100, 116, 139, 0.9), rgba(71, 85, 105, 0.9));
}

/* 响应式设计 */
@media (max-width: 640px) {
  .login-container {
    max-width: 360px;
    padding: 40px 24px;
    margin: 20px;
  }
  
  .login-header h2 {
    font-size: 28px;
  }
  
  .tech-logo {
    width: 60px;
    height: 60px;
  }
  
  .logo-center {
    font-size: 22px;
  }
  
  .modern-btn {
    padding: 14px 24px;
    font-size: 15px;
    min-width: 120px;
  }
  
  .button-group {
    flex-direction: column;
    gap: 12px;
  }
}

@media (max-height: 700px) {
  .login-container {
    padding: 30px 40px;
  }
  
  .logo-section {
    margin-bottom: 16px;
  }
  
  .subtitle {
    margin-bottom: 30px;
  }
}
</style>

