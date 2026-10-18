# Skip static shadow-batch local matrix composition

Related: #326 forest frame cost and the [live build](https://ael-dev3.github.io/Tervain/). Reproduced on 0.0.24 · 06ef770. Hardware evidence in `LATEST.md` remains live16; this software receipt does not replace it.

The forest's sun-only instanced meshes have identity local poses. Instance matrices contain the tree placements, and the shader supplies wind. Their local `matrixAutoUpdate` nevertheless remained enabled, so the scene walk recomposed every batch's identity matrix each render, including hidden batches. Disable that flag at construction. World-matrix propagation remains enabled, so moving or rotating the forest parent still reaches every caster.

The native High population contains **120 shadow batches**. Instrumenting their `updateMatrix` calls around a render gives **120 before, 0 after, 120 after restoring the baseline**. Instrumentation is removed before collecting CPU timings. No instance packing, culling, geometry, wind, shader, draw distance, GPU buffer or texture change.

## Reproduce

```sh
node tools/repro-live-shadow-static-matrices.mjs --url https://ael-dev3.github.io/Tervain/ --out shadow-static-proof
```

The script asserts that the published baseline's local poses are identity and its automatic-update flags are enabled, then applies the production field change to those native meshes. Seven High post/MSAA4 poses cover five nearby forest walk views, a second forest direction and a dusk shadow-map edge. Each pose compares baseline, candidate and restored-baseline RGB; shadow maps refresh during every draw. Draw calls, triangles, buffer/texture upload bytes and texture counts are recorded from native rendering. This is software-renderer correctness evidence, not a visual-quality or hardware-performance PASS.

## Rendered cost comparison

All seven baseline/candidate/restored RGB comparisons are exact, with zero console errors.

| Cost per rendered pose | Before | After |
| --- | ---: | ---: |
| Shadow-batch local matrix compositions | 120 | 0 |
| Draw calls (range across seven poses) | 231–421 | 231–421 |
| Maximum triangles in these poses | 6,052,764 | 6,052,764 |
| Upload bytes (range) | 13,440–26,880 | 13,440–26,880 |
| Texture count | 274 | 274 |
| Shader code / texture taps per draw | unchanged | unchanged |
| Added buffers / textures / caches | 0 | 0 |

The custom forest poses carry more geometry than the stock budget-gate route; comparisons above use the same pose on both sides. [Full rendered receipt](proofs/shadow-static-matrices/rendered.json), [forest before](proofs/shadow-static-matrices/pose-0-before.png), [forest after](proofs/shadow-static-matrices/pose-0-after.png), [dusk before](proofs/shadow-static-matrices/pose-6-before.png), [dusk after](proofs/shadow-static-matrices/pose-6-after.png).

## CPU collection

```sh
REPRO_INIT_FILE=tools/repro-renderer-cpu-init.js node tools/repro-live-shadow-static-matrices.mjs --cpu true --out shadow-static-cpu
REPRO_INIT_FILE=tools/repro-renderer-cpu-init.js node tools/repro-live-shadow-static-matrices.mjs --cpu true --aa true --out shadow-static-aa
```

Three runs each use 90 warm pairs and 120 measured balanced pairs; all 360 samples per mode are retained. Frame markers cover native `renderWorld`, including its scene matrix walk. Camera placement and world updates happen outside that interval. A common unmeasured render warms camera-dependent captures before each pair. The per-caster matrix counter is removed before timing. A/A uses the original enabled flags for both modes.

| Warmed renderer thread CPU | Before mean / p95 ms | After mean / p95 ms |
| --- | ---: | ---: |
| Candidate, 360 samples per mode | 3.589550 / 5.041 | 3.509317 / 5.310 |
| Identical-code A/A, 360 samples per mode | 4.234194 / 6.271 | 4.086925 / 6.052 |

All three candidate runs have lower means, but pooled p95 is **0.269 ms higher**. An individual identical-code A/A run shifts p95 **+0.805 ms**; its pooled mean shift also exceeds the candidate's. These measurements do **not** demonstrate a CPU-throughput or consistent p95 win. The deterministic reduction is 120 local matrix compositions per render, with no added per-frame work. Both acquisitions and all individual runs/samples are retained: [candidate](proofs/shadow-static-matrices/cpu.json), [A/A](proofs/shadow-static-matrices/cpu-aa.json).

Raster draw entrypoints are suppressed only for CPU timing. These thread-CPU measurements exclude GPU work, raster-driver costs, scheduler waits and other world updates; they are not whole-game frame times or Mac FPS. The native budget gate and rendered comparisons keep raster drawing enabled.

Validation: 43 selected forest/pine/shadow integration tests pass, including a regression that checks zero local recompositions and correct world transforms under a translated/rotated parent; production build passes, including TypeScript.

Tree attachment, root contact, grass sparkle, pop-in and Mac 60 fps remain separate open goals.
