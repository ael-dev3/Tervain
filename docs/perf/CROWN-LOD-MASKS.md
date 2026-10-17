# Tree LOD intervals do not guarantee complementary pixels

The published **0.0.22 · d40777b** colour shader samples the distance-fade noise at each fragment's own world position. Its cell size also uses that surface's world derivatives. Near and middle geometry can occupy different depths at the same screen pixel, so they obtain different noise samples. Complementary instance intervals then need not produce complementary pixel masks: both levels can discard, or both can keep, the same pixel.

This is a controlled renderer invariant repro, **not a measured live-tree hole percentage or a fix**. It is relevant during partial LOD fades, including Medium and High with distance detail enabled. Ordinary High trees with complete coverage are not affected by this mask failure, so this does not explain their general camera-motion shimmer.

## Verified source and WebGL witness

The tool downloads the live version, entry module and bundle over verified HTTPS. It requires an exact match between the published distance-noise GLSL and the imported production function, checks that the published coordinate expression is still the one under test, and checks the version again after capture. Source and bundle fingerprints are in the [receipt](proofs/crown-lod-masks/report.json).

Two opaque surfaces have identical projected silhouettes but stand four metres apart. The fixture uses the production world-noise function and complementary intervals. It sweeps three depth pairs, three interval weights, three lateral camera offsets, and actual single/four-sample framebuffers: **54 cases**. It checks the bound framebuffer's actual sample count and rejects graphics errors.

Example: 150 m / 154 m depths, 50/50 weights, four-sample target, 128×128 pixels:

| Pixel coverage | Published coordinate rule | Equal-depth control | Shared-reference control |
| --- | ---: | ---: | ---: |
| Neither level | 4,178 | 0 | 0 |
| Both levels | 3,844 | 0 | 0 |
| Exactly one | 8,362 | 16,384 | 16,384 |

Every case reproduces holes and double coverage. Both controls yield exactly one level at all pixels in all 54 cases. The reference control evaluates both surfaces on the same plane along the camera ray; it changes only the coordinate supplied to the unchanged noise function.

[Published-rule mask](proofs/crown-lod-masks/before.png) · [Equal-depth control](proofs/crown-lod-masks/control.png) · [Shared-reference control](proofs/crown-lod-masks/shared.png). Red means neither level, blue means both, white means exactly one. These are diagnostic false colours, not game screenshots.

[Lossless lateral-motion comparison](proofs/crown-lod-masks/motion-lossless.mp4) · [Browser preview](proofs/crown-lod-masks/motion-preview.mp4). Published rule left, diagnostic shared reference right. Three synthetic plane samples, slowed for inspection; not a native forest walk or hardware cadence. [Decode verification](proofs/crown-lod-masks/motion-verification.json) checks exact RGB; the preview is lossy and not metric input.

The receipt distinguishes `measurementPass: true` from `productionInvariantPass: false`. A successful repro is not a renderer-quality PASS.

## Fix direction and limits

A production fix needs a shared per-tree coordinate frame for overlapping levels, independent of their surface depths and normals. The shared-plane control demonstrates the desired complementary-mask property. A camera-facing plane can itself move its pattern during camera rotation, so it must be tested for temporal stability before adoption. Simply restoring screen-fixed noise would restore the old moving-sieve tradeoff.

No production shader or tree attachment is changed here. A candidate still needs native non-oak transition captures under walk/turn and wind, colour/depth-prepass consistency, precision/boundary tests, varying-budget checks, and a hardware play/video gate. Actual source silhouettes and alpha masks may differ; even a correct shared noise field cannot make those shapes identical. The fixture does not clear crown attachment, general shimmer, or whole-world pop events per metre.

The interval unit test previously used a legacy screen hash while its title claimed pixel complementarity. It now explicitly tests **shared-sample interval arithmetic**; the browser witness covers the missing coordinate assumption instead of silently certifying it.

## Reproduce

```sh
node tools/repro-crown-lod-masks.mjs crown-lod-masks
npm test -- --run tests/presentation/distanceVisibility.test.ts
npm run build
```

Requires curl, ffmpeg and the existing software-WebGL tooling. Five focused tests and the production build/type-check pass. The reproducible failure is the production mask invariant; application rendering remains unchanged.
