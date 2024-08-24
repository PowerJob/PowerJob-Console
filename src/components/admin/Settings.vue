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

    <el-collapse-item :title="$t('message.systemConfig')" name="systemConfig">
      <el-button type="primary" @click="onClickAddNewSystemConfig">{{$t('message.add')}}</el-button>
      <el-table :data="systemConfigList" style="width: 100%">
        <el-table-column prop="key" label="key"/>
        <el-table-column prop="value" label="value"/>
        <el-table-column prop="comment" label="comment"/>
      </el-table>
    </el-collapse-item>
  </el-collapse>

  <el-dialog :close-on-click-modal="false" :visible.sync="saveSystemConfigDialogVisible" width="80%">
    <el-form :model="saveSystemConfigRequest" label-width="120px">
      <el-form-item label="key">
        <el-input v-model="saveSystemConfigRequest.key"/>
      </el-form-item>

      <el-form-item label="value">
        <el-input v-model="saveSystemConfigRequest.value"/>
      </el-form-item>

      <el-form-item label="comment">
        <el-input v-model="saveSystemConfigRequest.comment"/>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="onClickSaveNewSystemConfig">{{$t('message.save')}}</el-button>
        <el-button @click="saveSystemConfigDialogVisible = false">{{$t('message.cancel')}}</el-button>
      </el-form-item>

    </el-form>
  </el-dialog>

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
      adminUserIds: [],

      // 系统配置相关
      saveSystemConfigDialogVisible: false,
      saveSystemConfigRequest: {
      },
      systemConfigList: []
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
    },

    // 系统配置
    onClickAddNewSystemConfig() {
      this.saveSystemConfigDialogVisible = true
    },
    onClickSaveNewSystemConfig() {
      let that = this;
      this.axios.post("/config/save", this.saveSystemConfigRequest).then(() => {
        that.$message.success(that.$t('message.success'));
        this.listSystemConfigs();
      })
      this.saveSystemConfigDialogVisible = false;
    },
    listSystemConfigs() {
      const that = this;
      this.axios.get("/config/list").then((res) => {
        that.systemConfigList = res;
      });
    }
  },
  mounted() {
    this.listUser()
    this.listGlobalAdmins()
    this.listSystemConfigs()
  }
}

</script>

<style scoped>

</style>