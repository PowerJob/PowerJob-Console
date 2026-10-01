import { describe,it,expect } from 'vitest'
import { validPackage,containerDraft,deploymentState } from '../../src/features/containers/model'
describe('container sources and deploy receipts',()=>{
 it('retains existing FatJar and unknown metadata across independent drafts',()=>{
  const source={id:'9223372036854775806',sourceType:'FatJar',containerName:'synthetic',sourceInfo:'abcdef',version:'x',future:null},draft=containerDraft(source)
  expect(draft.artifact).toBe('abcdef');expect(draft.draft).toEqual(source);draft.draft.containerName='changed';expect(source.containerName).toBe('synthetic')
 })
 it('preserves unknown Git source fields while avoiding cross-draft credentials',()=>{
  const source={sourceType:'Git',sourceInfo:JSON.stringify({repo:'https://example.invalid/fixture.git',branch:'main',username:'synthetic',password:'synthetic-only',future:false})}
  expect(containerDraft(source).git).toEqual({repo:'https://example.invalid/fixture.git',branch:'main',username:'synthetic',password:'synthetic-only',future:false});expect(containerDraft().git.username).toBe('');expect(()=>containerDraft({sourceType:'Git',sourceInfo:'[]'})).toThrow()
 })
 it.each(['[ERROR] build error','BUILD FAILURE','deploy lock failed','deploy failed'])('does not hide a %s with a later completion message',message=>{
  const failed=deploymentState('running',message);expect(failed).toBe('error');expect(deploymentState(failed,'deploy finished, congratulations!')).toBe('error');expect(deploymentState('running','deploy finished, congratulations!')).toBe('success')
 })
 it.each(['com.example','tech.处理器','currency.$name','under_score._'])('validates Java 8/11 package %s with their identifier rules',value=>{
  expect(validPackage(value,'8')).toBe(true);expect(validPackage(value,'11')).toBe(value!=='under_score._')
 })
 it.each(['','com..example','.leading','com.class','com.true','com.123name','com.a-b','com.name/other'])('rejects invalid package %s',value=>expect(validPackage(value,'8')).toBe(false))
})
