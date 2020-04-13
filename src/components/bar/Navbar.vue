<template>
    <div id="navbar">
        <div id="logo_content">
            <p>OhMyScheduler</p>
        </div>

        <div id="right_content">
        </div>
    </div>
</template>

<script>
    export default {
        name: "Navbar",
        data() {
            return {

            }
        }
    }
</script>

<style scoped>
    #navbar {
        width: 100%;
        height: 50px;
        display: flex;
        background-color: #ffffff;
        /* 子容器沿主轴均匀分布，位于首末两端的子容器与父容器相切 */
        justify-content: space-between;
    }

    #logo_content {
        width: 200px;
        height: 100%;
        background-color: #409EFF;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    #right_content {
        display: flex;
        background-color: #277277;
        align-items: center;
    }

    img {
        width: 45px;
        height: 45px;
        margin-left: 10px;
    }
</style>
