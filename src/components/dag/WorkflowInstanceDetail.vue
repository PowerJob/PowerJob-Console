<template>
    <div>
        <el-row>
            <div class="power-toolbtn">
                <div>
                    <el-button type="primary" @click="back">{{$t('message.back')}}</el-button>
                </div>
                <div>
                    <el-button @click="fetchWfInstanceInfo">{{$t('message.refresh')}}</el-button>
                    <el-button type="warning" @click="restart">{{$t('message.reRun')}}</el-button>
                    <el-button type="danger" @click="stop">{{$t('message.stop')}}</el-button>
                </div>
            </div>
        </el-row>

        <el-row class="power-work-info-item">
            <el-col :span="24">
                {{$t('message.status')}}：
                <span class="title">{{ this.common.translateWfInstanceStatus(wfInstanceDetail.status) }}</span>
            </el-col>
        </el-row>

        <el-row class="power-work-info-item">
            <el-col :span="8">
                {{$t('message.wfId')}}：
                <span class="title">{{ wfInstanceDetail.workflowId }}</span>
            </el-col>
            <el-col :span="16">
                {{$t('message.wfInstanceId')}}：
                <span class="title">{{ wfInstanceDetail.wfInstanceId }}</span>
            </el-col>
        </el-row>
        <el-row class="power-work-info-item">
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
        <el-row class="power-work-info-item">
            <el-col :span="24">
            {{$t('message.wfInitParams')}}：
            <span class="title">{{ wfInstanceDetail.wfInitParams }}</span>
            </el-col>
        </el-row>
        <el-row v-if="wfInstanceDetail.wfContext" class="power-work-info-item">
            <div>
                <el-col :span="24">
                    {{$t('message.wfContext')}}：
                    <el-popover width="400" placement="top" trigger="click">
                        <div class="power-work-info-item-content">
                            <JsonViewer :value="JSON.parse(wfInstanceDetail.wfContext)" />
                        </div>
                        <span class="power-work-info-item-context" slot="reference">{{wfInstanceDetail.wfContext}}</span>
                        <!-- <i class="el-icon-chat-dot-square result" slot="reference"></i> -->
                    </el-popover>
                </el-col>
            </div>
        </el-row>
        <el-row class="power-work-info-item">
            <el-col :span="24">
                {{$t('message.result')}}（{{$t('message.wfTips')}}）：
                <span class="title">{{ wfInstanceDetail.result }}</span>
            </el-col>
        </el-row>
        <el-row>
            <div>
                <PowerWorkFlow 
                    v-if="peworkflowDAG.nodes.length > 0" 
                    :rightFixed="421"
                    :nodes="peworkflowDAG.nodes" 
                    :edges="peworkflowDAG.edges" 
                    :selectNode="selectNode" 
                    :defaultWidthInc="245"
                    :interceptSelectedNode="interceptSelectedNode"
                    mode="view"
                    @getDag="getDag" 
                    @onSelectedNode="handleSelectedNode"
                    @onClearSelectNode="handleClearSelectNode"
                >
                    <template v-slot:tool>
                        <div @click="markedSuccess">
                            <el-tooltip :content="$t('message.markerSuccess')" placement="top" effect="light">
                              <i class="el-icon-document-checked" :style="{'color': selectNode && selectNode.get('model').status == 4 ? '#3D3E3E' : '#BBBBBB'}"></i>
                            </el-tooltip>
                        </div>
                        <div @click="fetchWfInstanceInfo">
                            <el-tooltip :content="$t('message.refresh')" placement="top" effect="light">
                              <i class="el-icon-refresh"></i>
                            </el-tooltip>
                        </div>
                    </template>
                    <InstanceDetail 
                        :instance-id="currentInstanceId" 
                        :fixedWidth="400"
                        :nodeDetail="nodeDetail"
                    >
                        <template>
                            <el-row class="job-detail-text" v-if="nodeDetail && nodeDetail.nodeType != 2">
                                <el-col :span="24">
                                    <span class="power-job-text">{{$t('message.enable')}}:</span>
                                    <span class="title">{{currentNodeInfo.enable ? $t('message.yes') : $t('message.no')}}</span>
                                </el-col>
                            </el-row>
                            <el-row class="job-detail-text" v-if="nodeDetail && nodeDetail.nodeType != 2">
                                 <el-col :span="24">
                                    <span class="power-job-text">{{$t('message.skipWhenFailed')}}:</span>
                                    <span class="title">{{currentNodeInfo.skipWhenFailed ? $t('message.yes') : $t('message.no')}}</span>
                                </el-col>
                            </el-row>
                           <el-row class="job-detail-text" v-if="nodeDetail && nodeDetail.nodeType == 2">
                                 <el-col :span="24">
                                    <span class="power-job-text" :style="{width: nodeDetail.nodeType == 2 ? '64px' : ''}">{{$t('message.nodeParams')}}:</span>
                                    <div :style="{paddingTop: '10px'}">
                                        <JSEditor :code="nodeDetail.nodeParams" key="nodeParams" :editorOptions="{readOnly: true}"></JSEditor>
                                    </div>
                                    
                                    <!-- <span class="title">{{nodeDetail.nodeParams}}</span> -->
                                </el-col>
                            </el-row>
                        </template>
                    </InstanceDetail>
                </PowerWorkFlow>
            </div>
        </el-row>

        <el-dialog :visible.sync="instanceDetailVisible" v-if='instanceDetailVisible'>
            <InstanceDetail :instance-id="currentInstanceId" :nodeDetail="nodeDetail" />
        </el-dialog>
    </div>
</template>

<script>
    import InstanceDetail from "../common/InstanceDetail";
    import PowerWorkFlow from './PowerWorkflow';
    import JsonViewer from 'vue-json-viewer';
    import JSEditor from "./JSEditor";
    export default {
        name: "WorkflowInstanceDetail",
        components: {
            InstanceDetail,
            // WorkFlow,
            PowerWorkFlow,
            JsonViewer,
            JSEditor
        },
        data() {
            return {
                wfInstanceDetail: {
                },
                // 任务实例详情
                currentInstanceId: undefined,
                instanceDetailVisible: false,
                powerFlow: null,
                selectNode: null,
                /** 当前的节点信息 */
                currentNodeInfo: {},
                peworkflowDAG: {
                    nodes: [],
                    edges: []
                },
                nodeDetail: null
            }
        },
        methods: {
            /** 获取数据 */
            async fetchWfInstanceInfo() {
                // 从 router 获取 wfInstanceId
                this.peworkflowDAG = {
                    nodes: [],
                    edges: []
                }
                const wfInstanceId = this.$route.params.wfInstanceId;
                let url = "/wfInstance/info?appId=" + this.$store.state.appInfo.id + "&wfInstanceId=" + wfInstanceId;
                let res = await this.axios.get(url)
                this.wfInstanceDetail = res;
                this.peworkflowDAG = res.peworkflowDAG;
                // this.initDag()
            },

            /** 标记成功 */
            async markedSuccess() {
                // console.log(this.selectNode)
                if(!(this.selectNode && this.selectNode.get('model').status == 4)) return;
                
                const data = {
                    appId: this.$store.state.appInfo.id,
                    wfInstanceId: this.$route.params.wfInstanceId,
                    nodeId: this.selectNode.get('model').id
                };

                await this.axios.get('/wfInstance/markNodeAsSuccess', {
                    params: data
                });
                
                this.changeStatusSuccess();
                this.$message.success(this.$t("message.success"));
            },

            /** 重试 */
            async restart() {
                const data = {
                    appId: this.$store.state.appInfo.id,
                    wfInstanceId: this.$route.params.wfInstanceId,
                };
                await this.axios.get('/wfInstance/retry', {
                    params: data
                });
                this.fetchWfInstanceInfo()
            },

            // 点击停止实例
            async stop() {
              let that = this;
              let url = "/wfInstance/stop?wfInstanceId=" + this.$route.params.wfInstanceId +
                  "&appId=" + this.$store.state.appInfo.id;
              await this.axios.get(url).then(() => {
                that.$message.success(this.$t('message.success'));
              });
              await this.fetchWfInstanceInfo()
            },

            /** 更改状态为成功 */
            changeStatusSuccess() {
                const group = this.selectNode.getContainer();
                /** 主图 */
                const current0 = group.getChildByIndex(0);
                /** 状态文字 */
                const current2 = group.getChildByIndex(3);
                /** 状态圆 */
                const current3 = group.getChildByIndex(4);
                current0.attr('fill', '#C3FFD2');
                current2.attr('fill', '#00BB2F');
                current2.attr('text', '成功');
                current3.attr('fill', '#00BB2F');
            },

            /** node 拦截判断 */
            interceptSelectedNode(node) {
                const model = node.get('model');
                
                console.log()
                return model.instanceId || model.nodeType == 2;
            },

            /** 选中 node 回调 */
            handleSelectedNode(node) {
                const model = node ? node.get('model') : {};
                const instanceId = model.instanceId;
                const type = model.nodeType;
                console.log(model);
                
                console.log(instanceId);
                if(type === 2 || type == 3) {
                    console.log('1111');
                    this.nodeDetail = model;
                } else {
                    if(!instanceId) this.$message.warning(this.$t('message.ntfClickNoInstanceNode'));
                    this.nodeDetail = null;
                }
                
                this.currentInstanceId = instanceId;
                this.selectNode = node;
                this.currentNodeInfo = node.get('model');
                console.log(this.currentNodeInfo);
            },
            /** 清除 node 节点 */
            handleClearSelectNode() {
                this.selectNode = null;
            },
            /** 获取工作流程图实例 */
            getDag(powerFlow) {
              this.powerFlow = powerFlow;
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
*,
*::after,
*::before {
  box-sizing: border-box;
}
    /* .el-row {
        margin: 20px;
    } */

    .title{
        display: inline-block;
        /* margin:5px 0; */
        font-size: 14px;
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

    .power-toolbtn {
        display: flex;
        justify-content: space-between;
    }
    .power-work-info-item {
        margin: 10px;
    }

    .power-work-info-item-content {
        max-height: 300px;
        overflow-y: scroll;
    }

    .power-work-info-item-context {
        max-width: 600px;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
        display: inline-block;
    }
    
</style>

<style>
.jv-container .jv-code {
    padding: 8px;
}
.power-job-text {
  display: inline-block;
  width: 148px;
  text-align: right;
  margin-right: 4px;
  font-size: 14px;
}
.job-detail-text {
    padding: 5px 0;
}
</style>
