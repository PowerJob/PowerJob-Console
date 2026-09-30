import vue from 'eslint-plugin-vue'

export default [
  { ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'] },
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.{js,vue}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-mutating-props': ['error', { shallowOnly: true }],
    },
  },
]
