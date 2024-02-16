<template>
  <div class="auth-container">
    <h1>{{$t('message.welcomeTitle')}}</h1>
    <p>{{$t('message.chooseLoginType')}}</p>

    <button v-for="(login, index) in login_type_info" :key="index" @click="onClickLoginTypeBottom(login)">{{login.name}}</button>
  </div>
</template>

<script>
export default {
  name: 'LoginHomepage',
  data() {
    return {

      login_type_info: [
      ]
    }
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
        window.localStorage.removeItem('Power_jwt');
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
        window.localStorage.setItem('Power_jwt', jwtToken);

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

    this.fetchSupportLoginTypes()
    this.callbackLogin()
    this.tryLogin()
  }
}
</script>

<style>
/* 全局样式重置，确保跨浏览器的一致性 */
html, body, div, h1, p, button {
  margin: 0;
  padding: 0;
  border: 0;
}

/* 应用字体和背景 */
body {
  font-family: 'Arial', sans-serif; /* 或者您页面中使用的字体 */
  background-color: #f0f0f0; /* 页面背景颜色 */
  color: #333; /* 默认文本颜色 */
}

/* 容器样式，用于居中和控制宽度 */
.auth-container {
  width: 100%;
  max-width: 400px; /* 最大宽度，根据您的设计调整 */
  margin: 100px auto; /* 上下边距100px，自动水平居中 */
  padding: 20px;
  background-color: #ffffff; /* 容器背景颜色 */
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); /* 容器阴影效果 */
  border-radius: 8px; /* 容器边角的圆滑度 */
}

/* 标题样式 */
.auth-container h1 {
  font-size: 24px; /* 标题字体大小 */
  color: #333; /* 标题颜色 */
  margin-bottom: 20px; /* 标题下边距 */
}

/* 描述文本样式 */
.auth-container p {
  font-size: 16px; /* 描述文本字体大小 */
  color: #666; /* 描述文本颜色 */
  margin-bottom: 30px; /* 描述文本下边距 */
}

/* 按钮公共样式 */
.auth-container button {
  width: 100%; /* 按钮宽度 */
  padding: 10px 0; /* 按钮上下内边距 */
  margin-bottom: 15px; /* 按钮间距 */
  font-size: 16px; /* 按钮字体大小 */
  color: #ffffff; /* 按钮文字颜色 */
  background-color: #1da1f2; /* 按钮背景颜色 */
  border-radius: 4px; /* 按钮边角的圆滑度 */
  cursor: pointer; /* 鼠标悬停时的指针样式 */
  border: none; /* 去除边框 */
  transition: background-color 0.3s ease; /* 颜色变换过渡效果 */
}

/* 按钮鼠标悬停样式 */
.auth-container button:hover {
  background-color: #0d95e8; /* 按钮背景颜色变深 */
}

/* 按钮不可点击状态样式 */
.auth-container button:disabled {
  background-color: #ccc; /* 灰色背景 */
  cursor: not-allowed; /* 不允许点击的鼠标样式 */
}

/* 图片logo的样式 */
.auth-container img.logo {
  width: 50px; /* logo图片宽度 */
  height: auto; /* logo图片高度自适应 */
  margin-bottom: 20px; /* logo下边距 */
}

</style>
