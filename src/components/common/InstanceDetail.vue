<template>
    <div>
        <el-row>
            <el-col :offset="20">
                <el-button type="primary" @click="fetchInstanceDetail">{{$t('message.refresh')}}</el-button>
            </el-col>
        </el-row>
        <el-row>
            <el-col :span="24" >
                {{$t('message.instanceId')}}: <span class='title' >{{instanceId}}</span>
            </el-col>
        </el-row>
        <el-row style="margin-top:-20px">
            <el-col :span="8">
                {{$t('message.status')}}: <span class='title' >{{this.common.translateInstanceStatus(instanceDetail.status)}}</span>
            </el-col>
            <el-col :span="16">
                {{$t('message.runningTimes')}}：<span class='title' >{{instanceDetail.runningTimes}}</span>
            </el-col>
        </el-row>
        <el-row>
            <el-col :span="24" >
                {{$t('message.taskTrackerAddress')}}: <span class='title' > {{instanceDetail.taskTrackerAddress}}</span>
            </el-col>
        </el-row>
        <el-row>
            <el-col :span="24" >
                {{$t('message.expectedTriggerTime')}}: <span class='title' > {{instanceDetail.expectedTriggerTime}}</span>
            </el-col>
        </el-row>
        <el-row>
            <el-col :span="8">
                {{$t('message.startTime')}}: <span class='title' > {{instanceDetail.actualTriggerTime}}</span>
            </el-col>
            <el-col :span="8">
                {{$t('message.finishedTime')}}: <span class='title' >{{instanceDetail.finishedTime}}</span>
            </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            {{$t('message.instanceParams')}}: <span class='title' > {{instanceDetail.instanceParams}}</span>
          </el-col>
        </el-row>
        <el-row>
            <el-col :span="24">
                {{$t('message.result')}}: <span class='title' > {{instanceDetail.result}}</span>
            </el-col>
        </el-row>
        <el-row id="taskDetail">
            {{$t('message.subTaskInfo')}}: <span class='title' >{{instanceDetail.taskDetail}}</span>
        </el-row>
        <el-divider content-position="center">{{$t('message.secondlyJobHistory')}}:</el-divider>
        <el-row>
            <el-table  :data="instanceDetail.subInstanceDetails" style="width: 100%">
                <el-table-column prop="subInstanceId" :label="$t('message.subInstanceId')" width="120"/>
                <el-table-column prop="startTime" :label="$t('message.startTime')" width="160"/>
                <el-table-column prop="finishedTime" :label="$t('message.finishedTime')" width="160"/>
                <el-table-column :label="$t('message.status')" width="160">
                    <template slot-scope="scope">
                        {{common.translateInstanceStatus(scope.row.status)}}
                    </template>
                </el-table-column>
                <el-table-column prop="result" :label="$t('message.result')"/>
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
