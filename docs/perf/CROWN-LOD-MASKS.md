# Complementary tree LOD pixel masks

**Cost hold:** the [fresh CPU and shader measurements](CROWN-LOD-COST.md) do not clear the no-increase gate. The scoped CPU replay is higher and the focused software shader benchmark regresses twice. Older correctness captures below do not certify current cost.

Published **0.0.22 · d40777b** samples each LOD's fade noise at its own surface position and derivatives. Different-depth geometry therefore receives different samples at the same pixel. Complementary intervals can leave holes or keep both levels.

This matters during partial fades, including Medium and High with distance detail enabled. Complete High intervals do not explain general camera-motion shimmer.

The production candidate packs one shared camera-to-tree radius with the existing interval. Both levels reconstruct the same world-oriented reference from the raster coordinate, current viewport and projection. An analytic pixel footprint removes geometry-dependent derivatives. Noise is evaluated only after cutout rejection and only for partial coverage; full intervals skip it. Existing tree shapes, attachment, materials and shadow coverage are retained.

The field is world-oriented under camera rotation, rather than fixed to the screen. Translation follows the shared tree radius. This fixes the mask invariant where both source silhouettes cover a pixel; different silhouettes and alpha shapes can still change during a transition. It is not a general crown-shimmer or whole-world pop-in clearance.

## Rendered invariant

The [production receipt](proofs/crown-lod-production/report.json) exercises the actual material hooks against the published shader, using different-depth surfaces with matching projected silhouettes. It includes perspective and orthographic cameras, inset viewports, projection offsets, turning, opaque and cutout controls, three depth pairs, seven weights including endpoints, and actual single/four-sample targets: **1,008 cases**. Opaque overlap is nonempty in every case. Twenty-four float-target probes compare the shared world point and analytic footprint with independent CPU unprojection and numerical derivatives.

| 150/154 m, half coverage, four samples | Published | Candidate |
| --- | ---: | ---: |
| Neither LOD | 4,178 | 0 |
| Both LODs | 3,844 | 0 |
| Exactly one | 8,362 | 16,384 |

All candidate cases have zero holes and zero double coverage within the common opaque oracle. Genuine source alpha-edge differences are excluded. [Before mask](proofs/crown-lod-production/before.png) · [After mask](proofs/crown-lod-production/after.png). Red/blue are diagnostic coverage errors, not game colours.

The earlier [54-case diagnostic](proofs/crown-lod-masks/report.json) remains historical evidence, using the archived published shader. Its shared-plane control is replaced by the production world-oriented ray reference.

## Native walk and pacing scope

Native evidence is captured through the game's High post/MSAA path, with distance detail enabled and deterministic walk, turn and wind samples. The paired replay restores the published shader in the same compiled candidate world, then applies the production hook. Inactive-adapter and restored-before controls must match exactly. Source/build fingerprints prevent mixed revisions. Each new view primes its capture caches before the comparison. Draws, triangles, textures, warm program links and software GPU query samples are recorded.

[Before walk preview](proofs/crown-lod-production/before-preview.mp4) · [After walk preview](proofs/crown-lod-production/after-preview.mp4) · [Lossless before](proofs/crown-lod-production/before-lossless.mp4) · [Lossless after](proofs/crown-lod-production/after-lossless.mp4) · [decode verification](proofs/crown-lod-production/motion-verification.json) · [native receipt](proofs/crown-lod-production/native-report.json).

All **nine pairs** pass exact inactive/restored controls and equal draw/triangle/texture counts, with **zero warm program links**. The route walks 2.77 m inside the transition band while turning; it does not traverse the entire band. The first pair records 439 draws, 7,121,925 triangles and 274 textures per variant. Costs can change across views; equality is checked within each pair.

Software GPU-query medians are **15,165.5 ms before / 15,341.7 ms after / 15,249.1 ms restored**. This is a slow software render of the full scene, not a speedup or a 60 Hz PASS. Queries end before PNG readback. The [mixed forest/sky motion statistic](proofs/crown-lod-production/motion-metric.json) is essentially flat (sparkle share 1.39435% → 1.39395%); near-white transient observations fall **324 → 278**, with >98.5% alignment. This short sample does not clear general shimmer or grass sparkle.

Software query durations are not hardware cadence, Mac performance, or a play-gate PASS. A baseline-then-build hardware gate remains required. Colour distance buffers grow by one float per instance; shadow buffers retain their old layout. The [same-page attribute inventory](proofs/crown-lod-production/attribute-layout.json), including floor and shadow casters, measures 48,968 → 62,628 nominal payload bytes (+13,660 bytes), not driver VRAM. The viewport callback copies renderer CPU state without a GL readback or per-draw allocation. No extra vertex matrix transforms are introduced. Driver varying packing and hardware pacing remain gate checks.

## Reproduce

```sh
node tools/repro-production-crown-lod.mjs production-crown-lod d40777b
npm test -- --run tests/presentation/distanceVisibility.test.ts tests/presentation/foliageEngine.test.ts tests/presentation/treeBarkDetail.test.ts tests/presentation/terrainVisuals.test.ts
npm test -- --run tests/presentation/forestFloor.test.ts tests/presentation/forestFloorPending.test.ts tests/presentation/forestFloorMatrices.test.ts tests/presentation/pineForestIntegration.test.ts
npm run build
node tools/repro-native-crown-lod.mjs --url BUILD_URL --native after --frames 9 --timing 1 --out native-crown-lod
node tools/encode-native-crown-lod.mjs native-crown-lod motion-proof
```

The native command requires a served candidate build matching the committed runtime source. Existing software-WebGL tooling, ffmpeg and immutable game assets are required. Seventy-three focused and forest/floor integration tests and the production build/type-check pass.
