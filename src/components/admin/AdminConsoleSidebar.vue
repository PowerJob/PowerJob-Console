<!--
* 官方文档：https://element.eleme.cn/#/zh-CN/component/menu ，阅读底部属性说明即可
* 该组件内部包括了侧边栏和主显示区域（以router-view的形式声明，在router.js中通过component: () => import('./components/Home')的方式导入）
-->
<template>
  <div id="admin_sidebar" class="sidebar-container">
    <el-container class="left-container sidebar-left-container">
      <!--侧边栏容器-->
      <el-aside width="100%" >
        <!-- 菜单 -->
        <el-menu :router="true" :default-active="default_active_index" class="aside sidebar-menu">

          <!-- vue router，实现点击跳转 -->
          <el-menu-item index="/admin/app">
            <template #title>
              <!-- 图标 + 文字 -->
              <el-icon><Operation/></el-icon>
              <span>{{$t('message.tabAppManage')}}</span>
            </template>
          </el-menu-item>

          <el-menu-item index="/admin/namespace">
            <template #title>
              <!-- 图标 + 文字 -->
              <el-icon><FolderOpened/></el-icon>
              <span>{{$t('message.tabNamespace')}}</span>
            </template>
          </el-menu-item>

          <el-menu-item index="/admin/personal">
            <template #title>
              <!-- 图标 + 文字 -->
              <el-icon><UserFilled/></el-icon>
              <span>{{$t('message.tabPersonal')}}</span>
            </template>
          </el-menu-item>

          <el-menu-item index="/admin/settings">
            <template #title>
              <!-- 图标 + 文字 -->
              <el-icon><Setting/></el-icon>
              <span>{{$t('message.tabSettings')}}</span>
            </template>
          </el-menu-item>

          <el-menu-item index="/admin/user">
            <template #title>
              <!-- 图标 + 文字 -->
              <el-icon><User/></el-icon>
              <span>{{$t('message.tabUserManager')}}</span>
            </template>
          </el-menu-item>

        </el-menu>
      </el-aside>
    </el-container>

    <!-- 功能区 -->
    <div class="wrap sidebar-wrap">
      <router-view/>
    </div>
  </div>
</template>

<script>
import { Operation, FolderOpened, UserFilled, Setting, User } from '@element-plus/icons-vue'

export default {
  name: "AdminConsoleSidebar",
  components: {
    Operation,
    FolderOpened,
    UserFilled,
    Setting,
    User
  },
  computed: {
    default_active_index() {
      return this.$route?.path || '/admin/app'
    }
  }
}
</script>
<style scoped lang="scss">
@import '../../styles/shared/sidebar.scss';

#admin_sidebar {
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

/* 隐藏侧边栏滚动条 */
:deep(.el-aside),
:deep(.el-menu) {
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }
}
</style>
