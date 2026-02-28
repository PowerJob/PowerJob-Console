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
      // power-workflow-next 项目根目录（用于 CSS 导入）
      'power-workflow-next-root': workflowNextRoot,
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    // 强制使用单一 React 实例，避免 hooks 问题
    dedupe: ['react', 'react-dom', 'react-dom/client'],
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
