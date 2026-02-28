/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    // 扫描 power-workflow-next 源码中的 Tailwind 类
    "../power-workflow-next/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#6B7280',
        success: '#52C41A',
        warning: '#F59E0B',
        error: '#EF4444',
        background: '#F9FAFB',
      }
    },
  },
  plugins: [],
  // 避免与 Element Plus 样式冲突
  corePlugins: {
    preflight: false,
  },
}
