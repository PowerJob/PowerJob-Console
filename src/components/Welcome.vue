 <template>
     <div id="container">

         <div id="head">
             <el-row type="flex" class="row-bg" justify="end">
                 <el-col span="2">
                     <el-button type="primary" plain @click="appRegisterFormVisible = true">{{$t('message.appRegister')}}</el-button>
                 </el-col>
                 <el-col span="2">
                     <el-button type="success" plain @click="userRegisterFormVisible = true">{{$t('message.userRegister')}}</el-button>
                 </el-col>
                 <el-col span="2">
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

             <h1 align="center">{{$t('message.welcomeTitle')}}</h1>

             <!-- 登录表单 -->
             <el-form ref="ruleForm" :model="appLoginForm" label-width="0px" class="loginWrap">
                 <el-form-item label-width="">
                     <el-autocomplete
                             :trigger-on-focus="false"
                             class="loginWrap"
                             v-model="appLoginForm.appName"
                             :fetch-suggestions="queryAppNames"
                             :placeholder="$t('message.appName')"/>
                 </el-form-item>
                 <el-form-item label-width="">
                     <el-input v-model="appLoginForm.password" :placeholder="$t('message.password')" type="password" show-password="true"/>
                 </el-form-item>
                 <el-form-item>
                     <el-button type="primary" @click="login" class="loginWrap">{{$t('message.login')}}</el-button>
                 </el-form-item>
                 <el-checkbox v-model="stayLogged" style="color: #f0f3f4">{{$t('message.stayLogged')}}</el-checkbox>
             </el-form>

             <!-- 应用注册弹窗 -->
             <el-dialog :title="$t('message.appRegister')" :visible.sync="appRegisterFormVisible" width="35%" >
                 <el-form :model="appRegisterForm" style="margin:0 5px">

                     <el-form-item :label="$t('message.appName')">
                         <el-input v-model="appRegisterForm.appName"/>
                     </el-form-item>

                     <el-form-item :label="$t('message.appPassword')">
                         <el-input v-model="appRegisterForm.password"/>
                     </el-form-item>

                     <el-form-item>
                         <el-button type="primary" @click="registerApp">{{$t('message.register')}}</el-button>
                         <el-button @click="appRegisterFormVisible = false">{{$t('message.cancel')}}</el-button>
                     </el-form-item>
                 </el-form>
             </el-dialog>

             <!-- 用户注册弹窗 -->
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

                   <el-form-item :label="$t('message.webhook')">
                     <el-input v-model="userRegisterForm.webHook"/>
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

                // 应用注册表单是否可见
                appRegisterFormVisible: false,
                // 用户注册表单是否可见
                userRegisterFormVisible: false,

                // 应用注册表单对象
                appRegisterForm: {
                    appName: "",
                    password: undefined
                },
                // 用户注册表单对象
                userRegisterForm: {
                    username: "",
                    phone: "",
                    email: "",
                    webHook: ""
                },
                // 控制台登陆对象
                appLoginForm: {
                    appName: undefined,
                    password: undefined
                },
                // 是否保持登录状态
                stayLogged: true,
            }
        },
        methods: {
            // 请求应用下拉框数据
            queryAppNames(queryString, cb) {
                const array = [];
                const that = this;
                const url = "/appInfo/list?condition=" + queryString;
                this.axios.get(url).then((result) => {
                    result.forEach(appInfo => {
                       array.push({
                           "value": appInfo.appName
                       });
                       cb(array);
                    });
                }, error => that.$message.error(error));

                clearTimeout(this.timeout);
                this.timeout = setTimeout(() => {
                    cb(array);
                }, 3000);
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
            },
            // 登陆控制台
            login() {
                const that = this;
                this.axios.post("/appInfo/assert", this.appLoginForm).then(res => {

                    // 勾选了保持登录状态，就开启自动登录，直接本地存用户名密码（内部系统浏览器明文存问题不大）
                    if (this.stayLogged) {
                        window.localStorage.setItem('oms_auto_login', JSON.stringify(this.appLoginForm));
                    }

                    let appInfo = {
                        id: res,
                        appName: that.appLoginForm.appName
                    };
                    // 将 appId 存储到 VueStore
                    this.$store.commit("initAppInfo", appInfo);
                    // 跳转到主界面
                    this.$router.push("/oms/home")
                },error => {
                    window.localStorage.removeItem('oms_auto_login');
                    that.$message.error(error);
                });
            },
            // 自动登录
            autoLogin: function () {
                let autoLoginString = window.localStorage.getItem("oms_auto_login");
                if (autoLoginString === undefined || autoLoginString === null) {
                    return;
                }
                this.appLoginForm = JSON.parse(autoLoginString);
                this.login();
            },
            // 通过 URL 自动登陆
            loginByUrlParams: function () {
              let appName = this.$route.query.appName;
              let password = this.$route.query.password;
              console.log("login params from url: %o, %o", appName, password)
              if (appName === undefined || appName === null || appName === '') {
                return
              }
              this.appLoginForm.appName = appName;
              this.appLoginForm.password = password;
              this.login();
            }
        },
        mounted() {
            // 加载默认语言配置文件
            let localLang = window.localStorage.getItem('oms_lang');
            console.log("language from localStorage is %o", localLang);
            if (localLang != null) {
                this.$i18n.locale = localLang;
            }else {
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
            // 根据 URL 自动登陆
            this.loginByUrlParams();
            // 根据历史记录自动登陆
            this.autoLogin();
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
        flex-direction: column;
        /*flex-wrap: nowrap;*/
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

    h1 {
        width: 450px;
        color: #f0f3f4;
    }

    .loginWrap {
        width: 300px;
    }

</style>
