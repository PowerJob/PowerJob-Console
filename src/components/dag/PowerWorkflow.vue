<template>
  <div class="power-job" ref="power-job">
    <div class="power-job-header">
      <div class="job-tools">
        <div v-if="onClickImportNode" @click="onClickImportNode">
          <el-tooltip
            :content="$t('message.importJob')"
            placement="top"
            effect="light"
          >
            <i class="el-icon-document-add"></i>
          </el-tooltip>
        </div>
        <div @click="importJudgeNode" v-if="mode !== 'view'">
          <el-tooltip
            :content="$t('message.condition')"
            placement="top"
            effect="light"
          >
            <i class="iconfont icon-panduanti"></i>
            <!-- <img src="../../assets/panduanti.png" alt="" width="16" height="16">  -->
          </el-tooltip>
        </div>
        <div @click="importWorkflowNode"  v-if="mode !== 'view'">
          <el-tooltip
            :content="$t('message.workflowChild')"
            placement="top"
            effect="light"
          >
            <!-- <i class="el-icon-c-scale-to-original"></i> -->
            <i class="iconfont icon-workflow_"></i>
          </el-tooltip>
        </div>
        <slot name="tool"></slot>
        <div @click="handleZoomOut">
          <el-tooltip
            :content="$t('message.zoomOut')"
            placement="top"
            effect="light"
          >
            <i class="el-icon-zoom-out"></i>
          </el-tooltip>
        </div>
        <div @click="handleZoomIn">
          <el-tooltip
            :content="$t('message.zoomIn')"
            placement="top"
            effect="light"
          >
            <i class="el-icon-zoom-in"></i>
          </el-tooltip>
        </div>
        <div @click="handleAutoFit">
          <el-tooltip
            :content="$t('message.autoFit')"
            placement="top"
            effect="light"
          >
            <i class="el-icon-aim"></i>
          </el-tooltip>
        </div>
        <div @click="fullScreen">
          <el-tooltip
            :content="$t('message.fullScreen')"
            placement="top"
            effect="light"
          >
            <i class="el-icon-full-screen"></i>
          </el-tooltip>
        </div>
      </div>
    </div>
    <div class="power-job-body">
      <div
        class="power-power-flow"
        :style="{ width: `${size.width}px` }"
        ref="powerDag"
      ></div>
      <div class="power-job-detail" v-if="selectNode !== null">
        <slot></slot>
      </div>
    </div>
  </div>
</template>
<script>
import Workflow from "power-workflow";

const defaultSize = {
  width: (document.body.clientWidth - 254) * 0.7,
  height: 700,
};

const dagSize = {
  default: {
    width: (defaultWidthInc, radio) =>
      (document.body.clientWidth - defaultWidthInc) * radio,
    height: () => document.body.clientHeight,
  },
  fiexd: {
    width: (defaultWidthInc, rightWidth) =>
      document.body.clientWidth - defaultWidthInc - rightWidth,
    height: () => document.body.clientHeight,
  },
};

export default {
  name: "PowerWorkflow",
  data() {
    return {
      size: {
        width: document.body.clientWidth - 254,
        height: defaultSize.height,
      },
      powerFlow: null,
      selectNode: null,
      zoom: 1,
    };
  },
  props: [
    "onClickImportNode",
    "defaultWidthInc",
    "nodes",
    "edges",
    "rightFixed",
    "fullInc",
    "mode",
    "interceptSelectedNode",
    "onClickImportSpecialNode",
  ],
  mounted() {
    this.size.width = this.defaultWidthInc
      ? document.body.clientWidth - this.defaultWidthInc
      : document.body.clientWidth - 254;
    this.initFlow();
    window.addEventListener("resize", this.onFullScreenListener);
  },
  methods: {
    /** 初始化图 */
    initFlow() {
      // 整理节点数据
      let { nodes, edges } = this.makeNodes();
      const powerFlow = new Workflow({
        container: this.$refs.powerDag,
        width: this.size.width,
        height: this.size.height,
        initNodes: nodes,
        initEdges: edges,
        // layout: 'vertical',

        layout: {
          type: 'dagre',
          // align: 'UR', // 可选
          nodesep: 40, // 可选
          // ranksep: 60, // 可选
          rankdir: 'LR',
          controlPoints: true, // 可选
          ranksepFunc: (node) => {
            // console.log(node);
            if(node.nodeType === 2) {
              return 55
            }
            return 60
          }
        },
        edgeCallback: this.edgeEnd
      });
      powerFlow.graph.setMode("edit");
      // powerFlow.graph.fitCenter(20);
      this.powerFlow = powerFlow;

      this.powerFlow.graph.on("onSelectNode", (item) => {
        if (this.interceptSelectedNode && !this.interceptSelectedNode(item)) {
          this.$emit("onSelectedNode", item);
          return;
        } else {
          this.selectNode = item;
          this.$emit("onSelectedNode", item);
        }
      });

      this.powerFlow.graph.on("onClearSelectNode", () => {
        this.selectNode = null;
        this.$emit("onClearSelectNode", null);
      });

      if (this.mode) this.powerFlow.graph.setMode(this.mode);

      this.$emit("getDag", powerFlow, {
        nodes,
        edges,
        resetNodes: this.resetNodes,
      });
    },

    /** 重置节点 */
    resetNodes() {
      let { nodes, edges } = this.makeNodes();
      this.powerFlow.graph.data({ nodes, edges });
      this.powerFlow.graph.render();
    },

    /** 判断线是否可以 */
    edgeEnd(sourceNode) {
      // console.log(sourceNode);
      // console.log(targetNode);
      // console.log(sourceNode.get('currentShape'))
      const data = this.isEdge(sourceNode)
      if(!data) return false;
      return {
        ...data
      }
    },

    /** 判断线上是否添加文字以及是否可添加线 */
    isEdge(node) {
      const nodeType = node.get('currentShape');
      if(nodeType !== 'max-diamond-node') {
        return {}
      }

      const edges = node.getOutEdges();
      if(edges.length > 1)  {
        this.$message('最多只能有两条边哦');
        return false;
      }
      console.log(edges)
      if(edges.length === 0) {
        return {
          label: 'Y'
        }
      }

      const item = edges[0];
      const model = item.get('model');
      return {
        label: model.label === 'Y' ? 'N' : 'Y'
      }
    },

    /** 整理节点信息 */
    makeNodes() {
      let width = 0;
      this.nodes.forEach((item) => {
        let len = item.nodeName.length * 9;
        let curtWidth = 0;
        if(len > 220) {
          curtWidth = 220;
        } else if (len < 180) {
          curtWidth = 180;
        } else {
          curtWidth = len;
        }
        if (curtWidth > width) {
          width = curtWidth;
        }
      });
      let status = {
        3: {
          color: "",
          text: this.$t("message.running"),
        },
        4: {
          color: "#FFADA4",
          text: this.$t("message.failed"),
        },
        5: {
          color: "#C3FFD2",
          text: this.$t("message.success"),
        },
        10: {
          color: "",
          text: this.$t("message.stopped"),
        },
        9: {
          text: this.$t("message.canceleded"),
          color: '#E2E2E2',
          stroke: "#A5A5A5"
        }
      };
      let nodes = this.nodes.map((item) => {
        let statusValue = {};
        let statusStyle = {};
        if(item.nodeType === 2) {
          return {
            id: `${item.nodeId}`,
            type: "max-diamond-node",
            text: item.nodeName ? item.nodeName : "判断",
            size: [15, 80], 
            style: {
              sideLength: 80,
              textStyle: {
                // fill: "#FFFFFF",
              }
            },
            ...item
          }
        }
        if (item.status) {
          statusValue = {
            taskStatus: status[item.status]
              ? status[item.status].text
              : this.$t("message.waitingUpstream"),
            taskStatusValue: item.status,
          };
          if (status[item.status] && status[item.status].color) {
            statusStyle = {
              fill: status[item.status].color,
            };
            if(status[item.status].stroke) {
              statusStyle.stroke = status[item.status].stroke;
            }
          }
        }

        return {
          id: `${item.nodeId}`,
          type: item.nodeType === 1 ? "flow-node" : 'flow-child-node',
          size: [width, 70],
          leftText: item.jobId,
          titleText: item.nodeName,
          icon1: item.enable ? require("../../assets/start.svg") : "",
          icon2: item.skipWhenFailed ? require("../../assets/skip.svg") : "",
          // taskStatus: text,
          ...statusValue,
          style: statusStyle,
          rightText: item.instanceId ? item.instanceId : null,
          ...item,
        };
      });
      let edges = this.edges.map((item) => {
        const property = {};
        if(item.property) {
          property.label = item.property === 'true' ? 'Y' : 'N';
        }
        return {
          source: `${item.from}`,
          target: `${item.to}`,
          type: "cvte-polyline",
          ...property
        };
      });
      return { nodes, edges };
    },

    /** 引入判断节点 */
    importJudgeNode() {
      this.onClickImportSpecialNode && this.onClickImportSpecialNode({ type: 2 });
    },

    /** 引入工作流节点 */
    importWorkflowNode() {
      this.onClickImportSpecialNode && this.onClickImportSpecialNode({ type: 3 });
    },

    /** 监控全屏 */
    onFullScreenListener() {
      let isFull =
        document.fullscreenElement ||
        document.msFullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitFullscreenElement ||
        false;
      if (isFull === undefined) isFull = false;

      let incValue = 1;
      if (this.selectNode) {
        incValue = 0.7;
      }

      let width = 0;
      let height = 0;

      let strage = "default";

      if (this.rightFixed) {
        strage = "fiexd";
        incValue = this.rightFixed;
        if (!this.selectNode) {
          incValue = 0;
        }
      }

      if (isFull) {
        // if(!this.selectNode) {
        //   width = dagSize[strage].width(this.defaultWidthInc, incValue);
        // }
        width = dagSize[strage].width(0, incValue);
        height = dagSize[strage].height();
        this.size = {
          width,
          height,
        };
        this.powerFlow.graph.changeSize(this.size.width, this.size.height);
      } else {
        width = dagSize[strage].width(this.defaultWidthInc, incValue);
        height = dagSize[strage].height();
        this.size = {
          width,
          height: defaultSize.height,
        };
        this.powerFlow.graph.changeSize(this.size.width, this.size.height);
      }
    },

    /** 缩小 */
    handleZoomOut() {
      let zoom = this.powerFlow.graph.getZoom();
      zoom -= 0.1;
      this.powerFlow.graph.zoomTo(zoom);
    },

    /** 放大 */
    handleZoomIn() {
      let zoom = this.powerFlow.graph.getZoom();
      zoom += 0.1;
      this.powerFlow.graph.zoomTo(zoom);
    },

    /** 自适应 */
    handleAutoFit() {
      this.powerFlow.graph.layout();
      this.powerFlow.graph.fitView(20);
    },

    /** 全屏 */
    fullScreen() {
      const el =
        document.getElementById(this.fullInc) || this.$refs["power-job"];
      const rfs =
        el.requestFullScreen ||
        el.webkitRequestFullScreen ||
        el.mozRequestFullScreen ||
        el.msRequestFullScreen;
      if (typeof rfs != "undefined" && rfs) {
        rfs.call(el);
        return;
      }
    },
  },
  watch: {
    /** 监控节点的选中 */
    selectNode() {
      this.onFullScreenListener();
    },
  },
};
</script>    
<style scoped>
*,
*::before,
*::after {
  box-sizing: border-box;
}
.iconfont {
  font-size: 18px !important;
}
.power-power-flow {
  border: 1px solid #d0d0d0;
  border-top: 0px;
  /* box-shadow: 0 10px 10px 1px #c0c0c0; */
  box-sizing: border-box;
  border-radius: 10px;
  border-top-left-radius: 0px;
  border-top-right-radius: 0px;
  /* width: 700px; */
}

.job-tools {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d0d0d0;
  /* box-shadow: 0 0 10px 1px #c0c0c0; */
  border-radius: 10px;
  margin-right: 10px;
  border-bottom-left-radius: 0px;
  border-bottom-right-radius: 0px;
  display: flex;
  padding: 8px 10px;
}
.job-tools > div {
  box-sizing: border-box;
  height: 30px;
  width: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}
.job-tools div:hover {
  border: 1px solid #f0f0f0;
}
.job-tools > div + div {
  margin-left: 24px;
}
.job-tools i {
  font-size: 20px;
  color: #3d3e3e;
}

.power-job {
  width: 100%;
  background: #fff;
}
.power-job-body {
  display: flex;
}
.power-job-detail {
  flex: 1;
  border-right: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
}
</style>