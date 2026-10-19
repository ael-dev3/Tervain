# Restore thin-needle evidence in the crown audit

Published 0.0.32 source still throws `Canopy alpha sampling missed opaque foliage` when finer probes find opaque foliage between coarse samples. This is the #685 correction omitted from a later release snapshot. The diagnostic becomes incomplete; its failure cannot be counted as zero detached foliage.

The restored helper retains those positive barycentric witnesses in the existing UV-pattern cache. Transparent and supported controls remain, every lookup consumes the operation budget, and collapsed geometry cannot poison the cache for real cards. Native-mask conservative hints permit a finer bounded search. Sampling is finite, not an exact per-texel connectivity guarantee.

## Reproduce

From the candidate source, run:

```sh
node tools/repro-live-canopy-fine-alpha.mjs --baseline 2def3b0e0 --url https://ael-dev3.github.io/Tervain/ --out fine-alpha-proof
```

The baseline revision must match the published build. This runs both diagnostic versions on the same registered far-LOD forest and native cutouts. Options are `lod:2, alpha:true, gap:0.75, woodReach:1.5, maxOperations:300000000`. Native raster must be restored before retained captures; the driver rejects blank images, zero counters, revision changes, changed pixels and console errors.

The script compares diagnostic execution on one published renderer, rather than pretending to compare two compiled renderer binaries. Source changes are confined to the diagnostic helper, types and regression tests; no rendering or generation code changes.

## Regression checks

Six tests fail on the release source. After the restoration, 31 focused alpha/audit/flagged-set tests and the production build pass. Controls cover support, transparency, fine witnesses, cache reuse, collapsed-first patterns and operation-budget exhaustion.

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
