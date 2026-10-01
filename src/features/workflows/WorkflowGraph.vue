<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { t, toast } from '../../core/ui';
import { connect, curve, edgeBranch, inputPoint, layout, outputPoint, removeNodes } from './domain';
import { nodeStatus, nodeTone } from './status';
import type { Dag, Id, Point, PositionedNode, WorkflowEdge } from './types';

const props = withDefaults(defineProps<{ modelValue: Dag; readonly?: boolean }>(), { readonly: false });
const emit = defineEmits<{ 'update:modelValue': [dag: Dag]; select: [id: Id | null]; remove: [ids: Id[]] }>();
const root = ref<HTMLElement>(), surface = ref<HTMLElement>(), svg = ref<SVGSVGElement>();
const positions = ref<PositionedNode[]>([]), selected = ref<Id[]>([]), selectedEdge = ref<number | null>(null);
const viewport = ref({ width: 900, height: 590 }), pan = ref<Point>({ x: 0, y: 0 }), zoom = ref(1);
const connection = ref<{ from: Id; branch?: 'Y' | 'N'; point: Point } | null>(null);
const box = ref<{ start: Point; end: Point } | null>(null);
type Gesture = { kind: 'drag'; origin: Point; nodes: { id: Id; x: number; y: number }[] } | { kind: 'pan'; origin: Point; pan: Point } | { kind: 'connect' } | { kind: 'box' };
let gesture: Gesture | null = null, observer: ResizeObserver | undefined, needsFit = false;
const marker = `dag-arrow-${Math.random().toString(36).slice(2)}`;
watch(() => props.modelValue, dag => { const previous = new Map(positions.value.map(n => [n.nodeId, n])); positions.value = layout(dag).map(node => ({ ...node, x: previous.get(node.nodeId)?.x ?? node.x, y: previous.get(node.nodeId)?.y ?? node.y })); selected.value = selected.value.filter(id => positions.value.some(n => n.nodeId === id)); if (selectedEdge.value != null && !dag.edges[selectedEdge.value]) selectedEdge.value = null; }, { deep: true, immediate: true });
const selectedNode = computed(() => positions.value.find(n => n.nodeId === selected.value.at(-1)));
const preview = computed(() => { const source = positions.value.find(n => n.nodeId === connection.value?.from); return source && connection.value ? curve(outputPoint(source, connection.value.branch), connection.value.point) : ''; });
const boxBounds = computed(() => box.value ? { x: Math.min(box.value.start.x, box.value.end.x), y: Math.min(box.value.start.y, box.value.end.y), width: Math.abs(box.value.end.x - box.value.start.x), height: Math.abs(box.value.end.y - box.value.start.y) } : null);
function clear() { cancel(); selected.value = []; selectedEdge.value = null; emit('select', null); }
function choose(node: PositionedNode, additive = false) { if (!additive) selected.value = [node.nodeId]; else if (selected.value.includes(node.nodeId)) selected.value = selected.value.filter(id => id !== node.nodeId); else selected.value.push(node.nodeId); selectedEdge.value = null; emit('select', selected.value.at(-1) || null); }
function canvasPoint(event: PointerEvent | WheelEvent): Point { const rect = svg.value!.getBoundingClientRect(); return { x: (event.clientX - rect.left) * viewport.value.width / rect.width, y: (event.clientY - rect.top) * viewport.value.height / rect.height }; }
function graphPoint(event: PointerEvent | WheelEvent): Point { const point = canvasPoint(event); return { x: (point.x - pan.value.x) / zoom.value, y: (point.y - pan.value.y) / zoom.value }; }
function capture(event: PointerEvent) { svg.value?.setPointerCapture(event.pointerId); }
function pointerNode(event: PointerEvent, node: PositionedNode) {
  if (event.button !== 0) return;
  if (connection.value) { finishConnection(node.nodeId); return; }
  if (event.shiftKey || event.metaKey || event.ctrlKey) choose(node, true); else if (!selected.value.includes(node.nodeId)) choose(node); else emit('select', node.nodeId);
  root.value?.focus();
  if (!props.readonly) { gesture = { kind: 'drag', origin: graphPoint(event), nodes: positions.value.filter(n => selected.value.includes(n.nodeId)).map(n => ({ id: n.nodeId, x: n.x, y: n.y })) }; capture(event); }
}
function pointerSurface(event: PointerEvent) {
  if (event.button !== 0) return; root.value?.focus();
  if (connection.value) { cancel(); return; }
  if (event.shiftKey && !props.readonly) { const point = graphPoint(event); box.value = { start: point, end: point }; gesture = { kind: 'box' }; }
  else { clear(); gesture = { kind: 'pan', origin: canvasPoint(event), pan: { ...pan.value } }; }
  capture(event);
}
function move(event: PointerEvent) {
  const point = graphPoint(event); if (connection.value) connection.value.point = point;
  if (gesture?.kind === 'drag') { for (const original of gesture.nodes) { const node = positions.value.find(n => n.nodeId === original.id); if (node) { node.x = original.x + point.x - gesture.origin.x; node.y = original.y + point.y - gesture.origin.y; } } }
  else if (gesture?.kind === 'pan') { const p = canvasPoint(event); pan.value = { x: gesture.pan.x + p.x - gesture.origin.x, y: gesture.pan.y + p.y - gesture.origin.y }; }
  else if (gesture?.kind === 'box' && box.value) box.value.end = point;
}
function end(event: PointerEvent) {
  if (gesture?.kind === 'connect' && connection.value) { const point = graphPoint(event); const target = positions.value.find(n => { const port = inputPoint(n); return Math.hypot(point.x - port.x, point.y - port.y) <= 8 || (Math.abs(point.x - n.x) < (n.nodeType === 2 ? 102 : 120) && Math.abs(point.y - n.y) < 50); }); if (target) finishConnection(target.nodeId); else cancel(); }
  if (gesture?.kind === 'box' && boxBounds.value) { const bounds = boxBounds.value; selected.value = positions.value.filter(n => n.x >= bounds.x && n.x <= bounds.x + bounds.width && n.y >= bounds.y && n.y <= bounds.y + bounds.height).map(n => n.nodeId); emit('select', selected.value.at(-1) || null); box.value = null; }
  gesture = null; if (svg.value?.hasPointerCapture(event.pointerId)) svg.value.releasePointerCapture(event.pointerId); if (needsFit) { needsFit = false; fit(); }
}
function cancel() { gesture = null; connection.value = null; box.value = null; }
function startConnection(node: PositionedNode, branch?: 'Y' | 'N', event?: PointerEvent) { connection.value = { from: node.nodeId, branch, point: outputPoint(node, branch) }; if (event) { gesture = { kind: 'connect' }; capture(event); } }
function toggleConnection() { if (connection.value) cancel(); else if (selectedNode.value) startConnection(selectedNode.value); }
function finishConnection(target: Id) {
  if (!connection.value || props.readonly) return;
  try { emit('update:modelValue', connect(props.modelValue, connection.value.from, target, connection.value.branch)); }
  catch (error) { const reason = error instanceof Error ? error.message : ''; const messages: Record<string, string> = { self: t('节点不能连接自身', 'A node cannot connect to itself'), duplicate: t('连线已存在', 'This connection already exists'), cycle: t('连线会形成循环', 'This connection would create a cycle'), branches: t('条件节点只能有 Y、N 两条出边', 'Conditions require exactly one Y and one N branch'), branchDuplicate: t('该分支已有连线', 'This branch is already connected') }; toast(messages[reason] || t('无法连接节点', 'Cannot connect these nodes'), 'error'); }
  cancel();
}
function remove() { if (props.readonly) return; if (selected.value.length) { const ids = [...selected.value]; emit('update:modelValue', removeNodes(props.modelValue, new Set(ids))); emit('remove', ids); } else if (selectedEdge.value != null) emit('update:modelValue', { ...props.modelValue, edges: props.modelValue.edges.filter((_, i) => i !== selectedEdge.value) }); clear(); }
function edgePoints(edge: WorkflowEdge) { const from = positions.value.find(n => n.nodeId === edge.from), to = positions.value.find(n => n.nodeId === edge.to); return from && to ? [outputPoint(from, edgeBranch(edge.property) || undefined), inputPoint(to)] : null; }
function path(edge: WorkflowEdge) { const points = edgePoints(edge); return points ? curve(points[0]!, points[1]!) : ''; }
function labelPoint(edge: WorkflowEdge) { const p = edgePoints(edge); return p ? { x: (p[0]!.x + p[1]!.x) / 2, y: (p[0]!.y + p[1]!.y) / 2 } : { x: 0, y: 0 }; }
function setZoom(value: number, anchor: Point = { x: viewport.value.width / 2, y: viewport.value.height / 2 }) { const next = Math.max(.2, Math.min(2, value)), scale = next / zoom.value; pan.value = { x: anchor.x - (anchor.x - pan.value.x) * scale, y: anchor.y - (anchor.y - pan.value.y) * scale }; zoom.value = next; }
function wheel(event: WheelEvent) { setZoom(zoom.value * (event.deltaY < 0 ? 1.08 : 1 / 1.08), canvasPoint(event)); }
function fit() { if (!positions.value.length) return; const x0 = Math.min(...positions.value.map(n => n.x)) - 150, y0 = Math.min(...positions.value.map(n => n.y)) - 74, x1 = Math.max(...positions.value.map(n => n.x)) + 150, y1 = Math.max(...positions.value.map(n => n.y)) + 74; zoom.value = Math.max(.2, Math.min(1, (viewport.value.width - 50) / (x1 - x0), (viewport.value.height - 50) / (y1 - y0))); pan.value = { x: (viewport.value.width - (x0 + x1) * zoom.value) / 2, y: (viewport.value.height - (y0 + y1) * zoom.value) / 2 }; }
function arrange() { positions.value = layout(props.modelValue); nextTick(fit); }
function resize() { const rect = surface.value?.getBoundingClientRect(); if (!rect) return; viewport.value = { width: Math.max(250, rect.width), height: Math.max(360, rect.height) }; if (gesture) needsFit = true; else fit(); }
async function fullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await root.value?.requestFullscreen(); } catch { toast(t('当前浏览器无法进入全屏', 'Fullscreen is unavailable in this browser'), 'info'); } }
function key(event: KeyboardEvent) { const target = event.target as HTMLElement; if (/INPUT|TEXTAREA|SELECT/.test(target.tagName) || target.isContentEditable) return; if (event.key === 'Escape') { cancel(); if (document.fullscreenElement) document.exitFullscreen(); } else if (['Delete', 'Backspace'].includes(event.key)) { event.preventDefault(); remove(); } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && !props.readonly) { event.preventDefault(); selected.value = positions.value.map(n => n.nodeId); emit('select', selected.value.at(-1) || null); } }
function short(value: string, size: number) { let count = 0; return [...value].filter(() => ++count <= size).join('') + ([...value].length > size ? '…' : ''); }
onMounted(() => { observer = new ResizeObserver(resize); if (surface.value) observer.observe(surface.value); document.addEventListener('fullscreenchange', resize); nextTick(resize); });
watch(() => props.readonly, () => cancel());
onBeforeUnmount(() => { observer?.disconnect(); document.removeEventListener('fullscreenchange', resize); cancel(); });
defineExpose({ fit, arrange, clear });
</script>

<template>
  <section ref="root" class="flow-studio" tabindex="0" :aria-label="t('工作流图', 'Workflow graph')" @keydown="key">
    <header class="flow-tools">
      <div class="flow-context"><strong>{{ t('执行流程', 'Execution flow') }}</strong><span>{{ modelValue.nodes.length }} {{ t('节点', 'nodes') }} / {{ modelValue.edges.length }} {{ t('连线', 'connections') }}</span></div>
      <div class="flow-commands"><slot name="tools" /><button v-if="!readonly" class="btn btn-quiet" :disabled="!selectedNode" :aria-pressed="!!connection" @click="toggleConnection">{{ connection ? t('取消连线', 'Cancel connection') : t('连接', 'Connect') }}</button><button v-if="!readonly" class="btn btn-quiet" :disabled="!selected.length && selectedEdge === null" @click="remove">{{ t('删除', 'Delete') }}{{ selected.length > 1 ? ` (${selected.length})` : '' }}</button><button class="btn btn-quiet" @click="arrange">{{ t('自动布局', 'Arrange') }}</button><button class="btn btn-quiet" @click="fullscreen">{{ t('全屏', 'Fullscreen') }}</button></div>
    </header>
    <div ref="surface" class="flow-surface">
      <svg ref="svg" :viewBox="`0 0 ${viewport.width} ${viewport.height}`" class="flow-svg" @pointerdown="pointerSurface" @pointermove="move" @pointerup="end" @pointercancel="cancel" @wheel.prevent="wheel">
        <defs><pattern :id="`${marker}-grid`" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#d6deec" /></pattern><marker :id="marker" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="context-stroke" /></marker></defs>
        <rect width="100%" height="100%" :fill="`url(#${marker}-grid)`" />
        <g :transform="`translate(${pan.x},${pan.y}) scale(${zoom})`">
          <g v-for="(edge, index) in modelValue.edges" :key="`${edge.from}-${edge.to}`" class="flow-edge" :class="{ chosen: selectedEdge === index, inactive: edge.enable === false }" @pointerdown.stop="!readonly && (clear(), selectedEdge = index)"><path class="edge-target" :d="path(edge)" /><path class="edge-stroke" :d="path(edge)" :marker-end="`url(#${marker})`" /><g v-if="edgeBranch(edge.property)" :transform="`translate(${labelPoint(edge).x},${labelPoint(edge).y})`"><rect x="-14" y="-12" width="28" height="24" rx="6" /><text text-anchor="middle" dominant-baseline="central">{{ edgeBranch(edge.property) }}</text></g></g>
          <path v-if="connection" class="edge-preview" :d="preview" />
          <g v-for="node in positions" :key="node.nodeId" class="flow-node" :class="[nodeTone(node.status), { chosen: selected.includes(node.nodeId), inactive: node.enable === false || node.disableByControlNode }]" :data-node-id="node.nodeId" :transform="`translate(${node.x},${node.y})`" role="button" tabindex="0" :aria-label="node.nodeName || t('条件节点', 'Condition')" :aria-pressed="selected.includes(node.nodeId)" @pointerdown.stop="pointerNode($event, node)" @keydown.enter.stop="connection ? finishConnection(node.nodeId) : choose(node, $event.shiftKey)">
            <path v-if="node.nodeType === 2" class="node-outline" d="M -102 0 L 0 -52 L 102 0 L 0 52 Z" /><rect v-else class="node-outline" x="-120" y="-45" width="240" height="90" rx="12" />
            <text v-if="node.nodeType !== 2" class="node-reference" x="-102" y="-22">{{ node.nodeType === 3 ? t('子工作流', 'Workflow') : t('任务', 'Job') }} #{{ node.jobId }}</text>
            <text class="node-title" :x="node.nodeType === 2 ? 0 : -102" :y="node.nodeType === 2 ? 0 : 2" :text-anchor="node.nodeType === 2 ? 'middle' : 'start'">{{ short(node.nodeName || t('条件', 'Condition'), node.nodeType === 2 ? 12 : 25) }}<title>{{ node.nodeName }}</title></text>
            <text class="node-state" :x="node.nodeType === 2 ? 0 : -102" :y="node.nodeType === 2 ? 21 : 26" :text-anchor="node.nodeType === 2 ? 'middle' : 'start'">{{ node.status ? nodeStatus(node.status) : node.enable === false ? t('未启用', 'Disabled') : node.skipWhenFailed ? t('失败可跳过', 'Skip on failure') : t('已启用', 'Enabled') }}</text>
            <text v-if="node.instanceId" class="node-reference" x="0" y="69" text-anchor="middle">#{{ node.instanceId }}</text>
            <circle class="port-input" :cx="node.nodeType === 2 ? -102 : -120" cy="0" r="5" />
            <template v-if="!readonly"><circle v-if="node.nodeType !== 2" class="port-output" cx="120" cy="0" r="7" role="button" tabindex="0" :aria-label="t('连接此节点', 'Connect this node')" @pointerdown.stop="startConnection(node, undefined, $event)" @keydown.enter.stop="startConnection(node)" /><template v-else><g v-for="branch in (['Y', 'N'] as const)" :key="branch"><circle class="port-output" cx="66" :cy="branch === 'Y' ? -20 : 20" r="7" role="button" tabindex="0" :aria-label="`${t('连接分支', 'Connect branch')} ${branch}`" @pointerdown.stop="startConnection(node, branch, $event)" @keydown.enter.stop="startConnection(node, branch)" /><text class="port-label" x="79" :y="branch === 'Y' ? -19 : 24">{{ branch }}</text></g></template></template>
          </g>
          <rect v-if="boxBounds" class="selection-box" v-bind="boxBounds" />
        </g>
      </svg>
      <div v-if="!modelValue.nodes.length" class="flow-empty"><strong>{{ t('构建执行流程', 'Build an execution flow') }}</strong><p>{{ t('导入任务后，连接节点来安排执行顺序。', 'Import jobs, then connect nodes to define their execution order.') }}</p><slot name="empty" /></div>
      <div class="flow-zoom"><button :aria-label="t('缩小', 'Zoom out')" @click="setZoom(zoom / 1.15)">−</button><button :aria-label="t('适应画布', 'Fit graph')" @click="fit">{{ Math.round(zoom * 100) }}%</button><button :aria-label="t('放大', 'Zoom in')" @click="setZoom(zoom * 1.15)">+</button></div>
    </div>
    <footer class="flow-help">{{ connection ? t('点击目标节点，或拖动到目标节点；Esc 取消', 'Choose or drag to the destination node; Esc cancels') : readonly ? t('选择节点查看执行详情 · 拖动画布 · 滚轮缩放', 'Select a node for execution details · Drag to pan · Scroll to zoom') : t('拖动节点 · Shift 多选或框选 · Delete 删除 · 滚轮缩放', 'Drag nodes · Shift to select multiple nodes · Delete removes · Scroll to zoom') }}</footer>
  </section>
</template>

<style scoped>
.flow-studio{min-width:0;border:1px solid var(--border,#e0e6f0);border-radius:16px;background:#fff;overflow:hidden;outline:none}.flow-studio:focus-visible{outline:2px solid var(--primary,#4169e1);outline-offset:3px}.flow-tools{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border,#e0e6f0)}.flow-context{display:flex;flex-direction:column;gap:3px;flex-shrink:0}.flow-context strong{font-size:14px}.flow-context span{font-size:11px;color:var(--muted,#718099)}.flow-commands{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}.flow-commands:deep(.btn){padding:6px 10px;font-size:12px}.flow-surface{position:relative;height:590px;min-width:0;background:#f8faff}.flow-svg{width:100%;height:100%;display:block;touch-action:none;user-select:none;font-family:inherit}.edge-target{fill:none;stroke:transparent;stroke-width:20;cursor:pointer}.edge-stroke{fill:none;stroke:#9baac3;stroke-width:2}.flow-edge.chosen .edge-stroke{stroke:#4169e1;stroke-width:3}.flow-edge.inactive .edge-stroke{stroke-dasharray:7 5;opacity:.5}.flow-edge rect{fill:#fff;stroke:#e0e6f0}.flow-edge text{fill:#4169e1;font-size:12px;font-weight:700}.edge-preview{stroke:#4169e1;stroke-width:2;stroke-dasharray:5 5;fill:none}.flow-node{cursor:grab;outline:none}.flow-node:active{cursor:grabbing}.node-outline{fill:#fff;stroke:#cbd6e8;stroke-width:1.5}.flow-node.chosen .node-outline,.flow-node:focus-visible .node-outline{stroke:#4169e1;stroke-width:2.5}.flow-node.running .node-outline{fill:#edf2ff;stroke:#4169e1}.flow-node.success .node-outline{fill:#effaf6;stroke:#18a27d}.flow-node.danger .node-outline{fill:#fff1f2;stroke:#d14857}.flow-node.inactive{opacity:.5}.node-reference{font-size:10px;fill:#718099}.node-title{font-size:13px;font-weight:700;fill:#17233d}.node-state{font-size:10px;fill:#718099}.port-input{fill:#fff;stroke:#9baac3}.port-output{fill:#4169e1;stroke:#fff;stroke-width:2;cursor:crosshair}.port-output:focus{stroke:#17233d}.port-label{fill:#4169e1;font-size:10px;pointer-events:none}.selection-box{fill:#4169e111;stroke:#4169e1;stroke-dasharray:4 4}.flow-empty{position:absolute;inset:34% 20px auto;text-align:center;pointer-events:none}.flow-empty strong{font-size:18px;font-weight:600}.flow-empty p{font-size:13px;color:var(--muted,#718099)}.flow-empty:deep(button){pointer-events:auto}.flow-zoom{position:absolute;right:16px;bottom:16px;display:flex;border:1px solid #dfe6f0;background:#fff;border-radius:8px;overflow:hidden}.flow-zoom button{border:0;background:transparent;min-width:34px;height:32px;font:inherit;font-size:12px;cursor:pointer;color:#17233d}.flow-zoom button:hover{background:#edf2ff}.flow-zoom button:focus-visible{outline:2px solid #4169e1;outline-offset:-3px}.flow-help{padding:10px 18px;font-size:11px;color:var(--muted,#718099);border-top:1px solid var(--border,#e0e6f0)}.flow-studio:fullscreen{display:flex;flex-direction:column;border-radius:0}.flow-studio:fullscreen .flow-surface{flex:1;height:auto}@media(max-width:760px){.flow-tools{align-items:flex-start;flex-direction:column;padding:12px}.flow-commands{justify-content:flex-start}.flow-surface{height:460px}.flow-help{padding:10px 12px}}
</style>
