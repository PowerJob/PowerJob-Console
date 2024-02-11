<template>
  <div class="login-card" @click="navigateToUrl">
    <!-- 等有志之士来实现带 ICON 的效果了 -->
<!--    <img :src="image" :alt="`Login for ${name}`" class="login-image">-->
    <h3 style="width: 100%">{{ name }}</h3>
  </div>
</template>

<script>
export default {
  name: "LoginCard",
  props: {
    name: String,
    image: String,
    loginType: String
  },
  methods: {
    navigateToUrl() {
      this.axios.get('/auth/thirdPartyLoginUrl?type=' + this.loginType).then(ret => {

        // FE-REDIRECT 开头，则跳转到本地 vue 页面
        let redirectUrl = ret.toString()
        if (redirectUrl.startsWith('FE-REDIRECT:')) {
          this.$router.push(redirectUrl.split(':')[1])
          return
        }

        // 否则直接打开 URL
        window.open(ret, "_blank");
      })
    }
  }
}
</script>

<style scoped>
.login-card {
  cursor: pointer;
  border: 1px solid #ddd;
  padding: 20px;
  margin: 10px;
  text-align: center;
  transition: transform 0.3s ease;
  background-color: #FFFFFF;
}

.login-card:hover {
  transform: translateY(-5px);
}

.login-image {
  width: 100px;
  height: 100px;
  margin-bottom: 10px;
}
</style>
