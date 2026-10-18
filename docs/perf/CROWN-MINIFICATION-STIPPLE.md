# Minified foliage coverage noise during camera motion

Published source: **0.0.22 · 7884c88**, High, native post-processing and four-sample MSAA, software WebGL. Pages advanced to **0.0.22 · d40777b**; the foliage material, prepass, tree sources and LOD bands are byte-identical to the captured revision ([continuity receipt](proofs/crown-stipple/source-continuity.json)). Latest hardware data remains **live16** in [LATEST.md](LATEST.md); it is not a gate result for this change.

## Cause and change

The leaf depth pass adds screen-fixed interleaved-gradient stipple, up to ±0.125 coverage, to its alpha-to-coverage ramp. With camera movement, a minified contour crosses that noise pattern, causing extra coverage changes even though lighting, wind and actors are held still. A stationary view has no temporal noise: it is the movement across the pattern that matters.

Fade only this additional MSAA stipple as the existing texture footprint rises from one to two texels per pixel (mip 0→1). Keep the existing coverage ramp, four samples, alpha threshold, texture filtering, palette, geometry and attachment. No new texture fetches, uniforms, targets or passes. Magnified/cubic alpha remains identical; single-sample stippled captures and untextured materials retain their old paths.

Default High retains each tree's complete source colour mesh at visible distances. [Runtime inspection](proofs/crown-stipple/lod-inspection.json) confirms active non-oak batches are all level 0 with distance-detail disabled. Colour-mesh handover therefore does not explain this route's shimmer. Shadow LOD, distance-detail mode, Medium, shrubs and the horizon fade remain separate cases. This does **not** fix LOD pop-in, detached leaves, oak attachment or the remaining grass specks.

## Matched motion

An initial distant camera outside the terrain grid was rejected and excluded. The capture helper now checks the playable grid before drawing and exercises an intentionally invalid position as a negative control. The receipts contain only the completed in-bounds routes.

Nine synthetic 60 Hz samples per route: **0.347 m walked and 1.375° turned**. Both move the eye at ground height +2 m. The second route approaches a named fir from 65 m away. Fixed clocks, wind, actors, lighting and film noise; settled grass. Two repeated stationary controls per variant, pixel-identical inactive instrumentation, and a final pixel-identical restored image on each route. Intervention is limited to non-oak pine/fir/palm foliage and their depth twins; the whole scene is rendered through its native post/MSAA path.

Primary comparison uses **one neutral optical-flow reference for both variants** (per-frame mean of their luminance images), hence exactly the same accepted pixels and motion offsets. This avoids changing the denominator just because one image tracks more easily. Bright residuals use the existing 18-level luminance threshold and local-contrast check. They are frame-pixel observations, not unique leaves or a visual score. Independent-flow results are retained in the raw receipt.

| Route | Bright motion residuals | Relative reduction | Mean residual, 8-bit luma | Shared alignment acceptance |
| --- | ---: | ---: | ---: | ---: |
| forest | 4.9906% → 4.4616% | 10.60% | 7.8246 → 7.4460 | 99.08% |
| far-fir | 2.3638% → 1.7414% | 26.33% | 4.1256 → 3.5536 | 98.96% |

- forest: near-white ROI observations 202 → 158; mean ROI luminance differs by at most 0.054% per frame.
- far-fir: near-white ROI observations 320 → 279; mean ROI luminance differs by at most 0.019% per frame.

- Forest: [browser preview](proofs/crown-stipple/forest/motion-preview.mp4), [lossless RGB clip](proofs/crown-stipple/forest/motion.mp4), [before](proofs/crown-stipple/forest/before.png), [after](proofs/crown-stipple/forest/after.png).
- Far fir: [browser preview](proofs/crown-stipple/far-fir/motion-preview.mp4), [lossless RGB clip](proofs/crown-stipple/far-fir/motion.mp4), [before](proofs/crown-stipple/far-fir/before.png), [after](proofs/crown-stipple/far-fir/after.png).

Before left / after right. Playback is **6 fps, 10× slow** relative to the synthetic source cadence. Lossless video is decoded and compared byte-for-byte to all original crops; the browser preview is lossy and is never metric input. [Video verification](proofs/crown-stipple/video-verification.json), [shared-flow scores](proofs/crown-stipple/paired-metrics.json), [full native receipt](proofs/crown-stipple/report.json).

Draw, triangle and texture counts match at every paired position. The forest clip uses 280–290 draws and 5,340,939–5,428,609 triangles in both variants. Per-frame means and costs are in the native receipt. The independently completed route receipts are [forest](proofs/crown-stipple/forest-route.json) and [far fir](proofs/crown-stipple/far-route.json). This is a partial reduction of moving-crown noise, not closure of general foliage quality or proof of a faster frame.

## Regression and compiled build

The actual production foliage shader/prepass is exercised in **72 real WebGL renders**, nine translations per case and variant. Magnified alpha/cubic edges, single-sample captures and unmapped controls are byte-identical. The minified case exercises the new branch. Both variants use two draws / four triangles; only the single-sample case has zero MSAA samples. [Fixture receipt](proofs/crown-stipple/fixture.json).

The unmodified production build **39b9d71ce** starts and draws the native forest; linked pine and fir fragment programs read back from WebGL contain the new minification fade. No shader substitution or renderer replacement in that check. Four-sample post-processing is active, no GL errors. Its initial shadow preparation costs are not comparable to the frozen-shadow motion totals. [Compiled receipt](proofs/crown-stipple/compiled.json), [native image](proofs/crown-stipple/compiled.png).

**38 targeted tests pass** (30 foliage, 8 motion metrics), plus type-check/production build. The shared-motion regression checks that clean and noisy images use identical acceptance masks and that a localized flash remains detectable.

Reproduce from the candidate branch:

```sh
node tools/repro-foliage-minification.mjs fixture-proof 24629cf
node tools/repro-live-crown-stipple.mjs --out crown-proof
node tools/score-paired-crown-motion.mjs crown-proof
node tools/encode-crown-stipple-proof.mjs crown-proof
```

A GPU-capable browser can use `--headed 1`; the source path still uses a synthetic cadence and does not measure hardware frame pacing. The motion command defaults to Pages; `--url` selects a served build, and `--native after` asserts the candidate rather than baseline is already native there. For an unmodified compiled build, serve the production output and run `tools/check-compiled-crown-stipple.mjs` with its URL and an output directory.

Hardware play/video verification, broad forest coverage and sustained 60 fps remain **pending**. No hardware FPS or GPU timing is inferred from software rendering.

## Aligning the deterministic comparison with live

The rejected head `d00f183` predates five runtime-file updates in published
`d40777b`, including faded grass-tail trimming and tighter ocean culling. The
reported +8,142 triangles therefore compared different geometry/culling source
implementations, rather than isolating the stipple change. This identifies a
comparison defect; it does not assign that exact count to a particular mesh.

The branch now incorporates `d40777b`. Only `foliageMaterial.ts` differs under
`src`, and its differences are restricted to the stipple expression and shader
cache key. [Committed-source receipt](proofs/crown-stipple/runtime-baseline.json).
Run `node tools/check-crown-runtime-baseline.mjs d40777b HEAD runtime-baseline.json`
to enforce this comparison. Unexpected runtime changes fail and remove any old
output receipt; a regression test exercises that stale-result case.

The fragment change adds **one smoothstep and scaling/subtraction arithmetic**,
with **zero added texture instructions**, passes, uniforms, attributes or runtime
JS work. Its justification is the matched motion improvement above. Compiled
instruction count and GPU latency remain unmeasured: this is an explicit small
shader-cost tradeoff, not a zero-cost claim.

A fresh **published `d40777b`** native post/MSAA replay has five samples on each
route (0.173 m walk with a camera turn, fixed wind/lighting). Every paired render
has identical draws, triangles and texture counts; native, inactive, stationary
and restored controls pass. Shared-reference motion scoring gives:

| Route | Draws, both | Triangles, both | Bright residuals before → after |
| --- | ---: | ---: | ---: |
| Forest | 280–285 | 5,340,939–5,384,378 | 4.9820% → 4.4753% (−10.17%) |
| Far fir | 334–335 | 7,069,727–7,071,698 | 2.3501% → 1.7474% (−25.64%) |

[Fresh receipt](proofs/crown-stipple/aligned-live/report.json),
[shared-reference scores](proofs/crown-stipple/aligned-live/paired-metrics.json),
[forest clip](proofs/crown-stipple/aligned-live/forest/motion-preview.mp4),
[far-tree clip](proofs/crown-stipple/aligned-live/far-fir/motion-preview.mp4).
Both lossless clips decode exactly to the source RGB crops:
[verification](proofs/crown-stipple/aligned-live/video-verification.json).
This isolates the shader on the live renderer; it does not recreate the unknown
snapshot behind the earlier +8,142 count. The branch's geometry/culling sources
are now exactly live's. **30 targeted tests and production build pass** after
alignment. Hardware timing and acceptance of the explicit shader ALU tradeoff
remain separate from these deterministic counts.
