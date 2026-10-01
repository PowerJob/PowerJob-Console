import { createApp } from 'vue'
import App from './App.vue'
import { router } from './core/router'
import './style.css'
createApp(App).use(router).mount('#app')
