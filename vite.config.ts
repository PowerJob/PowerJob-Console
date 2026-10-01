import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.POWERJOB_SERVER_URL || 'http://127.0.0.1:7700';
  return {
    plugins: [react()], base: './',
    server: { host: '127.0.0.1', port: 24800, strictPort: true, proxy: { '/api': { target, ws: true, changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') } } },
    preview: { host: '127.0.0.1', port: 24800, strictPort: true, proxy: { '/api': { target, ws: true, changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') } } },
    build: { target: 'es2020', sourcemap: true, rollupOptions: { output: { manualChunks: (id: string) => id.includes('node_modules/@xyflow') ? 'flow' : id.includes('node_modules/antd') || id.includes('node_modules/@ant-design') ? 'ui' : id.includes('node_modules/react') ? 'react' : undefined } } },
  };
});
