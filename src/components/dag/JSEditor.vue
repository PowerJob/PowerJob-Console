<template>
  <div class="code-edit">
    <MonacoEditor
      :code="code"
      :key="randomKey"
      theme="vs"
      :height="300"
      :options="options"
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
  props: ['code'],
  data() {
    return {
      /** 代码组件 */
      editor: null,
      options: {
        selectOnLineNumbers: false,
      },
      randomKey: 1231231,
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

