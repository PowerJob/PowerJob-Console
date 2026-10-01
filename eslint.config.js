import vue from 'eslint-plugin-vue'
import ts from 'typescript-eslint'
export default [{ignores:['dist/**','node_modules/**']},...vue.configs['flat/essential'],{files:['src/**/*.ts','tests/**/*.ts'],languageOptions:{parser:ts.parser,parserOptions:{ecmaVersion:'latest',sourceType:'module'}}},{files:['src/**/*.vue'],languageOptions:{parserOptions:{parser:ts.parser,ecmaVersion:'latest',sourceType:'module'}},rules:{'vue/multi-word-component-names':'off','vue/valid-v-model':'error','vue/no-mutating-props':'error'}}]
