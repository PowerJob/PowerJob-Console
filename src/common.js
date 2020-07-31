import i18n from "./i18n/i18n";

let timestamp2Str = ts => {
    if (ts < 10000) {
        return "N/A";
    }
    try {
        if (ts) {
            let time = new Date(ts);
            let y = time.getFullYear();
            let M = time.getMonth() + 1;
            let d = time.getDate();
            let h = time.getHours();
            let m = time.getMinutes();
            let s = time.getSeconds();
            return y + '-' + addZero(M) + '-' + addZero(d) + ' ' + addZero(h) + ':' + addZero(m) + ':' + addZero(s);
        } else {
            return '';
        }
    }catch (e) {
        return "N/A";
    }
};

// 公共函数，涉及到 i18n ，放进 common.js 报错，暂时先放在这里吧
let translateInstanceStatus = status => {
    switch (status) {
        case 1: return i18n.t('message.waitingDispatch');
        case 2: return i18n.t('message.waitingWorkerReceive');
        case 3: return i18n.t('message.running');
        case 4: return i18n.t('message.failed');
        case 5: return i18n.t('message.success');
        case 9: return i18n.t('message.canceled');
        case 10: return i18n.t('message.stopped');
        default: return "unknown";
    }
};

let translateWfInstanceStatus = status => {
    switch (status) {
        case 1: return i18n.t('message.wfWaiting');
        case 2: return i18n.t('message.running');
        case 3: return i18n.t('message.failed');
        case 4: return i18n.t('message.success');
        case 10: return i18n.t('message.stopped');
        default: return "unknown";
    }
};

// 更换语言
let switchLanguage = cmd => {
    console.log("switch language to %o", cmd);
    i18n.locale = cmd;
    // 存储到LangStorage
    window.localStorage.setItem('oms_lang', cmd)
};

function addZero(m) {
    return m < 10 ? '0' + m : m;
}

export default {
    timestamp2Str,
    translateInstanceStatus,
    translateWfInstanceStatus,
    switchLanguage
}
