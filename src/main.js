import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import { ElMessage } from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import './styles.scss'
import i18n from './i18n/i18n'
import './iconfont.css';
// Tailwind CSS（用于 power-workflow-next 组件）
import './tailwind.css';
// power-workflow-next 组件样式（标准 npm 接入）
import '@powerjob/power-workflow-next/style.css';


// axios 负责统一拦截处理 ResultDTO，fly 负责处理不需要拦截的请求
import axios from 'axios';
import router from "./router";
import store from "./store";
import common from "./common";

// let baseURL = "http://139.224.83.134:7700";
let baseURL = import.meta.env.VITE_BASE_URL;
// let baseURL = '/api';

let timeout = 10000;

/* ******* axios config ******* */
axios.defaults.baseURL = baseURL;
axios.defaults.timeout = timeout;

const app = createApp(App);

// Register Element Plus icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus);
app.use(router);
app.use(store);
app.use(i18n);

// Global properties
app.config.globalProperties.common = common;
app.config.globalProperties.axios = axios;

app.mount('#app');

// 请求拦截，全局添加 JWT 和 APPID 信息
axios.interceptors.request.use((request) => {

  request.headers['PowerJwt'] = window.localStorage.getItem("PowerJwt");
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
    ElMessage.warning("USER_NEED_LOGIN")
    router.push("/");
    return
  }

  // 值示例 /user/query
  const req_url = response.config?.url ?? ''
  if (req_url.startsWith('/container')) {
    console.log("skip intercept container's request")
    return response
  }

  if (response.data.success === true) {
    return response.data.data;
  }
  ElMessage.warning("ERROR：" + response.data.message);
  return Promise.reject(response.data.msg);
}, (error) => {
  ElMessage.error(error.toString());
  return Promise.reject(error);
});

export default baseURL;
