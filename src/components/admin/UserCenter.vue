<template>
<div>
  <el-row>
    <el-form :model="userDetailInfo" label-width="118px" style="width: 500px;">
      <el-form-item label="ID">
        <el-input disabled v-model="userDetailInfo.id"/>
      </el-form-item>
      <el-form-item label="username">
        <el-input disabled v-model="userDetailInfo.username"/>
      </el-form-item>

      <el-form-item label="accountType">
        <el-input disabled v-model="userDetailInfo.accountType"/>
      </el-form-item>

      <el-form-item label="originUsername">
        <el-input disabled v-model="userDetailInfo.originUsername"/>
      </el-form-item>

      <el-form-item label="nick">
        <el-input v-model="userDetailInfo.nick"/>
      </el-form-item>

      <el-form-item label="phone">
        <el-input v-model="userDetailInfo.phone"/>
      </el-form-item>

      <el-form-item label="email">
        <el-input v-model="userDetailInfo.email"/>
      </el-form-item>

      <el-form-item label="webHook">
        <el-input v-model="userDetailInfo.webHook"/>
      </el-form-item>

      <el-form-item label="globalRoles">
        <el-input disabled v-model="userDetailInfo.globalRoles"/>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="onClickSaveNewUserInfo">{{$t('message.save')}}</el-button>
        <el-button type="danger" v-if="userDetailInfo.accountType=='PWJB'" @click="onClickChangePassword">{{$t('message.changePassword')}}</el-button>
      </el-form-item>

    </el-form>
  </el-row>

  <el-dialog :title="$t('message.changePassword')" :visible.sync="changePasswordFormVisible" width="35%" >
    <el-form :model="changePasswordRequest" style="margin:0 5px">

      <el-form-item label="username">
        <el-input disabled v-model="changePasswordRequest.username"/>
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
        <el-button type="primary" @click="submitChangePasswordRequest">{{$t('message.confirm')}}</el-button>
        <el-button @click="changePasswordFormVisible = false">{{$t('message.cancel')}}</el-button>
      </el-form-item>
    </el-form>
  </el-dialog>
</div>
</template>

<script>
import {Message} from "element-ui";

export default {
  name: 'UserCenter',
  data() {
    return {
      userDetailInfo: {
        id: undefined,
        username: undefined,
        nick: undefined,
        accountType: undefined,
        password: undefined,
        phone: undefined,
        email: undefined,
        webHook: undefined,
        originUsername: undefined,
        extra: undefined,
        globalRoles: [],
        role2NamespaceList: {

        },
        role2AppList: {

        }
      },
      // 修改密码
      changePasswordRequest: {
        username: undefined,
        oldPassword: undefined,
        newPassword: undefined,
        newPassword2: undefined
      },
      changePasswordFormVisible: false
    }
  },

  methods: {
    fetchUserDetail() {
      const that = this;
      this.axios.get('/user/detail').then(ret => that.userDetailInfo = ret)
    },

    onClickSaveNewUserInfo() {
      const that = this;
      this.axios.post('/user/modify', that.userDetailInfo).then(() => {
        Message.success("SUCCESS");
        that.fetchUserDetail();
      })
    },

    // 修改密码
    onClickChangePassword() {
      this.changePasswordRequest.username = this.userDetailInfo.originUsername
      this.changePasswordFormVisible = true
    },

    submitChangePasswordRequest() {
      this.axios.post('/pwjbUser/changePassword', this.changePasswordRequest).then(() => {
        Message.success('SUCCESS')
      }, err => {
        Message.error(err)
      })
    }
  },
  mounted() {
    this.fetchUserDetail()
  }
}
</script>

<style scoped>

</style>