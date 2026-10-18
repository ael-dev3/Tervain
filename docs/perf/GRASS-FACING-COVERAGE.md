# Facing-aware grass brightness coverage

Published baseline: **0.0.22 · d40777b**. Compiled candidate: **4ebcbcf4b**. The runtime diff is limited to `grassMaterial.ts`.

The blade/head brightness fades estimate pixel width from nominal size and distance. They retain that allowance when the surface turns edge-on. Reuse the face/view dot already computed for normal orientation to scale this estimate by facing; clamp it to the old allowance. This is a cheap projected-coverage proxy using clump distance, not an exact pixel footprint of every curved blade. Palette, geometry, density, opacity, lighting equations and interpolation qualifiers are unchanged.

Two equivalent normal expressions supply its scalar arithmetic budget: halve the tangent and its bias together before normalization, and multiply the edge scalars before the vector. Actual geometry uses edge values −1, 0 and 1. The probes below and every native opt-only control verify unchanged outputs.

## Deterministic cost deltas

All five paired native views use High, 1440×900 CSS at device ratio 2. The game's cap gives **2160×1350 drawn pixels**, native post-processing and four-sample MSAA. Counts are warmed renders with cached shadows, not initial shadow preparation or a whole-play timing claim.

| Cost | Before → after |
| --- | --- |
| Draw calls | **135–138 → identical at every paired view** |
| Triangles | **2,082,451–2,232,559 → identical at every paired view** |
| Resident textures | **274 → 274** |
| Source bytes uploaded | **0 → 0** per measured render; uniforms excluded |
| Warm program links | **0 → 0** |
| Texture instructions / expensive intrinsics | **0 added**; fragment expressions unchanged |
| Scalar shader budget | **Δ0 in the stated source model**: four simple facing operations replace four normal-expression multiplies |
| Per-frame JS | **0 added work**: source outside the vertex string is identical except the compile-cache key |

The source model counts scalar multiplies, `abs` and `min` equally. It is not compiled ISA, driver latency, CPU milliseconds or a hardware FPS result. No new attributes, uniforms, targets or passes are introduced.

## Shader regression

[16,200 actual production-expression WebGL2 probes](proofs/grass-facing/shader-probe.json):

- Edge-on cases retaining a nominal brightness allowance: **3,240 → 0**.
- **3,240 resolved coverage pairs** unchanged.
- Curve positions and sampled normals **bit-identical**; face-on width error ≤0.0000003 pixels, including non-power-of-two distances.
- No added texture, power, sine, cosine, square-root, length, normalize or dot calls. Normal simplifications add no coverage branches.

The probe exercises blade rows/sides, bend angles/directions, widths, distances, facing and a fraction above one. It checks finiteness, bounds and the clamped allowance against the published expressions.

## Native motion receipt

[Capture](proofs/grass-facing/capture.json) · [independent shared-reference scores](proofs/grass-facing/paired-brightness.json) · [source continuity](proofs/grass-facing/source-continuity.json).

Five synthetic 60 Hz samples walk **0.132 m** and turn **1.375°** near the fence. Keyboard input uses the real fixed step and a follow camera with a 6.2 m target boom and 0.32-radian pitch, including normal clearance. Wind/cloud/film phases are fixed to isolate motion. This is a short spot check, not an extended walk or a complete visual gate.

The production candidate is already native in the served build. The before variant restores the published shader in that same scene. Inactive instrumentation and every restored image match exactly. The opt-only variant applies just the cost-offset expressions: it is pixel-identical to before at **all five full-frame views**. Every pair has equal draw/triangle/texture/upload counts and zero warm links. Only the grass source differs from the published runtime.

Scoring uses native RGB, a grass-affected union mask (>8 channel levels versus black-grass intervention), and **one neutral motion reference for both variants**. Bright observations require luminance ≥180, temporal residual ≥18 and local contrast ≥9. The mask measures contribution, not exclusive object ownership. Both variants accept the same **99.84%** of ROI pixels. Counts are frame-pixel observations, not unique blades.

| Interior triplet | Bright observations before → after |
| --- | ---: |
| 1 | 2,235 → 2,178 |
| 2 | 2,324 → 2,256 |
| 3 | 2,081 → 2,025 |
| Total | **6,640 → 6,459 (−2.73%)** |

Mean ROI luminance changes by at most **0.235%**. Strict near-white grass-affected observations remain **0 → 0** (minimum channel 180, luminance 200, channel spread ≤40). This fixture does **not** reproduce or clear the remaining strict-white report. General alpha-edge sparkle, taper/presence footprint approximation and broad gameplay coverage remain open.

[Before](proofs/grass-facing/before.png) · [After](proofs/grass-facing/after.png) · [Browser motion preview](proofs/grass-facing/motion-preview.mp4) · [Lossless RGB motion](proofs/grass-facing/motion-lossless.mp4) · [Decode verification](proofs/grass-facing/video-verification.json).

Before left / after right; playback is 6 fps, 10× slower than the synthetic cadence. The lossless clip matches every source crop byte-for-byte. The lossy preview is never metric input. Primary scores are independently computed from native PNGs; capture-time motion summaries are not used. The acquisition controller is preserved at `89520ded7`; its recorded checksum matches that source. Current changes correct optional summary dispatch, add recorded hashes and support opt-in headed replay; captured defaults are unchanged.

## Reproduce

Build and serve this branch, then use its URL as `BUILD_URL`:

```sh
node tools/repro-grass-facing-coverage.mjs facing-fixture
npm run build
node tools/repro-live-grass-facing.mjs --url BUILD_URL --frames 5 --width 1440 --height 900 --dpr 2 --lead-steps 12 --substeps 1 --raw-only 1 --cases '[{"name":"fence-noon","x":-2,"z":35,"hour":12,"yaw":0}]' --out facing-native
node tools/score-native-grass-facing.mjs facing-native
node tools/encode-grass-facing-proof.mjs facing-native facing-motion
```

Use `--headed 1` for an available hardware-backed browser; this still measures counts and synthetic motion, not cadence.

The published baseline commit must be available to `git show`. Shared-reference scoring support is reused from #643; this adds no foliage runtime changes. The replay depends on #646's corrected lighting focus. Validation: **53 targeted tests**, type-check, the production runtime build, and the rendered probes above pass. This is a **partial bright-transient reduction**, not a 10/10 grass-flicker or M5 performance clearance.
