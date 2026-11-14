export type NetworkNode = { x: number; y: number; depth: number };
export type NetworkEdge = {
  a: number;
  b: number;
  strength: number;
  phase: number;
};
export type NetworkGlyph = {
  x: number;
  y: number;
  text: string;
  size: number;
  alpha: number;
};

const symbols = [
  "{ }",
  "<>",
  "01",
  "[ ]",
  "=>",
  "/",
  "( )",
  "1",
  ";",
  "0",
  "</>",
  "::",
];
const fract = (n: number) => n - Math.floor(n);
const seed = (n: number) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const smooth = (n: number) => {
  const v = Math.max(0, Math.min(1, n));
  return v * v * (3 - 2 * v);
};

export function networkBudget(width: number, height: number, cores = 8) {
  const compact = width < 640;
  const constrained = cores <= 4;
  return {
    nodes: Math.min(
      constrained ? 32 : 54,
      Math.max(compact ? 22 : 32, Math.round((width * height) / 26000)),
    ),
    glyphs: compact ? 10 : constrained ? 16 : 24,
    fps: compact || constrained ? 30 : 60,
    dpr: Math.min(1.5, Math.sqrt(2800000 / Math.max(1, width * height))),
    reach: compact ? 145 : Math.min(235, width * 0.18),
  };
}

/** Deterministic lanes, rather than a random particle cloud. Shared orbit phases
 * carry the nodes and their code packets through the same engineering diagram. */
export function createNetworkField(width: number, height: number, cores = 8) {
  const budget = networkBudget(width, height, cores);
  const nodes: NetworkNode[] = Array.from({ length: budget.nodes }, () => ({
    x: 0,
    y: 0,
    depth: 0,
  }));
  const edges = new Map<string, NetworkEdge>();
  const glyphs: NetworkGlyph[] = [];
  const degrees = new Uint8Array(nodes.length);
  const buckets = new Map<number, number[]>();
  const columns = Math.ceil(width / budget.reach) + 4;
  // Sample an absolute position, not an elapsed time. Returning to a section
  // reconstructs the same links and packets regardless of scroll speed.
  function update(chapter: number, spread = 1) {
    const phasePosition = chapter * 6;
    buckets.clear();
    edges.clear();
    degrees.fill(0);
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]!;
      const lane = i % 4;
      const phase = seed(i + 1) * Math.PI * 2;
      const flow = phasePosition * (0.075 + seed(i + 10) * 0.055);
      const x =
        lane < 2
          ? width * (lane === 0 ? 0.065 : 0.935) +
            Math.sin(phase + flow) * Math.min(width * 0.13, 155)
          : width * (0.12 + seed(i + 35) * 0.76) + Math.sin(phase + flow) * 72;
      const y =
        lane < 2
          ? height * (0.05 + seed(i + 20) * 0.9) +
            Math.cos(phase + flow * 1.3) * 65
          : height * (lane === 2 ? 0.14 : 0.87) +
            Math.cos(phase + flow) * Math.min(height * 0.14, 110);
      n.depth = 0.5 + seed(i + 91) * 0.5;
      n.x = width / 2 + (x - width / 2) * (1 + (spread - 1) * n.depth);
      n.y = y + Math.sin(chapter * .64 + lane) * height * .075 * n.depth;
      const key =
        (Math.floor(n.y / budget.reach) + 2) * columns +
        Math.floor(n.x / budget.reach) +
        2;
      const bucket = buckets.get(key) ?? [];
      bucket.push(i);
      buckets.set(key, bucket);
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]!;
      const col = Math.floor(a.x / budget.reach) + 2;
      const row = Math.floor(a.y / budget.reach) + 2;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          for (const j of buckets.get((row + dy) * columns + col + dx) ?? []) {
            if (j <= i || degrees[i]! >= 3 || degrees[j]! >= 3) continue;
            const b = nodes[j]!;
            const distance = Math.hypot(a.x - b.x, a.y - b.y);
            if (distance >= budget.reach || distance < 22) continue;
            // Staggered link handoffs give nearby nodes occasional disconnect /
            // reconnect sequences, in addition to distance-driven topology changes.
            const gate = smooth((Math.sin(phasePosition * .22 + seed(i * 71 + j) * Math.PI * 2) + 1) / .42);
            if (gate < .01) continue;
            degrees[i]!++;
            degrees[j]!++;
            const key = `${i}:${j}`;
            const target = smooth(
              (budget.reach - distance) / (budget.reach * 0.5),
            );
            edges.set(key, {
              a: i,
              b: j,
              strength: target * gate,
              phase: seed(i * 71 + j),
            });
          }
        }
    }
    glyphs.length = 0;
    const paths = Array.from(edges.values()).filter((e) => e.strength > 0.35);
    for (let i = 0; i < budget.glyphs; i++) {
      const phase = fract(phasePosition / (10 + seed(i + 53) * 10) + seed(i + 70));
      const anchor = nodes[(i * 7 + 3) % nodes.length]!;
      const edge = paths[(i * 3) % Math.max(1, paths.length)];
      let x = anchor.x + Math.sin(phase * Math.PI * 2) * 55;
      let y = anchor.y + (phase - 0.5) * 150;
      if (i % 3 === 0 && edge) {
        const a = nodes[edge.a]!,
          b = nodes[edge.b]!;
        const point = circuitPoint(a, b, phase);
        x = point.x;
        y = point.y - 11;
      }
      glyphs.push({
        x,
        y,
        text:
          i === 11
            ? "await build()"
            : i === 19
              ? "api.connect()"
              : symbols[i % symbols.length]!,
        size: 11 + seed(i + 4) * 9,
        alpha:
          smooth(phase / 0.16) *
          smooth((1 - phase) / 0.16) *
          (0.42 + seed(i + 9) * 0.3) *
          (i % 3 === 0 && edge ? edge.strength : 1),
      });
    }
  }
  update(0);
  return { nodes, edges, glyphs, budget, update };
}

/** Precise traces with 45-degree shoulders, echoing the brand symbol's cut. */
export function circuitRoute(a: NetworkNode, b: NetworkNode) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const cut = Math.min(Math.abs(dx) * 0.2, Math.abs(dy) * 0.35, 18);
  const mid = (a.x + b.x) / 2;
  return [
    a,
    { x: mid - Math.sign(dx) * cut, y: a.y },
    { x: mid, y: a.y + Math.sign(dy) * cut },
    { x: mid, y: b.y - Math.sign(dy) * cut },
    { x: mid + Math.sign(dx) * cut, y: b.y },
    b,
  ];
}

export function circuitPoint(a: NetworkNode, b: NetworkNode, progress: number) {
  const points = circuitRoute(a, b);
  const lengths = points
    .slice(1)
    .map((p, i) => Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y));
  let remaining =
    lengths.reduce((sum, n) => sum + n, 0) * Math.max(0, Math.min(1, progress));
  for (let i = 0; i < lengths.length; i++) {
    const length = lengths[i]!;
    if (remaining <= length && length > 0) {
      const start = points[i]!,
        end = points[i + 1]!,
        part = remaining / length;
      return {
        x: start.x + (end.x - start.x) * part,
        y: start.y + (end.y - start.y) * part,
      };
    }
    remaining -= length;
  }
  return { x: b.x, y: b.y };
}
