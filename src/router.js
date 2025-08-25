import { createRouter, createWebHashHistory } from 'vue-router'
import Console from "./components/Console";
import AdminConsole from "./components/admin/AdminConsole.vue";

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: "/", redirect: '/loginHomepage' },
        { path: "/loginHomepage", component: () => import('./components/login/LoginHomepage.vue') },
        { path: "/powerjobLogin", name: 'PowerJobThirdPartyLogin', component: () => import('./components/login/PowerJobThirdPartyLogin.vue') },
        {
            path: "/oms", component: Console, redirect: "/oms/home", children: [
                // 二级路由
                { path: "/oms/home", meta: { titleKey: 'message.routeHome' }, component: () => import('./components/views/Home') },
                { path: "/oms/job", meta: { titleKey: 'message.routeJobManage' }, component: () => import('./components/views/JobManager') },
                { path: "/oms/instance", name: "instanceManager", meta: { titleKey: 'message.routeInstanceManage' }, component: () => import('./components/views/InstanceManager') },
                { path: "/oms/workflow", meta: { titleKey: 'message.routeWorkflowManage' }, component: () => import('./components/views/WorkflowManager') },
                { path: "/oms/wfinstance", meta: { titleKey: 'message.routeWfInstanceManage' }, component: () => import('./components/views/WFInstanceManager') },
                { path: "/oms/template", meta: { titleKey: 'message.routeTemplateGenerate' }, component: () => import('./components/views/ContainerTemplate') },
                { path: "/oms/containermanage", meta: { titleKey: 'message.routeContainerManage' }, component: () => import('./components/views/ContainerManager') },

                { path: "/oms/wfInstanceDetail/:wfInstanceId", name: "WorkflowInstanceDetail", meta: { titleKey: 'message.routeWfInstanceDetail' }, component: () => import('./components/dag/WorkflowInstanceDetail') },
                { path: "/oms/workflowEditor", name: "workflowEditor", meta: { titleKey: 'message.routeWorkflowEditor' }, component: () => import('./components/dag/WorkflowEditor') }
            ]
        },

        // 管理后台
        {
            path: "/admin", component: AdminConsole, redirect: "/admin/app", children: [
                // 二级路由
                { path: "/admin/app", meta: { titleKey: 'message.routeAppManage' }, component: () => import('./components/admin/AppManager.vue') },
                { path: "/admin/namespace", meta: { titleKey: 'message.routeNamespace' }, component: () => import('./components/admin/NamespaceManager.vue') },
                { path: "/admin/personal", meta: { titleKey: 'message.routePersonalSettings' }, component: () => import('./components/admin/UserCenter.vue') },
                { path: "/admin/settings", meta: { titleKey: 'message.routeSystemSettings' }, component: () => import('./components/admin/Settings.vue') },
                { path: "/admin/user", meta: { titleKey: 'message.routeUserManage' }, component: () => import('./components/admin/UserManager.vue') }

            ]
        },

        // 调试用
        { path: "/sidebar", component: () => import('./components/bar/Sidebar') },
        { path: "/navbar", component: () => import('./components/bar/Navbar') },
    ]
});

// 默认导出，供 main.js 引入，作为项目的路由器
export default router;
