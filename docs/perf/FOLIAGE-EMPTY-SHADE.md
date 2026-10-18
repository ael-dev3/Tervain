# Empty foliage fragments inheriting another leaf's depth

## Fresh aligned 0.0.23 capture

Candidate runtime **6ba76cf1f**, aligned to published 0.0.23 source `1743c9484` (same game source as `ef4222d8b`), is replayed in five matched walking/turning samples through native High post/MSAA4. The physical hero anchors sky/grass focus. This is a short 0.173 m / 0.69° sample, not a whole-forest audit. Pages later advanced to `7d7eacd`, changing the grass shader; that later change is not in this frozen build.

Reference-error observations fall **302→221 (−26.8%)**. All five pairs have zero new reference errors and no changes to previously exact pixels. Three stationary controls are identical; native candidate equals the enabled adapter; all restored baseline images are exact. Draws/triangles/textures match in every pair:

| Cost | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Draw calls across the five poses | 280–285 | 280–285 | 0 per pair |
| Triangles | 5,224,983–5,316,424 | 5,224,983–5,316,424 | 0 per pair |
| Textures | 274 | 274 | 0 |
| Added texture instructions / uniforms / passes | — | None | 0 by source |
| Per-frame JS update / callback code | — | Unchanged | Structural source comparison, not measured 0 ms |
| Shade-only fragment work | Existing path | Extra footprint/alpha derivatives, comparison and conditional discard | **Added work; not certified free** |

The adapter toggles a uniform but keeps the discard instruction compiled in both variants. It therefore proves pixel/count invariants, **not the real early-depth/pipeline cost of adding discard**. No GPU timing, Mac FPS or pacing improvement is claimed.

General ROI sparkle is effectively unchanged: **5.12116%→5.11017%**. Strict near-white transient observations remain **105→105**. This is an empty-fragment correctness fix, not a general crown/grass sparkle closure.

[Fresh raw receipt](proofs/foliage-empty-shade-current/report.json) · [Lossless paired clip](proofs/foliage-empty-shade-current/motion.mp4) · [Web preview](proofs/foliage-empty-shade-current/motion-preview.mp4) · [Decoded RGB check](proofs/foliage-empty-shade-current/video-verification.json) · [Before](proofs/foliage-empty-shade-current/before.png) · [After](proofs/foliage-empty-shade-current/after.png) · [Single-pass diagnostic reference](proofs/foliage-empty-shade-current/reference.png).

The clip decoder matches every original RGB channel. The paired capture checks GL errors on every draw. The separate [unmodified compiled-world probe](proofs/foliage-empty-shade-current/compiled.json) passes with **zero console errors and zero GL errors**, verifies revision `6ba76cf1f`, and reads the actual linked native pine/fir guard programs. Its [native frame](proofs/foliage-empty-shade-current/compiled.png) includes shadow/capture preparation and its costs must not be compared with the warmed paired table. This is separate from the instrumented pixel experiment. Future paired runs also record console errors explicitly; the completed five-pair receipt above records its original GL-error checks.

Twenty-one selected foliage/shader tests and production build/type-check pass on the aligned runtime. The compiled checker now removes stale receipts, checks an optional expected revision, records console errors, and anchors lighting to the physical hero.

## Original published reproduction

Published **0.0.22 · 7884c88** can shade fully transparent card regions as opaque foliage during a forest walk/turn. The two-pass leaf renderer writes cutout coverage in its depth pass, then shades with `EQUAL` depth and no cutout. Equal depth does not identify the originating primitive: another card can project to the same stored depth. Its empty texels can then overwrite the leaf that supplied the covered samples. Moving the camera changes these coincidences, producing false colour specks.

The correction keeps the two-pass renderer and rejects only a provably empty subset in the colour pass: mapped, minified samples with zero alpha across the derivative quad. The UV-footprint bound excludes magnification, whose cubic alpha reconstruction can fill an empty raw texel. Derivatives are evaluated before divergent rejection. Alpha maps, vertex alpha and uncertain nonzero/edge alpha stay on the existing path. There are no additional texture fetches, uniforms or passes in the production change.

Geometry, UVs, crown attachment, atlases, palette, alpha thresholds and wood rendering are unchanged. This is not a general alpha-edge, detached-clump or LOD-quality fix.

Pages subsequently advanced to **0.0.22 · 24629cf** during verification. Its foliage material and leaf-prepass files are byte-identical to the tested published revision ([source continuity](proofs/foliage-empty-shade/source-continuity.json)); this is not a second full rendered replay.

## Controlled regression

Two cutout cards are separated by one micrometre at a camera distance of 50 m; finite projection/depth precision makes their depths indistinguishable. The rear card's texture is entirely transparent but contains bright RGB. The single-pass cutout renderer is the diagnostic image reference. The controlled fixture counts errors above one RGB-channel level; the native motion test below uses three levels.

| Case | Before reference-error pixels | After |
| --- | ---: | ---: |
| Minified, empty rear card at 50 m | 400 | 0 |
| Minified, empty rear card at 200 m | 30 | 0 |
| Rear card separated by 0.25 m | 0 | 0 |
| Magnified control | 475 | 475 |
| Uncertain nonzero alpha control | 400 | 400 |

The last two are deliberately unchanged controls, not claimed fixes. All controls match their respective original images exactly. Both production variants retain four draws / eight triangles; the single-pass reference uses two draws / four triangles. [Fixture receipt](proofs/foliage-empty-shade/fixture.json) · [Before](proofs/foliage-empty-shade/fixture-before.png) · [After](proofs/foliage-empty-shade/fixture-after.png).

## Published whole-scene motion

The capture uses native High post-processing and four-sample MSAA at 640×360. A uniform toggles the source guard in native pine/fir/palm materials only; the inactive instrumentation must match the unmodified published image exactly. Oak materials remain unchanged in this matched experiment. A temporary single-pass cutout for those same non-oak materials is the diagnostic reference, not the proposed implementation.

The camera starts at (-210,0), eye height 2 m above terrain, yaw 0.8, then walks at a synthetic 2.6 m/s / 60 Hz while turning 0.003 radians per sample. Clock, wind, actors and film are held fixed to isolate camera motion. Three stationary controls precede the walk. Sun shadow updates are frozen after initialization. Each position primes view-dependent capture caches before measuring before/after/reference/restored renders.

Across nine moving samples (0.347 m and 1.38° of turning), reference-error observations fall **550 → 415 (−24.5%)**. At 151 frame-pixels the maximum channel error decreases; no pixel becomes farther from the reference, and no previously exact pixel changes. Three stationary controls are identical, all nine restored baseline images are exact, and inactive instrumentation matches the native image.

Both variants match at every position: **280–290 draws**, **5,340,939–5,428,609 triangles**, and **274 textures**. These are warmed, frozen-shadow capture counts, not a hardware performance comparison. [Full motion receipt](proofs/foliage-empty-shade/report.json).

Overall ROI sparkle remains essentially unchanged: **5.02475% → 5.02336%**, with near-white flash observations **188 → 188**. Thus this fixes a distinct empty-fragment error; it does not demonstrate a meaningful reduction in general crown shimmer. The worst remaining reference error still reaches 118 channel levels in both variants.

Reference errors count frame-pixel observations with a maximum RGB-channel difference greater than three levels. They are not unique leaves or a hardware timing measurement. Ordinary crown-edge shimmer and uncertain alpha remain; a reduction in these reference errors must not be described as a complete foliage-quality pass.

[Web preview](proofs/foliage-empty-shade/motion-preview.mp4) (lossy, not metric input) · [Lossless before/after motion](proofs/foliage-empty-shade/motion.mp4), before left / after right, focused on the evergreen part of the full scene. Playback is 6 fps for 10× slower inspection; sample cadence is synthetic 60 Hz. [Decoded RGB verification](proofs/foliage-empty-shade/video-verification.json).

[Full before frame](proofs/foliage-empty-shade/before.png) · [Full after frame](proofs/foliage-empty-shade/after.png) · [Before error map](proofs/foliage-empty-shade/before-error.png) · [After error map](proofs/foliage-empty-shade/after-error.png). Error maps amplify difference from the reference eightfold; they are diagnostic images, not the product appearance.

## Reproduce and validation

```sh
node tools/repro-foliage-empty-shade.mjs foliage-empty-fixture 7884c88
node tools/repro-live-foliage-empty-shade.mjs \
  --url https://ael-dev3.github.io/Tervain/ --frames 9 --out foliage-empty-motion
node tools/encode-foliage-empty-proof.mjs foliage-empty-motion
```

The capture rejects graphics errors, a changed inactive control, moving stationary frames, any failed restored image, new reference errors or unmatched before/after draw costs. A production preview can use `--expected-native after`.

The actual compiled candidate **f591f6ecf** renders the forest successfully. Readback from its linked native pine and fir fragment programs confirms the guard, shade-only mode, map and alpha-test flags; no shaders or renderer methods are replaced in this check. [Compiled receipt](proofs/foliage-empty-shade/compiled.json) · [Native candidate frame](proofs/foliage-empty-shade/compiled.png). Its totals include shadow preparation and must not be compared directly with the motion capture’s frozen-shadow totals.

Twenty-nine targeted foliage tests and production build/type-check pass. Paired hardware play/video verification remains pending; no hardware FPS or performance improvement is claimed. The GPU write-up is still `docs/perf/LATEST.md`, run `live16`; it does not measure this candidate.
