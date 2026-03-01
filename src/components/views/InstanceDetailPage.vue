<template>
  <div class="instance-detail-page">
    <div class="page-toolbar">
      <el-button type="primary" @click="back">{{ $t('message.back') }}</el-button>
      <el-button @click="refresh">{{ $t('message.refresh') }}</el-button>
    </div>
    <div class="page-content">
      <InstanceDetail
        ref="instanceDetailRef"
        :instance-id="instanceId"
        :resultAll="true"
      />
    </div>
  </div>
</template>

<script>
import InstanceDetail from "../common/InstanceDetail";

export default {
  name: "InstanceDetailPage",
  components: { InstanceDetail },
  computed: {
    instanceId() {
      return this.$route.params.instanceId;
    },
  },
  methods: {
    back() {
      this.$router.go(-1);
    },
    refresh() {
      if (this.$refs.instanceDetailRef) {
        this.$refs.instanceDetailRef.fetchInstanceDetail();
      }
    },
  },
};
</script>

<style scoped>
.instance-detail-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.page-toolbar {
  margin-bottom: 16px;
}

.page-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
</style>
