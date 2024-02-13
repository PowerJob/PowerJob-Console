<template>
  <div class="login-container">
    <h2>Login to PowerJob</h2>

    <el-form ref="login_info" :model="login_info">
      <el-form-item label="username">
        <el-input v-model="login_info.username"></el-input>
      </el-form-item>
      <el-form-item label="password">
        <el-input v-model="login_info.password"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button size="medium" type="success" plain @click="userRegisterFormVisible = true">{{$t('message.userRegister')}}</el-button>
        <el-button size="medium" type="primary" @click="doLogin">{{$t('message.login')}}</el-button>
      </el-form-item>
    </el-form>

    <!-- 用户注册弹窗 -->
    <el-dialog :title="$t('message.userRegister')" :visible.sync="userRegisterFormVisible" width="35%" >
      <el-form :model="userRegisterForm" style="margin:0 5px">

        <el-form-item label="username">
          <el-input v-model="userRegisterForm.username" placeholder="全局唯一标识，建议使用英文"/>
        </el-form-item>

        <el-form-item :label="$t('message.nick')">
          <el-input v-model="userRegisterForm.nick"/>
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

        <el-form-item :label="$t('message.newPassword')">
          <el-input type="password" v-model="userRegisterForm.password"/>
        </el-form-item>

        <el-form-item :label="$t('message.newPassword2')">
          <el-input type="password" v-model="userRegisterForm.password2"/>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="registerUser">{{$t('message.register')}}</el-button>
          <el-button @click="userRegisterFormVisible = false">{{$t('message.cancel')}}</el-button>
        </el-form-item>

      </el-form>
    </el-dialog>

    <el-dialog :title="$t('message.changePassword')" :visible.sync="changePasswordFormVisible" width="35%" >
      <el-form :model="changePasswordRequest" style="margin:0 5px">

        <el-form-item label="username">
          <el-input v-model="changePasswordRequest.username"/>
        </el-form-item>

        <el-form-item :label="$t('message.oldPassword')">
          <el-input v-model="changePasswordRequest.oldPassword"/>
        </el-form-item>

        <el-form-item :label="$t('message.newPassword')">
          <el-input v-model="changePasswordRequest.newPassword"/>
        </el-form-item>
        <el-form-item :label="$t('message.newPassword2')">
          <el-input v-model="changePasswordRequest.newPassword2"/>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="changePassword">{{$t('message.confirm')}}</el-button>
          <el-button @click="changePasswordFormVisible = false">{{$t('message.cancel')}}</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>

  </div>
</template>

<script>
export default {
  name: 'PowerJobThirdPartyLogin',
  data() {
    return {
      login_info: {
        username: '',
        password: '',
      },

      // 用户注册表单是否可见
      userRegisterFormVisible: false,
      // 用户注册表单对象
      userRegisterForm: {
        username: '',
        nick: '',
        phone: '',
        email: '',
        webHook: '',
        password: '',
        password2: ''
      },

      // 修改密码
      changePasswordRequest: {
        username: undefined,
        oldPassword: undefined,
        newPassword: undefined,
        newPassword2: undefined
      },
      changePasswordFormVisible: false
    };
  },
  methods: {
    doLogin() {

      let s_info = {
        username: this.login_info.username,
        password: this.login_info.password,
        // 出于前端成本考虑暂不实现，有需求可在此扩展
        encryption: 'none'
      }

      let login_request = {
        loginType: 'PWJB',
        originParams: JSON.stringify(s_info)
      }

      this.axios.post('/auth/thirdPartyLoginDirect', login_request).then(ret => {

        const jwtToken = ret.jwtToken
        window.localStorage.setItem('Power_jwt', jwtToken);

        this.$router.push("/admin/app")
      })

    },

    // 注册用户
    registerUser() {

      if (this.userRegisterForm.password !== this.userRegisterForm.password2) {
        alert('两次输入密码不一致!')
        return
      }

      const that = this;
      this.axios.post("/pwjbUser/create", this.userRegisterForm).then(() => {
        that.$message.success(this.$t('message.success'));
        that.userRegisterFormVisible = false;
      }, that.userRegisterFormVisible = false);
    },

    // 修改密码
    changePassword() {
      this.axios.post('/pwjbUser/changePassword', this.changePasswordRequest)
    }
  },

  mounted() {
    console.log(window.location.search)
    const urlSearchParams = new URLSearchParams(window.location.search);
    console.log(JSON.stringify(urlSearchParams))
    console.log(urlSearchParams['usageType'])
  }
};
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

h2 {
  text-align: center;
  margin-bottom: 20px;
}




</style>
