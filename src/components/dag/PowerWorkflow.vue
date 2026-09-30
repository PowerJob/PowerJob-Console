<template>
  <section ref="root" class="workflow-canvas" tabindex="0" @keydown="onKeydown">
    <div class="canvas-toolbar">
      <el-button v-if="editable && onClickImportNode" @click="onClickImportNode">＋ {{ $t('message.importJob') }}</el-button>
      <el-button v-if="editable" @click="onClickImportSpecialNode?.({ type: 2 })">◇ {{ $t('message.condition') }}</el-button>
      <el-button v-if="editable" @click="onClickImportSpecialNode?.({ type: 3 })">▣ {{ $t('message.workflowChild') }}</el-button>
      <el-button v-if="editable" :disabled="!selectedId || !!selectedEdgeId" :type="connecting ? 'primary' : 'default'" @click="beginConnection">↗ {{ $t('message.workflowConnect') }}</el-button>
      <el-button v-if="editable" :disabled="!selectedId && !selectedEdgeId" @click="deleteSelection">{{ $t('message.delete') }}</el-button>
      <slot name="tool" />
      <span class="toolbar-spacer" />
      <el-button :aria-label="$t('message.zoomOut')" @click="setZoom(zoom - .1)">−</el-button>
      <span class="zoom-label">{{ Math.round(zoom * 100) }}%</span>
      <el-button :aria-label="$t('message.zoomIn')" @click="setZoom(zoom + .1)">＋</el-button>
      <el-button @click="autoLayout">{{ $t('message.autoFit') }}</el-button>
      <el-button @click="fullScreen">⛶ {{ $t('message.fullScreen') }}</el-button>
    </div>
    <p v-if="editable" class="canvas-help">{{ $t('message.workflowCanvasHelp') }}</p>
    <div class="canvas-body">
      <div ref="canvasContainer" class="canvas-surface">
        <svg ref="svg" class="dag-svg" :viewBox="`0 0 ${size.width} ${size.height}`" @pointerdown="startPan" @pointermove="movePointer" @pointerup="endPointer" @pointercancel="cancelPointer" @wheel.prevent="onWheel" @dblclick.self="autoLayout">
          <defs>
            <pattern :id="`${canvasId}-grid`" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#d9e2ef" /></pattern>
            <marker :id="`${canvasId}-arrow`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#8192ae" /></marker>
          </defs>
          <rect width="100%" height="100%" :fill="`url(#${canvasId}-grid)`" />
          <g :transform="`translate(${pan.x},${pan.y}) scale(${zoom})`">
            <g v-for="edge in dag.edges" :key="edge.id" class="dag-edge" :class="{ selected: selectedEdgeId === edge.id, disabled: edge.enable === false }" @pointerdown.stop="selectEdge(edge)">
              <path class="edge-hit" :d="edgePath(edge)" />
              <path class="edge-line" :d="edgePath(edge)" :marker-end="`url(#${canvasId}-arrow)`" />
              <g v-if="edge.label" :transform="`translate(${edgeMiddle(edge).x},${edgeMiddle(edge).y})`"><rect x="-14" y="-12" width="28" height="24" rx="8" fill="white" /><text class="branch-label" text-anchor="middle" dominant-baseline="central">{{ edge.label }}</text></g>
            </g>
            <path v-if="connecting && connectionPoint" class="connection-preview" :d="connectionPath" />
            <g v-for="node in dag.nodes" :key="node.id" class="dag-node" :class="[statusClass(node), { selected: selectedId === node.id, disabled: node.enable === false || node.disableByControlNode }]" :transform="`translate(${node.x},${node.y})`" :data-node-id="node.id" role="button" tabindex="0" :aria-label="node.nodeName || $t('message.condition')" @keydown.enter.stop="selectNode(node)" @pointerdown.stop="startNodeDrag($event, node)">
              <path v-if="node.nodeType === 2" class="node-shape condition-shape" d="M 0 -49 L 100 0 L 0 49 L -100 0 Z" />
              <rect v-else class="node-shape" x="-122" y="-42" width="244" height="84" rx="14" />
              <text v-if="node.nodeType !== 2" x="-106" y="-19" class="node-kind">{{ node.nodeType === 3 ? $t('message.workflowChild') : $t('message.jobId') }} · {{ node.jobId }}</text>
              <text class="node-name" :x="node.nodeType === 2 ? 0 : -106" :y="node.nodeType === 2 ? 3 : 4" :text-anchor="node.nodeType === 2 ? 'middle' : 'start'">{{ shortName(node.nodeName || $t('message.condition'), node.nodeType === 2 ? 128 : 208) }}<title>{{ node.nodeName }}</title></text>
              <text v-if="node.nodeType !== 2" x="-106" y="26" class="node-status">{{ node.status ? statusText(node) : $t('message.enable') + ': ' + $t(node.enable === false ? 'message.no' : 'message.yes') }}{{ node.skipWhenFailed ? ' · ' + $t('message.skipWhenFailed') : '' }}</text>
              <text v-else-if="node.status" x="0" y="24" text-anchor="middle" class="node-status">{{ statusText(node) }}</text>
              <text v-if="node.instanceId" x="0" y="58" text-anchor="middle" class="node-instance">#{{ node.instanceId }}</text>
              <circle class="input-anchor" :cx="node.nodeType === 2 ? -100 : -122" cy="0" r="5" />
              <template v-if="editable">
                <circle v-if="node.nodeType !== 2" class="output-anchor" cx="122" cy="0" r="7" @pointerdown.stop="startConnection($event, node)" />
                <g v-else>
                  <circle class="output-anchor branch-yes" cx="62" cy="-19" r="7" @pointerdown.stop="startConnection($event, node, 'Y')" /><text x="77" y="-20" class="anchor-label">Y</text>
                  <circle class="output-anchor branch-no" cx="62" cy="19" r="7" @pointerdown.stop="startConnection($event, node, 'N')" /><text x="77" y="25" class="anchor-label">N</text>
                </g>
              </template>
            </g>
          </g>
        </svg>
        <el-empty v-if="!dag.nodes.length" class="canvas-empty" :description="$t('message.workflowEmpty')" :image-size="85" />
      </div>
      <aside v-if="selectedId && showDetails" class="canvas-details" :style="{ width: rightFixed ? `${rightFixed}px` : '360px' }"><slot /></aside>
    </div>
  </section>
</template>
<script>
import { markRaw } from 'vue';
import { normalizeDag, layoutDag, canConnect, removeNode } from './workflow-model.js';
let sequence = 0;
export default {
  name: 'PowerWorkflow',
  props: ['onClickImportNode', 'defaultWidthInc', 'nodes', 'edges', 'rightFixed', 'fullInc', 'mode', 'interceptSelectedNode', 'onClickImportSpecialNode'],
  emits: ['getDag', 'onSelectedNode', 'onClearSelectNode', 'dagChange'],
  data() { return { canvasId: `workflow-${++sequence}`, dag: { nodes: [], edges: [] }, size: { width: 900, height: 600 }, zoom: 1, pan: { x: 0, y: 0 }, selectedId: null, selectedEdgeId: null, showDetails: true, connecting: null, connectionPoint: null, gesture: null, fitAfterGesture: false, powerFlow: null, observer: null, listeners: new Map() }; },
  computed: {
    editable() { return this.mode !== 'view'; },
    connectionPath() { const node = this.dag.nodes.find(n => n.id === this.connecting?.source); return node ? this.curve(this.outputPoint(node, this.connecting.label), this.connectionPoint) : ''; },
  },
  watch: {
    nodes: { deep: true, handler() { this.resetNodes(); } }, edges: { deep: true, handler() { this.resetNodes(); } },
  },
  mounted() {
    this.resetNodes(); this.createAdapter();
    this.observer = markRaw(new ResizeObserver(this.resize)); this.observer.observe(this.$refs.canvasContainer);
    document.addEventListener('fullscreenchange', this.resize);
    this.$emit('getDag', this.powerFlow, { ...this.dag, resetNodes: this.resetNodes });
    this.$nextTick(() => this.fitView());
  },
  beforeUnmount() { this.observer?.disconnect(); document.removeEventListener('fullscreenchange', this.resize); this.listeners.clear(); },
  methods: {
    resetNodes() {
      const next = normalizeDag(this.nodes, this.edges), previous = new Map(this.dag.nodes.map(node => [node.id, node]));
      next.nodes = layoutDag(next.nodes, next.edges).map(node => previous.has(node.id) ? { ...node, x: previous.get(node.id).x, y: previous.get(node.id).y } : node);
      this.dag = next;
      if (this.selectedId && !next.nodes.some(node => node.id === this.selectedId)) this.clearSelection();
    },
    createAdapter() {
      const graph = {
        save: () => structuredClone(JSON.parse(JSON.stringify(this.dag))),
        data: data => { this.dag = normalizeDag(data.nodes, data.edges); this.dag.nodes = layoutDag(this.dag.nodes, this.dag.edges); }, render: () => {},
        layout: () => this.autoLayout(), fitView: () => this.fitView(), fitCenter: () => this.fitView(),
        getZoom: () => this.zoom, zoomTo: zoom => this.setZoom(zoom), translate: (x, y) => { this.pan.x += x; this.pan.y += y; },
        getPointByCanvas: (x, y) => ({ x: (x - this.pan.x) / this.zoom, y: (y - this.pan.y) / this.zoom }), changeSize: () => this.resize(),
        updateItem: (item, update) => { const node = this.dag.nodes.find(node => node.id === String(item?.get?.('model')?.id || item)); if (node) Object.assign(node, update); },
        add: (kind, item) => { const collection = normalizeDag(kind === 'node' ? [item] : [], kind === 'edge' ? [item] : []); this.dag[kind === 'node' ? 'nodes' : 'edges'].push(...collection[kind === 'node' ? 'nodes' : 'edges']); },
        removeItem: item => { const id = String(item?.get?.('model')?.id || item); if (this.dag.nodes.some(node => node.id === id)) this.dag = removeNode(this.dag, id); else this.dag.edges = this.dag.edges.filter(edge => edge.id !== id); this.clearSelection(); },
        findById: id => { const node = this.dag.nodes.find(node => node.id === String(id)); return node ? this.handle(node) : null; },
        getNodes: () => this.dag.nodes.map(this.handle), getEdges: () => this.dag.edges.map(this.handle),
        get: key => key === 'selectedItem' ? graph.findById(this.selectedId) : undefined, set: () => {}, setMode: () => {},
        on: (name, fn) => this.listeners.set(name, fn), off: name => this.listeners.delete(name), destroy: () => this.listeners.clear(),
      };
      this.powerFlow = markRaw({ graph: markRaw(graph) });
    },
    handle(node) { return markRaw({ get: key => key === 'model' ? node : key === 'currentShape' ? node.nodeType === 2 ? 'max-diamond-node' : 'flow-node' : undefined, getOutEdges: () => this.dag.edges.filter(edge => edge.source === node.id).map(this.handle) }); },
    resize() { const rect = this.$refs.canvasContainer?.getBoundingClientRect(); if (rect) { const next = { width: Math.max(rect.width, 240), height: Math.max(rect.height, 400) }, changed = Math.abs(next.width - this.size.width) > 1 || Math.abs(next.height - this.size.height) > 1; this.size = next; if (changed) { if (this.gesture) this.fitAfterGesture = true; else this.fitView(); } } },
    selectNode(node) {
      if (this.connecting && this.gesture?.type !== 'connect') { this.connect(this.connecting.source, node.id, this.connecting.label); return; }
      this.selectedId = node.id; this.selectedEdgeId = null;
      const item = this.handle(node); this.showDetails = !this.interceptSelectedNode || this.interceptSelectedNode(item);
      this.$emit('onSelectedNode', item); this.listeners.get('onSelectNode')?.(item);
    },
    clearSelection() { this.selectedId = this.selectedEdgeId = null; this.$emit('onClearSelectNode', null); this.listeners.get('onClearSelectNode')?.(); },
    selectEdge(edge) { if (!this.editable) return; this.clearSelection(); this.selectedEdgeId = edge.id; this.$refs.root.focus(); },
    point(event) { const rect = this.$refs.svg.getBoundingClientRect(); return { x: ((event.clientX - rect.left) * this.size.width / rect.width - this.pan.x) / this.zoom, y: ((event.clientY - rect.top) * this.size.height / rect.height - this.pan.y) / this.zoom }; },
    capture(event) { this.$refs.svg.setPointerCapture?.(event.pointerId); },
    startNodeDrag(event, node) {
      if (event.button !== 0) return;
      if (this.connecting) { this.connect(this.connecting.source, node.id, this.connecting.label); return; }
      this.selectNode(node); this.$refs.root.focus();
      if (this.editable) { const point = this.point(event); this.gesture = { type: 'node', node, dx: point.x - node.x, dy: point.y - node.y }; this.capture(event); }
    },
    startPan(event) { if (event.button !== 0) return; if (this.connecting) { this.cancelPointer(); return; } this.clearSelection(); this.gesture = { type: 'pan', x: event.clientX, y: event.clientY, startX: this.pan.x, startY: this.pan.y }; this.capture(event); },
    movePointer(event) {
      const point = this.point(event);
      if (this.connecting) this.connectionPoint = point;
      if (this.gesture?.type === 'node') { this.gesture.node.x = point.x - this.gesture.dx; this.gesture.node.y = point.y - this.gesture.dy; }
      else if (this.gesture?.type === 'pan') { this.pan.x = this.gesture.startX + event.clientX - this.gesture.x; this.pan.y = this.gesture.startY + event.clientY - this.gesture.y; }
    },
    endPointer(event) {
      if (this.gesture?.type === 'connect') { const point = this.point(event), target = this.dag.nodes.find(node => Math.abs(node.x - point.x) < (node.nodeType === 2 ? 100 : 130) && Math.abs(node.y - point.y) < 55); if (target) this.connect(this.connecting.source, target.id, this.connecting.label); else this.cancelPointer(); }
      this.gesture = null;
      if (this.fitAfterGesture) { this.fitAfterGesture = false; this.fitView(); }
    },
    cancelPointer() { this.gesture = null; this.connecting = null; this.connectionPoint = null; },
    beginConnection() { if (this.connecting) { this.cancelPointer(); return; } this.connecting = { source: this.selectedId }; const node = this.dag.nodes.find(node => node.id === this.selectedId); this.connectionPoint = this.outputPoint(node); },
    startConnection(event, node, label) { this.connecting = { source: node.id, label }; this.connectionPoint = this.point(event); this.gesture = { type: 'connect' }; this.capture(event); },
    connect(source, target, label) {
      const result = canConnect(this.dag.nodes, this.dag.edges, source, target, label);
      if (!result.valid) this.$message.warning(this.$t(`message.${result.reason}`));
      else { this.dag.edges.push({ id: `edge-${source}-${target}-${Date.now()}`, source, target, label: result.label }); this.$emit('dagChange', this.powerFlow.graph.save()); }
      this.cancelPointer();
    },
    deleteSelection() { if (!this.editable) return; if (this.selectedId) this.dag = removeNode(this.dag, this.selectedId); else this.dag.edges = this.dag.edges.filter(edge => edge.id !== this.selectedEdgeId); this.clearSelection(); this.$emit('dagChange', this.powerFlow.graph.save()); },
    onKeydown(event) { if (['INPUT', 'TEXTAREA'].includes(event.target.tagName) || event.target.isContentEditable) return; if (event.key === 'Escape') { this.cancelPointer(); if (document.fullscreenElement) document.exitFullscreen?.(); } if (['Delete', 'Backspace'].includes(event.key)) { event.preventDefault(); this.deleteSelection(); } },
    outputPoint(node, label) { return { x: node.x + (node.nodeType === 2 ? label ? 62 : 100 : 122), y: node.y + (node.nodeType === 2 && label ? label === 'Y' ? -19 : 19 : 0) }; },
    endpoints(edge) { const source = this.dag.nodes.find(node => node.id === edge.source), target = this.dag.nodes.find(node => node.id === edge.target); return source && target ? [this.outputPoint(source, edge.label), { x: target.x - (target.nodeType === 2 ? 100 : 122), y: target.y }] : null; },
    curve(a, b) { const bend = Math.max(55, Math.abs(b.x - a.x) / 2); return `M ${a.x} ${a.y} C ${a.x + bend} ${a.y}, ${b.x - bend} ${b.y}, ${b.x} ${b.y}`; },
    edgePath(edge) { const points = this.endpoints(edge); return points ? this.curve(...points) : ''; },
    edgeMiddle(edge) { const points = this.endpoints(edge); return points ? { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 } : { x: 0, y: 0 }; },
    setZoom(value) { this.zoom = Math.max(.25, Math.min(2, value)); },
    onWheel(event) { const point = this.point(event), oldZoom = this.zoom; this.setZoom(this.zoom + (event.deltaY < 0 ? .08 : -.08)); this.pan.x += point.x * (oldZoom - this.zoom); this.pan.y += point.y * (oldZoom - this.zoom); },
    fitView() { if (!this.dag.nodes.length) return; const minX = Math.min(...this.dag.nodes.map(node => node.x)) - 145, maxX = Math.max(...this.dag.nodes.map(node => node.x)) + 145, minY = Math.min(...this.dag.nodes.map(node => node.y)) - 65, maxY = Math.max(...this.dag.nodes.map(node => node.y)) + 65; this.zoom = Math.min(1, (this.size.width - 70) / (maxX - minX), (this.size.height - 70) / (maxY - minY)); this.zoom = Math.max(.25, this.zoom); this.pan = { x: (this.size.width - (minX + maxX) * this.zoom) / 2, y: (this.size.height - (minY + maxY) * this.zoom) / 2 }; },
    autoLayout() { this.dag.nodes = layoutDag(this.dag.nodes, this.dag.edges); this.$nextTick(this.fitView); },
    async fullScreen() { if (document.fullscreenElement) await document.exitFullscreen(); else await (document.getElementById(this.fullInc) || this.$refs.root).requestFullscreen?.(); },
    shortName(value, limit = 208) { let width = 0, result = ''; for (const character of String(value)) { width += character.codePointAt(0) > 255 ? 13 : 7; if (width > limit) return `${result}…`; result += character; } return result; },
    statusClass(node) { return ({ 3: 'running', 4: 'failed', 5: 'succeeded', 9: 'canceled', 10: 'stopped' })[node.status] || ''; },
    statusText(node) { const key = ({ 3: 'running', 4: 'failed', 5: 'success', 9: 'canceleded', 10: 'stopped' })[node.status] || 'waitingUpstream'; return this.$t(`message.${key}`); },
  },
};
</script>
<style scoped>
.workflow-canvas { width:100%; border:1px solid var(--el-border-color-light); border-radius:16px; background:var(--el-bg-color); overflow:hidden; outline:none; }
.canvas-toolbar { display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding:14px; border-bottom:1px solid var(--el-border-color-light); }
.canvas-toolbar :deep(.el-button + .el-button) { margin-left:0; } .toolbar-spacer { flex:1; } .zoom-label { font-size:12px; color:var(--el-text-color-secondary); min-width:38px; text-align:center; }
.canvas-help { margin:0; padding:10px 16px; font-size:12px; color:var(--el-text-color-secondary); background:var(--el-fill-color-light); }
.canvas-body { display:flex; min-height:600px; } .canvas-surface { position:relative; flex:1; min-width:240px; height:600px; background:#f8fafd; overflow:hidden; }
.dag-svg { display:block; width:100%; height:100%; touch-action:none; user-select:none; border:0; }
.canvas-details { flex-shrink:0; padding:16px; border-left:1px solid var(--el-border-color-light); overflow:auto; max-height:600px; box-sizing:border-box; }
.canvas-empty { position:absolute; inset:100px 20px auto; pointer-events:none; }
.edge-line { stroke:#8192ae; fill:none; stroke-width:2; } .edge-hit { stroke:transparent; stroke-width:18; fill:none; cursor:pointer; }.dag-edge.selected .edge-line { stroke:var(--el-color-primary); stroke-width:3; }.dag-edge.disabled .edge-line { stroke-dasharray:7 5; opacity:.5; }
.branch-label { font-size:12px; font-weight:700; fill:#576a87; }.connection-preview { stroke:var(--el-color-primary); stroke-width:2; stroke-dasharray:6 5; fill:none; }
.dag-node { cursor:grab; outline:none; }.dag-node:active { cursor:grabbing; }.node-shape { fill:#fff; stroke:#cfd9e8; stroke-width:1.5; filter:drop-shadow(0 3px 4px #1c3f6e0a); }.dag-node.selected .node-shape,.dag-node:focus .node-shape { stroke:var(--el-color-primary); stroke-width:2.5; }.dag-node.running .node-shape { fill:#eff6ff; stroke:#79a9f9; }.dag-node.failed .node-shape { fill:#fff2f1; stroke:#f28e87; }.dag-node.succeeded .node-shape { fill:#effbf5; stroke:#7dcfa4; }.dag-node.disabled { opacity:.55; }
.dag-node.canceled .node-shape,.dag-node.stopped .node-shape { fill:#f0f2f5; stroke:#aeb7c5; }.node-instance { fill:#74829b; font-size:10px; }
.condition-shape { fill:#fff9ef; stroke:#e9c58f; }.node-kind { fill:#8492aa; font-size:11px; }.node-name { fill:#243654; font-size:13px; font-weight:600; }.node-status { fill:#74829b; font-size:10px; }.input-anchor { fill:white; stroke:#b1bfd3; }.output-anchor { fill:var(--el-color-primary); stroke:white; stroke-width:2; cursor:crosshair; }.output-anchor:hover { r:9; }.anchor-label { fill:#8b7446; font-size:10px; pointer-events:none; }
.workflow-canvas:fullscreen { border-radius:0; }.workflow-canvas:fullscreen .canvas-surface { height:calc(100vh - 130px); }.workflow-canvas:fullscreen .canvas-details { max-height:calc(100vh - 130px); }
@media(max-width:1000px) { .canvas-body { flex-direction:column; }.canvas-details { width:100%!important; max-height:none; border-left:0; border-top:1px solid var(--el-border-color-light); }.canvas-surface { flex:auto; height:500px; } }
</style>
