const js = require('@eslint/js')
const pluginVue = require('eslint-plugin-vue')
const tseslint = require('typescript-eslint')
const importX = require('eslint-plugin-import-x')

module.exports = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    plugins: {
      'import-x': importX
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'writable',
        global: 'readonly',
        defineEmits: 'readonly',
        defineProps: 'readonly',
        defineExpose: 'readonly',
        withDefaults: 'readonly',
        computed: 'readonly',
        ref: 'readonly',
        reactive: 'readonly',
        watch: 'readonly',
        watchEffect: 'readonly',
        onMounted: 'readonly',
        onUnmounted: 'readonly',
        onBeforeUnmount: 'readonly',
        nextTick: 'readonly',
        provide: 'readonly',
        inject: 'readonly',
        useSlots: 'readonly',
        useAttrs: 'readonly'
      },
      parserOptions: {
        parser: tseslint.parser
      }
    },
    rules: {
      // TypeScript 规则
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/ban-ts-comment': 'off',

      // Vue 规则
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'vue/require-default-prop': 'off',
      'vue/require-explicit-emits': 'warn',
      'vue/no-setup-props-reactivity-loss': 'warn',

      // Import 规则
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'never',
          alphabetize: { order: 'asc', caseInsensitive: true }
        }
      ],
      'import-x/no-duplicates': 'error',
      'import-x/no-unresolved': 'off',
      'import-x/named': 'off',

      // 通用规则
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always']
    }
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser
      }
    }
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.local',
      '*.log*',
      '.vscode/**',
      '!.vscode/extensions.json',
      '!.vscode/settings.json',
      'public/**',
      '.worktrees/**',
      'eslint.config.js',
      'commitlint.config.cjs',
      'postcss.config.js',
      'vite.config.ts'
    ]
  }
)
