# Share world matrices with window captures

The native shrine window capture ran while scene matrix auto-update was enabled. Each capture face therefore walked the world graph, followed by the explicit world walk already used for the main frame. Nothing moved between those draws.

Move the capture into the existing frozen-matrix render section, after its explicit update. Capture and main pass now share that update; the previous scene auto-update state is restored even if either pass throws.

```sh
node tools/repro-window-matrix-walk.mjs --url http://127.0.0.1:4173/ --expect before --out window-before
node tools/repro-window-matrix-walk.mjs --url http://127.0.0.1:4173/ --expect after --out window-after
```

Run the first against the original production build and the second against the changed build. The script enters the actual shrine capture room, records the native scene's matrix-update calls, and moves a non-rendered nested transform probe between capture frames.

Actual software-WebGL results: all six original capture frames walk the world twice (12 total); all six changed frames walk it once (6 total). Both complete the same six cube faces and publish their capture texture. Both present the expected fresh probe transforms, (8,10,12) through (13,10,12), in captures and main passes, and restore scene auto-update.

Current main enables painted-window captures only in the shrine. This does not establish the cause of an outdoor village pan hitch or ordinary-house stalls. No frame-time improvement is claimed. Rendering and lighting are unchanged; the committed screenshot is native shrine context, not an appearance comparison.

Validation: 66 transition/window tests, TypeScript check, production builds and the native six-face before/after assertions. Tests cover transform freshness and auto-update restoration when capture or main rendering throws. Receipts are in `window-matrix-proof/`.
