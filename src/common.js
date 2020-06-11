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

let translateInstanceStatus = status => {
    console.log("zzzzzzzz %o", status);
    switch (status) {
        case 1: return this.$t('message.waitingDispatch');
        case 2: return this.$t('message.waitingWorkerReceive');
        case 3: return this.$t('message.running');
        case 4: return this.$t('message.failed');
        case 5: return this.$t('message.success');
        case 10: return this.$t('message.stopped');
        default: return "unknown";
    }
};

let translteWfInstanceStatus = status => {
    switch (status) {
        case 1: return this.$t('message.wfWaiting');
        case 2: return this.$t('message.running');
        case 3: return this.$t('message.failed');
        case 4: return this.$t('message.success');
        case 10: return this.$t('message.stopped');
        default: return "unknown";
    }
};

function addZero(m) {
    return m < 10 ? '0' + m : m;
}

export default {
    timestamp2Str,
    translateInstanceStatus,
    translteWfInstanceStatus
}
