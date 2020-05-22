<template>
    <div id="navbar">
        <div id="logo_content">
            <img src="../../assets/oms-logo.png" />
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
        height: 80px;
        display: flex;
        background-color: #000;
        /* 子容器沿主轴均匀分布，位于首末两端的子容器与父容器相切 */
        justify-content: space-between;
        border-bottom:2px solid #dddfe6;
    }

    #logo_content {
        padding-right: 10px;
        box-sizing: border-box;
        width: 220px;
        height: 100%;
        background-color: #000000;
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
        width: 100%;
        margin-left:8px;
    }
</style>
