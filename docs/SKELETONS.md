# Global skeleton system

## Loading ownership correction

The initial implementation had two real waterfalls: `ContentBoundary` prevented the public route from mounting until CMS data arrived, so its lazy code request began afterward; admin lazy modules mounted before their component-local fetches began. Separate fallback compositions could replace one another. Strict Mode also restarted the old effect-owned public fetch. Caller abort signals inadvertently bypassed the shared API deadline.

Public `Page` routes now start their module import and CMS resource independently and make one readiness decision. The redundant `ContentBoundary` was removed. `shared/loadable.ts` caches module completion; `shared/resource-cache.ts` deduplicates prefetched and mounted requests, retains successful data during refresh, settles errors, and ignores responses after private cache clearing. The admin module coordinator starts code and primary data together; components consume that same cache. Authentication remains its own protected decision. A saved chat’s session/history and code are coordinated before the full-page route is revealed. New messages and history refreshes do not reset the page.

`api()` combines caller cancellation with its deadline. Public data keeps its shorter deadline. No minimum skeleton duration or fake delay is used. `ModuleSkeleton` matches each admin list, media, inbox or overview instead of displaying an unrelated editor. The shared product scene wireframe appears in both the homepage skeleton and the initializing 3D region.

The 3D defect was static fallback markup remaining mounted while a lazy canvas initialized. `HeroVisual` now has explicit initializing/ready/fallback states. Static nodes are mounted only for reduced motion, unsupported WebGL, failed imports/initialization or lost context. Readiness follows a successful actual render. The canvas reveal preserves its frame and has a reduced-motion-safe opacity transition.

`shared/ui/Skeleton.tsx` contains composable text, image, card, project, metric, table, chart, message, history, navigation, form, section, editor, dashboard, media and route compositions. `shared/ui/skeleton.css` derives neutral tones from semantic brand variables, so both applications share the same system in light/dark themes and RTL/LTR. Shimmer is subtle and disabled under `prefers-reduced-motion`. Regions announce a localized loading label once; placeholder geometry is hidden from assistive technology.

The public compositions in `PublicPageSkeleton.tsx` and `SpecialPageSkeleton.tsx` reuse the actual page typography, grid, hero, image and breakpoint classes. Known localized copy reserves line wrapping while remaining visually hidden behind skeleton shapes. Portfolio placeholders use the actual two-column grid. Home uses desktop/mobile interface outlines; case studies reserve artwork space; contact preserves channels and form; legal and results preserve their own structures. The approved logo stays visible during startup. A small static wireframe in each HTML entry covers module download before React mounts.

Initial CMS fetch and lazy route chunks use the route composition. Background refresh preserves loaded content and exposes a recovery notice on failure. Public CMS requests time out after 15 seconds; other API calls after 20 seconds. Images reserve aspect ratio or a fixed responsive frame, terminate on load/error and have a retry state after a 20-second network cap. No artificial minimum loading duration is used.

The dashboard uses structural authentication, overview, list/table, editor, image picker, media and inbox states. Static headings remain visible where known. The same message history presentation serves visitor and staff views. Chat session restoration, history loading and empty conversations are separate states. Real request failures expose localized retry actions; mutations retain their existing content and use a compact, non-circular action status.

For new asynchronous content:

1. Use an existing composition or combine primitives to match the final DOM geometry.
2. Mark the containing loading region; keep decorative blocks hidden from screen readers.
3. Render a separate retry/error state when the request settles unsuccessfully.
4. Render an empty state for successful empty data. Keep existing data during refresh.
5. Test a gated real request, both language directions/themes, reduced motion, mobile overflow and replacement geometry.

Skeletons minimize shifts for expected layouts. Arbitrarily long CMS copy can change a page’s natural height; editors should preview substantial copy changes at mobile widths. Layout metadata and image frames are fixed independently of network completion.
