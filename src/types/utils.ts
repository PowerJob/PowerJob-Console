/**
 * 工具类型定义
 */

/** 深度只读 */
export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K]
}

/** 可选字段 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/** 必选字段 */
export type RequiredFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: T[P] }

/** 提取函数参数类型 */
export type ExtractParams<T> = T extends (...args: infer P) => unknown ? P : never

/** 提取 Promise 返回类型 */
export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> = Awaited<
  ReturnType<T>
>

/** 非空类型 */
export type NonNullable<T> = T extends null | undefined ? never : T

/** 键名转换为驼峰 */
export type CamelCase<S extends string> = S extends `${infer P}_${infer Q}`
  ? `${P}${Capitalize<CamelCase<Q>>}`
  : S

/** 键名转换为下划线 */
export type SnakeCase<S extends string> = S extends `${infer C}${infer Rest}`
  ? `${C extends Uppercase<C> ? '_' : ''}${Lowercase<C>}${SnakeCase<Rest>}`
  : S

/** 对象键名转换 */
export type CamelCaseKeys<T> = {
  [K in keyof T as CamelCase<string & K>]: T[K]
}

/** 提取对象键类型 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never
}[keyof T]

/** 可为空的类型 */
export type Nullable<T> = T | null

/** 可为 undefined 的类型 */
export type Undefinable<T> = T | undefined
