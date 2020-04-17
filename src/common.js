let timestamp2Str = ts => {
    if (ts < 10000) {
        return "N/A";
    }
    try {
        let date = new Date(ts);
        let Y = date.getFullYear() + '-';
        let M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) + '-';
        let D = date.getDate() + ' ';
        let h = date.getHours() + ':';
        let m = date.getMinutes() + ':';
        let s = date.getSeconds();
        return  Y+M+D+h+m+s;
    }catch (e) {
        return "N/A";
    }
};

export default {
    timestamp2Str
}
