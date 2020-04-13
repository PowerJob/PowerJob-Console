import Vue from 'vue'
import VueRouter from 'vue-router'
import Console from "./components/Console";

Vue.use(VueRouter);

const router = new VueRouter({
    routes: [
        {
            path: "/oms", component: Console, redirect: "/oms/home", children: [
                // 二级路由
                { path: "/oms/home", meta: { title: '主页' }, component: () => import('./components/views/Home') },
                { path: "/oms/job", meta: { title: '任务管理' }, component: () => import('./components/views/JobManager') },
                { path: "/oms/instance", meta: { title: '实例管理' }, component: () => import('./components/views/InstanceManager') },
            ]
        },
        // 调试用
        { path: "/sidebar", component: () => import('./components/bar/Sidebar') },
        { path: "/navbar", component: () => import('./components/bar/Navbar') },
    ]
});

// 默认导出，供 main.js 引入，作为项目的路由器
export default router;
