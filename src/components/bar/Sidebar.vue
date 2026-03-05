<!--
* 官方文档：https://element.eleme.cn/#/zh-CN/component/menu ，阅读底部属性说明即可
* 该组件内部包括了侧边栏和主显示区域（以router-view的形式声明，在router.js中通过component: () => import('./components/Home')的方式导入）
-->
<template>
    <div id="sidebar">
        <el-container class="left-container">
            <!--侧边栏容器-->
            <el-aside width="220px" class="sidebar-aside">
                <!-- 菜单 -->
                <el-menu :router="true" :default-active="default_active_index" class="aside" :collapse="false">
                    <!-- vue router，实现点击跳转 -->
                    <el-menu-item index="/oms/home">
                        <template #title>
                            <!-- 图标 + 文字 -->
                            <el-icon><Monitor /></el-icon>
                            <span>{{$t('message.tabHome')}}</span>
                        </template>
                    </el-menu-item>

                    <el-menu-item index="/oms/job">
                        <template #title>
                            <!-- 图标 + 文字 -->
                            <el-icon><DataAnalysis /></el-icon>
                            <span>{{$t('message.tabJobManage')}}</span>
                        </template>
                    </el-menu-item>

                    <el-menu-item index="/oms/instance">
                        <template #title>
                            <!-- 图标 + 文字 -->
                            <el-icon><DataBoard /></el-icon>
                            <span>{{$t('message.tabJobInstance')}}</span>
                        </template>
                    </el-menu-item>

                    <el-menu-item index="/oms/workflow">
                        <template #title>
                            <!-- 图标 + 文字 -->
                            <el-icon><Share /></el-icon>
                            <span>{{$t('message.tabWorkflowManage')}}</span>
                        </template>
                    </el-menu-item>

                    <el-menu-item index="/oms/wfinstance">
                        <template #title>
                            <!-- 图标 + 文字 -->
                            <el-icon><Operation /></el-icon>
                            <span>{{$t('message.tabWfInstance')}}</span>
                        </template>
                    </el-menu-item>


                    <el-sub-menu index="/oms/container">
                        <template #title>
                            <el-icon><Present /></el-icon>
                            <span>{{$t('message.tabContainerOps')}}</span>
                        </template>
                        <el-menu-item index="/oms/template">{{$t('message.tabTemplate')}}</el-menu-item>
                        <el-menu-item index="/oms/containermanage">{{$t('message.tabContainerManager')}}</el-menu-item>
                    </el-sub-menu>

                </el-menu>
            </el-aside>
        </el-container>

        <!-- 功能区 -->
        <div class="wrap">
            <router-view/>
        </div>
    </div>
</template>

<script>
import { Monitor, DataAnalysis, DataBoard, Share, Operation, Present } from '@element-plus/icons-vue'

export default {
        name: "Sidebar",
        components: {
            Monitor,
            DataAnalysis,
            DataBoard,
            Share,
            Operation,
            Present
        },
        computed: {
            default_active_index() {
                return this.$route?.path || '/oms/home'
            }
        }
    }
</script>
<style scoped lang="scss">
@import '../../styles/shared/sidebar.scss';

#sidebar {
    @extend .sidebar-container;
}

.left-container {
    @extend .sidebar-left-container;
}

.sidebar-aside {
    @extend .sidebar-aside;
}

.aside {
    @extend .sidebar-menu;
}

.wrap {
    @extend .sidebar-wrap;
}

/* 应用 Menu 深度样式 */
:deep(.el-menu) {
    @include sidebar-menu-deep;
}

/* 应用悬光动效 */
@include sidebar-shine-effect;

/* 应用响应式样式 */
@include sidebar-responsive;

/* el-aside 宽度确保 */
:deep(.el-aside) {
    width: var(--pj-sidebar-width) !important;
    max-width: var(--pj-sidebar-width) !important;
    min-width: var(--pj-sidebar-width) !important;
    flex: 0 0 var(--pj-sidebar-width) !important;
}
</style>
