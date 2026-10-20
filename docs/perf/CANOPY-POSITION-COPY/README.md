# Canopy position-copy allocation receipt

Published baseline: 0.0.33 · b317734. Candidate source: 6d400ea8add69f8140f0216f60ccd11f6d078c73.

The position-copy loop inside `snapDetachedClumps` passed a newly constructed three-number array to `Float32Array.set` for every vertex. Replace those triplets with three direct Float32 assignments. The same attribute getters, conversion, order, signed zeros, indices, snapping decisions and retained metadata are preserved. There is no shader or per-frame code change.

## Native-input replay

Ten unique retained native High oak near/middle leaf templates contain 180,252 vertices. The controlled replay calls the original and candidate helper on identical retained leaf/wood inputs using the current production maximum-scale conversion. All output attribute/index hashes and moved-group counts match. Inputs are already processed native geometry: this is an identical-input helper check, **not** reconstruction of the earlier raw authoring stage or a new crown repair. Three near inputs move again when reprocessed; native controls record that separately.

The copy-loop work counter falls from 180,252 temporary triplet inputs to zero per replay pass. It counts executions of the original array-input expression, not heap-profiler allocation bytes or GC pauses. Timing runs use the original/candidate uninstrumented copy snippets; counters run separately. Thirty alternating samples average **4.62 → 1.36 ms**, p95 **5.30 → 1.80 ms** across all ten inputs. This isolates copying, excluding support queries and snapping translations. It does not measure whole-world loading, per-frame CPU/GPU time, Mac FPS or heat.

## Render scope

Five frozen High/MSAA4 native post-render camera poses compare the two helper outputs. Native and restored frames are retained as additional controls. Colour position/index substitutions preserve native per-instance coverage bindings. Original warmed shadow maps/casters and existing terrain/grass shade stay fixed; geometry hashes establish equal original/candidate outputs independently. This is not repaired-shadow or hardware video proof. Exact cameras, hashes, counters, timings and render totals are in `report.json`.

## Reproduce

Use `tools/repro-live-canopy-position-copy.mjs --url <build-url> --out <output-directory> --baseline b31773468` with the repository's software-browser prerequisites. Any optional startup-only raster suppression must restore before retained renders, as in this run. The module imports the original and candidate helpers and captures each frame through the native post path. The unmodified stock budget gate is run separately against the compiled exact head with normal startup and no initialization override.

Six existing canopy tests pass; type-check and production build pass. No floating-foliage fix, visual-style change, world-load hitch resolution or hardware pacing claim.

Additional extracted-loop controls cover Float32 signed-zero values, normalized integer attributes and interleaved getters. All copied bytes match; the zero-triplet work assertion rejects the original loop and accepts the candidate. These are copy-snippet controls, separate from the six existing full-helper tests. Run `copy-controls.mjs` from the checkout root; its optional argument chooses an output report.

All five original/candidate render pairs have zero changed channels and equal draws/triangles. Native/restored controls are exact at all poses. Reprocessing differs from the native control by 358 channels at the third pose (zero at the other four), demonstrating why it is reported as a helper replay rather than relabelled as raw-stage reconstruction. All twenty PNGs are nonblank; channel variance is retained in `image-check.json`.

## Exact-head stock budget

Unmodified gate exit **0**, normal startup, no initialization override or triangle allowance. Two same-revision live probes; four completed frames per probe; comparison uses the larger live maximum. Live **285 draws / 3,048,306 triangles**, candidate **285 / 3,048,306**, console errors **0 / 0**. This is the gate's sampled maximum, not a full forest-path/hardware profile. Shader texture taps and frame CPU are not measured by this page; their runtime source is unchanged.

`play-gate: PASS 6d400ea8a`

See `budget.log` (candidate preview URL redacted), `verification.json` and the exact source head above. The source commit and build stayed fixed while proof was collected.
