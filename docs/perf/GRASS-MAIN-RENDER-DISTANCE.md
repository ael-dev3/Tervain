# Grass main-pass distance reuse

The published 0.0.18 · 421d34b grass render callback computes a tile distance for every main-camera draw, although update already selected that camera's density and blade prefix. The callback only consumes its freshly calculated distance for alternate cameras. Skip that unused computation and capture-focus update for the main pass; preserve capture distance calculations, horizontal culling, prefix selection and after-render instance restoration.

## Reproduction

```sh
node tools/repro-live-grass-main-distance.mjs --out grass-main-distance-proof
```

The default target is [live Pages](https://ael-dev3.github.io/Tervain/). The script captures native grass layers and buffers, moves the follow camera to the grove, updates the real world, and records which tiles the renderer actually submits to the main camera. It replays callbacks made by the actual baseline/candidate `acquire` method for 120 repeated main passes over those tiles and four alternate-camera positions per tile (horizontal offsets of 0, 20, 80 and 130 m from its centre, with height 2 m above its lower bound). Counts, draw ranges and restored instance counts must match native callbacks exactly.

For the image comparison, every retained tile is replaced with a copy carrying the actual baseline/candidate callbacks, original attributes, options and bounds. Both full-scene replacement images must match original native pixels through post-processing/MSAA. The temporary geometry is removed and native visibility restored after each run.

Add `--candidate-ref 421d34b` for the unchanged-source control. It must exit nonzero because redundant work remains.

## Matched result

[Report](../../proofs/grass-main-distance/report.json) · [unchanged-source control](../../proofs/grass-main-distance/unchanged-source-control.json) · [before](../../proofs/grass-main-distance/before.png) · [after](../../proofs/grass-main-distance/after.png)

| Grove callback replay | Baseline | Candidate |
| --- | ---: | ---: |
| Submitted main-camera tiles | 18 | 18 |
| Main callbacks (120 passes) | 2,160 | 2,160 |
| Main-pass distance calculations | 2,160 | 0 |
| Alternate-camera callbacks / distance calculations | 72 / 72 | 72 / 72 |
| Matched capture draw calls | 245 | 245 |
| Matched capture triangles | 1,889,302 | 1,889,302 |

Every callback decision and after-render instance restoration matches native behavior, SHA-256 `129e21da8649a797386cf0088dbdbd4b4d212a745e837b7e11bc24462a60e327`. All 31 retained tiles are replaced for the image check; original native, baseline and candidate scene pixels are identical. The operation counters are snapshotted before the separate rendered-image passes. The unchanged-source control keeps 2,160 main distance calculations and correctly fails the reduction assertion.

Validation: 14 grass-engine tests pass with the CI test timeout; type-check and production build pass. No geometry, material or settings change.

## Scope

Software WebGL, low quality, fixed grove endpoint. The 120 passes are callback replays over the actually submitted tiles, not 120 independently simulated movement frames or a timing sample. The alternate-camera checks exercise culling, density and prefix decisions plus restoration; they do not measure GPU capture cost. No hardware FPS, M5 thermals or >25 ms stall-resolution claim. Tree/grass visual-quality work remains open.
