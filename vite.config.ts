import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'

const workflowNextRoot = path.resolve(__dirname, '../power-workflow-next')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    react({
      include: [
        /\.(tsx|jsx)$/,
        // 让 power-workflow-next 源码也走 React JSX 编译
        new RegExp(workflowNextRoot.replace(/[/\\]/g, '[/\\\\]') + '.*\\.(tsx|jsx|ts)$'),
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 源码引入：import 时直接解析到 src 目录
      '@echo009/power-workflow-next': path.resolve(workflowNextRoot, 'src/index.ts'),
    }
  },
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:7700',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'element-plus': ['element-plus'],
          'vue-vendor': ['vue', 'vue-router', 'vuex'],
        }
      }
    }
  },
  // 兼容 Vue CLI 的 publicPath 配置
  base: './'
})
