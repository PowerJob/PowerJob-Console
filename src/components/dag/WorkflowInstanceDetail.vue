<template>
    <div>
        <el-row>
            <el-col :span="1">
                <el-button type="primary" @click="back">返回</el-button>
            </el-col>
            <el-col :span="1" :offset="22">
                <el-button type="success" @click="fetchWfInstanceInfo">刷新</el-button>
            </el-col>
        </el-row>

        <el-row>
            <el-col :span="24">
                工作流整体状态：
                <span class="title">{{ wfInstanceDetail.statusStr }}</span>
            </el-col>
        </el-row>

        <el-row>
            <el-col :span="8">
                工作流ID：
                <span class="title">{{ wfInstanceDetail.workflowId }}</span>
            </el-col>
            <el-col :span="16">
                工作流实例ID：
                <span class="title">{{ wfInstanceDetail.wfInstanceId }}</span>
            </el-col>
        </el-row>
        <el-row>
            <el-col :span="8">
                触发时间：
                <span class="title">{{ wfInstanceDetail.actualTriggerTime }}</span>
            </el-col>
            <el-col :span="8">
                结束时间：
                <span class="title">{{ wfInstanceDetail.finishedTime }}</span>
            </el-col>
        </el-row>
        <el-row>
            <el-col :span="24">
                执行结果（tips：点击节点可查看任务实例详情）：
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

        <el-dialog title="任务实例详情" :visible.sync="instanceDetailVisible" v-if='instanceDetailVisible'>
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
                        case 3: color="#3498DB"; statusStr = "运行中";break;
                        case 4: color = "#EC7063"; statusStr = "失败";break;
                        case 5: color = "#58D68D"; statusStr = "成功";break;
                        case 10: color = "#F1C40F"; statusStr = "手动停止";break;
                        default: color = "#CACFD2"; statusStr = "等待上游节点";break;
                    }

                    let l = "任务ID: " + node.jobId + "\n" +
                             "任务名称:" + node.jobName + "\n" +
                             "状态:" + statusStr + "\n" +
                             "任务实例ID:" + node.instanceId ;


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
                                this.$message.warning("等待上游任务中...未生成任务实例，无法查看详情！")
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
