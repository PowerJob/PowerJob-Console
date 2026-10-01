import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins:[vue()],base:'./',
  server:{host:'127.0.0.1',port:5173,strictPort:true,proxy:{
    '/api':{target:process.env.POWERJOB_DEV_API_TARGET||'http://127.0.0.1:7700',changeOrigin:true,ws:true,rewrite:path=>path.replace(/^\/api/,'')},
  }},
  build:{target:'es2022'},
})
