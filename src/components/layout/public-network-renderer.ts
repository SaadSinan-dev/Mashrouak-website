import { circuitRoute, createNetworkField } from "./network-field";

type RGB = [number, number, number];
type Tone = "paper" | "mist" | "night" | "petrol";
type Bounds = { left: number; top: number; width: number; height: number };
type Surface = { tone: Tone; rect: Bounds };
type Palette = Record<Tone | "ink" | "signal" | "onNight", RGB>;
const rgb = (value: string): RGB => {
  const hex = value.trim().replace("#", "");
  if (/^[\da-f]{6}$/i.test(hex))
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
  const values = value.match(/[\d.]+/g)?.map(Number);
  return [values?.[0] ?? 0, values?.[1] ?? 0, values?.[2] ?? 0];
};
const css = (color: RGB, alpha = 1) =>
  `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;

const protectedSelector = [
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "li",
  "dt",
  "dd",
  "blockquote",
  "label",
  "button",
  "a",
  "input",
  "select",
  "textarea",
  ".eyebrow",
  ".hero-visual",
  ".hero-section__footnote",
  ".hero-section__bottomline",
  ".page-hero__aside",
  ".artwork",
  ".smart-image",
  ".service-detail__visual",
  ".case-gallery__mockup",
  ".contact-form",
  ".chat-conversation",
  ".company-chatbot",
  ".site-header",
  ".privacy-page__body",
  ".rich-text",
  ".result-card",
  ".stat-card",
].join(",");

/** One demand-driven canvas. Cache document geometry on layout changes;
 * a scroll frame only samples the cache and the current scroll offset. */
export function createPublicNetwork(host: HTMLDivElement) {
  const canvas = host.querySelector("canvas");
  const ctx = canvas?.getContext("2d", { alpha: true });
  if (!canvas || !ctx) return () => {};
  const root = document.documentElement;
  const scope = host.parentElement ?? document.body;
  const abort = new AbortController();
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const contrast = matchMedia("(forced-colors: active)");
  const print = matchMedia("print");
  let disposed = false,
    frame = 0,
    width = 0,
    height = 0,
    dpr = 1;
  let sizeDirty = true,
    layoutDirty = true,
    paletteDirty = true;
  let chapter = 0, spread = 1, strength = 1, lastPaint = -Infinity;
  let palette: Palette;
  let field = createNetworkField(1440, 900);
  let surfaces: Surface[] = [];
  let documentSurfaces: Surface[] = [];
  let masks: (Bounds & { fixed: boolean })[] = [];
  let hero: HTMLElement | null = null, heroTop = 0;
  const marked = new Set<HTMLElement>();
  let protection = new Path2D();
  let quietRects: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  }[] = [];
  let resolution: MediaQueryList | undefined;

  const invalidate = () => {
    layoutDirty = true;
    schedule();
  };
  const resize = () => {
    sizeDirty = true;
    layoutDirty = true;
    schedule();
  };
  const recolor = () => {
    paletteDirty = true;
    layoutDirty = true;
    schedule();
  };
  function watchResolution() {
    resolution?.removeEventListener("change", resize);
    resolution = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
    resolution.addEventListener("change", resize);
  }
  function readSize() {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    field = createNetworkField(width, height, navigator.hardwareConcurrency);
    dpr = Math.min(devicePixelRatio || 1, field.budget.dpr);
    canvas!.width = Math.ceil(width * dpr);
    canvas!.height = Math.ceil(height * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    host.dataset.networkNodes = String(field.budget.nodes);
    watchResolution();
    sizeDirty = false;
  }
  function readPalette() {
    const style = getComputedStyle(host),
      tokens = getComputedStyle(root);
    const value = (name: string) => rgb(style.getPropertyValue(name));
    palette = {
      paper: rgb(tokens.getPropertyValue("--ivory")),
      mist: rgb(tokens.getPropertyValue("--mist")),
      night: value("--network-night"),
      petrol: rgb("#142b3a"),
      ink: value("--network-ink"),
      signal: value("--network-signal"),
      onNight: value("--network-on-night"),
    };
    paletteDirty = false;
  }
  function readLayout() {
    documentSurfaces = [];
    const scroll = window.scrollY;
    const nextMarked = new Set<HTMLElement>();
    for (const element of scope.querySelectorAll<HTMLElement>(
      "main section, .site-footer, .chat-shell, .contact-bottom",
    )) {
      const tone = getComputedStyle(element)
        .getPropertyValue("--network-surface")
        .trim();
      if (!["paper", "mist", "night", "petrol"].includes(tone)) continue;
      if (element.dataset.networkSurface !== tone) element.dataset.networkSurface = tone;
      nextMarked.add(element);
      const rect = element.getBoundingClientRect();
      if (rect.width && rect.height)
        documentSurfaces.push({ tone: tone as Tone, rect: { left: rect.left, top: rect.top + scroll, width: rect.width, height: rect.height } });
    }
    for (const element of marked) if (!nextMarked.has(element)) delete element.dataset.networkSurface;
    marked.clear();
    for (const element of nextMarked) marked.add(element);
    documentSurfaces.sort((a,b) => a.rect.top - b.rect.top);
    hero = scope.querySelector<HTMLElement>(".hero-section--horizon");
    heroTop = hero ? hero.getBoundingClientRect().top + scroll : 0;
    masks = [];
    for (const element of scope.querySelectorAll<HTMLElement>(
      protectedSelector,
    )) {
      if (element.closest(".public-atmosphere")) continue;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      // Entire model/form areas are quiet; text gets a small breathing margin.
      const pad = element.matches(".hero-visual, .contact-form, .artwork")
        ? 12
        : 8;
      // Reserve the 18px reveal travel as well as the settled text position.
      const verticalPad = element.matches("h1, h2, h3, h4, p") ? pad + 18 : pad;
      const fixed = !!element.closest(".site-header,.company-chatbot,.support-launcher");
      masks.push({ left: rect.left - pad, top: rect.top - verticalPad + (fixed ? 0 : scroll),
        width: rect.width + pad * 2, height: rect.height + verticalPad * 2, fixed });
    }
    layoutDirty = false;
  }
  function sampleScroll() {
    const scroll = window.scrollY;
    const focus = scroll + height * .36;
    const profiles = { paper: [1, .72], mist: [.89, .64], night: [1.14, 1], petrol: [1.14, 1] } as const;
    let index = 0;
    for (let i = 1; i < documentSurfaces.length && documentSurfaces[i]!.rect.top <= focus; i++) index = i;
    const current = documentSurfaces[index], next = documentSurfaces[index + 1];
    const fraction = current ? Math.max(0, Math.min(1, (focus - current.rect.top) / Math.max(1, (next?.rect.top ?? current.rect.top + current.rect.height) - current.rect.top))) : 0;
    const a = profiles[current?.tone ?? "paper"], b = profiles[next?.tone ?? current?.tone ?? "paper"];
    const blend = fraction * fraction * (3 - 2 * fraction);
    chapter = motion.matches ? 0 : index + fraction;
    spread = motion.matches ? 1 : a[0] + (b[0] - a[0]) * blend;
    strength = motion.matches ? .68 : a[1] + (b[1] - a[1]) * blend;
    if (hero) {
      const offset = motion.matches ? 0 : Math.min(95, Math.max(0, (scroll - heroTop) * .16));
      const value = offset.toFixed(1) + "px";
      if (hero.style.getPropertyValue("--horizon-offset") !== value) hero.style.setProperty("--horizon-offset", value);
    }
    surfaces = [];
    for (const { tone, rect } of documentSurfaces) {
      const top = rect.top - scroll;
      if (top < height && top + rect.height > 0) surfaces.push({ tone, rect: { ...rect, top } });
    }
    protection = new Path2D();
    quietRects = [];
    for (const rect of masks) {
      const top = rect.top - (rect.fixed ? 0 : scroll);
      if (top > height || top + rect.height < 0) continue;
      protection.roundRect(rect.left, top, rect.width, rect.height, 10);
      quietRects.push({
        left: rect.left, right: rect.left + rect.width, top, bottom: top + rect.height,
      });
    }
  }
  function darkAt(x: number, y: number) {
    let tone: Tone = "paper";
    for (const surface of surfaces) {
      const r = surface.rect;
      if (x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height)
        tone = surface.tone;
    }
    const color = palette[tone];
    return (color[0] + color[1] + color[2]) / 3 < 100;
  }
  function draw() {
    ctx!.clearRect(0, 0, width, height);
    ctx!.globalAlpha = strength;
    ctx!.lineCap = "round";
    ctx!.lineJoin = "round";
    for (const edge of field.edges.values()) {
      const a = field.nodes[edge.a]!,
        b = field.nodes[edge.b]!;
      const dark = darkAt((a.x + b.x) / 2, (a.y + b.y) / 2);
      const ink = dark ? palette.onNight : palette.ink;
      const route = circuitRoute(a, b);
      // Use the same path for both the connection and travelling data.
      ctx!.beginPath();
      ctx!.moveTo(a.x, a.y);
      for (const point of route.slice(1)) {
        ctx!.lineTo(point.x, point.y);
      }
      ctx!.strokeStyle = css(ink, edge.strength * (dark ? 0.32 : 0.27));
      ctx!.lineWidth = 0.7;
      ctx!.stroke();
      if ((edge.a + edge.b) % 3 !== 0) continue;
      const phase = (chapter * .84 + edge.phase) % 1;
      const envelope = Math.sin(phase * Math.PI) * edge.strength;
      const length = route
        .slice(1)
        .reduce(
          (sum, point, i) =>
            sum + Math.hypot(point.x - route[i]!.x, point.y - route[i]!.y),
          0,
        );
      ctx!.setLineDash([Math.min(18, length * 0.15), length + 20]);
      ctx!.lineDashOffset = -phase * length;
      ctx!.strokeStyle = css(
        dark ? palette.onNight : palette.signal,
        envelope * 0.72,
      );
      ctx!.lineWidth = 1.25;
      ctx!.stroke();
      ctx!.setLineDash([]);
    }
    for (let i = 0; i < field.nodes.length; i++) {
      const n = field.nodes[i]!,
        dark = darkAt(n.x, n.y);
      const ink = dark ? palette.onNight : palette.ink;
      ctx!.beginPath();
      ctx!.arc(n.x, n.y, 1.2 + n.depth * 0.6, 0, Math.PI * 2);
      ctx!.fillStyle = css(ink, (dark ? 0.76 : 0.64) * n.depth);
      ctx!.fill();
      if (i % 7 === 0) {
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, 4, 0, Math.PI * 2);
        ctx!.strokeStyle = css(ink, 0.24);
        ctx!.lineWidth = 0.7;
        ctx!.stroke();
      }
    }
    ctx!.textAlign = "center";
    ctx!.textBaseline = "middle";
    ctx!.direction = "ltr";
    const glyphRects: {
      left: number;
      right: number;
      top: number;
      bottom: number;
    }[] = [];
    for (const glyph of field.glyphs) {
      const dark = darkAt(glyph.x, glyph.y);
      ctx!.font = `400 ${glyph.size}px "SFMono-Regular", Consolas, "Liberation Mono", monospace`;
      const half = ctx!.measureText(glyph.text).width / 2;
      const left = glyph.x - half,
        right = glyph.x + half;
      const top = glyph.y - glyph.size / 2,
        bottom = glyph.y + glyph.size / 2;
      let space = Math.min(left, width - right, top, height - bottom) / 12;
      for (const rect of quietRects) {
        const gap = Math.max(
          rect.left - right,
          left - rect.right,
          rect.top - bottom,
          top - rect.bottom,
        );
        space = Math.min(space, gap / 16);
        if (space <= 0) break;
      }
      for (const rect of glyphRects) {
        const gap = Math.max(
          rect.left - right,
          left - rect.right,
          rect.top - bottom,
          top - rect.bottom,
        );
        space = Math.min(space, gap / 12);
      }
      if (space <= 0) continue;
      ctx!.fillStyle = css(
        dark ? palette.onNight : palette.ink,
        glyph.alpha * (dark ? 1 : 0.85) * Math.min(1, space),
      );
      ctx!.fillText(glyph.text, glyph.x, glyph.y);
      if (glyph.alpha > 0.1) glyphRects.push({ left, right, top, bottom });
    }
    // Erase decoration, then backfill the original section colours. This needs
    // no overlay above content, extra canvas, or changes to foreground elements.
    ctx!.globalAlpha = 1;
    ctx!.globalCompositeOperation = "destination-out";
    ctx!.fillStyle = "#fff";
    ctx!.shadowColor = "#fff";
    ctx!.shadowBlur = 10;
    ctx!.fill(protection);
    ctx!.shadowBlur = 0;
    ctx!.globalCompositeOperation = "destination-over";
    for (let i = surfaces.length - 1; i >= 0; i--) {
      const { rect, tone } = surfaces[i]!;
      ctx!.fillStyle = css(palette[tone]);
      ctx!.fillRect(rect.left, rect.top, rect.width, rect.height);
    }
    ctx!.fillStyle = css(palette.paper);
    ctx!.fillRect(0, 0, width, height);
    ctx!.globalCompositeOperation = "source-over";
    if (!host.dataset.ready) host.dataset.ready = "true";
  }
  function tick(now: number) {
    frame = 0;
    if (disposed || document.hidden || contrast.matches || print.matches)
      return;
    if (!sizeDirty && !layoutDirty && !paletteDirty && now - lastPaint + 1 < 1000 / field.budget.fps) {
      schedule();
      return;
    }
    if (sizeDirty) readSize();
    if (paletteDirty) readPalette();
    if (layoutDirty) readLayout();
    sampleScroll();
    field.update(chapter, spread);
    draw();
    lastPaint = now;
    const state = motion.matches ? "static" : "linked";
    if (host.dataset.networkState !== state) host.dataset.networkState = state;
  }
  function schedule() {
    if (
      !disposed &&
      !frame &&
      !document.hidden &&
      !contrast.matches &&
      !print.matches
    )
      frame = requestAnimationFrame(tick);
  }
  function mode() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastPaint = -Infinity;
    if (contrast.matches || print.matches) delete host.dataset.ready;
    host.dataset.networkState =
      document.hidden || contrast.matches || print.matches
        ? "paused"
        : motion.matches
          ? "static"
          : "linked";
    invalidate();
  }
  const dom = new MutationObserver((records) => {
    if (
      records.some(
        (record) =>
          record.type !== "attributes" ||
          (record.target instanceof Element &&
            record.target.matches(
              "section, .cms-slot, .site-footer, .chat-shell",
            )),
      )
    )
      invalidate();
  });
  dom.observe(scope, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class"],
  });
  const preferences = new MutationObserver(recolor);
  preferences.observe(root, {
    attributes: true,
    attributeFilter: ["data-theme", "dir", "lang"],
  });
  const sizes = new ResizeObserver(resize);
  sizes.observe(host);
  // Root layout changes include image/font load, CMS refresh and open accordions.
  const contentSize = new ResizeObserver(invalidate);
  contentSize.observe(scope);
  window.addEventListener("resize", resize, {
    signal: abort.signal,
    passive: true,
  });
  window.addEventListener("scroll", (event) => {
    if (event.target === document || event.target === window) schedule();
    else invalidate();
  }, {
    signal: abort.signal,
    passive: true,
    capture: true,
  });
  window.addEventListener("mashrouak:route-ready", invalidate, {
    signal: abort.signal,
  });
  document.addEventListener("visibilitychange", mode, { signal: abort.signal });
  for (const query of [motion, contrast, print])
    query.addEventListener("change", mode);
  void document.fonts.ready.then(() => {
    if (!disposed) invalidate();
  });
  schedule();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    abort.abort();
    dom.disconnect();
    preferences.disconnect();
    sizes.disconnect();
    contentSize.disconnect();
    resolution?.removeEventListener("change", resize);
    for (const query of [motion, contrast, print])
      query.removeEventListener("change", mode);
    for (const element of marked) delete element.dataset.networkSurface;
    hero?.style.removeProperty("--horizon-offset");
    delete host.dataset.ready;
    canvas.width = canvas.height = 0;
  };
}
