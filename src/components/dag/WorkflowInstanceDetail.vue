<template>
    <div>
        <el-row>
            <el-col :span="1">
                <el-button type="primary" @click="goback">返回</el-button>
            </el-col>
            <el-col :span="1" :offset="22">
                <el-button type="success" @click="fetchWfInstanceInfo">刷新</el-button>
            </el-col>
        </el-row>

        <el-row>
            <el-col :span="8">
                工作流ID:
                <span class="title">{{ wfInstanceDetail.workflowId }}</span>
            </el-col>
            <el-col :span="16">
                工作流实例ID
                <span class="title">{{ wfInstanceDetail.wfInstanceId }}</span>
            </el-col>
        </el-row>
        <el-row>
            <el-col :span="24">
                状态:
                <span class="title">{{ wfInstanceDetail.statusStr }}</span>
            </el-col>
        </el-row>
        <el-row>
            <el-col :span="8">
                触发时间:
                <span class="title">{{ wfInstanceDetail.actualTriggerTime }}</span>
            </el-col>
            <el-col :span="8">
                结束时间:
                <span class="title">{{ wfInstanceDetail.finishedTime }}</span>
            </el-col>
        </el-row>
        <el-row>
            <el-col :span="24">
                执行结果:
                <span class="title">{{ wfInstanceDetail.result }}</span>
            </el-col>
        </el-row>
        <el-row>
            <div>
                <svg width="100%" height="50vh" id="svgCanvas">
                    <g />
                    <rect />
                </svg>
            </div>
        </el-row>

    </div>
</template>

<script>
    import dagreD3 from "dagre-d3";
    import * as d3 from "d3";

    export default {
        name: "WorkflowInstanceDetail",
        data() {
            return {
                wfInstanceDetail: {
                }
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
                    let l = "jobId: " + node.jobId + "\n" +
                             "jobName:" + node.jobName + "\n" +
                             "instanceId:" + node.instanceId ;
                    return {
                        id: node.jobId,
                        label: l
                    }
                });

                // 添加节点
                nodes.forEach(node => {
                    g.setNode(node.id, node);
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

                let code;
                inner.selectAll("g.node").on("click", e => {
                    //点击事件
                    code = nodes.filter(item => {
                        return item.id == e;
                    });
                    console.log(code);
                });
            },
            goback: function () {
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

    svg {
        font-size: 14px;
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
