<template>
  <div class="instance-detail-page">
    <!-- 顶部操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="back">
          <el-icon><ArrowLeft /></el-icon>
          <span>{{ $t('message.back') }}</span>
        </button>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="refresh">
          <el-icon><Refresh /></el-icon>
          <span>{{ $t('message.refresh') }}</span>
        </button>
        <button class="action-btn warning" @click="handleRetry">
          <el-icon><RefreshRight /></el-icon>
          <span>{{ $t('message.reRun') }}</span>
        </button>
        <button class="action-btn danger" @click="handleStop">
          <el-icon><VideoPause /></el-icon>
          <span>{{ $t('message.stop') }}</span>
        </button>
      </div>
    </div>

    <!-- 页面内容 -->
    <div class="page-content">
      <InstanceDetail
        ref="instanceDetailRef"
        :instance-id="instanceId"
        :resultAll="true"
      />
    </div>

    <!-- 停止确认弹窗 -->
    <el-dialog
      v-model="stopConfirmVisible"
      :title="$t('message.warning')"
      width="400px"
      class="confirm-dialog"
      :close-on-click-modal="true"
    >
      <div class="confirm-content">
        <el-icon class="confirm-icon" color="#f59e0b"><Warning /></el-icon>
        <p>{{ $t('message.confirmStop') }}</p>
      </div>
      <template #footer>
        <div class="confirm-footer">
          <button class="dialog-btn cancel" @click="stopConfirmVisible = false">
            {{ $t('message.cancel') }}
          </button>
          <button class="dialog-btn confirm" @click="confirmStop">
            {{ $t('message.confirm') }}
          </button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import InstanceDetail from "../common/InstanceDetail";
import { ArrowLeft, Refresh, RefreshRight, VideoPause, Warning } from '@element-plus/icons-vue';

export default {
  name: "InstanceDetailPage",
  components: {
    InstanceDetail,
    ArrowLeft,
    Refresh,
    RefreshRight,
    VideoPause,
    Warning
  },
  data() {
    return {
      stopConfirmVisible: false
    };
  },
  computed: {
    instanceId() {
      return this.$route.params.instanceId;
    },
    /** 当前实例状态 */
    currentStatus() {
      if (this.$refs.instanceDetailRef) {
        return this.$refs.instanceDetailRef.getCurrentStatus();
      }
      return null;
    },
    /** 是否可以重试（失败或停止状态） */
    canRetry() {
      const status = this.currentStatus;
      return status === 4 || status === 10; // FAILED or STOPPED
    },
    /** 是否可以停止（等待或运行中状态） */
    canStop() {
      const status = this.currentStatus;
      return status === 1 || status === 2 || status === 3; // WAITING_DISPATCH, WAITING_WORKER_RECEIVE, RUNNING
    }
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
    /** 处理重试 */
    handleRetry() {
      if (this.$refs.instanceDetailRef) {
        this.$refs.instanceDetailRef.retry();
      }
    },
    /** 处理停止（显示确认弹窗） */
    handleStop() {
      this.stopConfirmVisible = true;
    },
    /** 确认停止 */
    async confirmStop() {
      this.stopConfirmVisible = false;
      if (this.$refs.instanceDetailRef) {
        await this.$refs.instanceDetailRef.stop();
      }
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

.instance-detail-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  font-family: 'Outfit', -apple-system, sans-serif;
}

/* ========== 顶部操作栏 ========== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  color: #334155;
  transform: translateX(-2px);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #334155;
}

.action-btn.warning {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #f59e0b;
  color: #92400e;
}

.action-btn.warning:hover {
  background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
}

.action-btn.danger {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-color: #ef4444;
  color: #991b1b;
}

.action-btn.danger:hover {
  background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
}

/* ========== 页面内容 ========== */
.page-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* ========== 确认弹窗 ========== */
.confirm-dialog :deep(.el-dialog__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  margin-right: 0;
}

.confirm-dialog :deep(.el-dialog__body) {
  padding: 24px;
}

.confirm-dialog :deep(.el-dialog__footer) {
  padding: 12px 20px;
  border-top: 1px solid #e2e8f0;
}

.confirm-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.confirm-icon {
  font-size: 48px;
}

.confirm-content p {
  margin: 0;
  font-size: 15px;
  color: #334155;
  text-align: center;
}

.confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.dialog-btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dialog-btn.cancel {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.dialog-btn.cancel:hover {
  background: #e2e8f0;
  color: #334155;
}

.dialog-btn.confirm {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border: none;
  color: white;
}

.dialog-btn.confirm:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  transform: translateY(-1px);
}
</style>
