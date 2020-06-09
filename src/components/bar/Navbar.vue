<template>
    <div id="navbar">
        <div id="logo_content">
            <a href="https://github.com/KFCFans/OhMyScheduler" target="_blank">
                <img src="../../assets/oms-logo.png"  alt="logo"/>
            </a>
        </div>

        <div id="right_content">

            <el-dropdown @command="onClickLanguageSwitch">
                <span class="el-dropdown-link">
                    <p style="color:#ffffff">Language<i class="el-icon-arrow-down el-icon--right"/></p>
                </span>
                <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item command="en">English</el-dropdown-item>
                    <el-dropdown-item command="cn">简体中文</el-dropdown-item>
                </el-dropdown-menu>
            </el-dropdown>

            <div>
                <el-button type="danger" icon="el-icon-close" circle @click="onClickCloseConsole"/>
            </div>
        </div>
    </div>
</template>

<script>
    export default {
        name: "Navbar",
        data() {
            return {

            }
        },
        methods: {
            // 退出当前应用
            onClickCloseConsole: function () {
                this.$router.push("/");
            },
            // 更换语言
            onClickLanguageSwitch(cmd) {
                console.log("switch language to %o", cmd);
                this.$i18n.locale = cmd
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
        align-items: center;
        margin: 20px;
    }

    img {
        width: 100%;
        margin-left:8px;
    }

    .el-dropdown {
        margin-right: 50px;
    }
</style>
