<template>
  <div class="code-edit">
    <MonacoEditor
      :code="code"
      :key="mainKey"
      theme="vs"
      :height="300"
      :editorOptions="options"
      @mounted="onMounted"
      @codeChange="onCodeChange"
    >

    </MonacoEditor>
  </div>
</template>
<script>
import MonacoEditor from "vue-monaco-editor";
export default {
  name: 'WorkflowEditor',
  components: { MonacoEditor },
  props: ['code', 'mainKey', ],
  data() {
    return {
      /** 代码组件 */
      editor: null,
      options: {
        selectOnLineNumbers: false,
      },
      randomkey: 1231231,
    }
  },
  methods: {
    onMounted(editor) {
      this.editor = editor;
    },
    onCodeChange() {
      this.$emit('onCodeChange', this.editor.getValue());
    },
  }
}
</script>
<style scoped>
.code-edit {
  border: 1px solid #f0f0f0;
}
</style>

