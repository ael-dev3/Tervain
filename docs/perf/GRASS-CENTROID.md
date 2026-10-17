# Grass sparkle from MSAA interpolation

The published **0.0.21 · 99455b4** still has bright grass flashes during a controlled noon walk. This change corrects one sampling cause, without changing the palette, blade shape, density, lighting equations or material opacity. It is a partial fix, not a claim that all reported white spots or foliage shimmer are resolved.

A thin blade can cover an MSAA sample while the pixel centre lies outside its triangle. The default interpolation then extrapolates colour and blade-lighting values. The existing 0–1 clamp stops extreme values, but still admits values brighter than the blade's actual vertex colours. `centroid` interpolation in both shader stages samples within the covered triangle. The defensive clamps remain.

This grass is opaque procedural geometry, without a diffuse alpha texture; an alpha-test threshold or diffuse mip-map change would not address this specific interpolation error. The experiment does not rule out other causes of shimmer elsewhere.

## Controlled regression

The fixture reads the production interpolation declarations and renders subpixel slivers with known vertex colours, followed by a white coverage pass. It checks resolved brightness against the measured coverage times the maximum legal vertex colour, with rounding tolerance. It uses actual four-sample WebGL rendering, not a CPU interpolation approximation.

| Check | Before | After |
| --- | ---: | ---: |
| Pixels exceeding the coverage-weighted vertex-colour bound | 96 | 0 |
| Single-sample control | Pixel-identical | Pixel-identical |
| Resolved MSAA ramp | 448 pixels | 2 pixels differ by one colour level |

[Regression receipt](proofs/grass-centroid/slivers.json). The same check against [unchanged published source](proofs/grass-centroid/unchanged-source.json) correctly fails the bounded-colour assertion.

## Matched whole-scene motion

The native whole scene is rendered through its normal post-processing and four-sample MSAA path at High, 640×360. Camera walk: village grass at (-7,45), source samples 7–37, 2.6 m/s at a synthetic 60 Hz, spanning 1.3 m. Clock, cloud, wind, actors, film and interaction phases are held fixed to isolate camera movement. These are software-rendered samples, not hardware frame times.

The capture starts from the published build and changes only the two grass interpolation qualifiers. Every frame is rendered before→after→before: the restored baseline must match exactly. The full-scene ROI includes other objects, so the metric does not assert exclusive grass ownership. Only grass shading changes between variants; raw paired threshold crossings are also reported independently of motion alignment.

| Temporal pixel observations | Before | After |
| --- | ---: | ---: |
| Luminance ≥160 | 21,197 | 20,493 |
| Luminance ≥180 | 6,903 | 6,418 |
| Luminance ≥200 | 1,806 | 1,683 |
| Luminance ≥220 | 530 | 534 |
| Luminance ≥240 | 81 | 81 |
| Historical near-white flashes | 0 | 0 |
| Overall ROI sparkle | 2.1327% | 1.9380% |

Luminance-180 flashes fall **7.0%**, and overall sparkle falls **9.1%**. Restricting the same temporal test to pixels actually affected by the grass-only intervention gives **2,796 → 2,543** flashes. This contribution mask is not exclusive pixel ownership. The highest brightness bands do not improve, and strictly near-white flashes are absent in this route; the broader white-speck report remains open.

This does not just darken the view: raw luminance-180 observations rise **39,139 → 39,799**, while luminance-200 observations fall **18,843 → 18,748**. Raw totals are not temporal flash counts. [Raw paired counts and contribution metric](proofs/grass-centroid/pixel-counts.json).

All 31 restored baseline images have **zero changed pixels**. Both variants use **94 draws**, **1,714,488–1,719,441 triangles** (matching at each camera position), and **274 textures** after view-cache priming. [Full motion receipt](proofs/grass-centroid/report.json). These warmed capture totals are not a full-frame performance comparison including view preparation.

The historical near-white definition remains unchanged: every channel ≥180, luminance ≥200, channel spread ≤40. Brightness-bin counts instead use luminance alone. Both are pixel observations across frames, not unique blades. The temporal metric uses the existing aligned three-frame local flash test; raw brightness totals are reported separately and must not be described as flicker counts.

[Web-compatible preview](proofs/grass-centroid/motion-preview.mp4) (lossy convenience copy, not metric input). [Lossless motion comparison](proofs/grass-centroid/motion.mp4): before left, after right, ROI enlarged by layout only. Playback is 12 fps for 5× slower inspection; metrics use the original synthetic 60 Hz samples. [Decoded RGB verification](proofs/grass-centroid/video-verification.json) checks every clip channel against its source frames. [Before full frame](proofs/grass-centroid/before.png) · [After full frame](proofs/grass-centroid/after.png).

## Reproduce

```sh
node tools/repro-grass-centroid.mjs grass-slivers
# Expected failure against unchanged published declarations:
node tools/repro-grass-centroid.mjs grass-slivers-before 99455b4
node tools/repro-live-grass-centroid.mjs \
  --url https://ael-dev3.github.io/Tervain/ \
  --route village --hour 12 --frames 31 --out grass-centroid
node tools/encode-grass-centroid-proof.mjs grass-centroid
```

The native adapter must reproduce the published baseline exactly before sampling. Each camera position primes view-dependent capture caches before measuring either variant; the unprimed first render otherwise includes work reused by the second render. Each draw rejects graphics errors/context loss; draw/triangle/texture counts must match, alignment must exceed 90%, and every restored frame must be identical. The clip encoder independently requires fewer luminance-180 transient flashes, no increase in near-white flashes or overall sparkle, and lossless decoded RGB.

The actual compiled candidate, **03457fbb2**, also passes a five-frame native check: the unmodified compiled shader matches the candidate adapter exactly, every restored frame is identical, and draw/triangle/texture counts match. Luminance-180 temporal flashes are **673 → 617**; near-white flashes are **0 → 0**. [Compiled receipt](proofs/grass-centroid/compiled.json). For a production preview, add `--expected-native after`.

Fourteen grass tests and the production build/type-check pass. A paired hardware play/video gate is still required. This does not establish a frame-time gain or a complete quality verdict for moving grass.
