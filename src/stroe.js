import Vue from "vue"
import Vuex from "vuex"

Vue.use(Vuex);

const store = new Vuex.Store({
    state: {
        appId: ""
    },
    mutations: {
        setAppId(state, appId) {
            state.appId = appId;
        }
    }
});

export default store;
