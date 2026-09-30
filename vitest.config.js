import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: { extensions: ['.js', '.json', '.vue'] },
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.js'],
    restoreMocks: true,
    clearMocks: true,
  },
})
