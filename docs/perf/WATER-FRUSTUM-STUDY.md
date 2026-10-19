# Inland water frustum probe: no pass-removal fix established

Read-only geometry inspection of published **0.0.33 · b317734**. No application changes or production candidate.

At three camera views near the village/meadow, `water-main` passes the existing global-box visibility test, but none of its per-triangle or 32-triangle-group boxes intersects the frustum. The boxes retain the geometry's global vertical envelope and the current one-metre guard before world transformation. This identifies a conservative broad-phase false positive for that ribbon at the sampled frozen state.

| View | water-main: existing visibility / group hits | water-village: existing visibility / group hits |
| --- | --- | --- |
| Meadow yaw −8° | true / 0 | true / 14 |
| Meadow yaw 0° | true / 0 | true / 6 |
| Village west | true / 0 | true / 52 |

This does **not** establish that the whole water pipeline can be skipped. Another ribbon still intersects each frustum, and a frustum test does not prove pixel visibility through occluders. Nor does this inspection measure submitted per-mesh draws or justify the CPU cost of a tighter query. No pixel-identical performance win is claimed.

The sea is a projected grid: its vertex shader derives world vertices using `aGrid`, camera/inverse-projection uniforms and bathymetry. Raw CPU position triangles do not represent those vertices. The initial raw sea triangle test was invalid and is **excluded**, with null counts in the curated data and an explicit validity field. Existing sea visibility boxes still participate in the native coarse test. A zero raw triangle count must not be read as invisible sea or a valid sea-culling opportunity. The corrected source tool skips projected sea grids.

The probe uses CPU geometry under a diagnostic browser configured to suppress raster during loading. It produces no rendered before/after proof, GPU timings, frame-time saving, release-budget PASS or proposed culling change. Camera positions are in the [full data](proofs/water-frustum-study/geometry.json), including walk-fence and a southward control.

```sh
node tools/inspect-water-frustum.mjs water-frustum.json
```

An optional second positional argument supplies another build URL. The tool checks the native water pass's coarse test, then compares conservative CPU triangle/group boxes only for ordinary inland geometry. Dynamic hydraulic changes need separate validation before any caching or production optimization. No rendering code is modified.
