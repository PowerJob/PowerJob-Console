<template>
  <div class="code-edit">
    <div v-if="!readOnly" class="code-toolbar"><label>{{ $t('message.workflowCodeLanguage') }}</label><el-select v-model="language" size="small" style="width:130px" @change="setLanguage"><el-option label="Groovy" value="java" /><el-option label="JavaScript" value="javascript" /><el-option label="JSON" value="json" /></el-select></div>
    <div ref="container" class="monaco-container" />
  </div>
</template>
<script>
import { markRaw } from 'vue';
import * as monaco from 'monaco-editor/editor/editor.api.js';
import 'monaco-editor/languages/definitions/javascript/register.js';
import 'monaco-editor/languages/definitions/java/register.js';
import 'monaco-editor/languages/features/json/register.js';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import JsonWorker from 'monaco-editor/languages/features/json/json.worker.js?worker';
globalThis.MonacoEnvironment = { getWorker(_module, label) { return label === 'json' ? new JsonWorker() : new EditorWorker(); } };
export default {
  name: 'JSEditor',
  props: { code: { type: String, default: '' }, editorOptions: { type: Object, default: () => ({}) } },
  emits: ['onCodeChange'],
  data() { return { editor: null, model: null, subscription: null, language: 'java', syncing: false }; },
  computed: { readOnly() { return !!this.editorOptions.readOnly; } },
  mounted() {
    this.model = markRaw(monaco.editor.createModel(this.code || '', this.language));
    this.editor = markRaw(monaco.editor.create(this.$refs.container, { model: this.model, theme: 'vs', automaticLayout: true, minimap: { enabled: false }, fontSize: 13, tabSize: 2, scrollBeyondLastLine: false, wordWrap: 'on', lineNumbersMinChars: 3, padding: { top: 12, bottom: 12 }, ...this.editorOptions }));
    this.subscription = markRaw(this.editor.onDidChangeModelContent(() => { if (!this.syncing) this.$emit('onCodeChange', this.editor.getValue()); }));
  },
  beforeUnmount() { this.subscription?.dispose(); this.editor?.dispose(); this.model?.dispose(); },
  methods: { setLanguage() { if (this.model) monaco.editor.setModelLanguage(this.model, this.language); } },
  watch: {
    code(value) { if (this.editor && (value || '') !== this.editor.getValue()) { this.syncing = true; this.editor.setValue(value || ''); this.syncing = false; } },
    editorOptions: { deep: true, handler(value) { this.editor?.updateOptions(value); } },
  },
};
</script>
<style scoped>
.code-edit { border:1px solid var(--el-border-color); border-radius:10px; overflow:hidden; }
.code-toolbar { display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:var(--el-fill-color-light); font-size:12px; color:var(--el-text-color-secondary); }
.monaco-container { height:300px; }
</style>
