# Avoid support math for centre-inside grass planes

Each grass tile's horizontal-bound frustum check transports every plane into local coordinates and evaluates the support of the sphere clipped to the tile's horizontal extent. The support calculation uses norms and square roots. It is unnecessary for planes that already accept the bound's centre: a nonempty clipped sphere contains that centre, so it cannot be wholly outside such a plane.

Skip support evaluation when the transformed centre passes the existing `-1e-6` tolerance, provided the radius and horizontal half-extent are nonnegative. Outside-centre planes retain the full support calculation and rejection rule. Invalid negative bounds retain their old path. There is no culling-bound, material, distance or LOD-policy change.

## Reproduce

```sh
node tools/repro-live-grass-frustum-support.mjs \
  --url https://ael-dev3.github.io/Tervain/ \
  --out grass-frustum-support-proof
npx vitest run tests/presentation/vegetationInsidePlane.test.ts \
  tests/presentation/vegetationExtentCull.test.ts \
  tests/presentation/grassCaptureRanks.test.ts \
  tests/presentation/grassEngine.test.ts
npm run build
```

The script freezes the published scene, moves the camera to the grove and updates the full world for that view. The actual compiled grass callbacks remain installed. It replaces only each layer's frustum-test method with the same source method using the baseline/candidate extent helper, bound to the native layer and its retained frustum matrices. The compiled native method is the control.

A warmed full-scene draw passes through native post-processing. Near/far capture-camera probes on every tile also exercise rejection and capture-density restoration. Per-camera visibility decisions must match the native control exactly, as must native/before/after images, draw calls and triangle counts. Instrumentation counts support-function entries; it does not proxy timings. A further 2,000 deterministic cases compare baseline/candidate visibility across translated, scaled and sheared transforms and both visible/rejected outcomes.

## Receipt: published 0.0.18 · 421d34b

On the native 31-tile fixture, the measured full-scene frame performs 18 grass tile tests. Support evaluations fall **81 → 12** (about 85% fewer). Including the 62 controlled capture probes, they fall **453 → 12**. All **80 visibility results** match the compiled native method: 74 accepted, 6 rejected. State hash: `e9b744d0…c85258813`.

All 2,000 transformed synthetic cases match too (305 accepted / 1,695 rejected). Native/before/after PNGs are pixel-identical. Each frame retains **245 draw calls, 1,889,302 triangles and 174 textures**. The passing report, source hash and matched images are committed under `proofs/grass-frustum-support/`. The unchanged-source control correctly fails the reduction assertion (81 → 81).

The production build and 21 focused tests pass. The new centre-inside regression fails on the baseline (18 `Math.hypot` calls) and passes with zero calls; outside-centre rejection and boundary-tolerance assertions pass unchanged.

## Limits

Software-WebGL work counts do not establish hardware timings, Mac frame rates or resolution of historical >25 ms stalls. The capture probes are controlled cameras on native tiles, not a full window walkthrough. A hardware play-gate receipt remains required. Reports are deleted before a new run and failed assertions return a nonzero status.
