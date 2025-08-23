<template>
  <div>
    <el-form>
      <el-form-item :label="$t('message.observer')">
        <el-select multiple v-model="localUserRuleForm.observer" placeholder="observer" style="width: 80%" @change="updateObserver">
          <el-option
              v-for="item in user_list"
              :key="item.id"
              :label="item.showName"
              :value="item.id">
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item :label="$t('message.qa')">
        <el-select multiple v-model="localUserRuleForm.qa" placeholder="observer" style="width: 80%" @change="updateQa">
          <el-option
              v-for="item in user_list"
              :key="item.id"
              :label="item.showName"
              :value="item.id">
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item :label="$t('message.developer')">
        <el-select multiple v-model="localUserRuleForm.developer" placeholder="observer" style="width: 80%" @change="updateDeveloper">
          <el-option
              v-for="item in user_list"
              :key="item.id"
              :label="item.showName"
              :value="item.id">
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item :label="$t('message.admin')">
        <el-select multiple v-model="localUserRuleForm.admin" placeholder="observer" style="width: 80%" @change="updateAdmin">
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
      user_list: [],
      // 本地副本
      localUserRuleForm: {
        observer: [],
        qa: [],
        developer: [],
        admin: [],
      }
    }
  },

  methods: {
    listUser() {
      // 加载用户信息
      let that = this;
      that.axios.get("/user/list").then(res => {
        that.user_list = res
      });
    },
    updateObserver() {
      this.$emit('update:userRuleForm', { ...this.localUserRuleForm });
    },
    updateQa() {
      this.$emit('update:userRuleForm', { ...this.localUserRuleForm });
    },
    updateDeveloper() {
      this.$emit('update:userRuleForm', { ...this.localUserRuleForm });
    },
    updateAdmin() {
      this.$emit('update:userRuleForm', { ...this.localUserRuleForm });
    }
  },

  watch: {
    userRuleForm: {
      handler(newVal) {
        this.localUserRuleForm = { ...newVal };
      },
      deep: true,
      immediate: true
    }
  },
  mounted() {
    this.listUser()
  }
}
</script>


<style scoped>

</style>