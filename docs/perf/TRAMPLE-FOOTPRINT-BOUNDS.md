# Exclude footprints that cannot reach the grass trample field

Live reference: https://ael-dev3.github.io/Tervain/ (0.0.18 · 421d34b), with motion enabled. Tracking: [#326](https://github.com/ael-dev3/Tervain/issues/326). The tracked hardware write-up remains `docs/perf/LATEST.md`, run live16; this receipt does not replace it.

The trample shader tests each submitted footprint at every field texel. The published village snapshot submits 13 footprints, but 11 lie completely outside its 28 m field. Their distance/falloff calculations cannot alter the texture.

Filter those footprints when packing the shader uniforms, after the current update has recentered the field. Retain a full texel plus a conservative float rounding margin around the boundary. Preserve survivor order, the nearest-mover limit, pending-stamp consumption, recovery, shift passes and brush batching. The shader and target sizes are unchanged. Filtering at `setMovers` time would be wrong when the focus moves before the GPU step.

## Published-input replay

```sh
node tools/repro-live-trample-bounds.mjs --url https://ael-dev3.github.io/Tervain/ --out trample-native-proof
```

The script enables ordinary motion, captures the published Low field's actual uniform inputs, verifies that both source classes use the native shader, then replays those inputs through fresh fields in the same software renderer. This is a native-input component replay, not a complete candidate build or hardware timing run.

[Native receipt](../../proofs/trample-bounds/native/report.json), [before preview](../../proofs/trample-bounds/native/before.png), [after preview](../../proofs/trample-bounds/native/after.png).

Submitted footprints fall **13 → 2**, while each field step retains one draw/one triangle and the same 65,536-byte nominal field texture payload. The full field readback hashes match on all eight steps, and the diagnostic push/flattening preview pixels match. The field is not empty: both retained footprints affect the readback. This reduces the shader loop bound; it does not establish an 85% reduction in GPU time or whole-game demand.

## Source regression replay

```sh
node tools/repro-trample-bounds.mjs trample-bounds-proof
```

The actual source classes run 120 updates across 16², 64², 128² and 256² fields, with moving focus, recovery, zero-delta/sub-step frames, recentering and queued strokes exceeding a shader batch. Submitted footprints total **5,644 → 896**. All full field readback hashes and four paired preview images match. Draw/triangle counts, source-upload bytes and field target memory match on every update.

| Field | Updates | Submitted before → after | Draws / triangles | Source upload bytes | Field texture payload |
| --- | ---: | ---: | ---: | ---: | ---: |
| 16² / 8 m | 30 | 1,411 → 224 | 34 / 34 | 0 | 4,096 B |
| 64² / 28 m | 30 | 1,411 → 224 | 34 / 34 | 0 | 65,536 B |
| 128² / 40 m | 30 | 1,411 → 224 | 34 / 34 | 0 | 262,144 B |
| 256² / 48 m | 30 | 1,411 → 224 | 34 / 34 | 0 | 1,048,576 B |

Counters cover field updates, excluding warmup and diagnostic copy/readback draws. Source uploads exclude uniforms. Texture payload is the nominal size of two RGBA16F field targets, excluding diagnostic targets, renderbuffers and driver overhead. The test deliberately retains all recovery and brush passes; this change reduces footprint work inside those passes.

[Report](../../proofs/trample-bounds/report.json), [compressed per-update hashes/counters](../../proofs/trample-bounds/traces.json.gz), [before preview](../../proofs/trample-bounds/before-256.png), [after preview](../../proofs/trample-bounds/after-256.png). Preview colors encode push and flattening; they are not grass quality captures.

The new edge/recenter/queue regression fails on main. All **23 selected grass engine/trample tests** and production build/type check pass. No models, materials, shader strings, grass appearance, menus or audio changed. Hardware play-gate remains required; this does not establish that grass shimmer or the historical >25 ms frames are fixed.
