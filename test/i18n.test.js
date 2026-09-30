import { describe, it, expect } from 'vitest'
import { createI18n } from 'vue-i18n'
import messages from '../src/i18n/langs/index.js'

describe('All released language messages compile under Vue I18n 11', () => {
  for (const locale of ['cn','en']) {
    it(`renders every ${locale} message without an invalid plural/interpolation error`, () => {
      const i18n = createI18n({legacy:false,locale,messages,missingWarn:false,fallbackWarn:false})
      for (const key of Object.keys(messages[locale].message)) {
        expect(() => i18n.global.t(`message.${key}`, {name:'Synthetic object'}), key).not.toThrow()
      }
      expect(i18n.global.t('message.more')).toBe(locale === 'en' ? 'More' : '更多')
    })
  }
})
