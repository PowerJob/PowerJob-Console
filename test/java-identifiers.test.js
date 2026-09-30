import { describe, expect, it } from 'vitest'
import { validJavaPackage } from '../src/services/java-identifiers.js'

describe('Compilable template package names', () => {
  it.each(['com.example.processors', '组织.任务', 'com.$generated._internal', '£currency.example', 'com.var'])('preserves valid Java package %s', value => {
    expect(validJavaPackage(value, '8')).toBe(true)
    expect(validJavaPackage(value, '11')).toBe(true)
  })
  it.each(['', '.com', 'com.', 'com..example', 'com.two words', 'com.123', 'com.example-name', 'com.class', 'com.null', 'com.true', 'com/example', 'com.😀'])('rejects non-compilable package %s', value => {
    expect(validJavaPackage(value)).toBe(false)
  })
  it('allows the Java 8 underscore identifier and enforces its Java 11 keyword rule', () => {
    expect(validJavaPackage('com._', '8')).toBe(true)
    expect(validJavaPackage('com._', '11')).toBe(false)
  })
})
