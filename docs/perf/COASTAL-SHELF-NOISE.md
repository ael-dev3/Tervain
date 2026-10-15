# Coastal shelf noise reuse

Published reference: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/). Related streaming/performance reports: [playtest checklist #326](https://github.com/ael-dev3/Tervain/issues/326). This is a preparation-cost reduction, not a measured hardware frame-time or hitch-resolution claim.

`coastalShelfAt` and `coastalShelfHeight` evaluate the same seed-211 two-octave noise field for each of four shelves. Its inputs depend only on the query position. Evaluate that expression once before each loop; keep the shelf order and arithmetic unchanged. No geometry, materials, placement, quality settings or rendering policy changes.

## Native rendered replay

The repro loads the published scene, obtains its retained Habitat, planted crown field and grass generators, and refills the actual tile buffers using baseline and candidate `evalNode` dependencies. The baseline is `2edff1ffb` (#551), so previous habitat/shoreline savings are excluded. Only the coastline implementation changes between the two arms.

| Native workload | Before | After |
| --- | ---: | ---: |
| Grass tiles / instances | 31 / 4,088 | 31 / 4,088 |
| Raster nodes | 6,358 | 6,358 |
| Shelf cover queries | 2,249 | 2,249 |
| Shelf noise evaluations | 8,996 | 2,249 |
| Draw calls | 245 | 245 |
| Triangles | 1,889,302 | 1,889,302 |
| Texture objects | 174 | 174 |

Noise evaluations fall 75% within these shelf queries. These counters instrument the matching coastline module used by the surface sampler; separate terrain/biome imports are outside the counter scope. This native raster workload exercises shelf **cover**; height equivalence is checked separately in the tests. It does not measure allocations, upload bytes, GPU time or total application noise work.

Full grass attributes/bounds and all raster channels match the published reference. Software-WebGL Grade/post pixels match exactly among native, before and after. Renderer counts are unchanged controls, not claimed rendering savings. Low preset, 640×360; no hardware performance inference.

- [Machine-readable receipt](../../proofs/coastal-shelf-noise/report.json), including source checksums and buffer/raster hashes.
- [Native image](../../proofs/coastal-shelf-noise/native.png)
- [Before image](../../proofs/coastal-shelf-noise/before.png)
- [After image](../../proofs/coastal-shelf-noise/after.png)

## Reproduce

Run `node tools/repro-live-coastal-shelf.mjs --url https://ael-dev3.github.io/Tervain/ --out coastal-shelf-proof` with the repository's Chromium/software-WebGL prerequisites. The script exits unsuccessfully if native output equality or the four-to-one noise reduction fails. It uses the published version in its report; rebaseline explicitly when Pages changes.

As an unchanged-source control, add `--candidate-ref 2edff1ffb`: this must fail the reduction assertion while retaining equal output. An unchanged implementation must not earn a performance PASS.

Validation: 27 tests across coastal shelf equivalence, coast-row cache, habitat reuse, coastal terrain/dressing and terrain visuals; production build passes. Shelf equivalence covers centres, noisy rims, 2,000 deterministic additional points, signed zero and nonfinite/extreme inputs. No hardware play-gate receipt yet.
