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
              <circle cx="24" cy="24" r="22" stroke="url(#logoGradient)" stroke-width="3"/>
              <path d="M16 24L22 30L32 18" stroke="url(#logoGradient)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <defs>
                <linearGradient id="logoGradient" x1="0" y1="0" x2="48" y2="48">
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

      <!-- 欢迎文字 -->
      <div class="welcome-section">
        <h2>欢迎回来</h2>
        <p>选择登录方式开始使用</p>
      </div>

      <!-- 登录按钮列表 -->
      <div class="login-options">
        <button
          v-for="(login, index) in login_type_info"
          :key="index"
          class="login-btn"
          :class="'btn-' + (index % 4)"
          @click="onClickLoginTypeBottom(login)"
          :style="{ animationDelay: (index * 0.1) + 's' }"
        >
          <div class="btn-bg"></div>
          <span class="btn-icon">
            <svg v-if="login.type === 'PWJB'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
          </span>
          <span class="btn-text">{{ login.name }}</span>
          <span class="btn-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </span>
        </button>
      </div>

      <!-- 底部信息 -->
      <div class="footer-info">
        <div class="divider">
          <span>安全 · 可靠 · 高效</span>
        </div>
        <p class="copyright">© PowerJob Team</p>
      </div>
    </div>

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
import { ElMessage } from 'element-plus';

export default {
  name: 'LoginHomepage',
  data() {
    return {
      login_type_info: []
    };
  },
  methods: {
    fetchSupportLoginTypes() {
      const that = this;
      const url = "/auth/supportLoginTypes";
      this.axios.get(url).then((result) => {
        that.login_type_info = result;
      }, error => ElMessage.error(error));
    },

    onClickLoginTypeBottom(loginInfo) {
      console.log('onClickLoginTypeBottom: ' + JSON.stringify(loginInfo));
      this.axios.get('/auth/thirdPartyLoginUrl?type=' + loginInfo.type).then(ret => {
        let redirectUrl = ret.toString()
        if (redirectUrl.startsWith('FE-REDIRECT:')) {
          this.$router.push(redirectUrl.split(':')[1])
          return
        }
        window.open(ret, "_blank");
      })
    },

    tryLogin() {
      const url = "/auth/ifLogin";
      this.axios.get(url).then(ret => {
        if (ret === null || ret === undefined) {
          console.log('ifLogin failed, need reLogin')
        } else {
          this.$router.push("/admin/app")
        }
      }, error => {
        window.localStorage.removeItem('PowerJwt');
        window.localStorage.removeItem('Power_appId');
        ElMessage.error(error)
      });
    },

    callbackLogin() {
      const urlSearchParams = new URLSearchParams(window.location.search);
      if (urlSearchParams.size === 0) {
        console.log('no urlSearchParams, skip process callback')
        return
      }
      let callbackLoginUrl = '/auth/thirdPartyLoginCallback?'
      for (var pair of urlSearchParams.entries()) {
        callbackLoginUrl = callbackLoginUrl + '&' + pair[0] + '=' + pair[1];
      }
      console.log('final url:' + callbackLoginUrl)
      this.axios.get(callbackLoginUrl).then(ret => {
        console.log('login success, user: ' + ret)
        const jwtToken = ret.jwtToken
        window.localStorage.setItem('PowerJwt', jwtToken);
        this.$router.push("/admin/app")
      })
    }
  },
  mounted() {
    let localLang = window.localStorage.getItem('oms_lang');
    console.log("language from localStorage is %o", localLang);
    if (localLang != null) {
      this.$i18n.locale = localLang;
    }else {
      let lang = navigator.language;
      console.log("language from system is %o", lang);
      switch (lang) {
        case "zh-HK":
        case "zh-TW":
        case "zh-SG":
        case "zh-CN": this.$i18n.locale = "cn"; break;
        default:
          this.$i18n.locale = "en";
      }
    }

    this.fetchSupportLoginTypes();
    this.callbackLogin();
    this.tryLogin();
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

/* 欢迎区域 */
.welcome-section {
  text-align: center;
  margin-bottom: 32px;
}

.welcome-section h2 {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.welcome-section p {
  font-size: 15px;
  color: #64748b;
}

/* 登录按钮选项 */
.login-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-btn {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 18px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: btnSlideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

@keyframes btnSlideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.login-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.btn-bg {
  position: absolute;
  inset: 0;
  transition: all 0.3s ease;
}

.login-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.15);
  border-color: transparent;
}

.login-btn:hover .btn-bg {
  opacity: 1;
}

/* 不同按钮的渐变背景 */
.btn-0 .btn-bg {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.btn-1 .btn-bg {
  background: linear-gradient(135deg, #10b981, #059669);
}

.btn-2 .btn-bg {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
}

.btn-3 .btn-bg {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.btn-icon {
  position: relative;
  z-index: 2;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  margin-right: 12px;
  transition: all 0.3s ease;
}

.btn-icon svg {
  width: 16px;
  height: 16px;
  color: #3b82f6;
}

.btn-text {
  position: relative;
  z-index: 2;
  flex: 1;
  text-align: left;
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  transition: color 0.3s ease;
}

.btn-arrow {
  position: relative;
  z-index: 2;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s ease;
}

.btn-arrow svg {
  width: 20px;
  height: 20px;
  color: white;
}

.login-btn:hover .btn-text {
  color: white;
}

.login-btn:hover .btn-icon {
  background: rgba(255, 255, 255, 0.2);
}

.login-btn:hover .btn-icon svg {
  color: white;
}

.login-btn:hover .btn-arrow {
  opacity: 1;
  transform: translateX(0);
}

/* 底部信息 */
.footer-info {
  margin-top: 36px;
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

  .welcome-section h2 {
    font-size: 20px;
  }

  .login-btn {
    padding: 14px 18px;
  }

  .btn-icon {
    width: 36px;
    height: 36px;
  }

  .btn-text {
    font-size: 14px;
  }

  .side-decoration {
    display: none;
  }
}
</style>
