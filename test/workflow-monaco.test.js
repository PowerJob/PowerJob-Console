import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { isProxy } from 'vue';
const mocks = vi.hoisted(() => ({ create:vi.fn(),createModel:vi.fn(),setModelLanguage:vi.fn(),worker:vi.fn() }));
vi.mock('monaco-editor/editor/editor.api.js',()=>({editor:{create:mocks.create,createModel:mocks.createModel,setModelLanguage:mocks.setModelLanguage}}));
vi.mock('monaco-editor/languages/definitions/javascript/register.js',()=>({}));
vi.mock('monaco-editor/languages/definitions/java/register.js',()=>({}));
vi.mock('monaco-editor/languages/features/json/register.js',()=>({}));
vi.mock('monaco-editor/editor/editor.worker.js?worker',()=>({default:class{constructor(){mocks.worker('editor');}}}));
vi.mock('monaco-editor/languages/features/json/json.worker.js?worker',()=>({default:class{constructor(){mocks.worker('json');}}}));
import JSEditor from '../src/components/dag/JSEditor.vue';
let editor, model, listener, content;
beforeEach(()=>{
  content='';listener=null;
  model={dispose:vi.fn()};
  editor={getValue:()=>content,setValue:vi.fn(value=>{content=value;listener?.();}),updateOptions:vi.fn(),dispose:vi.fn(),onDidChangeModelContent:vi.fn(fn=>{listener=fn;return{dispose:vi.fn()};})};
  mocks.createModel.mockImplementation(value=>{content=value;return model;});
  mocks.create.mockReturnValue(editor);
});
const global={mocks:{$t:key=>key},stubs:{ElSelect:true,ElOption:true}};
describe('Monaco native lifecycle',()=>{
  it('creates raw editors and passes read-only mode instead of discarding it',()=>{const wrapper=shallowMount(JSEditor,{props:{code:'true',editorOptions:{readOnly:true}},global});expect(mocks.create).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({readOnly:true,automaticLayout:true}));expect(isProxy(wrapper.vm.editor)).toBe(false);expect(isProxy(wrapper.vm.model)).toBe(false);expect(wrapper.find('.code-toolbar').exists()).toBe(false);wrapper.unmount();});
  it('emits user edits but does not echo a parent code update as a user edit',async()=>{const wrapper=shallowMount(JSEditor,{props:{code:'true'},global});content='return false';listener();expect(wrapper.emitted('onCodeChange')).toEqual([['return false']]);await wrapper.setProps({code:'return true'});expect(editor.setValue).toHaveBeenCalledWith('return true');expect(wrapper.emitted('onCodeChange')).toHaveLength(1);wrapper.unmount();});
  it('updates read-only mode, switches syntax languages and disposes model/editor/listeners',async()=>{const wrapper=shallowMount(JSEditor,{props:{code:'true'},global});await wrapper.setProps({editorOptions:{readOnly:true}});expect(editor.updateOptions).toHaveBeenCalledWith({readOnly:true});wrapper.vm.language='json';wrapper.vm.setLanguage();expect(mocks.setModelLanguage).toHaveBeenCalledWith(model,'json');const subscription=wrapper.vm.subscription;wrapper.unmount();expect(subscription.dispose).toHaveBeenCalledTimes(1);expect(editor.dispose).toHaveBeenCalledTimes(1);expect(model.dispose).toHaveBeenCalledTimes(1);});
  it('uses isolated Editor and JSON workers through Vite',()=>{globalThis.MonacoEnvironment.getWorker(null,'json');globalThis.MonacoEnvironment.getWorker(null,'groovy');expect(mocks.worker).toHaveBeenCalledWith('json');expect(mocks.worker).toHaveBeenCalledWith('editor');});
});
