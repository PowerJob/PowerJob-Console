<template>
    <div>
        <el-row style="margin: 20px">
            <el-col :span="1">
                <el-button type="primary" @click="back">{{$t('message.back')}}</el-button>
            </el-col>
            <el-col :span="1" :offset="22">
                <el-button type="success" @click="saveWorkflow">{{$t('message.save')}}</el-button>
            </el-col>
        </el-row>

        <el-row>
            <el-form ref="form" :model="workflowInfo">

                <el-form-item :label="$t('message.wfName')">
                    <el-input v-model="workflowInfo.wfName"/>
                </el-form-item>
                <el-form-item :label="$t('message.wfDescription')">
                    <el-input v-model="workflowInfo.wfDescription"/>
                </el-form-item>

                <el-form-item :label="$t('message.scheduleInfo')">
                    <el-row>
                        <el-col :span="6">
                            <el-select v-model="workflowInfo.timeExpressionType" :placeholder="$t('message.timeExpressionType')">
                                <el-option
                                        v-for="item in timeExpressionTypeOptions"
                                        :key="item.key"
                                        :label="item.label"
                                        :value="item.key">
                                </el-option>
                            </el-select>
                        </el-col>
                        <el-col :span="12">
                            <el-input v-model="workflowInfo.timeExpression" :placeholder="$t('message.wfTimeExpressionPLH')" />
                        </el-col>
                        <el-col :span="4">
                            <el-button type="text" @click="onClickValidateTimeExpression">{{$t('message.validateTimeExpression')}}</el-button>
                        </el-col>
                    </el-row>
                </el-form-item>

                <el-form-item :label="$t('message.maxInstanceNum')">
                    <el-input-number v-model="workflowInfo.maxWfInstanceNum"/>
                </el-form-item>

                <el-form-item :label="$t('message.alarmConfig')">
                    <el-select v-model="workflowInfo.notifyUserIds" multiple filterable :placeholder="$t('message.alarmSelectorPLH')">
                        <el-option
                                v-for="user in userList"
                                :key="user.id"
                                :label="user.username"
                                :value="user.id">
                        </el-option>
                    </el-select>
                </el-form-item>
            </el-form>
        </el-row>

        <el-row>
            <el-row>
                <el-button @click="onClickImportNode">{{$t('message.importJob')}}</el-button>
                <el-button @click="onClickRemoveNode">{{$t('message.deleteJob')}}</el-button>
                <el-button @click="onClickAddFrom">{{$t('message.newStartPoint')}}</el-button>
                <el-button @click="onClickAddTo">{{$t('message.newEndPoint')}}</el-button>
                <el-button @click="onClickRemoveEdge">{{$t('message.deleteEdge')}}</el-button>
            </el-row>
            <div>
                <svg width="80%" height=1000px id="svgCanvas">
                    <g />
                    <rect />
                </svg>
            </div>
        </el-row>

        <!-- 导入选择器 -->
        <el-drawer
                :title="$t('message.importJobTitle')"
                :visible.sync="importDrawerVisible"
                direction="rtl"
                size="50%">
            <el-row>
                <el-form :inline="true" :model="jobQueryContent" class="el-form--inline">
                    <el-form-item :label="$t('message.jobId')">
                        <el-input v-model="jobQueryContent.jobId" :placeholder="$t('message.jobId')"/>
                    </el-form-item>
                    <el-form-item :label="$t('message.keyword')">
                        <el-input v-model="jobQueryContent.keyword" :placeholder="$t('message.keyword')"/>
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" @click="listJobInfos">{{$t('message.query')}}</el-button>
                        <el-button type="cancel" @click="onClickReset">{{$t('message.reset')}}</el-button>
                    </el-form-item>
                </el-form>
            </el-row>
            <el-table :data="jobInfoPageResult.data">
                <el-table-column property="id" :label="$t('message.jobId')"/>
                <el-table-column property="jobName" :label="$t('message.jobName')"/>
                <el-table-column :label="$t('message.operation')">
                    <template slot-scope="scope">
                        <el-button size="medium" @click="importNode(scope.row)">{{$t('message.import')}}</el-button>
                    </template>
                </el-table-column>
            </el-table>

            <el-row>
                <el-pagination
                        layout="prev, pager, next"
                        :total="this.jobInfoPageResult.totalItems"
                        :page-size="this.jobInfoPageResult.pageSize"
                        @current-change="onClickChangePage"/>
            </el-row>
        </el-drawer>

        <el-dialog :visible.sync="timeExpressionValidatorVisible" v-if='timeExpressionValidatorVisible'>
            <TimeExpressionValidator :time-expression="workflowInfo.timeExpression" :time-expression-type="workflowInfo.timeExpressionType"/>
        </el-dialog>
    </div>
</template>

<script>
    import TimeExpressionValidator from "../common/TimeExpressionValidator";
    import dagreD3 from "dagre-d3";
    import * as d3 from "d3";

    export default {
        name: "WorkflowEditor",
        components: {TimeExpressionValidator},
        data() {
            return {
                workflowInfo: {
                    appId: this.$store.state.appInfo.id,
                    enable: true,
                    maxWfInstanceNum: 1,
                    notifyUserIds: [],
                    peworkflowDAG: {
                        nodes: [],
                        edges:[]
                    },
                    timeExpression: undefined,
                    timeExpressionType: undefined,
                    wfDescription: undefined,
                    wfName: undefined
                },
                timeExpressionTypeOptions: [{key: "API", label: "API"}, {key: "CRON", label: "CRON"} ],
                userList: [],

                // 导入任务相关
                importDrawerVisible: false,
                jobQueryContent: {
                    appId: this.$store.state.appInfo.id,
                    index: 0,
                    pageSize: 8,
                    jobId: undefined,
                    keyword: undefined
                },
                jobInfoPageResult: {
                    pageSize: 20,
                    totalItems: 0,
                    data: []
                },

                // 事件（1：新增起点，2：新增终点，3：删除节点；4：删除边）
                event: undefined,
                from: undefined,

                // 时间表达式校验窗口
                timeExpressionValidatorVisible: false
            }
        },
        methods: {
            // 返回上一页
            back: function () {
                this.$router.go(-1);
            },
            /* ******** 导入任务相关，所有函数与 JobManager 重复，需要前端大佬重构！ ******** */
            // 点击重置按钮
            onClickReset() {
                this.jobQueryContent.keyword = undefined;
                this.jobQueryContent.jobId = undefined;
                this.listJobInfos();
            },
            // 列出符合当前搜索条件的任务
            listJobInfos() {
                const that = this;
                this.axios.post("/job/list", this.jobQueryContent).then((res) => {
                    that.jobInfoPageResult = res;
                });
            },
            // 点击 换页
            onClickChangePage(index) {
                // 后端从0开始，前端从1开始
                this.jobQueryContent.index = index - 1;
                this.listJobInfos();
            },
            onClickImportNode() {
                this.listJobInfos();
                this.importDrawerVisible = true;
            },
            // 导入任务，需要去重
            importNode(data) {
                let canSave = true;
                this.workflowInfo.peworkflowDAG.nodes.forEach(node => {
                   if (data.id === node.jobId) {
                       canSave = false;
                       console.log("nodes in workflow cannot be duplicated");
                   }
                });
                if (canSave) {
                    console.log("add node: " + data.id);
                    this.workflowInfo.peworkflowDAG.nodes.push({jobId: data.id, jobName: data.jobName});
                    this.draw();
                }
            },
            // 删除任务
            onClickRemoveNode() {
                this.event = 3;
                this.$message.info(this.$t('message.ntfClickNeedDeleteNode'));
            },
            onClickAddFrom() {
                this.event = 1;
                this.$message.info(this.$t('message.ntfClickStartPoint'));
            },
            onClickAddTo() {
                this.event = 2;
                this.$message.info(this.$t('message.ntfClickTargetPoint'));
            },
            onClickRemoveEdge() {
                this.event = 4;
                this.$message.info(this.$t('message.ntfClickDeleteEdge'));
            },
            // 保存工作流
            saveWorkflow() {
                const that = this;
                this.axios.post("/workflow/save", this.workflowInfo).then(() => {
                    that.$message.success(this.$t('message.success'));
                    that.back();
                });
            },
            draw() {

                console.log("draw by data: " + JSON.stringify(this.workflowInfo.peworkflowDAG));
                //获取D3
                var g = new dagreD3.graphlib.Graph().setGraph({});

                let nodes = this.workflowInfo.peworkflowDAG.nodes.map(node => {
                    return {
                        id: node.jobId,
                        label: "jobId: " + node.jobId + "\n" +
                                "jobName: " + node.jobName
                    }
                });

                // 添加节点
                nodes.forEach(node => {
                    g.setNode(node.id, node);
                });
                // 链接关系
                this.workflowInfo.peworkflowDAG.edges.forEach(item => {
                    g.setEdge(item.from, item.to, {
                        // style: "stroke-width: 1.5;"
                    })
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

                // 添加节点监听
                inner.selectAll("g.node").on("click", e => {
                    for (let i = 0; i < this.workflowInfo.peworkflowDAG.nodes.length; i++) {
                        if (e == this.workflowInfo.peworkflowDAG.nodes[i].jobId) {
                            console.log("onClickNode, jobId=" + e);
                            this.onClickDAGNode(e, g);
                        }
                    }
                });
                // 添加边监听
                inner.selectAll("path").on("click", e => {
                    if (this.event === 4) {
                        let oldEdges = this.workflowInfo.peworkflowDAG.edges;
                        this.workflowInfo.peworkflowDAG.edges= [];
                        // 删除节点相关的所有边
                        oldEdges.forEach(edge => {
                            if (!(edge.from == e.v && edge.to == e.w)) {
                                this.workflowInfo.peworkflowDAG.edges.push(edge);
                            }
                            this.draw();
                        });
                    }
                });
            },
            onClickDAGNode(nodeId, g) {
                switch (this.event) {
                    case 3: {
                        g.removeNode(nodeId);
                        let nodesArr = this.workflowInfo.peworkflowDAG.nodes;
                        let oldEdges = this.workflowInfo.peworkflowDAG.edges;
                        this.workflowInfo.peworkflowDAG.edges = [];
                        // 删除节点
                        nodesArr.splice(nodesArr.findIndex(item => item.jobId == nodeId), 1);
                        // 删除节点相关的所有边
                        oldEdges.forEach(edge => {
                            if (edge.from == nodeId || edge.to == nodeId) {
                                console.log("remove edge: " + JSON.stringify(edge));
                            }else {
                                this.workflowInfo.peworkflowDAG.edges.push(edge);
                            }
                        });

                        this.draw();
                        break;
                    }
                    case 1: {
                        this.from = nodeId;
                        break;
                    }
                    case 2: {
                        let to = nodeId;
                        if (this.from === undefined) {
                            this.$message.warning(this.$t('message.ntfAddStartPointFirst'));
                            break;
                        }
                        if (this.from === to) {
                            this.$message.warning(this.$t('message.ntfInvalidEdge'));
                            break;
                        }

                        let canSave = true;
                        this.workflowInfo.peworkflowDAG.edges.forEach(edge => {
                            if (edge.from === this.from && edge.to === to) {
                                canSave = false;
                                console.log("edge(%o -> %o) already exists!", this.from, to);
                            }
                        });

                        if (canSave) {
                            this.workflowInfo.peworkflowDAG.edges.push({from: this.from, to: to});
                            console.log("new edge(%o -> %o)", this.from, to);
                        }
                        this.draw();
                        break;
                    }
                }
            },
            onClickValidateTimeExpression() {
                this.timeExpressionValidatorVisible = true;
            }

        },
        mounted() {

            // 加载用户信息
            let that = this;
            that.axios.get("/user/list").then(res => that.userList = res);

            // 读取传递数据，如果是修改，需要先将数据绘制上去
            let modify = this.$route.params.modify;
            if (modify) {
                this.workflowInfo = this.$route.params.workflowInfo;
                this.workflowInfo.appId = this.$store.state.appInfo.id;
                this.draw();
            }
        }
    }
</script>

<style scoped>
    .el-input {
        width: 80%;
    }
    .title{
        display: inline-block;
        margin:5px 0;
        font-size: 16px;
        font-weight: bold;
    }
</style>

<!-- can't use scope, or dag will be the black block, maybe this is the bug of d3.js -->
<style>

    svg {
        font-size: 16px;
        border: 1px solid red;
    }

    .node rect {
        stroke: #999;
        fill: #fff;
        stroke-width: 1.5px;
    }

    .edgePath path {
        stroke: #333;
        stroke-width: 1px;
    }
</style>
