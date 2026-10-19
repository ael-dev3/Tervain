# Oak clump links use world metres

Live 0.0.29 · 8f3c9bd converts the oak seating pass's 1.5 m wood reach into tree-local units, but passes its 0.75 clump-link gap unchanged. At the supported maximum 1.46 scale, that links across 1.095 world metres. The audit links only across 0.75 m. Oversized groups can fail the existing radius guard even when smaller detached groups could seat against a branch.

Convert the gap with the same existing `woodReachLocal` helper and maximum scale: 0.75 / 1.46 = 0.5136986301 local units. The world gap is capped at 0.75 m for every supported instance; it is conservative on smaller instances. Wood reach, grouping algorithm, radius guard and seating strength remain unchanged. No card is added or removed; no material, texture, normal, UV, shader or authored tree data changes.

## Full-population production proof

Original and candidate production factories use the same real GLB templates. Apply the world's existing alpha-aware island pass at the actual maximum placement scale of each template. Original numeric static attribute/index hashes must match all 30 live oak parts/LODs (excluding per-instance `aDistanceCoverage`). The independently compiled candidate matches all 30 candidate hashes too.

Audit all 451 trees per LOD with `alpha:false, gap:0.75, woodReach:1.5, maxOperations:300000000`:

| Scope | Before cards / clumps | After cards / clumps |
| --- | ---: | ---: |
| Near, complete population | 8,928 / 693 | 8,889 / 664 |
| Middle | 24,477 / 396 | unchanged |
| Far | 14,972 / 522 | unchanged |
| `tree:wild:32:27` | 977 / 14 | 968 / 6 |
| `tree:wild:79:22` | 949 / 5 | 942 / 1 |
| `tree:wild:42:45` | 733 / 16 | 729 / 12 |

No individual tree gains a detached-card or clump flag. Middle/far reports deeply match. All reports complete with zero missing wood. These are sampled rest-geometry flags, not an opaque-foliage visual-quality score. The remaining large crown islands are not solved by this partial unit correction.

Five near templates move 160 vertices in total. Every template retains 100% height and X span; Z span retains 99.07–100%. The regression also checks unchanged index/vertex counts and exact non-position attributes against the old seating call.

[Complete reports and source hashes](proofs/canopy-world-gap/report.json.gz), [source/native hashes and post-processing](proofs/canopy-world-gap/factory.json), [independent compiled candidate agreement](proofs/canopy-world-gap/compiled-geometry.json), [movement/bounds](proofs/canopy-world-gap/movement.json), [read-only live grouping diagnosis](proofs/canopy-world-gap/live-gap-screen.json).

## Native forest captures

These use the original live scene, substituting only the exact candidate position buffers into every derived colour/depth/shadow geometry. Initial loading raster suppression is restored before every recorded render. This is a controlled geometry adapter, independently checked against compiled output, not a two-binary forest image comparison. Nearby pines obstruct parts of these ordinary forest views; clear isolated compiled tree-lab images are provided below.

| View | Draws, both | Triangles, both | Changed pixels |
| --- | ---: | ---: | ---: |
| wild:32:27 | 275 | 4,571,308 | 126 |
| wild:79:22 | 238 | 4,214,324 | 0 (moved cards occluded) |
| wild:42:45 | 361 | 6,990,672 | 22 |

- [32:27 before](proofs/canopy-world-gap/tree-wild-32-27-before.png) / [after](proofs/canopy-world-gap/tree-wild-32-27-after.png)
- [79:22 before](proofs/canopy-world-gap/tree-wild-79-22-before.png) / [after](proofs/canopy-world-gap/tree-wild-79-22-after.png)
- [42:45 before](proofs/canopy-world-gap/tree-wild-42-45-before.png) / [after](proofs/canopy-world-gap/tree-wild-42-45-after.png)

Console errors: zero. Shader programs and per-fragment texture taps are unchanged. No new per-frame JS path is added; conversion/grouping occurs during tree preparation. Static geometry buffer sizes are unchanged. Fragment coverage can change with corrected positions; GPU time/overdraw and load-time CPU are not measured here. No Mac 60 fps or heat claim.

## Validation and reproduction

39 focused tests, type-check and production build pass. The actual-asset production integration regression fails before the patch: world gap 1.095 instead of 0.75 and a grouping disagreement (6 vs 16 clumps in the image-free integration fixture). Corrected production grouping matches the independent world-space audit at maximum scale for near and middle geometry. The fixture strips images while retaining the actual GLB geometry and extras; native appearance has separate proof above.

Repro tools, retained on this proof branch:

- `tools/prove-canopy-world-gap.mjs`: live targets, source production pair, post-processing, reports and native full-scene image pairs.
- `tools/check-canopy-world-gap-build.mjs`: independently verify actual compiled output against the factory hashes.
- `tools/repro-canopy-gap-lab.mjs`: existing compiled tree-lab stills with wind disabled; exact source revision guard and scrubbed metadata.

## Isolated compiled tree-lab supplement

The existing tree-lab route captures `hero-oak` at scale 1.4164879838, with identical spot, dimensions and seven camera poses. Wind is disabled, and the app loop is frozen before awaiting late assets; no arrival-readiness assertion is skipped. These are actual compiled apps: baseline 0.0.29 · bf9261f and candidate 71aaa61. bf9261f differs from 8f3c9bd only in gate tooling/tests/docs, not application code or assets.

- [30 m before](proofs/canopy-world-gap/lab/before/d030.jpg) / [after](proofs/canopy-world-gap/lab/after/d030.jpg)
- [10 m before](proofs/canopy-world-gap/lab/before/d010.jpg) / [after](proofs/canopy-world-gap/lab/after/d010.jpg)
- [Under canopy before](proofs/canopy-world-gap/lab/before/canopy.jpg) / [after](proofs/canopy-world-gap/lab/after/canopy.jpg)
- [Baseline metadata](proofs/canopy-world-gap/lab/before/metrics.json) / [candidate metadata](proofs/canopy-world-gap/lab/after/metrics.json)

This isolates the asset for crown review; its one-tree placement population differs from the full forest and it is not a normal-play/root-contact video or performance measurement. No visual-quality score is claimed.

## Exact-head budget: FAIL

Compiled `71aaa616b9846eb656bd75e9edf4d29ee45b9df1`, completed-frame sampler and baseline identity guard, with the #673 startup correction. Two live probes agree on bf9261f; full candidate head matches.

| Build | Max draws | Max triangles | Console errors |
| --- | ---: | ---: | ---: |
| Live bf9261f | 285 | 3,048,306 | 0 |
| Candidate 71aaa61 | 285 | 3,048,543 | 0 |

Exit 1, **237 triangles above live**, no allowance. [Machine-readable failing receipt](proofs/canopy-world-gap/native-budget.json). The fixed-pose forest pairs and tree indices retain equal triangle counts, but the stock gate does not clear; the whole-frame difference remains under investigation. This PR remains draft. No PASS marker or hardware frame-pacing claim.

CI also exposed the inherited shot-start fixture's incompatibility with the completed-frame helper: missing copied dependency, legacy sampler stub and outdated wait expectation. This is being handled separately, without changing the seating patch or rejection thresholds.

Hardware walking/video verification and visual review remain outstanding; this is not a live fix or a 9/10 score.
