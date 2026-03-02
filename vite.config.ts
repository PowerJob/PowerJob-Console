import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    react({
      include: [/\.(tsx|jsx)$/],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
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
