# Reuse the wood index during canopy budget retries

The published 0.0.18 tree factory rebuilds a broadleaf canopy when its leaf cards and grown twigs exceed the triangle budget. Each retry rebuilds a nearest-wood search index even though the source wood is unchanged. Seven native variants take that retry path.

The candidate creates one index per near/middle LOD and shares its query across that LOD's retries. The index is local to the build; it is not cached across geometry replacement, mutation or disposal. Card counts, random seeds, trimming and twig generation retain their existing behavior.

## Reproduction

Run from the repository checkout:

```sh
node tools/repro-live-canopy-anchor-retry.mjs --url https://ael-dev3.github.io/Tervain/ --out canopy-anchor-retry-proof
npx vitest run tests/presentation/canopy.test.ts tests/presentation/meshyTrees.test.ts --testTimeout=90000
npm run build
```

The script takes the immutable parsed tree templates and placements from the published build, reconstructs every native asset-backed variant with the parent and candidate factories, and counts search-index builds and triangles indexed. It asserts identical attributes, indices and twig plans at every LOD. An exact published wood fixture renders with its native material through the software WebGL post path; an empty control verifies that wood is visible. Three alternating warm construction runs provide supplementary CPU timings.

Use `--candidate-ref b3c5dd76a` to run the unoptimized parent as the candidate: output equality should remain true, but the optimization assertion must fail. The focused unit regression also fails against the parent because its supplied query is never used.

## Receipt: published 0.0.18 · 421d34b

[Report](proofs/canopy-anchor-retry/report.json) · [before](proofs/canopy-anchor-retry/before.png) · [after](proofs/canopy-anchor-retry/after.png) · [empty control](proofs/canopy-anchor-retry/empty.png)

| Measurement | Parent | Candidate |
| --- | ---: | ---: |
| Native asset-backed variants / LODs checked | 17 / 51 | 17 / 51 |
| Wood-search index constructions | 27 | 20 |
| Triangles indexed cumulatively | 184,745 | 126,817 |
| Fixed index-array payload cumulatively | 14,040,620 bytes | 9,638,092 bytes |
| Warm index-construction median | 338.0 ms | 249.6 ms |
| Warm whole-factory median | 4,248.5 ms | 4,303.2 ms |

The fixed payload counts triangle corners, boxes, centres and the retained triangle order (76 bytes per indexed triangle); it excludes temporary sorting/order copies, node arrays and other allocations. This is cumulative construction work, not a peak-heap measurement.

All 51 generated LODs match the parent byte-for-byte in their attributes and indices, with identical twig-plan hashes. The native wood fixture changes 0 image channels between parent and candidate; hiding it changes 72,424 channels. Draw calls and triangles remain identical. The timings support less index-building work, **not a demonstrated whole-factory or full-load speedup**.

Validation: 19 tests pass across the canopy and native-tree suites; the focused regression fails against the original implementation. Type check and production build pass.

## Limits

This measures factory construction, not whole-world load time, hardware frame pacing, or foliage quality. It does not close the remaining live16 slow-frame or video-quality reports. Hardware play-gate review remains outstanding.
