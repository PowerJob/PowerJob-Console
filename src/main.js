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
