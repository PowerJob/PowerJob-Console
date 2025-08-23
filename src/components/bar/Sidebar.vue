<!--
* 官方文档：https://element.eleme.cn/#/zh-CN/component/menu ，阅读底部属性说明即可
* 该组件内部包括了侧边栏和主显示区域（以router-view的形式声明，在router.js中通过component: () => import('./components/Home')的方式导入）
-->
<template>
    <div id="sidebar">
        <el-container class="left-container">
            <!--侧边栏容器-->
            <el-aside width="220px" >
                <!-- 菜单 -->
                <el-menu :router="true" :default-active="default_active_index" class="aside">
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


                    <el-submenu index="/oms/container">
                        <template #title>
                            <el-icon><FolderOpened /></el-icon>
                            <span>{{$t('message.tabContainerOps')}}</span>
                        </template>
                        <el-menu-item index="/oms/template">{{$t('message.tabTemplate')}}</el-menu-item>
                        <el-menu-item index="/oms/containermanage">{{$t('message.tabContainerManager')}}</el-menu-item>
                    </el-submenu>

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
import { Monitor, DataAnalysis, DataBoard, Share, Operation, FolderOpened } from '@element-plus/icons-vue'

export default {
        name: "Sidebar",
        components: {
            Monitor,
            DataAnalysis, 
            DataBoard,
            Share,
            Operation,
            FolderOpened
        },
        data() {
            return {
                default_active_index: "/home"
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
        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
        border-right: 1px solid #e4e7ed;
        position: relative;
        z-index: 100;
    }
    
    .aside {
        height: 100%;
        border-right: none !important;
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
        background: var(--pj-bg-white);
        
        .el-menu-item {
            height: 56px;
            line-height: 56px;
            margin: 0 var(--pj-space-sm);
            border-radius: var(--pj-radius-md);
            transition: all 0.3s ease;
            color: var(--pj-text-secondary);
            
            &:hover {
                background: rgba(0, 150, 136, 0.08);
                color: var(--pj-primary);
            }
            
            &.is-active {
                background: linear-gradient(135deg, rgba(0, 150, 136, 0.1), rgba(38, 166, 154, 0.08));
                color: var(--pj-primary);
                font-weight: 500;
                
                &::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 3px;
                    height: 24px;
                    background: var(--pj-primary);
                    border-radius: 0 2px 2px 0;
                }
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
        }
        
        .el-submenu {
            .el-submenu__title {
                height: 56px;
                line-height: 56px;
                margin: 0 var(--pj-space-sm);
                border-radius: var(--pj-radius-md);
                color: var(--pj-text-secondary);
                
                &:hover {
                    background: rgba(0, 150, 136, 0.08);
                    color: var(--pj-primary);
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
                    right: 20px;
                    transition: transform 0.3s ease;
                }
            }
            
            &.is-opened .el-submenu__title .el-submenu__icon-arrow {
                transform: rotateZ(180deg);
            }
            
            .el-menu {
                background: #fafbfc;
                
                .el-menu-item {
                    height: 48px;
                    line-height: 48px;
                    margin: 0 var(--pj-space-md);
                    padding-left: 42px !important;
                    font-size: 13px;
                    
                    &:hover {
                        background: rgba(0, 150, 136, 0.05);
                    }
                    
                    &.is-active {
                        background: rgba(0, 150, 136, 0.1);
                        
                        &::before {
                            display: none;
                        }
                    }
                }
            }
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
    
    /* Animation for menu transitions */
    .el-menu-item,
    .el-submenu__title {
        position: relative;
        overflow: hidden;
        
        &::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
            transition: left 0.5s;
        }
        
        &:hover::after {
            left: 100%;
        }
    }
</style>
