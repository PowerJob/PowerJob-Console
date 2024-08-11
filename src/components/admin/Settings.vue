<template>
<div>

  <el-collapse v-model="activeNames" @change="handleChange">
    <el-collapse-item :title="$t('message.globalAdmin')" name="grantGlobalAdmin">
      <el-select multiple v-model="adminUserIds" placeholder="GlobalAdmin" style="width: 80%">
        <el-option
            v-for="item in user_list"
            :key="item.id"
            :label="item.showName"
            :value="item.id">
        </el-option>
      </el-select>
      <el-button type="success" style="margin-left: 20px" plain @click="saveGlobalAdmins">{{$t('message.save')}}</el-button>
    </el-collapse-item>
  </el-collapse>

</div>
</template>

<script>
import {Message} from "element-ui";

export default {
  name: 'Settings',
  data() {
    return {
      activeNames: ['grantGlobalAdmin'],

      user_list: [],
      adminUserIds: []
    };
  },
  methods: {
    handleChange(val) {
      console.log(val);
    },

    listUser() {
      // 加载用户信息
      let that = this;
      that.axios.get("/user/list").then(res => {
        that.user_list = res
      });
    },

    listGlobalAdmins() {
      let that = this;
      this.axios.get('/auth/listGlobalAdmin').then(ret => that.adminUserIds = ret)
    },

    saveGlobalAdmins() {

      const param = {
        admin: this.adminUserIds
      }
      this.axios.post('/auth/saveGlobalAdmin', param).then(() => {
        Message.success('SUCCESS')
      })
    }
  },
  mounted() {
    this.listUser()
    this.listGlobalAdmins()
  }
}

</script>

<style scoped>

</style>