<template>
  <div class="home-dashboard">
    <!-- 核心指标 + Worker状态概览 - 双栏布局 -->
    <div class="main-content">
      <!-- 左侧：系统信息 -->
      <div class="system-info-panel">
        <div class="section-title">系统信息</div>

        <div class="system-info-grid">
          <div class="system-info-item">
            <div class="info-icon">
              <el-icon><Monitor /></el-icon>
            </div>
            <div class="info-content">
              <div class="info-label">应用名称</div>
              <div class="info-value">{{ systemInfo.appName }}</div>
            </div>
          </div>

          <div class="system-info-item">
            <div class="info-icon">
              <el-icon><Connection /></el-icon>
            </div>
            <div class="info-content">
              <div class="info-label">Master IP</div>
              <div class="info-value">{{ systemInfo.scheduleServerInfo.ip }}</div>
              <div class="info-subtitle">运行时间: {{formatUptime(systemInfo.scheduleServerInfo.bornTime)}}</div>
            </div>
          </div>

          <div class="system-info-item">
            <div class="info-icon">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="info-content">
              <div class="info-label">服务器时区</div>
              <div class="info-value">{{ systemInfo.timezone }}</div>
              <div class="info-subtitle">{{ formatServerTime(systemInfo.serverTime) }}</div>
            </div>
          </div>

          <div class="system-info-item">
            <div class="info-icon">
              <el-icon><LocationInformation /></el-icon>
            </div>
            <div class="info-content">
              <div class="info-label">本地时区</div>
              <div class="info-value">{{ getLocalTimezone() }}</div>
              <div class="info-subtitle">{{ getCurrentTime() }}</div>
            </div>
          </div>
        </div>
      </div>
      <!-- 右侧：核心指标 -->
      <div class="metrics-panel">
        <div class="section-title">核心指标</div>
        <div class="metrics-grid">
          <div class="metric-item jobs">
            <div class="metric-icon">
              <el-icon><Setting /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-number">{{systemInfo.jobCount}}</div>
              <div class="metric-label">{{$t('message.totalJobNum')}}</div>
            </div>
          </div>
          
          <div class="metric-item running">
            <div class="metric-icon">
              <el-icon><VideoPlay /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-number">{{systemInfo.runningInstanceCount}}</div>
              <div class="metric-label">{{$t('message.runningInstanceNum')}}</div>
            </div>
            <div class="running-pulse"></div>
          </div>
          
          <div class="metric-item failed">
            <div class="metric-icon">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-number">{{systemInfo.failedInstanceCount}}</div>
              <div class="metric-label">{{$t('message.recentFailedInstanceNum')}}</div>
            </div>
            <div class="failure-indicator" v-if="systemInfo.failedInstanceCount > 0"></div>
          </div>
          
          <div class="metric-item workers">
            <div class="metric-icon">
              <el-icon><Server /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-number">{{activeWorkerCount}}</div>
              <div class="metric-label">{{$t('message.workerNum')}}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Worker节点列表 -->
    <div class="workers-section">
      <div class="section-header">
        <div class="section-title">
          Worker节点列表
          <div class="worker-summary">
            <el-tag type="success" size="small">低负载 {{getOnlineWorkerCount()}}</el-tag>
            <el-tag type="warning" size="small">中负载 {{getWarningWorkerCount()}}</el-tag>
            <el-tag type="danger" size="small">高负载 {{getDangerousWorkerCount()}}</el-tag>
            <el-tag type="info" size="small">已离线 {{getOfflineWorkerCount()}}</el-tag>
          </div>
        </div>
      </div>
      
      <div class="pj-table">
        <el-table 
          :data="workerList" 
          style="width: 100%" 
          :row-class-name="workerTableRowClassName"
          :default-sort="{prop: 'status', order: 'ascending'}"
          size="small"
          table-layout="fixed"
        >
          <el-table-column width="50" align="center">
            <template #default="scope">
              <div class="worker-status-indicator" :class="getWorkerStatusClass(scope.row.status)"></div>
            </template>
          </el-table-column>
          <el-table-column prop="address" :label="$t('message.workerAddress')"/>
          <el-table-column prop="version" label="版本" width="120" show-overflow-tooltip align="center">
            <template #default="scope">
              <span v-if="scope.row.version" class="version-text">{{scope.row.version}}</span>
              <span v-else class="text-placeholder">-</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('message.cpuLoad')" width="140" sortable align="center">
            <template #default="scope">
              <div class="load-cell" v-if="scope.row.cpuLoad">
                <span class="load-text">{{formatLoadDisplay(scope.row.cpuLoad)}}</span>
              </div>
              <span v-else class="text-placeholder">-</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('message.memoryLoad')" width="140" sortable align="center">
            <template #default="scope">
              <div class="load-cell" v-if="scope.row.memoryLoad">
                <span class="load-text">{{formatLoadDisplay(scope.row.memoryLoad)}}</span>
              </div>
              <span v-else class="text-placeholder">-</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('message.diskLoad')" width="140" sortable align="center">
            <template #default="scope">
              <div class="load-cell" v-if="scope.row.diskLoad">
                <span class="load-text">{{formatLoadDisplay(scope.row.diskLoad)}}</span>
              </div>
              <span v-else class="text-placeholder">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="tag" label="标签" width="120" show-overflow-tooltip align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.tag" size="small" type="info">{{scope.row.tag}}</el-tag>
              <span v-else class="text-placeholder">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="lastActiveTime" :label="$t('message.lastActiveTime')" width="150" sortable align="center" />
        </el-table>
      </div>
    </div>
  </div>
</template>

<script>
import { 
  Monitor, Connection, Clock, LocationInformation, 
  Setting, VideoPlay, Warning, Server
} from '@element-plus/icons-vue';

export default {
  name: "Home",
  components: {
    Monitor, Connection, Clock, LocationInformation,
     Setting, VideoPlay, Warning, Server
  },
  data() {
    return {
      systemInfo: {
        appName: 'UNKNOWN',
        jobCount: "N/A",
        runningInstanceCount: "N/A",
        failedInstanceCount: "N/A",
        serverTime: "UNKNOWN",
        timezone: "UNKNOWN",
        scheduleServerInfo: {
          ip:'UNKNOWN',
          bornTime: undefined
        }
      },
      activeWorkerCount: "N/A",
      workerList: [],
      currentTime: ''
    }
  },
  methods: {
    workerTableRowClassName({row}) {
      switch (row.status) {
        case 1: return 'success-row';
        case 2: return 'warning-row';
        case 9999: return 'offline-row';
        default: return 'error-row';
      }
    },
    
    // 获取Worker状态样式类
    getWorkerStatusClass(status) {
      switch (status) {
        case 1: return 'online';
        case 2: return 'warning';
        case 3: return 'error';
        case 9999: return 'offline';
        default: return 'error';
      }
    },
    
    // 格式化运行时间
    formatUptime(bornTime) {
      if (!bornTime) return '未知';
      const now = Date.now();
      const diff = now - bornTime;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        return `${days}天${hours}小时`;
      }
      return `${hours}小时`;
    },
    
    // 格式化服务器时间
    formatServerTime(serverTime) {
      if (!serverTime || serverTime === 'UNKNOWN') return '未知';
      return this.common.timestamp2Str(serverTime);
    },
    
    // 获取本地时区
    getLocalTimezone() {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    },
    
    // 获取当前时间
    getCurrentTime() {
      return this.common.timestamp2Str(new Date().getTime());
    },
    
    // 统计在线Worker数量
    getOnlineWorkerCount() {
      return this.workerList.filter(w => w.status === 1).length;
    },
    
    // 统计警告Worker数量
    getWarningWorkerCount() {
      return this.workerList.filter(w => w.status === 2).length;
    },

    // 统计警告Worker数量
    getDangerousWorkerCount() {
      return this.workerList.filter(w => w.status === 3).length;
    },
    
    // 统计离线Worker数量  
    getOfflineWorkerCount() {
      return this.workerList.filter(w => w.status === 9999).length;
    },
    
    // 更新当前时间
    updateCurrentTime() {
      this.currentTime = this.getCurrentTime();
    },

    // 格式化负载百分比用于进度条
    formatLoadPercentage(loadStr) {
      if (!loadStr || typeof loadStr !== 'string') return '0%';
      
      // 处理类似 "6.8 / 11 cores" 的格式
      if (loadStr.includes('/')) {
        const parts = loadStr.split('/');
        if (parts.length >= 2) {
          const current = parseFloat(parts[0].trim());
          const total = parseFloat(parts[1].split(' ')[0].trim());
          if (!isNaN(current) && !isNaN(total) && total > 0) {
            return Math.min(100, (current / total) * 100) + '%';
          }
        }
      }
      
      // 处理百分比格式
      const percentage = parseFloat(loadStr);
      if (!isNaN(percentage)) {
        return Math.min(100, percentage) + '%';
      }
      
      return '0%';
    },

    // 格式化负载显示文本
    formatLoadDisplay(loadStr) {
      if (!loadStr || typeof loadStr !== 'string') return '-';
      
      // 处理类似 "6.8 / 11 cores" 的格式
      if (loadStr.includes('/')) {
        const parts = loadStr.split('/');
        if (parts.length >= 2) {
          const current = parseFloat(parts[0].trim());
          const total = parseFloat(parts[1].split(' ')[0].trim());
          if (!isNaN(current) && !isNaN(total) && total > 0) {
            const percentage = (current / total) * 100;
            return percentage.toFixed(1) + '%';
          }
        }
        return loadStr; // 保留原始格式作为后备
      }
      
      // 处理百分比格式
      const percentage = parseFloat(loadStr);
      if (!isNaN(percentage)) {
        return percentage.toFixed(1) + '%';
      }
      
      return loadStr;
    }
  },
  
  mounted() {
    let that = this;
    let appId = window.localStorage.getItem("Power_appId");
    
    // 请求 Worker 列表
    that.axios.get("/system/listWorker?appId=" + appId).then(res => {
      res.sort((a,b) => a.status - b.status );
      that.workerList = res;
      let num = 0;
      that.workerList.forEach(w => {
        if (w.status !== 9999) {
          num++;
        }
      })
      that.activeWorkerCount = num;
    });
    
    // 请求 Overview
    that.axios.get("/system/overview?appId=" + appId).then(res => {
      that.systemInfo = res;
    });
    
    // 每秒更新一次当前时间
    this.timeInterval = setInterval(() => {
      this.updateCurrentTime();
    }, 1000);
  },
  
  beforeUnmount() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }
}
</script>

<style scoped lang="scss">
/* 优化后的紧凑Dashboard样式 */
.home-dashboard {
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
}

/* 顶部系统信息条 - 紧凑设计 */
.system-info-bar {
  display: flex;
  align-items: center;
  background: var(--pj-bg-white);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  gap: 24px;
  flex-wrap: wrap;

  .info-item {
    display: flex;
    align-items: center;
    gap: 8px;

    .info-icon {
      font-size: 16px;
      color: var(--pj-primary);
    }

    .info-text {
      font-size: 14px;
      color: var(--pj-text-primary);
      font-weight: 500;
    }
  }

  .sync-status {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--pj-success);
    font-size: 13px;
    margin-left: auto;
    
    .sync-icon {
      animation: spin 2s linear infinite;
    }
  }
}

/* 主要内容区域 - 双栏布局 */
.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

/* 左侧核心指标面板 */
.metrics-panel {
  background: var(--pj-bg-white);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--pj-text-primary);
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--pj-primary);
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .metric-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #f8fafc;
    border-radius: 8px;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .metric-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }

    .metric-info {
      flex: 1;
      min-width: 0;

      .metric-number {
        font-size: 20px;
        font-weight: 700;
        color: var(--pj-text-primary);
        line-height: 1;
      }

      .metric-label {
        font-size: 12px;
        color: var(--pj-text-secondary);
        margin-top: 4px;
      }
    }

    &.jobs .metric-icon {
      background: linear-gradient(135deg, #1890ff, #40a9ff);
      color: white;
    }

    &.running .metric-icon {
      background: linear-gradient(135deg, #52c41a, #73d13d);
      color: white;
    }

    &.failed .metric-icon {
      background: linear-gradient(135deg, #ff4d4f, #ff7875);
      color: white;
    }

    &.workers .metric-icon {
      background: linear-gradient(135deg, #722ed1, #9254de);
      color: white;
    }
  }
}

/* 右侧系统信息面板 */
.system-info-panel {
  background: var(--pj-bg-white);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--pj-text-primary);
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--pj-primary);
  }

  .system-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .system-info-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: #f8fafc;
    border-radius: 8px;
    transition: all 0.3s ease;

    &:hover {
      background: #e6f7ff;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .info-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
      background: linear-gradient(135deg, var(--pj-primary), var(--pj-primary-light));
      color: white;
    }

    .info-content {
      flex: 1;
      min-width: 0;

      .info-label {
        font-size: 12px;
        color: var(--pj-text-secondary);
        margin-bottom: 4px;
        font-weight: 500;
      }

      .info-value {
        font-size: 14px;
        font-weight: 600;
        color: var(--pj-text-primary);
        margin-bottom: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .info-subtitle {
        font-size: 11px;
        color: var(--pj-text-disabled);
        line-height: 1.2;
      }
    }
  }
}

/* Worker节点列表区域 */
.workers-section {
  background: var(--pj-bg-white);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .section-title {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 16px;
      font-weight: 600;
      color: var(--pj-text-primary);

      .worker-summary {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
    }
  }

  .pj-table {
    overflow-x: auto;
    
    .el-table {
      min-width: 800px;
    }
  }

  .worker-status-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin: 0 auto;
    
    &.online {
      background: var(--pj-success);
      box-shadow: 0 0 6px rgba(82, 196, 26, 0.3);
    }
    
    &.warning {
      background: var(--pj-warning);
      animation: pulse 2s infinite;
    }
    
    &.offline {
      background: #d9d9d9;
    }
    
    &.error {
      background: var(--pj-error);
    }
  }
  
  .load-cell {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    
    .load-bar {
      flex: 1;
      height: 6px;
      background: #f0f0f0;
      border-radius: 3px;
      overflow: hidden;
      min-width: 60px;
      
      .load-progress {
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s ease;
      }
    }
    
    .load-text {
      font-size: 11px;
      color: var(--pj-text-secondary);
      min-width: 40px;
      text-align: right;
      flex-shrink: 0;
    }
  }
  
  .text-placeholder {
    color: var(--pj-text-disabled);
    font-style: italic;
  }

  .version-text {
    font-size: 12px;
    color: var(--pj-text-primary);
    font-weight: 500;
    background: #f0f2f5;
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-block;
  }
}

/* 运行中任务动画效果 */
.running-pulse {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--pj-success), transparent);
  animation: sweep 2s infinite;
}

/* 失败任务指示器 */
.failure-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 6px;
  height: 6px;
  background: var(--pj-error);
  border-radius: 50%;
  animation: blink 1s infinite;
}

/* 动画效果 */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes sweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  
  .system-info-panel .system-info-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .home-dashboard {
    padding: 8px;
  }
  
  .system-info-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    
    .sync-status {
      margin-left: 0;
    }
  }
  
  .metrics-panel .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .system-info-panel .system-info-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<!-- 全局属性，解决 element-ui 的 row-class-name 不生效问题 -->
<style>
    .el-table .warning-row {
        color: darkgoldenrod;
    }

    .el-table .success-row {
        color: green;
    }

    .el-table .error-row {
        color: red;
    }

    .el-table .offline-row {
        color: darkgray;
    }
</style>
