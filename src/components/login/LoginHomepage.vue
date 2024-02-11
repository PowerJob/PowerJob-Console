<template>
  <div id="container">

    <div id="login_card_container">
      <LoginCard class="login_card_component"
                 v-for="login in login_type_info"
                 :key="login.type"
                 :name="login.name"
                 :image="login.iconUrl"
                 :login-type="login.type">
      </LoginCard>
    </div>
  </div>
</template>

<script>

import LoginCard from './LoginCard.vue';

  export default {
    name: "LoginHomepage",
    components: {
      LoginCard
    },
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
      }
    },
    mounted() {
      this.fetchSupportLoginTypes()
    }
  }
</script>

<style scoped>
/*
https://juejin.cn/post/7004622232378966046
display: flex;会生成一个块状的flex容器盒子，使用display: inline-flex;会生成一个行内的flex容器盒子。如果我们使用块状元素，比如div标签，就可以使用flex，如果使用行内元素，就可以使用inline-flex
flex-wrap：容器内元素是否可以换行，它有三个属性值：warp 换行第一行在上面，nowarp 不换行，wrap-reverse 换行第一行在下面
flex-direction：主轴方向，它决定了容器内元素排列方向。 row：默认值，沿水平主轴从左到右排列，起点在左沿
justify-content：元素在主轴的对齐方式，它有五个属性值：flex-start | flex-end | center | space-between | space-around;
 */

#container {
  width: 100%;
  height: 100%;
  //background-image: url("../../assets/banner.jpg");
  background-color: #C7EDCC;
}

#title_div {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

#login_card_container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login_card_component {

  margin: 20px;
  display: inline-flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;

}
</style>