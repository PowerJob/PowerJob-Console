<template>
  <div id="container">
    <div class="login-container">
      <h2>Login to PowerJob</h2>

      <el-form ref="login_info" :model="login_info" label-width="0">
        <el-form-item>
          <el-input v-model="login_info.username" placeholder="Username"></el-input>
        </el-form-item>
        <el-form-item>
          <el-input v-model="login_info.password" placeholder="Password" show-password></el-input>
        </el-form-item>
        <el-form-item class="actions">
          <el-button size="medium" type="success" plain @click="userRegisterFormVisible = true">{{$t('message.userRegister')}}</el-button>
          <el-button size="medium" type="primary" @click="doLogin">{{$t('message.login')}}</el-button>
        </el-form-item>
      </el-form>

      <!-- User registration dialog -->
      <el-dialog :title="$t('message.userRegister')" :visible.sync="userRegisterFormVisible" width="400px">
        <el-form :model="userRegisterForm" label-width="120px">
          <el-form-item label="Username">
            <el-input v-model="userRegisterForm.username" placeholder="Unique identifier, use English"></el-input>
          </el-form-item>
          <el-form-item :label="$t('message.nick')">
            <el-input v-model="userRegisterForm.nick"></el-input>
          </el-form-item>
          <el-form-item :label="$t('message.phone')">
            <el-input v-model="userRegisterForm.phone"></el-input>
          </el-form-item>
          <el-form-item :label="$t('message.email')">
            <el-input v-model="userRegisterForm.email"></el-input>
          </el-form-item>
          <el-form-item :label="$t('message.webhook')">
            <el-input v-model="userRegisterForm.webHook"></el-input>
          </el-form-item>
          <el-form-item :label="$t('message.newPassword')">
            <el-input type="password" v-model="userRegisterForm.password" show-password></el-input>
          </el-form-item>
          <el-form-item :label="$t('message.newPassword2')">
            <el-input type="password" v-model="userRegisterForm.password2" show-password></el-input>
          </el-form-item>
          <el-form-item class="actions">
            <el-button type="primary" @click="registerUser">{{$t('message.register')}}</el-button>
            <el-button @click="userRegisterFormVisible = false">{{$t('message.cancel')}}</el-button>
          </el-form-item>
        </el-form>
      </el-dialog>
    </div>
  </div>
</template>


<script>
import {Message} from "element-ui";

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

    };
  },
  methods: {
    doLogin() {
      this.innerDoLogin(this.login_info.username, this.login_info.password, true)
    },

    innerDoLogin(name, pwd, real_login) {
      let s_info = {
        username: name,
        password: pwd,
        // 出于前端成本考虑暂不实现，有需求可在此扩展
        encryption: 'none'
      }

      let login_request = {
        loginType: 'PWJB',
        originParams: JSON.stringify(s_info)
      }

      this.axios.post('/auth/thirdPartyLoginDirect', login_request).then(ret => {

        if (real_login) {
          const jwtToken = ret.jwtToken
          window.localStorage.setItem('PowerJwt', jwtToken);

          this.$router.push("/admin/app")
        }
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
        that.userRegisterFormVisible = false;

        that.innerDoLogin(that.userRegisterForm.username, that.userRegisterForm.password, false)

        // 直接登录一次，创建 PowerJob 的 USER 对象
        that.$message.success(this.$t('message.success'));

      }, err => {
        Message.error(err);
        that.userRegisterFormVisible = false
      });
    }
  },

  mounted() {
  }
};
</script>

<style scoped>
#container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f5f5f5;
}

.login-container {
  width: 360px;
  padding: 30px 25px;
  background-color: #ffffff;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
}

h2 {
  margin-bottom: 25px;
  font-weight: 500;
  color: #333;
}

.el-form-item {
  margin-bottom: 15px;
}

.el-input {
  width: 100%;
  border-radius: 5px;
}

.actions {
  display: flex;
  justify-content: space-between;
}

.el-dialog {
  .el-input {
    width: 100%;
    border-radius: 5px;
  }

  .actions {
    display: flex;
    justify-content: space-between;
  }
}
</style>

