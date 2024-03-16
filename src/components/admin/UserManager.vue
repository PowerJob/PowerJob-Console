<template>
  <div id="user_manager">
    <!--第一行，条件搜索栏（row布局：gutter代表栅格间隔，span代表占用格数）-->
    <el-row :gutter="20">

      <el-col :span="24">
        <el-form :inline="true" :model="queryUserRequest" class="el-form--inline">
          <el-form-item label="ID">
            <el-input v-model="queryUserRequest.userIdEq" placeholder="ID"/>
          </el-form-item>
          <el-form-item label="nick">
            <el-input v-model="queryUserRequest.nickLike" :placeholder="$t('message.fuzzyQuery')"/>
          </el-form-item>
          <el-form-item label="phone">
            <el-input v-model="queryUserRequest.phoneLike" :placeholder="$t('message.fuzzyQuery')"/>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="listUser">{{$t('message.query')}}</el-button>
            <el-button type="cancel" @click="onClickReset">{{$t('message.reset')}}</el-button>
          </el-form-item>
        </el-form>
      </el-col>
    </el-row>

    <!--第二行，任务数据表格-->
    <el-row>
      <el-table :data="userListResult" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80"/>

        <el-table-column prop="accountType" label="accountType"/>
        <el-table-column prop="username" label="username"/>
        <el-table-column prop="nick" label="nick"/>
        <el-table-column prop="phone" label="phone"/>
        <el-table-column prop="email" label="email"/>

      </el-table>
    </el-row>
  </div>
</template>

<script>
export default {
  name: "UserManager",
  data() {
    return {
      // 查询 APP 请求
      queryUserRequest: {
        userIdEq: undefined,
        nickLike: undefined,
        phoneLike: undefined
      },

      // 用户查询结果
      userListResult: []
    }
  },
  methods: {
    // 点击重置按钮
    onClickReset() {
      this.queryUserRequest.userIdEq = undefined;
      this.queryUserRequest.nickLike = undefined;
      this.queryUserRequest.phoneLike = undefined;
      this.listUser();
    },

    listUser() {
      const that = this;
      this.axios.post("/user/query", this.queryUserRequest).then((res) => {
        that.userListResult = res;
      });
    }
  },
  mounted() {

    this.listUser()
  }
}
</script>

<style scoped>

</style>