import Vue from "vue"
import Vuex from "vuex"

Vue.use(Vuex);

const store = new Vuex.Store({
    state: {
        // 包含两个属性：id和appName
        appInfo: {}
    },
    // 推荐使用 mutations 改变 store中的值，调用方法：this.$store.commit('initAppInfo', xxx)
    mutations: {
        initAppInfo(state, appInfo) {
            state.appInfo = appInfo;
        }
    }
});

export default store;
