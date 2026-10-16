# Grass gust-noise helper reuse

Published 0.0.18 · 421d34b defines its periodic-noise lattice lookup helper inside every texel iteration. The helper captures only the octave's lattice and period; neither changes during that loop. Define it once per octave instead, keeping all lattice indices, interpolation expressions and typed-array rounding unchanged.

## Reproduction

```sh
node tools/repro-live-grass-gust-helper.mjs --out grass-gust-helper-proof
```

The default target is [live Pages](https://ael-dev3.github.io/Tervain/). Load the native world, capture its actual wind texture data, then cold-generate the field using the actual baseline and candidate source modules. Count executions of the lattice lookup helper's definition site. Require byte-for-byte equality with the published texture. A second call must return the same cached object without new helper definitions.

Re-upload each generated field into the native shared grass/foliage wind texture and require full-scene post-processing/MSAA pixels to match the original native image. Restore the original data afterward. Add `--candidate-ref 421d34b` for an unchanged-source control, which must exit nonzero because repeated helper definitions remain.

## Matched result

[Report](../../proofs/grass-gust-helper/report.json) · [unchanged-source control](../../proofs/grass-gust-helper/unchanged-source-control.json) · [before](../../proofs/grass-gust-helper/before.png) · [after](../../proofs/grass-gust-helper/after.png)

| Cold field construction | Baseline | Candidate |
| --- | ---: | ---: |
| Lookup helper definition-site executions | 98,304 | 6 |
| RGBA texture bytes | 65,536 | 65,536 |
| New helper definitions on warm call | 0 | 0 |
| Matched scene draws | 245 | 245 |
| Matched scene triangles | 1,889,302 | 1,889,302 |
| Texture count | 174 | 174 |

All 128×128 RGBA bytes equal the native texture, SHA-256 `dd720e07a2ae8b947629a9f1731da03799ddad0b526ede2ee7ee6ed5e2ee41fa`. Warm calls preserve object identity. Re-uploading native/baseline/candidate fields produces identical full-scene pixels. The unchanged-source control retains 98,304 helper definitions and correctly fails the reduction assertion.

Validation: 31 tests across realm wind, grass engine and foliage engine pass; type-check and production build pass.

## Scope

This reduces repeated helper definition-site executions during cold field construction, not measured heap allocations or GC time. A compiler may optimize function expressions, so no physical-allocation or timing claim is made. Warm calls are already cached; there is no per-frame saving claimed here. Software WebGL at low quality verifies exact texture data and scene pixels, not hardware FPS, M5 thermals or closure of >25 ms stalls. Tree/grass visual-quality targets remain open.
