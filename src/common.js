let timestamp2Str = ts => {
    if (ts < 10000) {
        return "N/A";
    }
    try {
        if (ts) {
            var time = new Date(ts);
            var y = time.getFullYear();
            var M = time.getMonth() + 1;
            var d = time.getDate();
            var h = time.getHours();
            var m = time.getMinutes();
            var s = time.getSeconds();
            return y + '-' + addZero(M) + '-' + addZero(d) + ' ' + addZero(h) + ':' + addZero(m) + ':' + addZero(s);
        } else {
            return '';
        }
    }catch (e) {
        return "N/A";
    }
};

function addZero(m) {
    return m < 10 ? '0' + m : m;
}

export default {
    timestamp2Str
}
