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
      </el-form-item>

    </el-form>
  </el-row>
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
      }
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
    }
  },
  mounted() {
    this.fetchUserDetail()
  }
}
</script>

<style scoped>

</style>