import Vue from 'vue'
import App from './App.vue'
import ElementUI from 'element-ui'
import './styles.scss'
import './plugins/element.js'

import axios from 'axios'
import router from "./router";
import store from "./stroe";
// import VueCookies from 'vue-cookies';

Vue.use(ElementUI);
// Vue.use(VueCookies);
Vue.prototype.axios = axios;
axios.defaults.baseURL = "http://localhost:7700";

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: h => h(App),
}).$mount('#app');

// 请求返回拦截，封装公共处理逻辑
axios.interceptors.response.use((response) => {
  if (response.data.success === true) {
    return response.data.data;
  }
  console.log("request failed due to " + response.data.msg);
  return Promise.reject(response.data.msg);
}, (error) => {
  console.log(error);
  return Promise.reject(error);
});
