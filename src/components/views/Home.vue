<template>
    <div id="home">

        <!-- 第0行，显示时间信息 -->
        <el-row :gutter="24">
            <el-col :span="6">
                <el-card shadow="always">
                    调度中心服务器时间：{{ this.common.timestamp2Str(systemInfo.serverTime) }}
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="always">
                    本地浏览器时间：{{ this.common.timestamp2Str(new Date().getTime()) }}
                </el-card>
            </el-col>
            <a href="https://github.com/KFCFans/OhMyScheduler" target="_blank">
                <el-col :span="6">
                    <el-card shadow="always" style="text-align:center">
                        项目地址
                    </el-card>
                </el-col>
            </a>
            <a href="https://www.yuque.com/ohmyscheduler/guidence" target="_blank" style="text-align:center">
                <el-col :span="6">
                    <el-card shadow="always">
                        文档地址
                    </el-card>
                </el-col>
            </a>
        </el-row>

        <!-- 第一行，显示概览 overview -->
        <el-row :gutter="24">
            <el-col :span="6">
                <div class="wrap">
                    <div class="grid-content bg-purple">
                        <div class="text mTitle">任务总数</div>
                        <div class="text mText">{{systemInfo.jobCount}}</div>
                    </div>
                    <i class="el-icon-orange"/>
                </div>
            </el-col>
            <el-col :span="6">
                <div class="wrap">
                    <div class="grid-content bg-purple">
                        <div class="text mTitle">当前运行实例数</div>
                        <div class="text">{{systemInfo.runningInstanceCount}}</div>
                    </div>
                    <i class="el-icon-loading"/>
                </div>
            </el-col>
            <el-col :span="6">
                <div class="wrap">
                    <div class="grid-content bg-purple">
                        <div class="text mTitle">近期失败任务数</div>
                        <div class="text">{{systemInfo.failedInstanceCount}}</div>
                    </div>
                    <i class="el-icon-bell"/>
                </div>
            </el-col>
            <el-col :span="6">
                <div class="wrap">
                    <div class="grid-content bg-purple">
                        <div class="text mTitle">集群机器数</div>
                        <div class="text">{{activeWorkerCount}}</div>
                    </div>
                    <i class="el-icon-cpu"/>
                </div>
            </el-col>
        </el-row>

        <!-- 第二行，显示在线机器，包个容器方便日后更改 -->
        <el-row>
            <el-col :span="24">

                <!-- 只要在el-table元素中定义了height属性，即可实现固定表头的表格，而不需要额外的代码 -->
                <!-- 可以通过指定 Table 组件的 row-class-name 属性来为 Table 中的某一行添加 class，表明该行处于某种状 -->
                <el-table :data="workerList" style="width: 100%" height="400px" :row-class-name="workerTableRowClassName">
                    <el-table-column prop="address" label="机器地址"/>
                    <el-table-column prop="cpuLoad" label="CPU占用"/>
                    <el-table-column prop="memoryLoad" label="内存占用"/>
                    <el-table-column prop="diskLoad" label="磁盘占用"/>
                </el-table>

            </el-col>
        </el-row>
    </div>
</template>

<script>
    export default {
        name: "Home",
        data() {
            return {
                systemInfo: {
                    jobCount: "N/A",
                    runningInstanceCount: "N/A",
                    failedInstanceCount: "N/A",
                    serverTime: undefined
                },
                activeWorkerCount: "N/A",
                workerList: []
            }
        },
        methods: {
            workerTableRowClassName({row}) {
                switch (row.status) {
                    case 1: return 'success-row';
                    case 2: return 'warning-row';
                    case 3: return 'error-row';
                }
            }
        },
        mounted() {
            let that = this;
            let appId = that.$store.state.appInfo.id;
            // 请求 Worker 列表
            that.axios.get("/system/listWorker?appId=" + appId).then(res => {
                that.workerList = res;
                that.activeWorkerCount = that.workerList.length;
            });
            // 请求 Overview
            that.axios.get("/system/overview?appId=" + appId).then(res => {
                that.systemInfo = res;

                // 对比服务器时间和本地时间
                let localTime=new Date().getTime();
                let serverTime = res.serverTime;
                console.log("localTime: %o, serverTime: %o", localTime, serverTime);

                let offset = localTime - serverTime;
                // 误差大于一分钟，弹窗告警
                if (Math.abs(offset) > 60000) {
                    this.$notify({
                        title: '警告',
                        message: '调度中心服务器与本地存在时间差，可能影响任务调度准确性，建议排查时间问题！',
                        type: 'warning',
                        duration: 0
                    });
                }


            });
        }
    }
</script>

<style scoped>
    /* 头部信息 */
    .wrap {
        background: #fff;
        display: flex;
        text-align: center;
        justify-content: space-around;
        align-items: center;
        margin: 10px;
        box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.2);
        font-size: 1.5rem;
        font-weight: bolder;
        height: 131px;
    }
    .mTitle{
        font-size: 20px;
        color:#0f0f0fad;
        margin-bottom: 8px;
    }

    .el-card {
        margin: 10px;
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
</style>
