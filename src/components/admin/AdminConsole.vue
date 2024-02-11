<template>
  <div id="console">
    <!-- 顶部导航条 -->
    <navbar/>
    <!-- 左侧导航条 -->
    <AdminConsoleSidebar/>
  </div>
</template>

<script>
import Navbar from "../bar/Navbar.vue";
import AdminConsoleSidebar from "./AdminConsoleSidebar.vue";

export default {
  name: "AdminConsole",
  components: {Navbar, AdminConsoleSidebar}
}
</script>

<style scoped>
#console {
  width: 100%;
  height: 100%;
}
</style>
