<template>
  <div>
    <el-form>
      <el-form-item :label="$t('message.observer')">
        <el-select multiple v-model="userRuleForm.observer" placeholder="observer" style="width: 80%">
          <el-option
              v-for="item in user_list"
              :key="item.id"
              :label="item.showName"
              :value="item.id">
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item :label="$t('message.qa')">
        <el-select multiple v-model="userRuleForm.qa" placeholder="observer" style="width: 80%">
          <el-option
              v-for="item in user_list"
              :key="item.id"
              :label="item.showName"
              :value="item.id">
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item :label="$t('message.developer')">
        <el-select multiple v-model="userRuleForm.developer" placeholder="observer" style="width: 80%">
          <el-option
              v-for="item in user_list"
              :key="item.id"
              :label="item.showName"
              :value="item.id">
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item :label="$t('message.admin')">
        <el-select multiple v-model="userRuleForm.admin" placeholder="observer" style="width: 80%">
          <el-option
              v-for="item in user_list"
              :key="item.id"
              :label="item.showName"
              :value="item.id">
          </el-option>
        </el-select>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
export default {
  name: 'UserRole',
  props: {
    userRuleForm: {
      type: Object,
      default: () => {
        return {
          observer: [],
          qa: [],
          developer: [],
          admin: [],
        }
      }
    }
  },

  data() {
    return {
      // 用户列表
      user_list: []
    }
  },

  methods: {
    listUser() {
      // 加载用户信息
      let that = this;
      that.axios.get("/user/list").then(res => {
        that.user_list = res
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