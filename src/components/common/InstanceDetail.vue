<template>
    <div>
        <el-row>
            <el-col :offset="20">
                <el-button type="primary" @click="fetchInstanceDetail">刷新</el-button>
            </el-col>
        </el-row>
        <el-row>
            <el-col :span="24" >
                任务实例ID: <span class='title' >{{instanceId}}</span>
            </el-col>
        </el-row>
        <el-row style="margin-top:-20px">
            <el-col :span="8">
                状态: <span class='title' >{{instanceDetail.status}}</span>
            </el-col>
            <el-col :span="16">
                运行次数：<span class='title' >{{instanceDetail.runningTimes}}</span>
            </el-col>
        </el-row>
        <el-row>
            <el-col :span="24" >
                TaskTracker地址: <span class='title' > {{instanceDetail.taskTrackerAddress}}</span>
            </el-col>
        </el-row>
        <el-row>
            <el-col :span="8">
                开始时间: <span class='title' > {{this.common.timestamp2Str(instanceDetail.actualTriggerTime)}}</span>
            </el-col>
            <el-col :span="8">
                结束时间: <span class='title' >{{this.common.timestamp2Str(instanceDetail.finishedTime)}}</span>
            </el-col>
        </el-row>
        <el-row>
            <el-col :span="24">
                运行结果: <span class='title' > {{instanceDetail.result}}</span>
            </el-col>
        </el-row>
        <el-row id="taskDetail">
            子任务数据: <span class='title' >{{instanceDetail.taskDetail}}</span>
        </el-row>
        <el-row>
            <span class="title">最近10条秒级任务历史记录:</span>
            <el-table  :data="instanceDetail.subInstanceDetails" style="width: 100%">
                <el-table-column prop="subInstanceId" label="子实例ID" width="100"/>
                <el-table-column prop="startTime" label="开始时间" width="160"/>
                <el-table-column prop="finishedTime" label="结束时间" width="160"/>
                <el-table-column prop="status" label="运行状态" width="100"/>
                <el-table-column prop="result" label="运行结果"/>
            </el-table>
        </el-row>
    </div>
</template>

<script>
    export default {
        name: "InstanceDetail",
        // 数据传递
        props: ["instanceId"],
        data() {
            return {
                instanceDetail: {},
            }
        },
        methods: {
            fetchInstanceDetail() {
                let that = this;
                let url = "/instance/detail?instanceId=" + this.instanceId;
                this.axios.get(url).then(res => that.instanceDetail = res);
            }
        },
        mounted() {
            console.log("using InstanceId: " + this.instanceId);
            this.fetchInstanceDetail();
        }
    }
</script>

<style scoped>
    .title{
        display: inline-block;
        margin:5px 0;
        font-size: 16px;
        font-weight: bold;
    }
</style>
