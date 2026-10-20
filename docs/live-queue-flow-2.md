# Live Queue Flow 2 (TV entry)

- `/live-queue-flow-2/?branch_id=1` and `?branch_id=2` are standalone public display pages.
- Reuses `src/components/LiveQueueFlow.tsx` unchanged: ordering, public APIs, sockets, branch tune, animations, 3-second call overlay, notices and existing disconnect polling remain in that component.
- The original `/live-queue-flow` entry and main application logic are unchanged.
- No database or backend changes. No login/session providers or unrelated dashboard modules in the TV entry.

## Compatibility

The TV build alone uses `@vitejs/plugin-legacy` and TV-scoped Tailwind 3 CSS generated from the shared component's class names. Main-app Tailwind 4 remains in place. Both modern and legacy chunks target Chrome 64+, Firefox 68+, Safari 12+ syntax; polyfills are included. These are build targets, not evidence of testing on every browser/device. TV firmware, certificate trust, hardware acceleration and available Web APIs can still affect operation. Physical TV verification is required.

TV-only startup diagnostics show a retry page instead of a permanent blank screen. A small Enable sound/Test sound control plays the existing chime on a user gesture without changing patient state. A successful click is not proof of physical speaker output; confirm on the TV. The same configured branch announcement/chime continues on subsequent token changes.

## Build and serving

`npm run build` prepares TV CSS, builds the normal app, then writes the isolated TV build beneath `dist/live-queue-flow-2/`. Main-app build runs first because it clears `dist/`. Deploy the complete resulting directory.

The included Nginx configuration redirects the no-slash URL to the directory while preserving the query string and serves its own `index.html` with no-store caching. Do not rewrite this directory to the main SPA index. An existing service worker's navigation fallback is already disabled; the TV entry does not register another service worker.

`npm run dev` serves both entry HTML files on port 3000; TV CSS is prepared first. After editing shared queue utility classes, run `npm run prepare:tv` again. For TV-specific Vite development, `npm run dev:tv` uses port 3001. Compatibility/legacy behavior must be verified from a production build, not Vite's dev server.

## Validation

- Main app and standalone TV production builds; TypeScript check.
- Sample-only production fixture verifies both branches, token update and the fullscreen announcement returning to the normal queue; no real appointments are changed.
- Force the generated SystemJS legacy entry in a test harness to verify it loads, in addition to the modern entry. This does not emulate an old TV's rendering engine.
- On the actual TV: check branch, current/next/held queues, one real call with sound and 3-second overlay, remote-control focus, reconnect, overnight date behavior and font readability.
- No production deployment is performed by creating these files.
