<template>
  <div class="role-fields" v-loading="loading">
    <div v-for="role in roles" :key="role" class="role-field">
      <label :for="'role-' + role + '-' + uid">{{ $t('message.' + role) }}</label>
      <el-select :id="'role-' + role + '-' + uid" :model-value="userRuleForm[role] || []"
                 multiple filterable clearable collapse-tags collapse-tags-tooltip
                 :placeholder="$t('message.' + role)" @update:model-value="updateRole(role, $event)">
        <el-option v-for="user in user_list" :key="user.id" :label="user.showName" :value="user.id" />
      </el-select>
    </div>
  </div>
</template>

<script>
let roleEditorId = 0
export default {
  name: 'UserRole',
  props: {
    userRuleForm: { type: Object, default: () => ({ observer: [], qa: [], developer: [], admin: [] }) }
  },
  emits: ['update:userRuleForm'],
  data() {
    return { user_list: [], loading: false, roles: ['observer', 'qa', 'developer', 'admin'], uid: ++roleEditorId }
  },
  methods: {
    updateRole(role, value) {
      this.$emit('update:userRuleForm', { ...this.userRuleForm, [role]: value })
    },
    async listUser() {
      this.loading = true
      try {
        const result = await this.axios.get('/user/list')
        this.user_list = Array.isArray(result) ? result : []
      } catch (error) {
        this.$message.error(error?.message || String(error))
      } finally {
        this.loading = false
      }
    }
  },
  mounted() { this.listUser() }
}
</script>

<style scoped>
.role-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 20px; width: 100%; }
.role-field { display: flex; flex-direction: column; gap: 7px; }
.role-field label { color: var(--pj-muted); font-size: 12px; }
.role-field .el-select { width: 100%; }
@media (max-width: 600px) { .role-fields { grid-template-columns: 1fr; } }
</style>
