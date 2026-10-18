# Skip repeated foliage mover vectors

The published forest's six mover vectors use Three's plain vector-array uniform setter. It uploads all 24 floats on each affected material submission, including unchanged entries. This repeats work across leaf, wood, shadow and floor-plant materials sharing the same field and programs.

Use an array of six single-member structs instead. Each member remains a vec4, while Three resolves it through its cached scalar-vector setter. The indexed shader loop reads `.item`; its distance, falloff, motion arithmetic and texture reads stay unchanged. The view retains six wrapper objects per source, follows in-place mutations and replacement arrays, and allocates no object per frame. Three also retains four cached numbers per member (24 per affected program); all 24 GPU floats remain unchanged. Program cache versions distinguish the new layout.

This is a submission-cost fix, **not a detached-crown attachment or grass sparkle fix**. It changes no geometry, materials' intended appearance, draw distance or menus.

## Native moving High forest replay

Baseline: published **0.0.23 · f515599**, checked against the menu and version endpoint. Native High at 640×360, post/MSAA4, default tree detail. Route: 5.157 m walked and 20.45° turned, 120 warm A/B pairs followed by 120 measured pairs with alternating order. Native mover data and wind are shared by both paths.

| Per measured replay frame | Live array | Cached members | Delta |
| --- | ---: | ---: | ---: |
| Mover uniform calls, average | 97.367 | 23.767 | −75.6% |
| Mover command payload, average | 9,347.20 bytes | 380.27 bytes | −95.9% |
| Renderer thread CPU, average | 3.218 ms | 3.180 ms | −0.038 ms |
| Renderer thread CPU, p95 | 5.140 ms | 4.807 ms | −0.333 ms |
| Maximum intended draws | 423 | 423 | 0 |
| Maximum intended triangles | 8,005,237 | 8,005,237 | 0 |
| Texture count | 274 | 274 | 0 |
| Added wind arithmetic expressions / texture reads | 0 | 0 | 0 |
| Console errors | 0 | 0 | 0 |

All 120 paired draw/triangle/texture counts match. [Every CPU sample](proofs/foliage-mover-uniform/cpu-walk.json).

CPU timestamps measure renderer traversal, matrix updates, callbacks and uniform submission using Chrome thread CPU clocks; raster draw entry points are suppressed only for this CPU acquisition. Common instrumentation/sort overhead is included. Simulation/input, GPU waits and native draw-driver CPU are omitted. These numbers do not establish whole-game FPS, hardware GPU instruction throughput, Mac performance or thermal savings. Uniform payload is bytes supplied to GL commands, not measured bus traffic.

## Compiled changed-field controls

[Eight-case fixture receipt](proofs/foliage-mover-uniform/fixture.json). Actual production colour and custom shadow hooks, four distinct colour materials sharing a program and a shared depth material. Before restores only the original declaration, indexed lookup and field record. Every RGB channel and draw/triangle count matches; every actual GL write is checked against original Float32 values.

| State | Calls before → after | Payload before → after |
| --- | ---: | ---: |
| Unchanged field, four cases | 5 → 0 | 480 → 0 bytes |
| One changed mover | 5 → 2 | 480 → 32 bytes |
| Six changed entries, expiry, replacement | 5 → 12 | 480 → 192 bytes |

**Tradeoff:** changing six members needs six scalar setters per program rather than one array setter. In this small fixture that raises call count, while reducing bytes. The native forest's many material submissions sharing programs reduce both counts. Newly linked programs still receive every vector. The same-time active/inactive control changes pixels, proving deformation is not frozen. Source-data changes remain visible through the retained view.

## Reproduce

```sh
npx vitest run tests/presentation/foliageMoverUniform.test.ts tests/presentation/foliageEngine.test.ts
npm run build
node tools/repro-foliage-mover-uniform.mjs mover-fixture-proof
node tools/repro-live-foliage-mover-uniform.mjs --url https://ael-dev3.github.io/Tervain/ --head "$LIVE_REVISION" --cpu true --cpu-only true --moving-cpu true --out mover-cpu-proof
node tools/repro-live-foliage-mover-uniform.mjs --url https://ael-dev3.github.io/Tervain/ --head "$LIVE_REVISION" --out mover-pixel-proof
```

The native controller applies the exact production helper to cloned native materials, including custom shadow materials. It retains the original opaque sort and checks the inactive adapter against native pixels. The pixel replay refreshes shadows and checks before/after/restored RGB, draw counts and triangles. Readback is correctness proof, not a frame-time measurement.

## Five native forest poses

All five before/after/restored RGB captures match exactly, with freshly rendered shadows. Zero console errors. Each warmed pose skips 96 mover uploads / 9,216 bytes.

| Pose | Draws, both | Triangles, both | Texture count, both | Images |
| --- | ---: | ---: | ---: | --- |
| 0 | 376 | 6,413,125 | 274 | [Before](proofs/foliage-mover-uniform/before-0.png) / [After](proofs/foliage-mover-uniform/after-0.png) |
| 1 | 379 | 6,447,213 | 274 | [Before](proofs/foliage-mover-uniform/before-1.png) / [After](proofs/foliage-mover-uniform/after-1.png) |
| 2 | 380 | 6,491,322 | 274 | [Before](proofs/foliage-mover-uniform/before-2.png) / [After](proofs/foliage-mover-uniform/after-2.png) |
| 3 | 381 | 6,506,078 | 274 | [Before](proofs/foliage-mover-uniform/before-3.png) / [After](proofs/foliage-mover-uniform/after-3.png) |
| 4 | 380 | 6,505,694 | 274 | [Before](proofs/foliage-mover-uniform/before-4.png) / [After](proofs/foliage-mover-uniform/after-4.png) |

[Native receipt](proofs/foliage-mover-uniform/native.json). Software correctness proof, not hardware frame pacing.
