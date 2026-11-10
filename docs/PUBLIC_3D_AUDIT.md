# Public 3D and wireframe audit

Completed 10 November 2026. Public website scope only; dashboard, backend, media, database, and deployment configuration were not changed by this work.

## Complete rendering inventory

| Implementation | Public instances | Finding |
| --- | --- | --- |
| `HeroSection` → `ProductScene` | Homepage: one scene containing the original monitor and phone | The only Three.js/WebGL renderer in the public codebase. |
| `ProductSceneSkeleton` | Homepage route loading and model preparation | Shared loading drawing; previously omitted the stand and mirrored the phone in LTR while the model stayed fixed. |
| Hero static illustration | Homepage reduced-motion and failure states | Original HTML/CSS device illustration retained. |
| `ProjectArtwork` | Homepage project section, `/work`, and all three `/work/:slug` case studies | Flat HTML/CSS artwork or CMS images; no 3D geometry, wireframe layers, or animation loops. |
| Other public routes | Services, about, process, contact, chat, results, privacy, terms, custom-page and not-found templates | No additional 3D renderer. Confirmed through source searches and loaded browser routes. |

The installed renderer is Three.js r187 / WebGL2. Existing devices are solid modeled surfaces with screen UI illustrations. There are no `LineSegments`, `EdgesGeometry`, random edge generators, or `wireframe: true` materials in the public implementation. Random/disconnected 3D edges were not reproduced; no replacement models or extra wireframe meshes were introduced.

## Findings and corrections

| Affected component | Root cause / evidence | Implemented correction |
| --- | --- | --- |
| `ProductScene.tsx`, new `product-scene-renderer.ts` | Two near-coplanar theme artwork surfaces per screen; measured 39 meshes / 39 draw calls. These were deliberate theme overlays, rather than random edges. | One shader-blended artwork surface per screen. Kept the original separate optical glass. Final scene has 37 meshes / 37 draw calls. |
| Model geometry allocation | Identical vents, buttons, and camera parts allocated separate buffers. Original measurement: 35 geometry buffers. | Cache identical rounded-box geometry within each instance; share matching camera geometry. Final measurement: 21 buffers, preserving all mesh positions and original dimensions. |
| Scene loading | Original first frame reported ready at entrance progress `0.00181`, with no progressive reveal. | `loading → rendering → ready` lifecycle. One continuous bottom-to-top visibility plane reveals the existing surfaces in fixed spatial order. Position, camera and orientation stay fixed during reveal. Original entrance and pointer animations run after the reveal. |
| `HeroSection` | Failures selected a static fallback without a retry. Reduced motion was only checked at initial mount. | Distinct localized error state with original static artwork and Retry. Asset/context retry recreates one renderer; a failed module retries through a fresh page/module load. Live reduced-motion changes release/restart the scene safely. |
| Shared scene lifecycle | Cleanup was assigned only after initialization finished. Asset loading had no deadline; viewport/language updates recalculated framing from animated bounds. | Resources acquire teardown immediately through `SceneResources`; partial failures use the same idempotent cleanup. Asset deadline: 12 seconds; preparation deadline: 20 seconds. Superseded image loads abort. Camera fitting uses immutable complete-model bounds; pixel-ratio budget refreshes on resize. |
| `ProductSceneSkeleton`, `platform.css` | Placeholder layout did not match both devices and differed between RTL and LTR. Styling was coupled to obsolete loading phase names. | One responsive SVG composition includes monitor, stand and phone in their correct relative positions. Shared light/dark palette, subtle opacity pulse, scoped color transitions, and reduced-motion support. Placeholder and rendered scene are never stacked. The existing shared stylesheet also preserves these public components inside the visual editor's public preview. |

The approved dark palette, light intensities, lens/glass materials, model proportions, camera framing, and final scene composition were retained. A settled dark screenshot comparison measured mean maximum RGB-channel difference **0.076 / 255**; **381 / 316,824 pixels (0.12%)** differed by more than eight channel steps, primarily at the removed screen overlay's subpixel edge. This is visual preservation, not a claim of identical pixels.

## Verification performed

1. **98 automated browser checks:** all 15 public routes; Arabic/English × light/dark × 390/820/1440 px; lifecycle ordering; single canvas; no placeholder/fallback stacking; theme changes; live reduced-motion changes; asset failure and retry; WebGL context loss and retry; three SPA navigation/remount cycles; simultaneous independent scenes; measured monotonic reveal and stable camera/position; resource counts across theme/language updates; idle render loops; and forced partial-initialization failure.
2. **Four additional browser cases:** failed module and fresh-load retry; unsupported WebGL; a genuinely stalled image request hitting its 12-second deadline and recovering; navigation away while the scene module was still pending, with no late mount.
3. **55 unit tests passed across 14 test files**, including cleanup order/idempotency, cleanup after an intermediate exception, deterministic reveal and existing skeleton behavior.
4. **Production verification:** TypeScript, targeted lint and production build. Screenshots and measured counters are saved under ignored `artifacts/3d-audit/` (`rendering-results.json`, `edge-results.json`, `before-metrics.json`, `after-metrics.json`, theme/viewport images and loading images).

Repeat the automated browser suite with `npm run test:scene:browser`. It starts a temporary Vite server and intercepts content requests using the repository's seed content; it does not write to a database or require production credentials. Lifecycle tests: `npx vitest run tests/scene-lifecycle.test.ts tests/skeleton.test.tsx`.

Browser verification used Windows Chrome with real WebGL and desktop/tablet/mobile viewport emulation. Physical mobile GPUs and other browser engines were not measured. Resource and draw-call counters are not measurements of GPU memory consumption or frame-rate improvements.
