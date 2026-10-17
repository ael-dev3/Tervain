# Bound repeated canopy nearest-wood searches

Published source and native geometry: [Pages](https://ael-dev3.github.io/Tervain/), **0.0.18 · 421d34b**; related [playtest checklist #326](https://github.com/ael-dev3/Tervain/issues/326).

When finding the nearest branch to a detached opaque-leaf part, the repair searches the centre and then its retained leaf samples. Each search previously started without a maximum distance, even after a previous point supplied a closer result. Pass that best distance to the existing wood spatial index. A farther result cannot replace the winner; equal-distance results still do not replace it. No new index, memory cache, traversal ordering or foliage policy is introduced.

## Native replay result

| Work across 40 retained near/middle templates | Parent | Candidate |
| --- | ---: | ---: |
| Wood-triangle closest-point evaluations | 8,723 | 3,463 |
| Spatial-index node visits | 49,640 | 39,698 |
| Changed before/after image channels | — | 0 |
| Draw calls | 121 | 121 |
| Rendered triangles | 824,790 | 824,790 |

Every repaired attribute/index hash and repair result matches. Source leaf and wood buffers remain unchanged. Both variants move the same 52 islands in this replay; the change reduces search work, not detached-island counts. Hiding the replay's leaf meshes changes 23,585 image channels, checking that the fixture contributes visible pixels.

[Before](proofs/leaf-nearest-bound/before.png) · [After](proofs/leaf-nearest-bound/after.png) · [Hidden-leaf control](proofs/leaf-nearest-bound/empty.png) · [Full counts and geometry hashes](proofs/leaf-nearest-bound/report.json)

## Reproduce

```sh
node tools/repro-live-leaf-nearest-bound.mjs --out leaf-nearest-bound-proof
# Expected failure: unchanged source must not satisfy the reduction assertion.
node tools/repro-live-leaf-nearest-bound.mjs --candidate-ref 0f8f0da8f --out leaf-nearest-bound-control
npx vitest run tests/presentation/leafIslands.test.ts tests/presentation/canopy.test.ts tests/presentation/leafSurfaceSites.test.ts tests/presentation/farLeafContact.test.ts --testTimeout=90000
npm run build
```

The replay loads the published world through software WebGL, clones its 40 retained near/middle tree templates, removes the borrowed per-instance coverage attribute before repair, and uses actual wood, cutouts and maximum selected-instance scales. Both variants share the queued thin-alpha repair from #611. These are work counts for a repair replay on retained native geometry, **not a recording of the original startup sequence or a claim about total load time**. The nearest-search block and wood-index implementation are checked against published source. All geometry buffers, results and rendered output are compared before reporting success.

The sandbox's Chrome did not trust its HTTPS proxy certificate. Captures therefore used a temporary verified-HTTPS mirror of the published build, with model bytes verified against the published revision's generated size/SHA-256 table. The game's normal integrity checks stayed active. Neither TLS nor checksum validation was disabled. The tool defaults to the public Pages URL; environments with normal Chrome trust need no mirror.

Counters are re-exported through the dependency actually used by the repair module, so Vite URL aliases cannot yield a separate unused counter instance. The earlier zero-counter diagnostic failed its assertion; only the verified nonzero replay is attached.

Validation: **34 focused tests**, production type-check and build pass. The opposing-islands fixture checks that edge samples can beat the centre and that the second island does not inherit the first island's winner. The [unchanged-source control](proofs/leaf-nearest-bound/unchanged-source.json) retains 8,723 triangle checks on both sides and correctly fails the reduction assertion.

No elapsed-time, hardware-FPS or Mac frame-pacing improvement is established. Hardware play-gate remains required. This does not close the visible canopy, grass sparkle, pop-in or `live16` missed-refresh reports.
