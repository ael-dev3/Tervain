# Draw-range correctness in placement audits

Related: [playtest #326](https://github.com/ael-dev3/Tervain/issues/326), [referenced-vertex fix #488](https://github.com/ael-dev3/Tervain/pull/488), [published build](https://ael-dev3.github.io/Tervain/).

This production-module counterexample concerns the floating-prop/root detector. It is **not** a live floating-asset count or a claim that a tree has been repaired. It is stacked on #488, whose referenced-vertex correction explicitly excluded draw-range handling.

## Reproduction

`node tools/repro-placement-draw-range.mjs --out placement-draw-range-proof`

The tool runs actual baseline/candidate audit modules in a software-WebGL fixture. Baseline `1915d729b` includes #488. Each geometry contains complete referenced triangles outside `drawRange`. WebGL excludes them; the baseline audit still uses them.

| Diagnostic case | Before | After |
| --- | --- | --- |
| Grounded visible prop plus hidden floating box | 2 checks, 1 phantom candidate | 1 check, 0 candidates |
| Visible root floating 0.3 m plus hidden ground plane | Falsely cleared, sampled gap ≈0 m | Detected, sampled gap 0.300000012 m |
| Clean grounded prop | Supported | Supported |
| Clean floating root | Detected | Detected |
| Renderer draws / triangles | 3 / 78 | 3 / 78 |

Both prefix and tail exclusions are checked on indexed and non-indexed geometry: four prop and four root regressions in the rendered receipt. Both audit arms report complete on those valid fixtures; pixels match exactly, WebGL error is zero and the context stays available.

The fix limits triangle joins, component faces, weld representatives and basal-ring references to complete triangles inside the draw window. Original global face IDs use Three's `floor(indexOffset / 3)`, including nonaligned starts, so a component cannot count its own face as support. Invalid draw windows fail explicitly. An empty root window remains incomplete because there is no root footprint to inspect.

A further unit regression uses hidden/drawn vertices on opposite sides of the 8 cm clearance threshold but within the weld tolerance. Hidden representatives must not clear the drawn component. Default complete-range geometry retains its original vertex order.

- [Paired receipt with all raw case results and source checksums](../../proofs/placement-draw-range/report.json)
- [Before image](../../proofs/placement-draw-range/before.png)
- [After image](../../proofs/placement-draw-range/after.png)
- [Executed unchanged-source control](../../proofs/placement-draw-range/unchanged-source-control.json)

Repeat the negative control with `--candidate-ref 1915d729b`: it must fail the correction assertions while the images remain equal. The committed control was run before the fix.

Validation: the initial ten draw-window regressions fail on baseline; the additional hidden-weld threshold case also fails before restricting weld inputs. Final 29 selected placement/support tests and production build pass. No scene geometry, material, position, rendering policy or gameplay changes. No hardware performance or full-population placement-quality PASS is claimed; hardware play-gate receipt remains pending.
