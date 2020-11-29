<template>
    <div>
        <el-row>
            <el-col :span="1">
                <el-button type="primary" @click="back">{{$t('message.back')}}</el-button>
            </el-col>
            <el-col :span="1" :offset="17">
                <el-button type="success" @click="fetchWfInstanceInfo">{{$t('message.refresh')}}</el-button>
            </el-col>
        </el-row>

        <el-row>
            <el-col :span="24">
                {{$t('message.status')}}：
                <span class="title">{{ this.common.translateWfInstanceStatus(wfInstanceDetail.status) }}</span>
            </el-col>
        </el-row>

        <el-row>
            <el-col :span="8">
                {{$t('message.wfId')}}：
                <span class="title">{{ wfInstanceDetail.workflowId }}</span>
            </el-col>
            <el-col :span="16">
                {{$t('message.wfInstanceId')}}：
                <span class="title">{{ wfInstanceDetail.wfInstanceId }}</span>
            </el-col>
        </el-row>
        <el-row>
            <el-col :span="8">
                {{$t('message.expectedTriggerTime')}}：
                <span class="title">{{ wfInstanceDetail.expectedTriggerTime }}</span>
            </el-col>
            <el-col :span="8">
                {{$t('message.triggerTime')}}：
                <span class="title">{{ wfInstanceDetail.actualTriggerTime }}</span>
            </el-col>
            <el-col :span="8">
                {{$t('message.finishedTime')}}：
                <span class="title">{{ wfInstanceDetail.finishedTime }}</span>
            </el-col>
        </el-row>
      <el-row>
        <el-col :span="24">
          {{$t('message.wfInitParams')}}：
          <span class="title">{{ wfInstanceDetail.wfInitParams }}</span>
        </el-col>
      </el-row>
        <el-row>
            <el-col :span="24">
                {{$t('message.result')}}（{{$t('message.wfTips')}}）：
                <span class="title">{{ wfInstanceDetail.result }}</span>
            </el-col>
        </el-row>
        <el-row>
            <div>
                <svg width="80%" height=1000px id="svgCanvas">
                    <g />
                    <rect />
                </svg>
            </div>
        </el-row>

        <el-dialog :visible.sync="instanceDetailVisible" v-if='instanceDetailVisible'>
            <InstanceDetail :instance-id="currentInstanceId"/>
        </el-dialog>
    </div>
</template>

<script>
    import dagreD3 from "dagre-d3";
    import * as d3 from "d3";

    import InstanceDetail from "../common/InstanceDetail";

    export default {
        name: "WorkflowInstanceDetail",
        components: {
            InstanceDetail
        },
        data() {
            return {
                wfInstanceDetail: {
                },
                // 任务实例详情
                currentInstanceId: undefined,
                instanceDetailVisible: false
            }
        },
        methods: {
            fetchWfInstanceInfo: function () {

                let that = this;
                // 从 router 获取 wfInstanceId
                const wfInstanceId = this.$route.params.wfInstanceId;
                console.log("wfInstanceId: " + wfInstanceId);

                let url = "/wfInstance/info?appId=" + this.$store.state.appInfo.id + "&wfInstanceId=" + wfInstanceId;
                this.axios.get(url).then(res => {
                    that.wfInstanceDetail = res;
                    that.draw();
                });
            },
            draw: function () {

                console.log(this.wfInstanceDetail);
                //获取D3
                var g = new dagreD3.graphlib.Graph().setGraph({});

                // 转化节点
                let nodes = this.wfInstanceDetail.peworkflowDAG.nodes.map(node => {

                    // 计算颜色 1:等待上游节点，3:运行中，4:失败，5:成功，10:手动停止
                    let color;
                    let statusStr;
                    switch (node.status) {
                        case 3: color="#3498DB"; statusStr = this.$t('message.running');break;
                        case 4: color = "#EC7063"; statusStr = this.$t('message.failed');break;
                        case 5: color = "#58D68D"; statusStr = this.$t('message.success');break;
                        case 10: color = "#F1C40F"; statusStr = this.$t('message.stopped');break;
                        default: color = "#CACFD2"; statusStr = this.$t('message.waitingUpstream');break;
                    }

                    let l = this.$t('message.jobId') + ": " + node.jobId + "\n" +
                             this.$t('message.jobName') + ": " + node.jobName + "\n" +
                             this.$t('message.status') + ": " + statusStr + "\n" +
                             this.$t('message.instanceId') + ": " + node.instanceId ;


                    return {
                        id: node.jobId,
                        label: l,
                        color: color
                    }
                });

                // 添加节点
                nodes.forEach(node => {
                    g.setNode(node.id, node);
                    // 设置颜色
                    g.node(node.id).style = 'fill:' + node.color;
                });
                // 链接关系
                this.wfInstanceDetail.peworkflowDAG.edges.forEach(item => {
                    g.setEdge(item.from, item.to, {});
                });
                //绘制图形
                var svg = d3.select("svg"),
                    inner = svg.select("g");

                //缩放
                var zoom = d3.zoom().on("zoom", function () {
                    inner.attr("transform", d3.event.transform);
                });
                svg.call(zoom);
                var render = new dagreD3.render();
                render(inner, g);

                inner.selectAll("g.node").on("click", e => {
                    this.wfInstanceDetail.peworkflowDAG.nodes.forEach(node => {
                        if (node.jobId == e) {
                            if (node.instanceId == undefined) {
                                this.$message.warning(this.$t('message.ntfClickWaitingNode'))
                            }else {
                                this.currentInstanceId = node.instanceId;
                                this.instanceDetailVisible = true;
                            }
                        }
                    })
                });
            },
            back: function () {
                this.$router.go(-1);
            }
        },
        mounted() {
            console.log("Welcome to WorkflowInstanceDetail!");
            this.fetchWfInstanceInfo();
        }
    }
</script>

<style scoped>

    .el-row {
        margin: 20px;
    }

    .title{
        display: inline-block;
        margin:5px 0;
        font-size: 16px;
        font-weight: bold;
    }

    svg {
        font-size: 16px;
    }

    .node rect {
        stroke: #606266;
        fill: #fff;
    }

    .edgePath path {
        stroke: #606266;
        fill: #333;
        stroke-width: 1.5px;
    }

</style>
