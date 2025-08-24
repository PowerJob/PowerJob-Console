<template>
  <div class="modern-login-page">
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
    
    <!-- 主登录容器 -->
    <div class="auth-container">
      <div class="login-header">
        <div class="logo-section">
          <div class="tech-logo">
            <div class="logo-ring"></div>
            <div class="logo-center">PJ</div>
          </div>
        </div>
        <h1>{{ $t('message.welcomeTitle') }}</h1>
        <p>{{ $t('message.chooseLoginType') }}</p>
      </div>
      
      <div class="login-buttons">
        <button
            v-for="(login, index) in login_type_info"
            :key="index"
            class="modern-btn"
            @click="onClickLoginTypeBottom(login)">
          <span class="btn-text">{{ login.name }}</span>
          <div class="btn-glow"></div>
        </button>
      </div>
      
      <!-- 科技感装饰元素 -->
      <div class="tech-decoration">
        <div class="circuit-line line-1"></div>
        <div class="circuit-line line-2"></div>
        <div class="data-dot dot-1"></div>
        <div class="data-dot dot-2"></div>
        <div class="data-dot dot-3"></div>
      </div>
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

        // FE-REDIRECT 开头，则跳转到本地 vue 页面
        let redirectUrl = ret.toString()
        if (redirectUrl.startsWith('FE-REDIRECT:')) {
          this.$router.push(redirectUrl.split(':')[1])
          return
        }

        // 否则直接打开 URL
        window.open(ret, "_blank");
      })
    },

    // 上下文登录（JWT ifLogin）
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

    // 处理第三方登录的回调请求
    callbackLogin() {
      const urlSearchParams = new URLSearchParams(window.location.search);
      if (urlSearchParams.size === 0) {
        console.log('no urlSearchParams, skip process callback')
        return
      }
      // 处理第三方回调
      let callbackLoginUrl = '/auth/thirdPartyLoginCallback?'
      // 显示键/值对
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
    // 加载默认语言配置文件
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

/* 全局样式覆盖 */
:deep(body) {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.modern-login-page {
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
.auth-container {
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
  margin-bottom: 32px;
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
.login-header h1 {
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #ffffff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  letter-spacing: -0.5px;
}

.login-header p {
  font-size: 16px;
  margin-bottom: 40px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 400;
  line-height: 1.6;
}

/* 登录按钮 */
.login-buttons {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 30px;
}

.modern-btn {
  position: relative;
  width: 100%;
  padding: 18px 32px;
  font-size: 16px;
  font-weight: 500;
  color: #ffffff;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border: none;
  border-radius: 16px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
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
  box-shadow: 0 12px 40px rgba(59, 130, 246, 0.4);
  background: linear-gradient(135deg, #2563eb, #1e40af);
}

.modern-btn:hover .btn-glow {
  left: 100%;
}

.modern-btn:active {
  transform: translateY(0);
}

.modern-btn:disabled {
  background: linear-gradient(135deg, #64748b, #475569);
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 4px 16px rgba(100, 116, 139, 0.2);
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

/* 响应式设计 */
@media (max-width: 640px) {
  .auth-container {
    max-width: 360px;
    padding: 40px 24px;
    margin: 20px;
  }
  
  .login-header h1 {
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
    padding: 16px 24px;
    font-size: 15px;
  }
}

@media (max-height: 700px) {
  .auth-container {
    padding: 30px 40px;
  }
  
  .logo-section {
    margin-bottom: 20px;
  }
  
  .login-header p {
    margin-bottom: 30px;
  }
}
</style>
