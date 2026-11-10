# Public live code network

Implemented locally on 10 November 2026. No commit, push or production deployment was performed for this change.

## Implementation

`PublicAtmosphere` retains its existing position above the public route tree and owns one decorative Canvas 2D element. Navigation reuses that element. The existing WebGL product model keeps its independent canvas and animation.

`src/components/layout/network-field.ts` provides deterministic moving lanes, depth variations, code packets and distance-based connections. Spatial buckets limit neighbour searches; each node selects at most three new connections. Outgoing connections fade independently. Staggered connection handoffs, 45-degree circuit shoulders and travelling packets make the topology visibly active. Code fragments stay short, fade at their route endpoints, and fade before overlapping one another.

`src/components/layout/public-network-renderer.ts` owns a single cancellable `requestAnimationFrame` clock, cached layout measurements, responsive resolution and resource cleanup. It paints the existing ivory, mist and petrol section colours underneath the network. It erases decoration beneath text, controls, images, forms and the entire 3D model area. Everything remains behind page content with `pointer-events: none`; existing foreground layout and stacking are preserved. CMS section colour changes invalidate the cached surface without requiring navigation.

`src/components/layout/public-atmosphere.css` supplies brand green colours for both themes and declares the existing section surface types. The previous gradient animation and contour SVG were removed. There are no new dependencies, external assets, or React updates on animation frames.

## Runtime limits and fallbacks

- 22 nodes at the tested phone size, up to 54 at larger sizes; lower core counts reduce the desktop budget. Mobile has fewer code symbols and a 30 FPS target; desktop targets 60 FPS. Sustained expensive frames lower the target to 30 FPS.
- Device pixel ratio is capped at 1.5, with an additional approximately 2.8 million pixel bitmap budget. Resizing and display resolution changes recreate the field and backing dimensions.
- Theme colours interpolate over 240 ms. Code renders in LTR order inside both English LTR and Arabic RTL pages.
- Reduced motion draws a static network with no pending animation callback. Hidden documents pause the clock. Print and forced colours restore the original CSS surfaces. Missing Canvas support keeps those surfaces available from the beginning.
- Unmount cancels the callback, aborts listeners, disconnects observers, removes surface markers and releases the canvas bitmap. No loading delays or asynchronous application states were changed.

## Actual verification

Tests ran against the local public site in Chrome on Windows, using seeded CMS/API responses. Screen sizes and phone DPR/touch were browser emulations, not physical device benchmarks.

| Check | Result |
| --- | --- |
| Public production build | Passed |
| Admin production build, including public preview | Passed |
| Existing unit suite | 55 tests passed |
| Background browser suite | 333 checks passed; zero browser errors |
| Route/theme/size matrix | 15 routes × 2 themes × 3 viewports = 90 cases |
| Desktop redraw rate with existing 3D scene | Approximately 60.18 FPS |
| Desktop instrumented JS work per drawn frame | 0.84 ms average; 1.3 ms p95 |
| Emulated phone redraw rate | Approximately 30.04 FPS |
| Emulated phone JS work per drawn frame | 0.46 ms average |
| Phone density and backing size | 22 nodes; 585 × 1266 backing pixels at 390 × 844 CSS pixels, device DPR 3 |
| Isolated renderer memory after 20 remounts and GC | 2.55 MB → 2.43 MB JS heap; 62 DOM nodes and 28 listeners before and after |
| Homepage layout against previous background | Hero, heading bounding boxes and total document height identical |

Frame instrumentation confirmed moving programming characters, changing connection counts and travelling packet offsets. Controls checked include theme switching in both directions, language switching, mobile navigation/Escape, portfolio filtering and contact form entry. The suite also checks live CMS surface colour updates, static reduced motion, print, forced colours, unavailable Canvas and eight repeated unmounts with no resurrected callbacks.

Additional visual exploration covered light/dark hero views, the unchanged 3D model, tablet services, project cards on petrol, portfolio, legal content, contact and standalone chat. There was no observed horizontal overflow, blocked control, foreground overlap or duplicate background canvas. Timing observations measure background redraws and JavaScript work; they do not measure GPU time or guarantee the same FPS on other hardware.

## Reproduce

```sh
npx tsx tests/network.browser.runner.mjs
```

The runner starts an isolated Vite server, uses fixture responses and closes its browser/server afterward. It does not write production data. Interactive review and recording used the existing local server.

Local evidence is in `artifacts/live-network/` (ignored by Git):

- `network-preview.webm`: actual browser recording, including light/dark transition.
- `before-after.png`, `coverage.png`: comparison and representative page views.
- `verification.json`: all 333 browser checks and measured desktop frames.
- `memory-profile.json`, `mobile-profile.json`: isolated cleanup and emulated phone measurements.

Only the public background implementation, its verification files and this report changed. The media migration, API, secrets, deployment settings and 3D implementation were left untouched.
