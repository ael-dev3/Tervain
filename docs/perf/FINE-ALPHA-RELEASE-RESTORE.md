# Restore thin-needle evidence in the crown audit

Published 0.0.32 source still throws `Canopy alpha sampling missed opaque foliage` when finer probes find opaque foliage between coarse samples. This is the #685 correction omitted from a later release snapshot. The diagnostic becomes incomplete; its failure cannot be counted as zero detached foliage.

The restored helper retains those positive barycentric witnesses in the existing UV-pattern cache. Transparent and supported controls remain, every lookup consumes the operation budget, and collapsed geometry cannot poison the cache for real cards. Native-mask conservative hints permit a finer bounded search. Sampling is finite, not an exact per-texel connectivity guarantee.

## Reproduce

From the candidate source, run:

```sh
node tools/repro-live-canopy-fine-alpha.mjs --baseline b31773468 --url https://ael-dev3.github.io/Tervain/ --out fine-alpha-proof
```

The baseline revision must match the published build. This runs both diagnostic versions on the same registered far-LOD forest and native cutouts. Options are `lod:2, alpha:true, gap:0.75, woodReach:1.5, maxOperations:300000000`. Native raster must be restored before retained captures; the driver rejects blank images, zero counters, revision changes, changed pixels and console errors.

The script compares diagnostic execution on one published renderer, rather than pretending to compare two compiled renderer binaries. Source changes are confined to the diagnostic helper, types and regression tests; no rendering or generation code changes.

## Regression checks

Six tests fail on the release source. After the restoration, 31 focused alpha/audit/flagged-set tests, the full 67-test canopy suite and the production build pass. Controls cover support, transparency, fine witnesses, cache reuse, collapsed-first patterns and operation-budget exhaustion.

## Scope and cost

| Path | Change |
| --- | --- |
| Rendering geometry, materials, shaders, texture taps | None |
| Per-frame update and uploads | None |
| Explicit alpha diagnostic | Retains positively witnessed foliage rather than aborting |

This is diagnostic coverage, not a claim that floating crowns are fixed, and not a hardware frame-time or heat measurement.

## Published 0.0.32 result

On revision `2def3b0`, the old diagnostic throws. The candidate completes all **451 far-LOD targets**, with **zero missing wood**, in **15,841,338 charged operations** under the unchanged 300,000,000 ceiling. It reports 369,164 sampled opaque triangle components, including 79,257 beyond the sampled support reach in 2,421 groups across 295 trees. These are finite-sample candidates, not confirmed visual defects or welded-card counts.

[Before failure](proofs/fine-alpha-release/before-audit.json), [after complete report](proofs/fine-alpha-release/after-audit.json), [source fingerprints and full receipt](proofs/fine-alpha-release/report.json.gz).

[Native before](proofs/fine-alpha-release/before.png) / [native after](proofs/fine-alpha-release/after.png): **zero changed pixel channels**, **403 draws / 5,257,159 triangles** on both sides, **zero console errors**. Time and camera were fixed; actual post/MSAA rendering brackets the diagnostic call. No rendering source was edited.

## Independent compiled application

The compiled `63e6f0a46` application independently returns the same complete report: all target fields and **15,841,338** operations exactly match the source-adapter run. The native wrapper confirms 451 expected targets, complete species coverage and zero console errors. [Compiled receipt](proofs/fine-alpha-release/compiled.json).

```sh
node tools/check-canopy-fine-alpha-build.mjs --url CANDIDATE_BUILD --expected fine-alpha-proof/after-audit.json --head 63e6f0a46 --out compiled.json
```

## Current 0.0.33 repeat

Pages deployed the grass-cap revert while the first budget was running. The stock gate correctly rejected mixed live revisions `2def3b0 -> b317734`; no candidate budget verdict came from that run. The feature was rebased onto `b31773468` as `511b220200290cd30ba61e307a19e237bd73f909`.

Repeated the full native experiment on **0.0.33 · b317734**: original audit aborts; candidate completes all **451** targets, zero missing wood, **15,841,338 operations**, with the same diagnostic summary. Native controls again have **zero changed channels**, **403 draws / 5,257,159 triangles** both sides, and zero errors. [Receipt](proofs/fine-alpha-release/live033/report.json.gz), [before failure](proofs/fine-alpha-release/live033/before-audit.json), [complete after](proofs/fine-alpha-release/live033/after-audit.json), [before image](proofs/fine-alpha-release/live033/before.png), [after image](proofs/fine-alpha-release/live033/after.png).

Earlier 0.0.32 results above are retained with their original revision; they are not relabelled as 0.0.33 evidence.

The compiled rebased `511b22020` application independently matches every target field and operation count, complete species coverage, 451 expected trees and zero errors: [0.0.33 compiled receipt](proofs/fine-alpha-release/live033/compiled.json).


## Current-head stock software budget: PASS

For `511b220200290cd30ba61e307a19e237bd73f909`, two same-revision **b317734** live probes and four completed frames per probe: **285 / 285 draws**, **3,048,306 / 3,048,306 triangles**, **0 / 0 errors** (live/candidate). Triangle allowance **0**, actual exit **0**, producer/sampler unchanged. [Scrubbed structured receipt](proofs/fine-alpha-release/live033/budget.json).

`play-gate: PASS 511b22020`

This gate measures rendered counts, not hardware timing, heat, texture taps or JS frame CPU. The source patch changes only explicit diagnostic alpha sampling; no per-frame code or shader changes.
