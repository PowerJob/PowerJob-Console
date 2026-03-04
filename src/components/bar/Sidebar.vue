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
<style scoped>
    #sidebar {
        display: flex;
        height: calc(100vh - var(--pj-navbar-height));
    }
    
    .left-container {
        width: var(--pj-sidebar-width) !important;
        max-width: var(--pj-sidebar-width);
        min-width: var(--pj-sidebar-width);
        flex: 0 0 var(--pj-sidebar-width);
        background: var(--pj-bg-white);
        box-shadow: 2px 0 12px rgba(0, 0, 0, 0.06);
        border-right: 1px solid var(--pj-border-color, #e4e7ed);
        position: relative;
        z-index: 100;
    }
    
    .sidebar-aside {
        padding: var(--pj-space-sm) 0;
    }
    
    .aside {
        height: 100%;
        border-right: none !important;
        padding: 0 var(--pj-space-sm);
    }
    
    /* 确保 el-aside 组件不会过度扩展 */
    :deep(.el-aside) {
        width: var(--pj-sidebar-width) !important;
        max-width: var(--pj-sidebar-width) !important;
        min-width: var(--pj-sidebar-width) !important;
        flex: 0 0 var(--pj-sidebar-width) !important;
    }
    
    /* Menu Styling */
    :deep(.el-menu) {
        border-right: none;
        background: transparent;
        
        .el-menu-item {
            height: 52px;
            line-height: 52px;
            margin: 2px 0;
            padding: 0 var(--pj-space-md) !important;
            border-radius: var(--pj-radius-md);
            transition: background-color 0.25s ease, color 0.25s ease, transform 0.2s ease, box-shadow 0.25s ease;
            color: var(--pj-text-secondary);
            position: relative;
            
            &:hover {
                background: rgba(0, 150, 136, 0.08);
                background: color-mix(in srgb, var(--pj-primary) 8%, transparent);
                color: var(--pj-primary);
                transform: translateX(2px);
            }
            
            &.is-active {
                background: linear-gradient(135deg, rgba(0, 150, 136, 0.12), rgba(38, 166, 154, 0.08));
                background: color-mix(in srgb, var(--pj-primary) 12%, var(--pj-bg-white));
                color: var(--pj-primary);
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(0, 150, 136, 0.18);
                box-shadow: 0 2px 8px color-mix(in srgb, var(--pj-primary) 18%, transparent);
                
                &::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 4px;
                    height: 28px;
                    background: var(--pj-primary);
                    border-radius: 0 4px 4px 0;
                    animation: sidebar-accent-in 0.3s ease;
                }
                
                .el-icon {
                    color: var(--pj-primary);
                }
            }
            
            .el-icon {
                margin-right: var(--pj-space-sm);
                font-size: 18px;
                width: 18px;
                transition: color 0.25s ease;
            }
            
            span {
                font-size: 14px;
                font-weight: 500;
            }
        }
        
        .el-sub-menu {
            .el-sub-menu__title {
                height: 52px;
                line-height: 52px;
                margin: 2px 0;
                padding: 0 var(--pj-space-md) !important;
                border-radius: var(--pj-radius-md);
                color: var(--pj-text-secondary);
                transition: background-color 0.25s ease, color 0.25s ease, transform 0.2s ease;
                
                &:hover {
                    background: rgba(0, 150, 136, 0.08);
                    background: color-mix(in srgb, var(--pj-primary) 8%, transparent);
                    color: var(--pj-primary);
                    transform: translateX(2px);
                }
                
                .el-icon {
                    margin-right: var(--pj-space-sm);
                    font-size: 18px;
                    width: 18px;
                }
                
                span {
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .el-submenu__icon-arrow {
                    right: var(--pj-space-md);
                    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                }
            }
            
            &.is-opened .el-submenu__title .el-submenu__icon-arrow {
                transform: rotateZ(180deg);
            }
            
            .el-menu {
                background: #fafbfc;
                background: color-mix(in srgb, var(--pj-primary) 3%, var(--pj-bg-white));
                border-radius: var(--pj-radius-md);
                margin: 0 0 var(--pj-space-xs) 0;
                padding: var(--pj-space-xs) 0;
                
                .el-menu-item {
                    height: 44px;
                    line-height: 44px;
                    margin: 0 var(--pj-space-sm);
                    padding-left: 40px !important;
                    font-size: 13px;
                    border-radius: var(--pj-radius-sm);
                    transition: background-color 0.25s ease, color 0.25s ease;
                    
                    &:hover {
                        background: rgba(0, 150, 136, 0.06);
                        background: color-mix(in srgb, var(--pj-primary) 8%, transparent);
                        color: var(--pj-primary);
                    }
                    
                    &.is-active {
                        background: rgba(0, 150, 136, 0.12);
                        background: color-mix(in srgb, var(--pj-primary) 14%, var(--pj-bg-white));
                        color: var(--pj-primary);
                        font-weight: 600;
                        box-shadow: 0 1px 4px rgba(0, 150, 136, 0.15);
                        box-shadow: 0 1px 4px color-mix(in srgb, var(--pj-primary) 15%, transparent);
                        
                        &::before {
                            display: none;
                        }
                    }
                }
            }
        }
    }
    
    @keyframes sidebar-accent-in {
        from {
            opacity: 0;
            transform: translateY(-50%) scaleY(0.6);
        }
        to {
            opacity: 1;
            transform: translateY(-50%) scaleY(1);
        }
    }
    
    /* Main Content Area */
    .wrap {
        flex: 1;
        width: calc(100% - var(--pj-sidebar-width));
        background: var(--pj-bg-base);
        padding: var(--pj-container-padding);
        overflow-y: auto;
        position: relative;
        min-width: 0; /* 防止内容溢出 */
        display: flex;
        flex-direction: column;
    }
    .wrap > * {
        flex: 1;
        min-height: 0;
    }
    
    /* Enhanced Scrollbar */
    .wrap::-webkit-scrollbar {
        width: 6px;
    }
    
    .wrap::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
    }
    
    .wrap::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
        transition: background 0.3s ease;
    }
    
    .wrap::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
    }
    
    /* Responsive Design */
    @media (max-width: 1024px) {
        .left-container {
            width: 180px !important;
            max-width: 180px;
            min-width: 180px;
            flex: 0 0 180px;
        }
        
        :deep(.el-aside) {
            width: 180px !important;
            max-width: 180px !important;
            min-width: 180px !important;
            flex: 0 0 180px !important;
        }
        
        .wrap {
            width: calc(100% - 180px);
        }
    }
    
    @media (max-width: 768px) {
        #sidebar {
            flex-direction: column;
        }
        
        .left-container {
            width: 100%;
            height: auto;
            max-height: 200px;
            overflow-y: auto;
        }
        
        :deep(.el-menu) {
            display: flex;
            overflow-x: auto;
            
            .el-menu-item,
            .el-submenu .el-submenu__title {
                margin: 0 var(--pj-space-xs);
                min-width: 120px;
                text-align: center;
            }
        }
        
        .wrap {
            padding: var(--pj-space-md);
            width: 100%;
        }
    }
    
    /* 菜单项悬光动效（可选，与主色协调） */
    :deep(.el-menu-item):not(.is-active):hover,
    :deep(.el-sub-menu .el-sub-menu__title):hover {
        position: relative;
        overflow: hidden;
    }
    
    :deep(.el-menu-item):not(.is-active):hover::after,
    :deep(.el-sub-menu .el-sub-menu__title):hover::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 60%;
        height: 100%;
        background: linear-gradient(
            90deg,
            transparent,
            rgba(0, 150, 136, 0.14),
            transparent
        );
        animation: sidebar-shine 0.6s ease;
        pointer-events: none;
    }
    
    @keyframes sidebar-shine {
        from { left: -60%; }
        to { left: 100%; }
    }
</style>
