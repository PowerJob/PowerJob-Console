import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: './',
    plugins: [vue()],
    resolve: { extensions: ['.js', '.json', '.vue'] },
    server: {
      forwardConsole: false,
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        '/api': {
          target: env.POWERJOB_DEV_SERVER || 'http://127.0.0.1:7700',
          changeOrigin: true,
          ws: true,
          rewrite: path => path.replace(/^\/api/, ''),
        },
      },
    },
    build: { target: 'es2020', sourcemap: false },
  }
})
