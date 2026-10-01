import { clone } from '../../core/ui'
import type { Entity } from '../../core/session'
const javaKeywords=new Set('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null'.split(' '))
export function validPackage(value:string,javaVersion:string){
 const identifier=/^[\p{L}\p{Nl}\p{Sc}\p{Pc}][\p{L}\p{Nl}\p{Sc}\p{Pc}\p{Mn}\p{Mc}\p{Nd}\p{Cf}]*$/u
 return !!value&&value.split('.').every(part=>identifier.test(part)&&!javaKeywords.has(part)&&!(javaVersion!=='8'&&part==='_'))
}
export function containerDraft(item?:Entity){
 const draft=clone(item||{sourceType:'Git',containerName:'',status:'ENABLE'})
 const source={repo:'',branch:'',username:'',password:''}
 if(draft.sourceType==='Git'&&draft.sourceInfo){const data=JSON.parse(draft.sourceInfo);if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid Git configuration');Object.assign(source,data)}
 return {draft,git:source,artifact:draft.sourceType==='FatJar'?draft.sourceInfo||'':''}
}
export function deploymentState(previous:string,message:string){
 if(/\[ERROR\]|BUILD FAILURE|deploy (?:lock )?failed/i.test(message))return 'error'
 if(previous!=='error'&&/deploy finished, congratulations/i.test(message))return 'success'
 return previous
}
