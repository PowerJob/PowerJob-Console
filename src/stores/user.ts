import { defineStore } from 'pinia'
import { userApi } from '@/api'
import { storage } from '@/utils'
import type { UserInfo } from '@/types/user'

interface UserState {
  currentUser: UserInfo | null
  userList: UserInfo[]
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    currentUser: null,
    userList: [],
  }),

  getters: {
    isLoggedIn: () => !!storage.getToken(),
    userId: (state) => state.currentUser?.id,
  },

  actions: {
    async fetchUserList() {
      const data = await userApi.list()
      this.userList = data.map(item => ({
        ...item,
        id: String(item.id),
      }))
    },

    setCurrentUser(user: UserInfo | null) {
      this.currentUser = user
    },

    logout() {
      this.currentUser = null
      storage.removeToken()
    },
  },
})
