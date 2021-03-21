<!--
* 官方文档：https://element.eleme.cn/#/zh-CN/component/menu ，阅读底部属性说明即可
* 该组件内部包括了侧边栏和主显示区域（以router-view的形式声明，在router.js中通过component: () => import('./components/Home')的方式导入）
-->
<template>
    <div id="sidebar">
        <el-container class="left-container">
            <!--侧边栏容器-->
            <el-aside width="100%" >
                <!-- 菜单 -->
                <el-menu :router="true" :default-active="default_active_index" class="aside">
                    <!-- vue router，实现点击跳转 -->
                    <el-menu-item index="/oms/home">
                        <template slot="title">
                            <!-- 图标 + 文字 -->
                            <i class="el-icon-monitor"/>
                            <span>{{$t('message.tabHome')}}</span>
                        </template>
                    </el-menu-item>

                    <el-menu-item index="/oms/job">
                        <template slot="title">
                            <!-- 图标 + 文字 -->
                            <i class="el-icon-data-analysis"/>
                            <span>{{$t('message.tabJobManage')}}</span>
                        </template>
                    </el-menu-item>

                    <el-menu-item index="/oms/instance">
                        <template slot="title">
                            <!-- 图标 + 文字 -->
                            <i class="el-icon-s-data"/>
                            <span>{{$t('message.tabJobInstance')}}</span>
                        </template>
                    </el-menu-item>

                    <el-menu-item index="/oms/workflow">
                        <template slot="title">
                            <!-- 图标 + 文字 -->
                            <i class="el-icon-share"/>
                            <span>{{$t('message.tabWorkflowManage')}}</span>
                        </template>
                    </el-menu-item>

                    <el-menu-item index="/oms/wfinstance">
                        <template slot="title">
                            <!-- 图标 + 文字 -->
                            <i class="el-icon-s-operation"/>
                            <span>{{$t('message.tabWfInstance')}}</span>
                        </template>
                    </el-menu-item>


                    <el-submenu index="/oms/">
                        <template slot="title">
                            <i class="el-icon-data-analysis"/>
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
    export default {
        name: "Sidebar",
        data() {
            return {
                default_active_index: "/home"
            }
        }
    }
</script>
<style scoped>

    /* 菜单左对齐 */
    .el-menu {
        text-align: left;
    }
    #sidebar{
        display: flex;
    }
    .aside{
        height: 100vh;
    }
    .left-container{
        flex-basis:210px;
        flex-grow: 0;
        flex-shrink: 0;
    }
    /* view */
    .wrap {
        box-sizing: border-box;
        padding: 20px;
        position: absolute;
        left: 210px;
        right: 0;
        top: 80px;
        bottom: 0;
        background: #ffffff;
        width: calc(100% - 200px);
        overflow-y: scroll;

    }
    .wrap::-webkit-scrollbar {
        /*滚动条整体样式*/
        width: 4px; /*高宽分别对应横竖滚动条的尺寸*/
        height: 4px;
    }
    .wrap::-webkit-scrollbar-thumb {
        /*滚动条里面小方块*/
        border-radius: 5px;
        -webkit-box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
        background: rgba(0, 0, 0, 0.2);
    }
    .wrap::-webkit-scrollbar-track {
        /*滚动条里面轨道*/
        -webkit-box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
        border-radius: 0;
        background: rgba(0, 0, 0, 0.1);
    }
</style>
