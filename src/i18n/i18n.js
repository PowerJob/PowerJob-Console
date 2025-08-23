import { createI18n } from 'vue-i18n'
import messages from './langs'

//从localStorage中拿到用户的语言选择，如果没有，那默认中文。
const i18n = createI18n({
    legacy: false,
    locale: localStorage.getItem('oms_lang') || 'cn',
    messages,
});

export default i18n
