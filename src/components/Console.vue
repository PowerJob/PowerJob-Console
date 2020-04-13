<template>
    <div id="console">
        <!-- 顶部导航条 -->
        <navbar/>
        <!-- 左侧导航条 -->
        <sidebar/>
    </div>
</template>

<script>
    import Sidebar from "./bar/Sidebar";
    import Navbar from "./bar/Navbar";

    export default {
        name: "Console",
        components: {Navbar, Sidebar}
    }
</script>

<style scoped>
    #console {
        width: 100%;
        height: 100%;
    }
</style>
