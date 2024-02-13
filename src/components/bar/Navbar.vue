<template>
    <div id="navbar">
        <div id="logo_content">
            <a href="http://www.powerjob.tech/" target="_blank">
                <img src="../../assets/powerjob-console-logo.png"  alt="logo"/>
            </a>
        </div>

        <div id="right_content">

            <el-dropdown @command="this.common.switchLanguage">
                <span class="el-dropdown-link">
                    <p style="color:#ffffff">Language<i class="el-icon-arrow-down el-icon--right"/></p>
                </span>
                <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item command="en">English</el-dropdown-item>
                    <el-dropdown-item command="cn">简体中文</el-dropdown-item>
                </el-dropdown-menu>
            </el-dropdown>

            <el-dropdown @command="handleSettings">
                <span class="el-dropdown-link">
                    <p style="color:#ffffff">Settings<i class="el-icon-arrow-down el-icon--right"/></p>
                </span>
                <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item command="back2Home">{{$t('message.back2Home')}}</el-dropdown-item>
                    <el-dropdown-item command="logout">{{$t('message.logout')}}</el-dropdown-item>
                </el-dropdown-menu>
            </el-dropdown>
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

          // 返回主页
          onClickBack2Home() {
            window.localStorage.removeItem('Power_appId')
            this.$router.push("/");
          },

          // 退出登录
          onClickLogout() {
            window.localStorage.removeItem('Power_appId');
            window.localStorage.removeItem('Power_jwt')
            this.$router.push("/");
          },
            // 处理系统设置的指令时间
            handleSettings: function (cmd) {
                switch (cmd) {
                    case "logout": this.onClickLogout(); break;
                    case "back2Home": this.onClickBack2Home(); break;
                }
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
