import Vue from 'vue'
import App from './App.vue'
import ElementUI from 'element-ui'
// import { Message } from 'element-ui'; 
import './styles.scss'
import './plugins/element.js'

import axios from 'axios'
import router from "./router";
import store from "./store";
import common from "./common";
// import VueCookies from 'vue-cookies';

Vue.use(ElementUI);
// Vue.use(VueCookies);

Vue.prototype.common = common;
/* ******* axios config ******* */
Vue.prototype.axios = axios;
axios.defaults.baseURL = "http://101.132.101.215:7700";
axios.defaults.timeout = 5000;

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: h => h(App),
}).$mount('#app');

// 请求返回拦截，封装公共处理逻辑
// axios.interceptors.response.use((response) => {
//   if (response.data.success === true) {
//     return response.data.data;
//   }
//   // Message.warning("错误信息：" + response.data.message);
//   return Promise.reject(response.data.msg);
// }, (error) => {
//   Message.error(error.toString());
//   return Promise.reject(error);
// });
