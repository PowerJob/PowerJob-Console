import { mount,flushPromises } from '@vue/test-utils'
import { defineComponent,h,ref,nextTick } from 'vue'
import { beforeEach,afterEach,it,expect,vi } from 'vitest'
import Field from '../../src/shared/Field.vue'
import Modal from '../../src/shared/Modal.vue'
import Logs from '../../src/features/instances/Logs.vue'
import { setLocale } from '../../src/core/ui'
const mocks=vi.hoisted(()=>({api:vi.fn(),saveBlob:vi.fn()}))
vi.mock('../../src/core/api',()=>mocks)
beforeEach(()=>{setLocale('en');mocks.api.mockReset();mocks.saveBlob.mockReset();document.body.innerHTML=''})
afterEach(()=>vi.useRealTimers())
it('links the visible field name to the native control and keeps hints/buttons out of its name',async()=>{
 const wrapper=mount(Field,{props:{label:'Password',hint:'Use your account password',required:true},slots:{default:()=>h('span',[h('input',{type:'password'}),h('button','Show')])},attachTo:document.body})
 await nextTick();const input=wrapper.get('input').element as HTMLInputElement
 expect(input.labels?.[0]?.htmlFor).toBe(input.id);expect(document.getElementById(input.getAttribute('aria-labelledby')!)?.textContent).toBe('Password');expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe('Use your account password');wrapper.unmount()
})
it('maintains native dialog open/close lifecycle and exposes the actual title',async()=>{
 const parent=defineComponent({components:{Modal},setup(){return {open:ref(true)}},template:'<Modal v-model="open" title="Synthetic operation"><input aria-label="Field"/></Modal>'})
 const wrapper=mount(parent,{attachTo:document.body});await flushPromises()
 const dialog=document.querySelector('dialog')!
 expect(dialog.open).toBe(true);expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Synthetic operation')
 dialog.dispatchEvent(new Event('cancel',{cancelable:true}));await flushPromises();expect(dialog.open).toBe(false);expect(wrapper.findComponent(Modal).emitted('closed')?.length).toBe(1);wrapper.unmount()
})
it('closes a dialog when its parent changes state programmatically',async()=>{
 const wrapper=mount(Modal,{props:{modelValue:true,title:'Synthetic'},attachTo:document.body});await flushPromises();await wrapper.setProps({modelValue:false});await flushPromises()
 expect(document.querySelector('dialog')!.open).toBe(false);expect(wrapper.emitted('closed')?.length).toBe(1);wrapper.unmount()
})
it('aborts previous log requests and rejects delayed data when switching instance IDs',async()=>{
 const pending:{resolve:(value:unknown)=>void;signal:AbortSignal}[]=[]
 mocks.api.mockImplementation((_path:string,options:{signal:AbortSignal})=>new Promise(resolve=>pending.push({resolve,signal:options.signal})))
 const wrapper=mount(Logs,{props:{instanceId:'9223372036854775806'}});await wrapper.setProps({instanceId:'9223372036854775807'})
 expect(pending[0].signal.aborted).toBe(true)
 pending[1].resolve({data:'new instance log',totalPages:2});await flushPromises();pending[0].resolve({data:'stale old instance',totalPages:9});await flushPromises()
 expect(wrapper.get('pre').text()).toBe('new instance log');expect(wrapper.text()).not.toContain('stale old instance');wrapper.unmount();expect(pending[1].signal.aborted).toBe(true)
})
it('stops log polling and in-progress downloads on unmount without saving a late blob',async()=>{
 vi.useFakeTimers();mocks.api.mockImplementation((path:string)=>path.endsWith('downloadLog4Console')?new Promise(()=>{}):Promise.resolve({data:'synthetic',totalPages:1}))
 const wrapper=mount(Logs,{props:{instanceId:'99'}});await flushPromises();await wrapper.get('input[type="checkbox"]').setValue(true);await vi.advanceTimersByTimeAsync(5000);expect(mocks.api).toHaveBeenCalledTimes(2)
 await wrapper.findAll('button').find(button=>button.text()==='Download logs')!.trigger('click');const downloadOptions=mocks.api.mock.calls.at(-1)![1]
 expect(downloadOptions.timeout).toBe(75000);wrapper.unmount();expect(downloadOptions.signal.aborted).toBe(true);await vi.advanceTimersByTimeAsync(15000);expect(mocks.api).toHaveBeenCalledTimes(3);expect(mocks.saveBlob).not.toHaveBeenCalled()
})
