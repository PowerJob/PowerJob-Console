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
                    <el-dropdown-item command="changeAppInfo">{{$t('message.changeAppInfo')}}</el-dropdown-item>
                    <el-dropdown-item command="logout">{{$t('message.logout')}}</el-dropdown-item>
                </el-dropdown-menu>
            </el-dropdown>

            <!-- 修改应用信息 -->
            <el-dialog :visible.sync="changeAppInfoDialogVisible" width="35%" >
                <el-form :model="appInfo" style="margin:0 5px">

                    <el-form-item :label="$t('message.appName')">
                        <el-input v-model="appInfo.appName"/>
                    </el-form-item>

                  <el-form-item :label="$t('message.oldPassword')">
                    <el-input v-model="appInfo.oldPassword"/>
                  </el-form-item>

                    <el-form-item :label="$t('message.newPassword')">
                        <el-input v-model="appInfo.password"/>
                    </el-form-item>

                    <el-form-item :label="$t('message.newPassword2')">
                        <el-input v-model="appInfo.password2"/>
                    </el-form-item>

                    <el-form-item>
                        <el-button type="primary" @click="saveNewAppInfo">{{$t('message.save')}}</el-button>
                        <el-button @click="changeAppInfoDialogVisible = false">{{$t('message.cancel')}}</el-button>
                    </el-form-item>
                </el-form>
            </el-dialog>

        </div>
    </div>
</template>

<script>
    export default {
        name: "Navbar",
        data() {
            return {
                changeAppInfoDialogVisible: false,
                appInfo: {
                    id: this.$store.state.appInfo.id,
                    appName: this.$store.state.appInfo.appName,
                    oldPassword: undefined,
                    password: undefined,
                    password2: undefined
                }
            }
        },
        methods: {
            // 退出当前应用
            onClickCloseConsole: function () {
                window.localStorage.removeItem('oms_auto_login');
                this.$router.push("/");
            },
            // 处理系统设置的指令时间
            handleSettings: function (cmd) {
                switch (cmd) {
                    case "logout": this.onClickCloseConsole(); break;
                    case "changeAppInfo": this.changeAppInfoDialogVisible = true; break;
                }
            },
            // 更新应用信息
            saveNewAppInfo() {
                if (this.appInfo.password === this.appInfo.password2) {
                    const that = this;
                    this.axios.post("/appInfo/save", this.appInfo).then(() => {
                        that.$message.success(this.$t('message.success'));
                        that.$router.push("/");
                    }, e => that.$message.error(e));
                }else {
                    this.$message.error("the password doesn't match");
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
