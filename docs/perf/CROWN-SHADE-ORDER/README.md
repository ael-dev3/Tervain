# Canopy shade initialized before leaf repair

Live reproduction: 0.0.33 · b317734. Candidate source: a221a5a8ce433d173f2248bd43781e075ee6cfe2.

`buildFlora` populated `PlantedCrownIndex` before `anchorLeafIslands` changed the retained leaf geometry. That index caches a projected mask by geometry identity. Later consumers therefore baked terrain shade and sampled understory using a projection of the previous positions. This is a geometry-derived shade proxy; it does not measure alpha coverage or prove artistic crown connectivity.

The change populates the same index after repair, and initializes the immediate woodland floor after that. No projection algorithm, repair parameter, foliage position/index buffer, per-frame path or shader changes.

## Reproduce

Use `tools/repro-live-crown-shade.mjs --url <build-url> --expect stale|corrected --out <output-directory>`. Chrome with software WebGL is supported. Pass a baseline `report.json` with `--baseline-report <report>` to assert identical retained wood/leaf position and index hashes across every detail level. The tool uses Chrome function scopes to inspect the actual native meadow field rather than substituting a field in the rendered world. An optional `REPRO_INIT_FILE` can reduce startup raster work; it is restored before retained High/MSAA4 captures. This is not used for the stock budget gate.

The probe compares every one of 18 native near-leaf masks to a fresh projection of the same current geometry, bypassing the identity cache with a new geometry wrapper. All 248 planted crowns match registered trees. It samples 129×129 positions per representative template, checks actual baked terrain `aCanopy` against both native and fresh fields, and hashes retained geometry at all three detail levels. Terrain comparisons tolerate 1e-6 rounding error. Fresh combined-field insertion order can differ; this tolerance excludes insignificant composition rounding.

The fixed camera is at (128, 6.187612247467041, -1), looking at (120.82948624761057, 3.822867323852104, -9.46733849160156), FOV 55, hour 15, wind/time frozen. Each build has two repeats. These are context renders of the actual field; neither shade nor geometry is patched for the kept images.

## Baseline

Only hero-oak-b is stale: 17 planted instances, 2 repaired islands, 506/16,641 local samples differ. Maximum single-tree coverage error 0.1743942261. At the worst sample, the full combined field changes 0.8478649292→0.7990345459 (0.0488303833). All other 17 template masks match.

Terrain: 209,630 checked vertices; 0 mismatch against its native cached field, 188 mismatches against fresh retained geometry (183 unique x/z nodes), maximum 0.1522162220. This proves stale data reached the baked terrain, rather than merely finding an unused cache.

Regression: original source fails all four High/Low × immediate/deferred-floor cases. Candidate passes 31 related tests. Type-check and production build pass.

## Limitations

This corrects initialization order. It does not repair detached crowns, modify tree art, claim every canopy issue is fixed, or establish hardware frame-time/heat improvements. Software wall-clock pacing is not Mac hardware performance.

## Compiled result and cost caveat

All 18 masks match fresh retained geometry; terrain reference mismatches 188→0, native mismatches 0→0. Position/index hashes of all 60 retained tree geometry pairs across the three detail levels are identical to live. Console errors 0→0.

| Context-render measurement | Live | Candidate | Delta |
|---|---:|---:|---:|
| Draws | 236 | 260 | +24 |
| Triangles | 5,215,133 | 5,307,577 | +92,444 |
| Grass instances | 25,086 | 25,091 | +5 |
| Grass triangles | 1,662,273 | 1,662,645 | +372 |
| Grass draws | 39 | 39 | 0 |
| Terrain reference mismatches | 188 | 0 | −188 |
| Retained tree geometry changes | — | 0 | 0 |

Each build's repeated screenshot has zero changed pixels. Cross-build context images differ at 114,777 pixels, but only 79 differ by more than 1/255 (maximum channel difference 3/255). This is not a pixel-identity claim: there is known independent-session software rounding, and the shade/density correction intentionally affects understory input. The initial context delta alone does not isolate a source regression; see the furniture-pass reconciliation below. Do not treat the cache assertions as a no-increase receipt. Stock exact-head gate: **FAIL**, observed process exit status 1. Two live probes on b317734 and four completed frames per probe; no startup override or allowance. Live 285 draws / 3,048,306 triangles / 0 errors; candidate a221a5a8c 285 draws / 3,048,558 triangles / 0 errors. Delta 0 draws / +252 triangles (+0.00827%). This does not meet the strict no-increase rule. No PASS line is claimed. The PR remains draft for cost review.

## Context-count reconciliation

A separately compiled original-code control reproduces the same stale mask/terrain values and 25,086 grass instances. `trace-capture.mjs` is the same read-only probe with a `renderBufferDirect` submission log. Both original and candidate are also captured with that logger.

| Full native context capture | Draws | Triangles | Grass triangles |
|---|---:|---:|---:|
| Initial published-live capture | 236 | 5,215,133 | 1,662,273 |
| Initial compiled candidate | 260 | 5,307,577 | 1,662,645 |
| Compiled original-code control | 260 | 5,307,205 | 1,662,273 |
| Candidate control | 236 | 5,215,505 | 1,662,645 |

The logged control difference is exactly 24 furniture submissions / 92,072 triangles in one capture, plus +372 grass triangles in the candidate: −92,072 + 372 = −91,700 total triangles. `compiled-control-comparison.json` contains every differing submission. Thus the earlier +24/+92,444 context result is not a stable source regression; subtracting the identified differing pass leaves the +372 grass delta. This accounting is an explanation, **not** an adjusted budget score. The stock gate remains unmodified and still FAILS by +252 triangles.

Corrected shade legitimately changes grass sampling (+5 instances in this context). I have not tuned placement or density to force the old budget. A strict no-increase review should keep this draft held; any small correctness exception belongs to the maintainer. The geometry fix for floating crowns remains separate.
