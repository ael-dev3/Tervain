# Reuse grass thinning for the main render camera

The grass stream computes each tile's main-camera density and blade prefix in `update()`. Its draw callback nevertheless computes the same tile distance again, including `Math.hypot`, even though both consumers use the cached main-camera results. This repeats for every grass tile submitted to that camera. Capture cameras still need their own distance.

The fix moves distance evaluation and capture-focus extraction into the capture-camera branch. Main-camera draws restore the cached blade prefix after captures; the horizontal-frustum check and instance-count restoration remain active for both cameras. There are no density, material, culling-bound or LOD-policy changes.

## Reproduce

```sh
node tools/repro-live-grass-main-distance.mjs \
  --url https://ael-dev3.github.io/Tervain/ \
  --out grass-main-distance-proof
npx vitest run tests/presentation/grassMainDistance.test.ts \
  tests/presentation/grassCaptureRanks.test.ts \
  tests/presentation/grassPassPixels.test.ts \
  tests/presentation/grassEngine.test.ts
npm run build
```

The script defaults to the published build, freezes simulation, moves the camera to the grove, updates the full world for that camera, and finds the two actual grass layers. The compiled native draw callback is the control. Baseline and candidate callback bodies are extracted verbatim from their source and bound to the same native layer, tile, geometry and material; no replacement grass generator or isolated blade scene is used.

For each arm it records a warmed full-scene draw through the native post-processing path, then invokes near and far capture cameras on each actual tile. It compares per-draw instance counts, blade prefixes and camera classification, asserts restoration after captures, counts actual `distTo` calls, and compares native/before/after final pixels. Each run removes its previous report before loading; failed assertions set a nonzero exit status.

## Receipt: published 0.0.18 · 421d34b

Across 31 actual grass tiles, the measured full-scene frame submitted 18 grass callbacks. Main-camera distance evaluations fell **18 → 0**. The 62 near/far capture probes retained all 62 independent distance evaluations; total calls across the frame and probes fell **80 → 62**.

Native, baseline and candidate callback-state hashes all match (`d3b558d9…5652379b3`). Native/before/after images are pixel-identical. Each measured frame retains **245 draw calls, 1,889,302 triangles and 174 textures**. The committed `proofs/grass-main-distance/report.json` records a passing run and the tested source hash; matched PNGs are beside it. The unchanged-source control correctly failed the reduction assertion (18 → 18).

Validation: 19 focused tests and the production build pass. The two new regression cases fail against the baseline and pass with the fix.

## Limits

This is deterministic work-count and software-WebGL evidence. It does not measure hardware frame times, prove the village-pan hitch resolved, or replace a hardware play gate. The capture probes are controlled cameras on native tiles, not a claim that every window is exercised. Geometry, draw calls and texture count must remain unchanged. The two focused regression cases fail on the baseline because its main draw calls `distTo`; both pass with the fix, including a capture followed by a main draw.
