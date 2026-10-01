<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../../core/ui'
import { copyRoles, roleKeys, type ID, type Role, type Roles, type User } from './contracts'

const props = defineProps<{ modelValue: Roles; users: User[]; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [roles: Roles] }>()
const search = ref('')
const choices = computed(() => props.users.filter(user => [user.showName, user.username, user.nick, user.id].some(value => String(value ?? '').toLowerCase().includes(search.value.toLowerCase()))))
function roleName(role: Role) { return ({ observer: t('观察者', 'Observer'), qa: 'QA', developer: t('开发者', 'Developer'), admin: t('管理员', 'Administrator') })[role] }
function userName(id: ID) { const user = props.users.find(user => String(user.id) === String(id)); return user?.showName || user?.nick || user?.username || String(id) }
function selected(role: Role, id: ID) { return props.modelValue[role].some(value => String(value) === String(id)) }
function toggle(role: Role, id: ID) {
  const next = copyRoles(props.modelValue)
  next[role] = selected(role, id) ? next[role].filter(value => String(value) !== String(id)) : [...next[role], id]
  emit('update:modelValue', next)
}
</script>

<template>
  <fieldset class="role-picker" :disabled="disabled">
    <legend>{{ t('角色与权限', 'Roles and permissions') }}</legend>
    <label class="role-search">{{ t('搜索用户', 'Search users') }}<input v-model="search" type="search" :placeholder="t('名称或 ID', 'Name or ID')"></label>
    <div class="role-grid">
      <section v-for="role in roleKeys" :key="role" class="role-column">
        <h3>{{ roleName(role) }}</h3>
        <div class="role-selected" data-private>
          <button v-for="id in modelValue[role]" :key="String(id)" type="button" class="role-chip" :aria-label="t('移除', 'Remove') + ' ' + roleName(role) + ' ' + userName(id)" @click="toggle(role, id)">{{ userName(id) }} <span aria-hidden="true">×</span></button>
          <span v-if="!modelValue[role].length" class="role-none">{{ t('未选择', 'None selected') }}</span>
        </div>
        <div class="role-options" data-private>
          <label v-for="user in choices" :key="String(user.id)"><input type="checkbox" :checked="selected(role, user.id)" @change="toggle(role, user.id)"><span>{{ user.showName || user.username || user.id }}</span></label>
          <small v-if="!choices.length">{{ t('无匹配用户', 'No matching users') }}</small>
        </div>
      </section>
    </div>
  </fieldset>
</template>

<style scoped>
.role-picker { border: 1px solid var(--line); padding: 16px; min-width: 0; margin: 8px 0 0; border-radius: 10px; }
.role-picker legend { padding: 0 6px; font-weight: 650; }
.role-search { display: flex; align-items: center; gap: 12px; font-size: 12px; margin-bottom: 14px; }
.role-search input { max-width: 280px; }
.role-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 12px; }
.role-column { min-width: 0; }
.role-column h3 { font-size: 12px; margin: 0 0 8px; }
.role-selected { min-height: 44px; display: flex; flex-wrap: wrap; gap: 4px; align-content: flex-start; padding-bottom: 8px; }
.role-chip { border: 1px solid var(--line); border-radius: 6px; background: #f5f7fc; font: inherit; font-size: 11px; cursor: pointer; padding: 3px 6px; overflow-wrap: anywhere; text-align: left; }
.role-none { color: var(--muted); font-size: 11px; }
.role-options { border-top: 1px solid var(--line); padding-top: 8px; max-height: 160px; overflow: auto; display: grid; gap: 7px; font-size: 11px; }
.role-options label { display: flex; align-items: flex-start; gap: 6px; overflow-wrap: anywhere; }
.role-options input { width: auto; flex: 0 0 auto; }
@media (max-width: 640px) { .role-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }.role-search { align-items: stretch; flex-direction: column; gap: 5px; } }
</style>
