# Fine canopy-mask witnesses

Feature head `a6b704082b65ff8b20f313294039fb63ee326dfa` (#685), based on #684. Native geometry/masks: published 0.0.29 · `bf9261f`. Finite 48-grid reference: `5d5a64fc3`.

The published audit aborts when its fine scan witnesses opaque foliage between coarse probes. Retaining those witnesses repairs that abort; a further native study found 28 far-LOD UV patterns whose opaque pixels evade both 6- and 48-grid probes. The candidate supplements an empty fine pattern with a bounded 192-grid search only when the existing conservative mask predicate reports possible coverage. Positive weights are retained and repeated UV patterns share them. All supplemental probes and hint queries are charged to the operation limit.

## Paired native result

Both auditors used the same 451 registered far-LOD targets, native masks, gap 0.75 m, wood reach 1.5 m and the default 20-million operation ceiling.

| Alpha-mode measure | 48-grid reference | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Registered trees | 451 | 451 | 0 |
| Sampled opaque triangle components | 368,486 | 369,164 | +678 |
| Components beyond wood reach | 79,157 | 79,257 | +100 |
| Detached groups | 2,356 | 2,421 | +65 |
| Whole-chunk review candidates | 0 | 64 | +64 |
| Charged operations | 14,066,702 | 15,841,338 | +1,774,636 |

This is additional work in explicitly requested diagnostics. Rendering shaders, frame callbacks and geometry-only generation retain their existing paths. The 46 focused tests cover positive fine witnesses, cached repeated UVs, conservative hints, collapsed triangles, supported controls and exhaustion of the supplemental operation budget.

These alpha-mode units are sampled opaque triangle components. Unmasked welded-card totals use a different unit. Finite base-mask probes, proximity links and rest geometry require visual review; shader wind and rendered mip selection are outside this measurement.

`tree:wild:32:27` remains at 878 sampled components, 636 beyond wood reach and 38 detached groups in far detail. Its near/middle mask patterns all had coarse hits in the independent witness scan. This refinement leaves its attachment problem open.

## Render and compiled verification

Native High images bracket both diagnostic runs: [before](proofs/canopy-extra-witness/before.png) / [after](proofs/canopy-extra-witness/after.png). Zero changed channels; 355 draws, 5,107,699 triangles and 1,642 points on both sides; console errors 0. Positive raster counts and image variance are required. The camera uses normal LOD selection while the diagnostic selects far rest geometry.

The actual compiled application API agrees with every candidate-source field and its operation count. It reports 451 expected trees, complete species coverage, 15,841,338 operations and no console errors.

The stock exact-head budget gate takes four completed samples per probe and compares against the larger of two live probes, with zero triangle allowance:

| Budget maximum | Published bf9261f | Candidate a6b704082 | Delta |
| --- | ---: | ---: | ---: |
| Draw calls | 285 | 285 | 0 |
| Triangles | 3,048,306 | 3,048,306 | 0 |
| Console errors | 0 | 0 | 0 |

`play-gate: PASS a6b704082` — runner exit 0. Hardware timing is unmeasured.

[Native report](proofs/canopy-extra-witness/report.json) · [compiled receipt](proofs/canopy-extra-witness/compiled.json) · [budget](proofs/canopy-extra-witness/budget.json) · [individual positive UV witnesses](proofs/canopy-extra-witness/witnesses.json)

## Reproduction

The proof branch adds tools/data to the feature source. Build the feature head separately for the compiled check; keep its stamped artifact served while running the proof tools. The reference commit is reachable through the original fine-alpha proof branch when working with a shallow checkout.

- `node tools/repro-live-canopy-extra-alpha.mjs --baseline 5d5a64fc3 --out artifacts/canopy-extra-witness`
- `node tools/check-canopy-extra-alpha-build.mjs --url <compiled-preview-url> --expected artifacts/canopy-extra-witness/after-audit.json --out artifacts/canopy-extra-witness/compiled.json --head a6b704082b65ff8b20f313294039fb63ee326dfa`

The witness dataset records native UV triangles and positive 192-grid barycentric probes after the 6/48 grids were clear, across 20 unique far buffers plus the selected tree's near/middle buffers. It contains 28 distinct missed UV patterns; expanded per-instance component deltas are measured by the paired full audit above.
