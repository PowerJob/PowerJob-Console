import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router.js'
import i18n from './i18n/i18n.js'
import common from './common.js'
import PjIcon from './components/common/PjIcon.vue'
import { createHttpClient } from './services/http.js'
import './styles.scss'
import './iconfont.css'

const app = createApp(App)
app.component('PjIcon', PjIcon)
const http = createHttpClient({ router, translate: i18n.global.t })
app.config.globalProperties.axios = http
app.config.globalProperties.common = common
app.use(createPinia()).use(router).use(i18n).use(ElementPlus)
app.mount('#app')
