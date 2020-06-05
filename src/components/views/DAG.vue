<template>
  <div>
    <svg width="100%" height="50vh" id="svgCanvas">
      <g />
      <rect />
    </svg>
    <input type="submit" value="Submit" @click="addNode" />
    <input type="submit" value="新增起点" @click="status = 1" />
    <input type="submit" value="新增终点" @click="status = 2" />
    <input type="submit" value="删除节点" @click="status = 3" />
  </div>
</template>

<script>
import dagreD3 from "dagre-d3";
import * as d3 from "d3";

let render = new dagreD3.render();

export default {
  data() {
    return {
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
      edgeTemp: {
        from: "",
        to: "",
      },
      status: 0,
      nodeEnd: 8,
    };
  },
  methods: {
    // statePoint ,node, edge
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
    addNode: function() {
      let tempnode = { id: this.nodeEnd + 1, label: "hello" };
      this.nodeEnd = this.nodeEnd + 1;
      this.node.push(tempnode);
      this.g.setNode(tempnode.id, { label: tempnode.label, class: "newnode" });
      render(d3.select("svg g"), this.g); //渲染节点
      let inner = d3.select("#svgCanvas").select("g");
      inner.selectAll("g.newnode").on("click", (e) => this.clickNode(e, inner));
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
      inner.selectAll("g.node").on("click", (e) => this.clickNode(e, inner));
      inner.selectAll("path").on("click", (e) => this.clickPath(e));

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
    clickPath(e) {
      // console.log(JSON.stringify(this.edge),'1');
      this.g.removeEdge(e.v, e.w);
      // 在数据中删除边
      this.edge.forEach((item, index) => {
        if (item.from == e.v && item.to == e.w) {
          this.edge.splice(index, 1);
        }
      });
      render(d3.select("svg g"), this.g); //渲染节点
    },
    clickNode(e, inner) {
      //点击事件
      if (this.status == 1) {
        this.edgeTemp.from = e;
        console.log(this.edgeTemp, "first");
      }
      if (this.status == 2) {
        this.edgeTemp.to = e;

        if (!(this.edgeTemp.to === this.edgeTemp.from || !this.edgeTemp.from)) {
          this.g.setEdge(this.edgeTemp.from, this.edgeTemp.to, {
            style: "stroke: #0fb2cc; fill: none;",
            arrowheadStyle: "fill: #0fb2cc;stroke: #0fb2cc;",
            arrowhead: "vee",
          });
          console.log(this.edgeTemp, "second");
          this.edge.push(this.edgeTemp);
          this.edgeTemp = { from: "", to: "" };
          render(d3.select("svg g"), this.g); //渲染节点
          inner.selectAll("path").on("click", (e) => this.clickPath(e));
        }
      }
      if (this.status == 3) {
        this.g.removeNode(e);
        this.node.forEach((item, index) => {
          if (item.id == e) {
            this.node.splice(index, 1);
          }
        });
        render(d3.select("svg g"), this.g); //渲染节点
      }
      this.status = 0;
    },
  },
  mounted() {
    this.init(this.statePoint, this.node, this.edge); //创建关系图
  },
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
