# Late content skipped GPU preparation without shadows

**The original night-time mud/water hitch is not yet proven fixed.** This isolates and fixes a real upload burst in the shadowless path, including Low. Published baseline: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/).

`warmShaders` returned immediately after colour compilation when `renderer.shadowMap.enabled` was false. That bypassed the continuation which uploads textures and performs first draws. Animals and furniture could therefore be adopted with their shaders compiled but their textures/geometry still cold. The fix uses the same continuation with or without shadows. Compile-only first-view preparation retains its existing behavior.

## Native asset repro

```sh
node tools/repro-shadowless-warming.mjs --baseline 421d34b --out artifacts/shadowless-warming
```

This runs the actual App preparation methods on the delivered cat and material policy in software WebGL. Each source runs in a fresh browser. The renderer has shadows disabled, and the first visible image is read immediately after drawing.

| First visible draw | Published source | Fixed source |
| --- | ---: | ---: |
| Source buffer/texture uploads | 15,061,924 bytes | 2,304 bytes |
| Draw calls | 1 | 1 |
| Triangles | 45,798 | 45,798 |
| WebGL errors | 0 | 0 |

Before: zero upload/first-draw preparation calls. After: one upload continuation and one first-draw preparation call, awaited before the object is ready. The same bytes are prepared earlier; this is **not a reduction in total texture memory**. The remaining 2,304-byte upload belongs to the ordinary skeleton texture update.

The first visible RGB images compare exactly equal: [before](proofs/shadowless-warming/before.png), [after](proofs/shadowless-warming/after.png), [complete receipt](proofs/shadowless-warming/report.json).

## Matched rendered crossing

The full compiled game also walked from (−30, 40) across the village's shallow-water boundary with the same trusted forward key, seed, camera reset, noon lighting, Low preset and 320×180 canvas. This is a reproducible control route, **not the exact night-time video camera path**. Low has MSAA disabled.

Both runs contain 300 fixed 60 Hz simulation steps and 30 native renders: one render per ten simulation steps. The five-second clips therefore play at **6 fps**, not a 60 fps frame-pacing gate.

| Result | Published build | Fix |
| --- | ---: | ---: |
| Largest submitted source upload in a rendered sample | 51,187,382 bytes | 2,119,618 bytes |
| Player/camera/water-depth drift between runs | — | 0 |
| Draw/triangle counts at each sampled view | identical | identical |

Peak source uploads fell **95.9%** in this crossing. These counts include buffers and textures. A separate bound-texture probe found animal colour/normal/roughness maps and furniture maps in the cold bursts. This change moves their existing work into preparation before adoption; it does not establish that every preparation frame meets a 25 ms budget.

25 of the 30 captured frames are RGB-identical. Across the other five frames there are five changed pixel observations in total, at most two changed pixels in a frame and at most two channel levels. The asset-level image comparison above is exact.

- [Before clip](proofs/shadowless-warming/crossing/before/walk.mp4) · [after clip](proofs/shadowless-warming/crossing/after/walk.mp4)
- [Comparison](proofs/shadowless-warming/crossing/comparison.json), including per-frame pixel changes
- [Before rows](proofs/shadowless-warming/crossing/before/report.json) · [after rows](proofs/shadowless-warming/crossing/after/report.json)

From this PR's checkout, run a local compiled build and capture it with:

```sh
npm run build
npm run preview
node tools/replay-mud-crossing.mjs --url http://localhost:4173/ --out artifacts/crossing --frames 30 --steps 10 --quality low --size 320x180 --capture true
node tools/compare-mud-replays.mjs BEFORE/report.json AFTER/report.json artifacts/comparison.json
```

The comparer rejects changed route/camera conditions, missing captures and blank images. It reports pixel differences and leaves `hitchFixed` unset. Capture encoding/readback makes these runs unsuitable for timing conclusions.

For an uncaptured replay, use the default 300 renders, one per simulation step, and `--capture false`. `--thread-cpu true` additionally records renderer-thread CPU consumption through CDP's `threadTicks` domain. That includes the harness and callbacks in the measured interval, not only `App.step`. Software render submission and renderer-thread CPU are not hardware presented-frame timings. `--from`, `--yaw`, `--pitch`, `--hour`, `--quality`, `--size` and `--headed true` allow further controlled routes.

## Preparation-only controls and remaining work

Before finding the shadowless return, a separate candidate combined #470/#473/#476. Its 300-render uncaptured control had exactly matching route/camera/water depth, but did **not** demonstrate stall removal: simulation wall-time p95 50.7→45.1 ms, maximum 177.6→180.8 ms. A shorter renderer-thread CPU control likewise retained expensive frames. These are diagnostic software observations, not M5 or hardware-gate results.

[Control source composition](proofs/shadowless-warming/preparation-control/source.json), [300-render comparison](proofs/shadowless-warming/preparation-control/comparison.json), [thread-CPU comparison](proofs/shadowless-warming/preparation-control/thread-comparison.json). The comparison build is derived from the three public commits listed there; its source hash identifies the exact resident implementation. It does not contain this shadowless fix.

The supplied 0:26–0:28 video is a night-time approach toward the hip-roof house. The video’s exact route and preset remain unconfirmed, and its night-time stall still needs a matching reproduction. This branch change does not alter the shadow-enabled path. This PR does not claim a complete hitch fix or steady M5 60 fps. `docs/perf/LATEST.md` remains the separate live16 hardware evidence.

Validation: the new regression fails twice on the published source; all 75 preparation/transition/graphics tests pass after the fix, and the production build passes. Native asset and full rendered crossing checks above pass.
