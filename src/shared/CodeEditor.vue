<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import type * as Monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker'
const props = withDefaults(defineProps<{modelValue:string;language?:string;height?:number}>(),{language:'java',height:340})
const emit = defineEmits<{'update:modelValue':[value:string]}>()
const container = ref<HTMLElement>()
let editor:Monaco.editor.IStandaloneCodeEditor | undefined
let disposed = false
onMounted(async () => {
  const monaco = await import('monaco-editor/editor/editor.api.js')
  await import('monaco-editor/languages/definitions/java/register.js')
  if (disposed || !container.value) return
  ;(self as any).MonacoEnvironment = {getWorker:() => new EditorWorker()}
  editor = monaco.editor.create(container.value, {value:props.modelValue || '',language:props.language,automaticLayout:true,minimap:{enabled:false},fontSize:13,scrollBeyondLastLine:false})
  editor.onDidChangeModelContent(() => emit('update:modelValue',editor?.getValue() || ''))
})
watch(() => props.modelValue,value => { if (editor && editor.getValue()!==value) editor.setValue(value || '') })
onBeforeUnmount(() => { disposed = true; const model = editor?.getModel(); editor?.dispose(); model?.dispose() })
</script>
<template><div ref="container" class="code-editor" :style="{height:height+'px'}" role="group" aria-label="Code editor"/></template>
