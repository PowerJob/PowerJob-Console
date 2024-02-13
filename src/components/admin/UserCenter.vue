<template>
<div>
{{JSON.stringify(this.userDetailInfo)}}
</div>
</template>

<script>
export default {
  name: 'UserCenter',
  data() {
    return {
      userDetailInfo: {
        accountType: undefined,
        password: undefined,
        phone: undefined,
        email: undefined,
        webHook: undefined,
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
    }
  },
  mounted() {
    this.fetchUserDetail()
  }
}
</script>

<style scoped>

</style>