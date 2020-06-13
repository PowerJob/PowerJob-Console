 <template>
     <div id="container">

         <div id="head">
             <el-row>
                 <el-col :offset="22">
                     <el-dropdown @command="this.common.switchLanguage">
                        <span class="el-dropdown-link">
                            <p style="color:#ffffff">Language<i class="el-icon-arrow-down el-icon--right"/></p>
                        </span>
                         <el-dropdown-menu slot="dropdown">
                             <el-dropdown-item command="en">English</el-dropdown-item>
                             <el-dropdown-item command="cn">简体中文</el-dropdown-item>
                         </el-dropdown-menu>
                     </el-dropdown>
                 </el-col>
             </el-row>
         </div>

         <div id="welcome">

             <!-- <h3 class="topBar"><span class="left">OhMy</span><span class="right">Scheduler</span></h3> -->
             <el-button type="primary" plain @click="appRegisterFormVisible = true">{{$t('message.appRegister')}}</el-button>

             <div id="entrance">
                 <el-select
                         id="appSelect"
                         v-model="selectedAppInfo"
                         filterable
                         remote
                         reserve-keyword
                         :placeholder="$t('message.appNameInputPLH')"
                         :remote-method="fetchAppNames"
                         @change="selectedApp"
                         :loading="loading">
                     <el-option
                             v-for="appInfo in appInfoList"
                             :key="appInfo.id"
                             :label="appInfo.appName"
                             :value="appInfo">
                     </el-option>
                 </el-select>
             </div>

             <el-button type="success" plain @click="userRegisterFormVisible = true">{{$t('message.userRegister')}}</el-button>

             <el-dialog :title="$t('message.appRegister')" :visible.sync="appRegisterFormVisible" width="35%" >
                 <el-form :model="appRegisterForm" style="margin:0 5px">

                     <el-form-item :label="$t('message.appName')">
                         <el-input v-model="appRegisterForm.appName"/>
                     </el-form-item>

                     <el-form-item :label="$t('message.appDescription')">
                         <el-input v-model="appRegisterForm.description"/>
                     </el-form-item>

                     <el-form-item>
                         <el-button type="primary" @click="registerApp">{{$t('message.register')}}</el-button>
                         <el-button @click="appRegisterFormVisible = false">{{$t('message.cancel')}}</el-button>
                     </el-form-item>
                 </el-form>
             </el-dialog>

             <el-dialog :title="$t('message.userRegister')" :visible.sync="userRegisterFormVisible" width="35%" >
                 <el-form :model="userRegisterForm" style="margin:0 5px">

                     <el-form-item :label="$t('message.name')">
                         <el-input v-model="userRegisterForm.username"/>
                     </el-form-item>

                     <el-form-item :label="$t('message.phone')">
                         <el-input v-model="userRegisterForm.phone"/>
                     </el-form-item>

                     <el-form-item :label="$t('message.email')">
                         <el-input v-model="userRegisterForm.email"/>
                     </el-form-item>

                     <el-form-item>
                         <el-button type="primary" @click="registerUser">{{$t('message.register')}}</el-button>
                         <el-button @click="userRegisterFormVisible = false">{{$t('message.cancel')}}</el-button>
                     </el-form-item>

                 </el-form>
             </el-dialog>
         </div>
     </div>
</template>

<script>
    export default {
        name: "Welcome",
        data() {
            return {
                // 下拉框被选中的数据
                selectedAppInfo: {},
                // 下拉框的选择列表数据
                appInfoList: [],

                // 应用注册表单是否可见
                appRegisterFormVisible: false,
                // 用户注册表单是否可见
                userRegisterFormVisible: false,

                // 应用注册表单对象
                appRegisterForm: {
                    appName: "",
                    description: ""
                },
                // 用户注册表单对象
                userRegisterForm: {
                    username: "",
                    phone: "",
                    email: ""
                }
            }
        },
        methods: {
            // 请求应用下拉框数据
            fetchAppNames(condition) {
                const that = this;
                const url = "/appInfo/list?condition=" + condition;
                this.axios.get(url).then((result) => {
                    that.appInfoList = result;
                }, error => that.$message.error(error));
            },
            // 选中应用跳转
            selectedApp() {
                // 将 appId 存储到 VueStore
                this.$store.commit("initAppInfo", this.selectedAppInfo);
                // 跳转到主界面
                this.$router.push("/oms/home")
            },
            // 注册应用
            registerApp() {
                const that = this;
                this.axios.post("/appInfo/save", this.appRegisterForm).then(() => {
                   that.$message.success(this.$t('message.success'));
                   that.appRegisterFormVisible = false;
                }, that.appRegisterFormVisible = false);
            },
            // 注册用户（仅用于报警通知）
            registerUser() {
                const that = this;
                this.axios.post("/user/save", this.userRegisterForm).then(() => {
                    that.$message.success(this.$t('message.success'));
                    that.userRegisterFormVisible = false;
                }, that.userRegisterFormVisible = false);
            }
        },
        mounted() {
            // 加载默认语言配置文件
            let localLang = window.localStorage.getItem('oms_lang');
            console.log("language from localStorage is %o", localLang);
            if (localLang != null) {
                this.$i18n.locale = localLang;
                return;
            }

            let lang = navigator.language;
            console.log("language from system is %o", lang);
            switch (lang) {
                case "zh-HK":
                case "zh-TW":
                case "zh-SG":
                case "zh-CN": this.$i18n.locale = "cn"; break;
                default:
                    this.$i18n.locale = "en";
            }
        }
    }
</script>

<style scoped>

    #container {
        width: 100%;
        height: 100%;
        background-image: url("../assets/banner.jpg");
    }
    #head {
        width: 100%;
    }
    #welcome {
        width: 100%;
        height: 100%;

        /*
        flex布局：
        flex-direction：决定主轴的方向（项目的排列方向），比如row、column
        flex-wrap：决定容器内项目是否可换行
        justify-content：定义了项目在主轴的对齐方式（主轴在水平方向，就是水平居中）
        align-items：定义了项目在交叉轴伤的对齐方式
         */
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        justify-content: center;
        align-items: center;
    }
    .topBar{
        position: fixed;
        left: 30px;
        top:10px;
        color: #fff;
    }
    .right{
        background-color: #ff9900;
        color:#000;
        display: inline-block;
        box-sizing: border-box;
        margin-left: 5px;
        border-radius: 5px;
        padding: 5px;
    }
    #entrance {
        margin: 20px;
    }
</style>
