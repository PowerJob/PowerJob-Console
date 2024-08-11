<template>
  <div class="auth-container">
    <h1>{{ $t('message.welcomeTitle') }}</h1>
    <p>{{ $t('message.chooseLoginType') }}</p>
    <div class="login-buttons">
      <button
          v-for="(login, index) in login_type_info"
          :key="index"
          @click="onClickLoginTypeBottom(login)">
        {{ login.name }}
      </button>
    </div>
  </div>
</template>

<script>
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
      }, error => that.$message.error(error));
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
      const that = this;

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
        that.$message.error(error)
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

<style>
/* 使用轻纹理背景 */
body {
  font-family: 'Arial', sans-serif;
  background: #f0f0f0 url('../../assets/fe_login_backgroup_cubes.png') repeat; /* 浅灰色纹理背景 */
  color: #343a40;
}

/* 其他样式保持不变 */


.auth-container {
  max-width: 400px;
  margin: 100px auto;
  padding: 40px 30px;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.auth-container h1 {
  font-size: 28px;
  margin-bottom: 25px;
  color: #212529;
}

.auth-container p {
  font-size: 18px;
  margin-bottom: 35px;
  color: #495057;
}

.login-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.auth-container button {
  width: 100%;
  padding: 14px 0;
  font-size: 16px;
  color: #fff;
  background-color: #007bff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
}

.auth-container button:hover {
  background-color: #0056b3;
}

.auth-container button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}
</style>
