export type MapNode = {
  id: string;
  parent?: string | null;
  text: string;
  x: number;
  y: number;
  color?: string;
  collapsed?: boolean;
};
export function nodeWidth(n: MapNode) {
  return Math.min(
    380,
    Math.max(
      150,
      Array.from(n.text || "")
        .slice(0, 80)
        .reduce((w, c) => w + (/[^\x00-\xff]/.test(c) ? 14 : 8), 32),
    ),
  );
}
export function descendants(nodes: MapNode[], id: string) {
  const result = new Set([id]);
  let more = true;
  while (more) {
    more = false;
    for (const n of nodes)
      if (n.parent && result.has(n.parent) && !result.has(n.id)) {
        result.add(n.id);
        more = true;
      }
  }
  return result;
}
export function visibleNodes(nodes: MapNode[]) {
  return nodes.filter((n) => {
    let p = n,
      seen = new Set([n.id]);
    while (p.parent) {
      const next = nodes.find((x) => x.id === p.parent);
      if (!next) return true;
      if (seen.has(next.id) || next.collapsed) return false;
      seen.add(next.id);
      p = next;
    }
    return true;
  });
}
export function layoutNodes(nodes: MapNode[], layout = "逻辑图") {
  const result = nodes.map((n) => ({ ...n })),
    root = result.find((n) => !n.parent) || result[0];
  if (!root) return result;
  const visited = new Set<string>(),
    children = (id: string) => result.filter((n) => n.parent === id),
    weights = new Map<string, number>();
  function weight(n: MapNode, seen = new Set<string>()): number {
    if (seen.has(n.id)) return 1;
    const next = new Set(seen);
    next.add(n.id);
    const cs = n.collapsed ? [] : children(n.id);
    const w = cs.length ? cs.reduce((s, c) => s + weight(c, next), 0) : 1;
    weights.set(n.id, w);
    return w;
  }
  weight(root);
  root.x = 0;
  root.y = 0;
  const place = (n: MapNode, side: number, start: number, depth: number) => {
    if (visited.has(n.id)) return;
    visited.add(n.id);
    n.x = depth === 0 ? 0 : side * depth * 440;
    n.y = start + (weights.get(n.id) || 1) * 45;
    let cursor = start;
    for (const c of children(n.id)) {
      place(c, side, cursor, depth + 1);
      cursor += (weights.get(c.id) || 1) * 90;
    }
  };
  if (layout === "中心主题") {
    visited.add(root.id);
    const cs = children(root.id);
    for (const side of [1, -1]) {
      const group = cs.filter((_, i) => i % 2 === (side === 1 ? 0 : 1)),
        total = group.reduce((s, n) => s + (weights.get(n.id) || 1) * 90, 0);
      let cursor = -total / 2;
      for (const n of group) {
        place(n, side, cursor, 1);
        cursor += (weights.get(n.id) || 1) * 90;
      }
    }
  } else {
    place(root, 1, -(weights.get(root.id) || 1) * 45, 0);
    if (layout === "树状图") {
      for (const n of result) {
        const x = n.x;
        n.x = n.y * 5;
        n.y = x * 0.32;
      }
    }
  }
  return result;
}
export function reparentNode(nodes: MapNode[], id: string, parent: string) {
  const n = nodes.find((x) => x.id === id);
  if (
    !n?.parent ||
    !nodes.some((x) => x.id === parent) ||
    descendants(nodes, id).has(parent)
  )
    return nodes;
  return nodes.map((x) => (x.id === id ? { ...x, parent } : x));
}
