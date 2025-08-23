<template>
  <div class="code-edit">
    <div ref="monacoEditor" style="height: 300px; width: 100%;"></div>
  </div>
</template>
<script>
import loader from '@monaco-editor/loader';

export default {
  name: 'WorkflowEditor',
  props: ['code'],
  data() {
    return {
      /** 代码组件 */
      editor: null,
      options: {
        selectOnLineNumbers: false,
        theme: 'vs',
        language: 'javascript',
        value: this.code || ''
      },
      randomKey: 1231231,
    }
  },
  mounted() {
    this.initMonacoEditor();
  },
  beforeUnmount() {
    if (this.editor) {
      this.editor.dispose();
    }
  },
  methods: {
    async initMonacoEditor() {
      const monaco = await loader.init();
      this.editor = monaco.editor.create(this.$refs.monacoEditor, {
        ...this.options,
        value: this.code || ''
      });
      
      this.editor.onDidChangeModelContent(() => {
        this.$emit('onCodeChange', this.editor.getValue());
      });
      
      this.$emit('mounted', this.editor);
    },
    onMounted(editor) {
      this.editor = editor;
    },
    onCodeChange() {
      this.$emit('onCodeChange', this.editor.getValue());
    },
  },
  watch: {
    code(newCode) {
      if (this.editor && newCode !== this.editor.getValue()) {
        this.editor.setValue(newCode || '');
      }
    }
  }
}
</script>
<style>
.code-edit {
  border: 1px solid #f0f0f0;
}
.code-edit .margin-view-overlays.monaco-editor-background {
  width: 0px !important;
}
.code-edit .margin-view-overlays.monaco-editor-background .view-line .line-numbers {
  width: 24px !important;
  left: 0px !important;
}
.code-edit .margin-view-overlays.monaco-editor-background .glyph-margin {
  width: 0px !important;
}
.code-edit .monaco-scrollable-element.editor-scrollable {
  left: 32px !important;
}
</style>

