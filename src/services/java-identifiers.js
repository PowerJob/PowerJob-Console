const reserved = new Set('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null'.split(' '))
const identifier = /^[\p{L}\p{Nl}\p{Sc}\p{Pc}$][\p{L}\p{Nl}\p{Sc}\p{Pc}\p{Mn}\p{Mc}\p{Nd}\p{Cf}$]*$/u

export function validJavaPackage(value, javaVersion = '8') {
  return typeof value === 'string' && value.length > 0 && value.split('.').every(part => identifier.test(part) && !reserved.has(part) && !(String(javaVersion) !== '8' && part === '_'))
}
