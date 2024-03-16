import Vue from 'vue'
import App from './App.vue'
import ElementUI from 'element-ui'
import { Message } from 'element-ui';
import './styles.scss'
import './plugins/element.js'
import i18n from './i18n/i18n'
import './iconfont.css';


// axios 负责统一拦截处理 ResultDTO，fly 负责处理不需要拦截的请求
import axios from 'axios';
import router from "./router";
import store from "./store";
import common from "./common";

Vue.use(ElementUI);
// let baseURL = "http://139.224.83.134:7700";
let baseURL = process.env.VUE_APP_BASE_URL;
// let baseURL = '/api';

let timeout = 10000;

Vue.prototype.common = common;
/* ******* axios config ******* */
Vue.prototype.axios = axios;
axios.defaults.baseURL = baseURL;
axios.defaults.timeout = timeout;

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  i18n,
  render: h => h(App),
}).$mount('#app');

// 请求拦截，全局添加 JWT 和 APPID 信息
axios.interceptors.request.use((request) => {

  request.headers['Power_jwt'] = window.localStorage.getItem("Power_jwt");
  if (request.headers['AppId'] == null) {
    request.headers['AppId'] = window.localStorage.getItem("Power_appId");
  }

  return request;

}, function (error) {
  // Do something with request error
  return Promise.reject(error);
});

// 请求返回拦截，封装公共处理逻辑
axios.interceptors.response.use((response) => {

  // -100 为未登录约定状态码，前端全局拦截跳转登录页面
  if (response.data.code === '-100') {
    Message.warning("USER_NEED_LOGIN")
    router.push("/");
    return
  }

  // 值示例 /user/query
  const req_url = response.config.url
  if (req_url.startsWith('/container')) {
    console.log("skip intercept container's request")
    return response
  }

  if (response.data.success === true) {
    return response.data.data;
  }
  Message.warning("ERROR：" + response.data.message);
  return Promise.reject(response.data.msg);
}, (error) => {
  Message.error(error.toString());
  return Promise.reject(error);
});

export default baseURL;
