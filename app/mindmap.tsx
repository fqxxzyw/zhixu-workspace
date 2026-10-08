"use client";
import { useRef, useState } from "react";
import {
  Plus,
  Minus,
  Trash2,
  Maximize,
  Undo2,
  Redo2,
  CornerDownRight,
  ChevronDown,
} from "lucide-react";
import { Btn, Choice } from "./ui";
import {
  MapNode,
  nodeWidth,
  visibleNodes,
  layoutNodes,
  descendants,
  reparentNode,
} from "@/lib/mindmap";
export function Mindmap({
  value,
  onChange,
  readonly = false,
}: {
  value: any;
  onChange: (v: any) => void;
  readonly?: boolean;
}) {
  const nodes: MapNode[] = value.nodes || [],
    [selected, setSelected] = useState(nodes[0]?.id || "root"),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [editing, setEditing] = useState(false),
    [undo, setUndo] = useState<any[]>([]),
    [redo, setRedo] = useState<any[]>([]),
    [dragNodes, setDragNodes] = useState<MapNode[] | null>(null),
    [target, setTarget] = useState<string | null>(null);
  const drag = useRef<any>(null),
    canvas = useRef<SVGGElement>(null),
    surface = useRef<HTMLDivElement>(null),
    editor = useRef<HTMLInputElement>(null),
    display = dragNodes || nodes,
    node = nodes.find((n) => n.id === selected) || nodes[0],
    visible = visibleNodes(display),
    bounds = visibleNodes(nodes),
    layout = value.layout || "逻辑图";
  function commit(next: any) {
    setUndo((v) => [...v.slice(-39), structuredClone(value)]);
    setRedo([]);
    onChange(next);
  }
  function patch(id: string, p: any, arrange = false) {
    const next = nodes.map((n) => (n.id === id ? { ...n, ...p } : n));
    commit({ ...value, nodes: arrange ? layoutNodes(next, layout) : next });
  }
  function beginEdit() {
    setEditing(true);
    setTimeout(() => editor.current?.select(), 0);
  }
  function add(sibling = false) {
    if (!node || readonly) return;
    const id = crypto.randomUUID(),
      parent = sibling && node.parent ? node.parent : node.id,
      next = nodes.map((n) =>
        n.id === parent ? { ...n, collapsed: false } : n,
      ),
      index = sibling
        ? next.findIndex((n) => n.id === node.id) + 1
        : next.length;
    next.splice(index, 0, {
      id,
      parent,
      text: sibling ? "新主题" : "子主题",
      x: 0,
      y: 0,
      color: node.color || "#2875e8",
    });
    commit({ ...value, nodes: layoutNodes(next, layout) });
    setSelected(id);
    beginEdit();
  }
  function remove() {
    if (!node?.parent) return;
    const doomed = descendants(nodes, node.id);
    commit({
      ...value,
      nodes: layoutNodes(
        nodes.filter((n) => !doomed.has(n.id)),
        layout,
      ),
    });
    setSelected(node.parent);
    setEditing(false);
  }
  function history(back = true) {
    const stack = back ? undo : redo;
    if (!stack.length) return;
    const next = stack[stack.length - 1];
    if (back) {
      setUndo(undo.slice(0, -1));
      setRedo((v) => [...v, structuredClone(value)]);
    } else {
      setRedo(redo.slice(0, -1));
      setUndo((v) => [...v, structuredClone(value)]);
    }
    onChange(next);
    setEditing(false);
  }
  const minX = Math.min(...bounds.map((n) => n.x - nodeWidth(n) / 2), -100),
    maxX = Math.max(...bounds.map((n) => n.x + nodeWidth(n) / 2), 100),
    minY = Math.min(...bounds.map((n) => n.y - 32), -60),
    maxY = Math.max(...bounds.map((n) => n.y + 32), 60),
    width = Math.max(1050, maxX - minX + 100),
    height = Math.max(500, maxY - minY + 120);
  const vx = (minX + maxX) / 2 - width / zoom / 2 + pan.x,
    vy = (minY + maxY) / 2 - height / zoom / 2 + pan.y;
  function point(e: React.PointerEvent) {
    const matrix = canvas.current?.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
  }
  function endDrag() {
    const d = drag.current;
    if (d?.id && dragNodes) {
      let next = dragNodes;
      if (target) next = layoutNodes(reparentNode(next, d.id, target), layout);
      commit({ ...value, nodes: next });
    }
    drag.current = null;
    setDragNodes(null);
    setTarget(null);
  }
  return (
    <div
      className="mindmap-block"
      tabIndex={0}
      aria-label="思维导图编辑器，Tab 新建子主题，Enter 新建同级主题，F2 编辑"
      onKeyDown={(e) => {
        if (readonly || e.target instanceof HTMLInputElement) return;
        if (e.key === "Tab") {
          e.preventDefault();
          add();
        } else if (e.key === "Enter") {
          e.preventDefault();
          add(true);
        } else if (e.key === "F2") {
          e.preventDefault();
          beginEdit();
        } else if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          remove();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
          e.preventDefault();
          history(!e.shiftKey);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          const child = nodes.find((n) => n.parent === selected);
          if (child) setSelected(child.id);
        } else if (e.key === "ArrowLeft" && node?.parent) {
          e.preventDefault();
          setSelected(node.parent);
        }
      }}
    >
      <div className="map-toolbar">
        <span className="eyebrow">思维导图</span>
        <div className="row">
          {!readonly && (
            <>
              <Choice
                label="思维导图布局"
                value={layout}
                items={["逻辑图", "中心主题", "树状图"]}
                onChange={(l) => {
                  commit({ ...value, layout: l, nodes: layoutNodes(nodes, l) });
                  setPan({ x: 0, y: 0 });
                }}
              />
              <Btn
                title="撤销 · Ctrl+Z"
                disabled={!undo.length}
                onClick={() => history()}
              >
                <Undo2 size={14} />
              </Btn>
              <Btn
                title="重做 · Ctrl+Shift+Z"
                disabled={!redo.length}
                onClick={() => history(false)}
              >
                <Redo2 size={14} />
              </Btn>
            </>
          )}
          <Btn
            title="缩小"
            onClick={() => setZoom((v) => Math.max(0.4, v - 0.15))}
          >
            <Minus size={14} />
          </Btn>
          <Btn
            title="放大"
            onClick={() => setZoom((v) => Math.min(2.5, v + 0.15))}
          >
            <Plus size={14} />
          </Btn>
          <Btn
            title="适应画布"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            <Maximize size={14} />
          </Btn>
        </div>
      </div>
      <div className="map-canvas" ref={surface}>
        <svg
          viewBox={`${vx} ${vy} ${width / zoom} ${height / zoom}`}
          role="img"
          aria-label="知识主题与分支"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) {
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = {
                pan: true,
                cx: e.clientX,
                cy: e.clientY,
                start: pan,
                width: width / zoom,
                height: height / zoom,
              };
            }
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            if (d.pan) {
              const r = e.currentTarget.getBoundingClientRect();
              setPan({
                x: d.start.x - ((e.clientX - d.cx) * d.width) / r.width,
                y: d.start.y - ((e.clientY - d.cy) * d.height) / r.height,
              });
              return;
            }
            if (readonly) return;
            const p = point(e),
              dx = p.x - d.x,
              dy = p.y - d.y,
              branch = descendants(nodes, d.id),
              next = nodes.map((n) =>
                branch.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n,
              );
            setDragNodes(next);
            const moved = next.find((n) => n.id === d.id);
            setTarget(
              nodes.find(
                (n) =>
                  !branch.has(n.id) &&
                  moved &&
                  Math.abs(n.x - moved.x) < nodeWidth(n) / 2 + 40 &&
                  Math.abs(n.y - moved.y) < 45,
              )?.id || null,
            );
          }}
          onPointerUp={endDrag}
          onPointerCancel={() => {
            drag.current = null;
            setDragNodes(null);
            setTarget(null);
          }}
        >
          <g ref={canvas}>
            {visible.map((n) => {
              const p = visible.find((a) => a.id === n.parent);
              if (!p) return null;
              const side = n.x >= p.x ? 1 : -1,
                a = p.x + (side * nodeWidth(p)) / 2,
                b = n.x - (side * nodeWidth(n)) / 2;
              return (
                <path
                  key={"line-" + n.id}
                  d={
                    layout === "树状图"
                      ? `M ${p.x} ${p.y + 25} C ${p.x} ${(p.y + n.y) / 2},${n.x} ${(p.y + n.y) / 2},${n.x} ${n.y - 25}`
                      : `M ${a} ${p.y} C ${(a + b) / 2} ${p.y},${(a + b) / 2} ${n.y},${b} ${n.y}`
                  }
                  fill="none"
                  stroke="var(--map-line,#acbed9)"
                  strokeWidth="2"
                />
              );
            })}
            {visible.map((n) => (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                onClick={() => {
                  setSelected(n.id);
                  surface.current?.parentElement?.focus();
                }}
                onDoubleClick={() => {
                  if (!readonly) {
                    setSelected(n.id);
                    beginEdit();
                  }
                }}
                onPointerDown={(e) => {
                  if (readonly) return;
                  e.stopPropagation();
                  e.currentTarget.ownerSVGElement?.setPointerCapture(
                    e.pointerId,
                  );
                  setSelected(n.id);
                  const p = point(e);
                  drag.current = { id: n.id, x: p.x, y: p.y };
                }}
                style={{ cursor: readonly ? "default" : "grab" }}
              >
                <rect
                  x={-nodeWidth(n) / 2}
                  y="-25"
                  width={nodeWidth(n)}
                  height="50"
                  rx="12"
                  fill={!n.parent ? n.color || "#2875e8" : "var(--card)"}
                  stroke={
                    selected === n.id || target === n.id
                      ? n.color || "#2875e8"
                      : "var(--border)"
                  }
                  strokeWidth={target === n.id ? 4 : selected === n.id ? 2 : 1}
                />
                <foreignObject
                  x={-nodeWidth(n) / 2 + 12}
                  y="-22"
                  width={nodeWidth(n) - 24}
                  height="44"
                >
                  <div
                    className="map-node-label"
                    style={{ color: !n.parent ? "white" : "var(--foreground)" }}
                    title={n.text}
                  >
                    {n.text}
                  </div>
                </foreignObject>
                {nodes.some((x) => x.parent === n.id) && (
                  <g
                    className="map-branch-toggle"
                    transform={`translate(${nodeWidth(n) / 2 + 9},0)`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!readonly)
                        patch(n.id, { collapsed: !n.collapsed }, true);
                    }}
                  >
                    <circle r="9" fill="var(--card)" stroke="var(--border)" />
                    <text
                      textAnchor="middle"
                      y="4"
                      fontSize="13"
                      fill="var(--foreground)"
                    >
                      {n.collapsed ? "+" : "−"}
                    </text>
                  </g>
                )}
              </g>
            ))}
          </g>
        </svg>
      </div>
      {!readonly && node && (
        <div className="node-editor">
          <input
            ref={editor}
            aria-label="节点文本，Enter 完成编辑"
            value={node.text}
            onFocus={() => setEditing(true)}
            onChange={(e) => patch(node.id, { text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
                surface.current?.parentElement?.focus();
              }
            }}
          />
          <input
            aria-label="节点颜色"
            type="color"
            value={node.color || "#2875e8"}
            onChange={(e) => patch(node.id, { color: e.target.value })}
          />
          <Btn onClick={() => add()}>
            <CornerDownRight size={14} />
            子主题
          </Btn>
          <Btn onClick={() => add(true)}>同级主题</Btn>
          <Btn
            title={node.collapsed ? "展开分支" : "折叠分支"}
            onClick={() => patch(node.id, { collapsed: !node.collapsed }, true)}
          >
            <ChevronDown size={14} />
          </Btn>
          <Btn title="删除节点与分支" disabled={!node.parent} onClick={remove}>
            <Trash2 size={14} />
          </Btn>
        </div>
      )}
      <div className="map-hint">
        {target
          ? "松开鼠标，将分支移到此主题下"
          : readonly
            ? "拖动画布浏览 · + / − 缩放"
            : "Tab 子主题 · Enter 同级 · 双击 / F2 编辑 · 拖动分支可移动或重挂 · 拖动空白平移"}
      </div>
    </div>
  );
}
