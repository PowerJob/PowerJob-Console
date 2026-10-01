import { createRouter, createWebHashHistory } from 'vue-router'
import { session } from './session'

export const router = createRouter({history:createWebHashHistory(),routes:[
  {path:'/',redirect:'/loginHomepage'},
  {path:'/loginHomepage',component:() => import('../features/auth/AuthLanding.vue')},
  {path:'/powerjobLogin',component:() => import('../features/auth/AuthForm.vue')},
  {path:'/admin',redirect:'/admin/app'},
  {path:'/admin/app',component:() => import('../features/admin/Applications.vue')},
  {path:'/admin/namespace',component:() => import('../features/admin/Namespaces.vue')},
  {path:'/admin/user',component:() => import('../features/admin/Users.vue')},
  {path:'/admin/personal',component:() => import('../features/admin/Profile.vue')},
  {path:'/admin/settings',component:() => import('../features/admin/Settings.vue')},
  {path:'/oms',redirect:'/oms/home'},
  {path:'/oms/home',component:() => import('../features/overview/Overview.vue')},
  {path:'/oms/job',component:() => import('../features/jobs/Jobs.vue')},
  {path:'/oms/instance',name:'instanceManager',component:() => import('../features/instances/Instances.vue')},
  {path:'/oms/workflow',component:() => import('../features/workflows/Workflows.vue')},
  {path:'/oms/workflowEditor',name:'workflowEditor',component:() => import('../features/workflows/WorkflowEditor.vue')},
  {path:'/oms/wfinstance',component:() => import('../features/workflows/WorkflowInstances.vue')},
  {path:'/oms/wfInstanceDetail',name:'WorkflowInstanceDetail',component:() => import('../features/workflows/WorkflowInstance.vue')},
  {path:'/oms/template',component:() => import('../features/containers/Templates.vue')},
  {path:'/oms/containermanage',component:() => import('../features/containers/Containers.vue')},
  {path:'/sidebar',redirect:'/oms/home'},
  {path:'/navbar',redirect:'/admin/app'},
  {path:'/:pathMatch(.*)*',redirect:'/loginHomepage'},
]})
router.beforeEach(to => {
  if (/^\/(oms|admin)(\/|$)/.test(to.path) && !session.jwt) return '/loginHomepage'
  if (to.path.startsWith('/oms') && !session.appId) return '/admin/app'
})
