# Tree LOD mask cost: hold the current implementation

The complementary masks fix the overlap invariant, but **#645 does not clear the no-increase cost gate**. The scoped CPU replay is higher, and a focused production-hook shader test reproduces a substantial SwiftShader increase twice. These measurements replace the earlier “CPU-ms unmeasured” entry; they are not a hardware or frame-pacing PASS.

## Forest CPU and full-scene query

Baseline `1743c9484` is the game source published as 0.0.23 at the start of this comparison (`ef4222d8b` only changed documentation). Candidate `6f88ca6be` changes only distance visibility and its radius packing under `src`. Pages advanced to `7d7eacd` during collection, changing the grass shader. **Neither side contains that later change**; this is a frozen published-source comparison, not a receipt for the newer live revision.

High, 640×360, four-sample post/MSAA, noon, deterministic wind samples, distance-based tree detail. The route turns and walks 5.16 m through a non-oak tree's partial crossfade, ending with complementary intervals `[0,0.627647)` / `[0.627647,1)`.

| Per-frame thread CPU, 120 warmed samples | Before | After | Delta |
| --- | ---: | ---: | ---: |
| World update average | 0.600 ms | 0.689 ms | +0.088 ms |
| World update p95 | 0.975 ms | 1.142 ms | +0.167 ms |
| Renderer/submission average | 5.039 ms | 5.887 ms | +0.849 ms |
| Renderer/submission p95 | 7.858 ms | 9.488 ms | +1.630 ms |
| Combined average | **5.639 ms** | **6.576 ms** | **+0.937 ms (+16.6%)** |
| Combined p95 | **8.350 ms** | **10.042 ms** | **+1.692 ms (+20.3%)** |

The runner uses Chrome trace **thread-CPU timestamps**, excluding scheduler/GPU waits. During CPU collection only, raster draw entry points are suppressed; native updates, visibility packing, traversal, callbacks and uniform submission remain. Native draw-driver CPU is omitted. This is a scoped CPU replay, **not whole-game frame CPU or FPS**. Both sides use identical stubs/markers; all measured frames link zero programs.

Independent scenes are not perfectly matched: only **10/120** frames have identical draw/triangle counts. Maximum draws are 778 on both; triangles are 12,538,875 → 12,549,627 (+10,752). Therefore the CPU difference is an **observation, not a clean causal estimate** of the viewport callback. It cannot establish zero added cost or a strict budget PASS. Historical same-world paired geometry controls remain separate.

After restoring real draws, five full-scene software GPU queries per build run inside the verified partial interval. Auxiliary-pass counts vary. The exact matched group has **751 draws / 11,874,943 triangles**, three samples per build: median **18,825.44 → 18,841.55 ms (+16.11 ms, +0.086%)**. All samples, including unmatched ones, are retained. This is a slow full-scene SwiftShader query, **not isolated mask ALU, Apple GPU timing, or 60 Hz cadence**. It does not erase the focused shader result below.

[Before CPU/raw queries](proofs/crown-lod-cost/before-cpu.json) · [After CPU/raw queries](proofs/crown-lod-cost/after-cpu.json) · [Comparison](proofs/crown-lod-cost/comparison.json) · [Before endpoint](proofs/crown-lod-cost/before-endpoint.png) · [After endpoint](proofs/crown-lod-cost/after-endpoint.png).

## Focused production-hook shader cost

The fixture imports the actual baseline and candidate `attachInstanceDistanceVisibility` hooks. One instanced draw covers a 128×128 target with 128 overlapping opaque planes (**256 triangles**), depth testing/writes disabled. The shared radius is 150 m. Full intervals are `[0,1)`; partial intervals are `[0,0.5)`. No textures are sampled. Both programs warm before collection; A/B order alternates, with seven samples per variant/control. Program count and draw/triangle budgets must stay unchanged. All console errors fail the runner.

| Elapsed-query median, seven samples | Before | After | Ratio |
| --- | ---: | ---: | ---: |
| Partial interval, run 1 | 25.188 ms | 60.899 ms | **2.418×** |
| Partial interval, repeat | 26.003 ms | 61.509 ms | **2.365×** |
| Full interval control, run 1 | 24.769 ms | 59.830 ms | 2.415× |
| Full interval control, repeat | 25.316 ms | 61.193 ms | 2.417× |

The repeated full-interval increase matters: skipping the hash branch does **not** prove the complete compiled candidate is free. The exact backend cause is not isolated. Queries include a small submission interval and measure this production-hook fixture, not hardware instruction throughput or the complete textured forest shader. The result is specific to the software backend; it is sufficient to keep a no-increase claim unproven.

[Run 1 raw samples and compiled shader hashes](proofs/crown-lod-cost/shader.json) · [Repeat](proofs/crown-lod-cost/shader-repeat.json).

Source-level partial work adds raster-coordinate reconstruction, perspective-ray normalization and analytic footprint arithmetic, replacing geometry-dependent footprint derivatives. There are **zero added texture instructions**, but source ALU and varying layout change. In the perspective path the reconstruction contains seven scalar division components and one inverse square root; this is a source inventory, **not an ISA count or a compiler cost model**. Per-frame JS adds viewport-state copies and shared-radius packing. Coverage payload also grows by one float per colour instance. None is labelled zero-cost.

## Reproduce

Serve immutable production builds separately, then run each in sequence without concurrent renderer/build work:

```sh
node tools/repro-forest-frame-cpu.mjs --url BASELINE_URL --head BASELINE_SHA --frames 120 --gpu 5 --out baseline-cost
node tools/repro-forest-frame-cpu.mjs --url CANDIDATE_URL --head CANDIDATE_SHA --frames 120 --gpu 5 --out candidate-cost
node tools/repro-crown-lod-shader-cost.mjs shader-cost 1743c9484
```

The CPU runner fails on stale build IDs, missing thread timestamps, empty draws, warm program links, missing partial intervals, missing/disjoint GPU queries or console errors. It exports relative timing deltas, not raw trace IDs/source URLs. The shader runner fingerprints baseline source, candidate source and compiled shader text; records every sample; rejects changed draw/program costs; and leaves no PASS receipt after failure. `collectionValid` means the measurement completed, **not that the candidate passed the cost gate**.

The production build/type-check and 29 focused distance/foliage/bark tests pass on the aligned runtime. The mask-correctness captures and 1,008-case production fixture are documented separately in [CROWN-LOD-MASKS.md](CROWN-LOD-MASKS.md). No new look or tree attachment change is introduced by this measurement update.
