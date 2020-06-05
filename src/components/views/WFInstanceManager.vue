<template>
  <div id="wf_instance_manager">
    <!-- 第一行，搜索区 -->
    <el-row>
      <el-col :span="20">
        <el-form
          :inline="true"
          :model="wfInstanceQueryContent"
          class="el-form--inline"
        >
          <el-form-item label="工作流实例ID">
            <el-input
              v-model="wfInstanceQueryContent.wfInstanceId"
              placeholder="工作流实例ID"
            />
          </el-form-item>
          <el-form-item label="任务ID">
            <el-input
              v-model="wfInstanceQueryContent.workflowId"
              placeholder="工作流ID"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="listWfInstances">查询</el-button>
            <el-button type="cancel" @click="onClickRest">重置</el-button>
          </el-form-item>
        </el-form>
      </el-col>
      <el-col :span="4">
        <div style="float:right;padding-right:10px">
          <el-button type="primary" @click="listWfInstances"
            >刷新状态</el-button
          >
        </div>
      </el-col>
    </el-row>

    <!-- 第二行，表单 -->
    <el-row>
      <el-table
        :data="wfInstancePageResult.data"
        style="width: 100%"
        :row-class-name="wfInstanceTableRowClassName"
      >
        <el-table-column prop="workflowId" label="工作流ID" width="80" />
        <el-table-column prop="workflowName" label="工作流名称" />
        <el-table-column prop="wfInstanceId" label="工作流实例ID" />
        <el-table-column prop="statusStr" label="状态" width="80" />
        <el-table-column prop="actualTriggerTime" label="触发时间" />
        <el-table-column prop="finishedTime" label="结束时间" />

        <el-table-column label="操作" width="300">
          <template slot-scope="scope">
            <el-button size="medium" @click="onClickShowDetail(scope.row)"
              >详情</el-button
            >
            <el-button size="medium" @click="onClickStop(scope.row)"
              >停止</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <el-dialog title="工作流实例详情" :visible.sync="instanceDetailVisible">
        <el-row style="margin-top:-20px">
          <el-col :span="8">
            工作流ID:
            <span class="title">{{ instanceTemp.workflowId }}</span>
          </el-col>
          <el-col :span="16">
            工作流实例ID
            <span class="title">{{ instanceTemp.wfInstanceId }}</span>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            状态:
            <span class="title">{{ instanceTemp.statusStr }}</span>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="8">
            触发时间:
            <span class="title">{{ instanceTemp.actualTriggerTime }}</span>
          </el-col>
          <el-col :span="8">
            结束时间:
            <span class="title">{{ instanceTemp.finishedTime }}</span>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            执行结果:
            <span class="title">{{ instanceTemp.result }}</span>
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
      </el-dialog>
    </el-row>

    <!-- 第三行，分页插件 -->
    <el-row>
      <el-col :span="24">
        <el-pagination
          :hide-on-single-page="true"
          :total="this.wfInstancePageResult.totalItems"
          :page-size="this.wfInstancePageResult.pageSize"
          @current-change="onClickChangeInstancePage"
          layout="prev, pager, next"
        />
      </el-col>
    </el-row>
  </div>
</template>

<script>
import dagreD3 from "dagre-d3";
import * as d3 from "d3";

let render = new dagreD3.render();
// import DAG from "./DAG";
export default {
  name: "WFInstanceManager",
  data() {
    return {
      // 查询条件
      wfInstanceQueryContent: {
        appId: this.$store.state.appInfo.id,
        index: 0,
        pageSize: 10,
        wfInstanceId: undefined,
        workflowId: undefined,
      },
      // 查询结果
      wfInstancePageResult: {
        pageSize: 10,
        totalItems: 0,
        data: [],
      },
      instanceDetailVisible: false,
      instanceTemp: {},
      statePoint: 0,
      g: "",
      node: [
        { id: 0, label: "根节点\n c:1\n a:@" },
        { id: 1, label: "一级节点1" },
        { id: 2, label: "一级节点2" },
        { id: 3, label: "一级节点3" },
        { id: 4, label: "一级节点4" },
        { id: 5, label: "二级节点1" },
        { id: 6, label: "二级节点2" },
        { id: 7, label: "三级节点1" },
        { id: 8, label: "三级节点2" },
      ],
      edge: [
        { from: 0, to: 1 },
        { from: 0, to: 2 },
        { from: 0, to: 3 },
        { from: 0, to: 4 },
        { from: 1, to: 5 },
        { from: 1, to: 6 },
        { from: 6, to: 7 },
        { from: 1, to: 7 },
        { from: 2, to: 7 },
      ],
    };
  },
  methods: {
    listWfInstances() {
      let that = this;
      this.axios
        .post("/wfInstance/list", this.wfInstanceQueryContent)
        .then((res) => (that.wfInstancePageResult = res));
    },
    // 重置搜索条件
    onClickRest() {
      this.wfInstanceQueryContent.wfInstanceId = undefined;
      this.wfInstanceQueryContent.workflowId = undefined;
    },
    // 查看工作流详情
    onClickShowDetail(data) {
      console.log(data);
      this.instanceDetailVisible = true;
      this.instanceTemp = data;
      this.node = data.peworkflowDAG.nodes.map(item=>{
          let label = 'jobID:' + item.jobId + "\n" +  'jobName:' + item.jobName + "\n" + "result:" + item.result
          return {
              id: item.jobId,
              label: label
          }
      });
      this.edge = data.peworkflowDAG.edges;
      this.init();
      this.renderG(this.statePoint, this.node, this.edge); 
    },
    // 停止工作流
    
    onClickStop(data) {
      let that = this;
      let url =
        "/wfInstance/stop?wfInstanceId=" +
        data.wfInstanceId +
        "&appId=" +
        this.$store.state.appInfo.id;
      this.axios.get(url).then(() => {
        that.$message.success("停止成功");
        // 重新加载列表
        that.listInstanceInfos();
      });
    },
    // 换页
    onClickChangeInstancePage(index) {
      // 后端从0开始，前端从1开始
      this.wfInstanceQueryContent.index = index - 1;
      this.listWfInstances();
    },
    // 表单颜色
    wfInstanceTableRowClassName({ row }) {
      switch (row.status) {
        // 失败
        case 3:
          return "error-row";
        // 成功
        case 4:
          return "success-row";
        case 10:
          return "warning-row";
      }
    },
    init: function(statePoint, node, edge) {
      console.log(statePoint, node, edge);
      this.createG();
      this.renderG();
    },
    createG: function() {
      this.g = new dagreD3.graphlib.Graph()
        .setGraph({
          rankdir: "LR", //方向
        })
        .setDefaultEdgeLabel(function() {
          return {};
        });
    },
    drawNode: function() {
      for (let i in this.node) {
        //画点
        let el = this.node[i];
        // let style = "";
        this.g.setNode(el.id, {
          id: el.id,
          label: el.label,
          class: el.class,
          style: el.node_id,
          node_id: el.node_id,
        });
      }
      this.g.nodes().forEach((v) => {
        //画圆角
        var node = this.g.node(v);
        node.rx = node.ry = 10;
      });
    },
    drawEdg: function() {
      for (let i in this.edge) {
        // 画连线
        let el = this.edge[i];
        if (el.from === this.statePoint || el.to === this.statePoint) {
          this.g.setEdge(el.from, el.to, {
            style: "stroke: #0fb2cc; fill: none;",
            arrowheadStyle: "fill: #0fb2cc;stroke: #0fb2cc;",
            arrowhead: "vee",
          });
        } else {
          this.g.setEdge(el.from, el.to, {
            arrowhead: "vee",
          });
        }
      }
    },
    renderG: function() {
      var svg = d3.select("#svgCanvas");

      svg.select("g").remove(); //删除以前的节点
      svg.append("g");
      var inner = svg.select("g");
      var zoom = d3.zoom().on("zoom", function() {
        //放大
        inner.attr("transform", d3.event.transform);
      });
      svg.call(zoom);
      this.drawNode();
      this.drawEdg();
      render(d3.select("svg g"), this.g); //渲染节点
      //   var max =
      //     svg._groups[0][0].clientWidth > svg._groups[0][0].clientHeight
      //       ? svg._groups[0][0].clientWidth
      //       : svg._groups[0][0].clientHeight;
      // var initialScale = max / 779;
      var initialScale = 1;
      var tWidth =
        (svg._groups[0][0].clientWidth - this.g.graph().width * initialScale) /
        2;
      //   var tHeight =
      //     (svg._groups[0][0].clientHeight -
      //       this.g.graph().height * initialScale) /
      //     2;
      var trans = d3.zoomIdentity.translate(tWidth, 50).scale(initialScale); //.scale(initialScale)
      svg.call(zoom.transform, trans); //元素居中
    },
    changePoint: function(point) {
      this.statePoint = point * 1.0;
      this.renderG();
    },
  },
  mounted() {
    this.listWfInstances();
  },
//   components: { DAG },
};
</script>

<style scoped>
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
path:hover {
  stroke-width: 3px;
  cursor: pointer;
}
.node:hover {
  stroke: #606266;
  cursor: pointer;
}
</style>
