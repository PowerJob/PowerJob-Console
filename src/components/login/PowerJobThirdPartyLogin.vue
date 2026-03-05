<template>
  <div class="login-page">
    <!-- 动态背景层 -->
    <div class="bg-layer">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
      <div class="grid-pattern"></div>
    </div>

    <!-- 主登录卡片 -->
    <div class="login-card">
      <!-- 顶部装饰 -->
      <div class="card-glow"></div>

      <!-- Logo 区域 -->
      <div class="logo-area">
        <div class="logo-wrapper">
          <div class="logo-icon">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="22" stroke="url(#logoGradient2)" stroke-width="3"/>
              <path d="M16 24L22 30L32 18" stroke="url(#logoGradient2)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <defs>
                <linearGradient id="logoGradient2" x1="0" y1="0" x2="48" y2="48">
                  <stop stop-color="#3B82F6"/>
                  <stop offset="1" stop-color="#8B5CF6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div class="logo-pulse"></div>
        </div>
        <h1 class="brand-title">PowerJob</h1>
        <p class="brand-tagline">分布式任务调度与计算平台</p>
      </div>

      <!-- 登录表单 -->
      <el-form ref="login_info" :model="login_info" label-width="0" class="login-form">
        <div class="form-group">
          <label class="input-label">用户名</label>
          <div class="input-wrapper">
            <div class="input-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <el-input
              v-model="login_info.username"
              placeholder="请输入用户名"
              class="modern-input"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="input-label">密码</label>
          <div class="input-wrapper">
            <div class="input-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <el-input
              v-model="login_info.password"
              placeholder="请输入密码"
              show-password
              type="password"
              class="modern-input"
            />
          </div>
        </div>

        <!-- 按钮组 -->
        <div class="button-group">
          <button
            type="button"
            class="action-btn register-btn"
            @click="userRegisterFormVisible = true"
          >
            <span class="btn-bg"></span>
            <span class="btn-content">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
              <span>注册账号</span>
            </span>
          </button>
          <button
            type="button"
            class="action-btn login-btn"
            @click="doLogin"
          >
            <span class="btn-bg"></span>
            <span class="btn-content">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              <span>立即登录</span>
            </span>
          </button>
        </div>
      </el-form>

      <!-- 底部信息 -->
      <div class="footer-info">
        <div class="divider">
          <span>安全 · 可靠 · 高效</span>
        </div>
        <p class="copyright">© PowerJob Team</p>
      </div>
    </div>

        <!-- 用户注册对话框 -->
    <el-dialog
      :title="$t('message.userRegister')"
      v-model="userRegisterFormVisible"
      width="420px"
      class="modern-dialog"
      :append-to-body="true"
    >
      <div class="dialog-content">
        <el-form :model="userRegisterForm" label-position="top" class="register-form">
          <div class="form-row">
            <div class="form-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <el-form-item label="用户名" class="form-item">
              <el-input v-model="userRegisterForm.username" placeholder="唯一标识，请使用英文" class="dialog-input"></el-input>
            </el-form-item>
          </div>

          <div class="form-row">
            <div class="form-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <el-form-item :label="$t('message.nick')" class="form-item">
              <el-input v-model="userRegisterForm.nick" placeholder="昵称" class="dialog-input"></el-input>
            </el-form-item>
          </div>

          <div class="form-row">
            <div class="form-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <el-form-item :label="$t('message.phone')" class="form-item">
              <el-input v-model="userRegisterForm.phone" placeholder="手机号" class="dialog-input"></el-input>
            </el-form-item>
          </div>

          <div class="form-row">
            <div class="form-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <el-form-item :label="$t('message.email')" class="form-item">
              <el-input v-model="userRegisterForm.email" placeholder="邮箱" class="dialog-input"></el-input>
            </el-form-item>
          </div>

          <div class="form-row">
            <div class="form-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <el-form-item :label="$t('message.webhook')" class="form-item">
              <el-input v-model="userRegisterForm.webHook" placeholder="Webhook 地址（可选）" class="dialog-input"></el-input>
            </el-form-item>
          </div>

          <div class="form-row">
            <div class="form-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <el-form-item :label="$t('message.newPassword')" class="form-item">
              <el-input type="password" v-model="userRegisterForm.password" show-password placeholder="请输入密码" class="dialog-input"></el-input>
            </el-form-item>
          </div>

          <div class="form-row">
            <div class="form-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
            </div>
            <el-form-item :label="$t('message.newPassword2')" class="form-item">
              <el-input type="password" v-model="userRegisterForm.password2" show-password placeholder="请再次输入密码" class="dialog-input"></el-input>
            </el-form-item>
          </div>

          <el-form-item class="dialog-actions">
            <div class="dialog-button-group">
              <button type="button" class="action-btn confirm-btn" @click="registerUser">
                <span class="btn-bg"></span>
                <span class="btn-content">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>确认注册</span>
                </span>
              </button>
              <button type="button" class="action-btn cancel-btn" @click="userRegisterFormVisible = false">
                <span class="btn-bg"></span>
                <span class="btn-content">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  <span>取消</span>
                </span>
              </button>
            </div>
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>

    <!-- 侧边装饰 -->
    <div class="side-decoration left">
      <div class="floating-element elem-1"></div>
      <div class="floating-element elem-2"></div>
    </div>
    <div class="side-decoration right">
      <div class="floating-element elem-3"></div>
      <div class="floating-element elem-4"></div>
    </div>
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

      userRegisterFormVisible: false,
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

    registerUser() {
      if (this.userRegisterForm.password !== this.userRegisterForm.password2) {
        alert('两次输入密码不一致!')
        return
      }

      const that = this;
      this.axios.post("/pwjbUser/create", this.userRegisterForm).then(() => {
        that.userRegisterFormVisible = false;
        that.innerDoLogin(that.userRegisterForm.username, that.userRegisterForm.password, false)
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
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.login-page {
  min-height: 100vh;
  position: relative;
  background: linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 50%, #bcccdc 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-family: 'Outfit', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* 动态背景层 */
.bg-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  animation: floatOrb 20s ease-in-out infinite;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.2));
  top: -200px;
  left: -100px;
  animation-delay: 0s;
}

.orb-2 {
  width: 500px;
  height: 500px;
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(59, 130, 246, 0.2));
  bottom: -150px;
  right: -100px;
  animation-delay: -7s;
}

.orb-3 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(236, 72, 153, 0.15));
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -14s;
}

@keyframes floatOrb {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(30px, -30px) scale(1.05);
  }
  50% {
    transform: translate(-20px, 20px) scale(0.95);
  }
  75% {
    transform: translate(-30px, -20px) scale(1.02);
  }
}

.grid-pattern {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
}

/* 登录卡片 */
.login-card {
  position: relative;
  z-index: 10;
  width: 90%;
  max-width: 440px;
  padding: 48px 40px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  animation: cardEnter 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.1), transparent 50%);
  pointer-events: none;
  animation: glowPulse 8s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* Logo 区域 */
.logo-area {
  text-align: center;
  margin-bottom: 32px;
}

.logo-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
}

.logo-icon {
  width: 100%;
  height: 100%;
  animation: logoFloat 3s ease-in-out infinite;
}

.logo-icon svg {
  width: 100%;
  height: 100%;
}

.logo-pulse {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.2), transparent 70%);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes logoFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 0.2; }
}

.brand-title {
  font-size: 36px;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -1px;
  margin-bottom: 8px;
}

.brand-tagline {
  font-size: 14px;
  color: #64748b;
  font-weight: 400;
}

/* 表单样式 */
.login-form {
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.input-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  margin-bottom: 8px;
  padding-left: 4px;
}

.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  z-index: 10;
  color: #94a3b8;
  transition: color 0.3s ease;
}

.input-icon svg {
  width: 100%;
  height: 100%;
}

.input-wrapper:focus-within .input-icon {
  color: #3b82f6;
}

:deep(.modern-input) {
  width: 100% !important;
}

:deep(.modern-input .el-input__wrapper) {
  width: 100% !important;
  background: white !important;
  border: 1.5px solid #e2e8f0 !important;
  border-radius: 12px !important;
  padding: 14px 14px 14px 44px !important;
  box-shadow: none !important;
  transition: all 0.3s ease !important;
}

:deep(.modern-input .el-input__wrapper:hover) {
  border-color: #cbd5e1 !important;
}

:deep(.modern-input .el-input__wrapper.is-focus) {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
}

:deep(.modern-input .el-input__inner) {
  color: #1e293b !important;
  font-weight: 500 !important;
  font-size: 14px !important;
}

:deep(.modern-input .el-input__inner::placeholder) {
  color: #94a3b8 !important;
}

/* 密码显示隐藏图标 */
:deep(.modern-input .el-input__password) {
  color: #94a3b8 !important;
}

/* 按钮组 */
.button-group {
  display: flex;
  gap: 16px;
  margin-top: 28px;
}

.action-btn {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 18px;
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-btn .btn-bg {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.register-btn .btn-bg {
  background: linear-gradient(135deg, #10b981, #059669);
}

.login-btn .btn-bg {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.btn-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-content svg {
  width: 18px;
  height: 18px;
}

.btn-content span {
  font-size: 14px;
  font-weight: 500;
  transition: color 0.3s ease;
}

.register-btn .btn-content span {
  color: #10b981;
}

.login-btn .btn-content span {
  color: #3b82f6;
}

.register-btn .btn-content svg {
  color: #10b981;
}

.login-btn .btn-content svg {
  color: #3b82f6;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px -8px rgba(0, 0, 0, 0.15);
}

.action-btn:hover .btn-bg {
  opacity: 1;
}

.action-btn:hover .btn-content span,
.action-btn:hover .btn-content svg {
  color: white;
}

/* 底部信息 */
.footer-info {
  margin-top: 28px;
  text-align: center;
}

.divider {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
}

.divider span {
  padding: 0 16px;
  font-size: 12px;
  color: #94a3b8;
  letter-spacing: 2px;
}

.copyright {
  font-size: 12px;
  color: #94a3b8;
}

/* 注册对话框样式 */
:deep(.el-overlay) {
  background-color: rgba(15, 23, 42, 0.6) !important;
  backdrop-filter: blur(4px);
}

:deep(.el-dialog) {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.5) !important;
  border-radius: 20px !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
}

:deep(.el-dialog__header) {
  padding: 28px 28px 20px !important;
  border-bottom: 1px solid #e2e8f0 !important;
  background: transparent !important;
}

:deep(.el-dialog__title) {
  color: #1e293b !important;
  font-size: 20px !important;
  font-weight: 500 !important;
}

:deep(.el-dialog__headerbtn) {
  top: 24px !important;
  right: 24px !important;
}

:deep(.el-dialog__close) {
  color: #94a3b8 !important;
  font-size: 18px !important;
  transition: color 0.3s ease;
}

:deep(.el-dialog__close:hover) {
  color: #3b82f6 !important;
}

:deep(.el-dialog__body) {
  padding: 16px 24px 24px !important;
  background: transparent !important;
}

/* 注册表单样式 */

/* 表单行样式 */
.form-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 6px;
}

.form-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border-radius: 8px;
  margin-right: 10px;
  margin-top: 20px;
  flex-shrink: 0;
}

.form-icon svg {
  width: 16px;
  height: 16px;
  color: #3b82f6;
}

.form-row .form-item {
  flex: 1;
  margin-bottom: 0;
}

.form-row .form-item :deep(.el-form-item__label) {
  margin-bottom: 2px;
  font-size: 12px;
}

.register-form :deep(.el-form-item__label) {
  color: #475569 !important;
  font-weight: 500 !important;
  font-size: 14px !important;
}

.register-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

:deep(.dialog-input .el-input__wrapper) {
  background: white !important;
  border: 1.5px solid #e2e8f0 !important;
  border-radius: 10px !important;
  padding: 12px 14px !important;
  box-shadow: none !important;
  transition: all 0.3s ease !important;
}

:deep(.dialog-input .el-input__wrapper:hover) {
  border-color: #cbd5e1 !important;
}

:deep(.dialog-input .el-input__wrapper.is-focus) {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
}

:deep(.dialog-input .el-input__inner) {
  color: #1e293b !important;
  font-size: 14px !important;
}

.dialog-actions {
  margin-top: 28px;
  margin-bottom: 0 !important;
}

.dialog-button-group {
  display: flex;
  gap: 16px;
  justify-content: center;
  width: 100%;
}

.dialog-button-group .action-btn {
  flex: 1;
  padding: 14px 20px;
}

.confirm-btn .btn-bg {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.cancel-btn .btn-bg {
  background: linear-gradient(135deg, #64748b, #475569);
}

.confirm-btn .btn-content span,
.confirm-btn .btn-content svg {
  color: #3b82f6;
}

.cancel-btn .btn-content span,
.cancel-btn .btn-content svg {
  color: #64748b;
}

.dialog-button-group .action-btn:hover .btn-bg {
  opacity: 1;
}

.dialog-button-group .action-btn:hover .btn-content span,
.dialog-button-group .action-btn:hover .btn-content svg {
  color: white;
}

/* 侧边装饰 */
.side-decoration {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 200px;
  pointer-events: none;
}

.side-decoration.left {
  left: 0;
}

.side-decoration.right {
  right: 0;
}

.floating-element {
  position: absolute;
  border-radius: 20px;
  animation: sideFloat 15s ease-in-out infinite;
}

.elem-1 {
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
  top: 20%;
  left: 20%;
  animation-delay: 0s;
}

.elem-2 {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(59, 130, 246, 0.1));
  bottom: 30%;
  left: 40%;
  animation-delay: -5s;
}

.elem-3 {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1));
  top: 25%;
  right: 20%;
  animation-delay: -3s;
}

.elem-4 {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1));
  bottom: 35%;
  right: 35%;
  animation-delay: -8s;
}

@keyframes sideFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  33% { transform: translateY(-20px) rotate(5deg); }
  66% { transform: translateY(10px) rotate(-3deg); }
}

/* 响应式设计 */
@media (max-width: 640px) {
  .login-card {
    padding: 36px 24px;
    margin: 20px;
  }

  .brand-title {
    font-size: 28px;
  }

  .logo-wrapper {
    width: 64px;
    height: 64px;
  }

  .button-group {
    flex-direction: column;
    gap: 12px;
  }

  .side-decoration {
    display: none;
  }

  :deep(.el-dialog) {
    width: 90% !important;
    margin: 0 auto !important;
  }
}
</style>
