# CPU gust sampler wrapping

The CPU wind sampler mirrors the repeating gust texture. Each moving struck leaf calls it through `pushAt`. The previous sampler built a local four-texel reader and performed sixteen remainder operations per query, repeatedly wrapping the same rows and columns.

The change shares four wrapped byte offsets using the existing power-of-two texture size. It preserves the four byte reads, byte normalization and bilinear arithmetic order. Neighbour addition stays before wrapping to preserve floating-point rounding for extreme coordinates. No texture, shader, wind parameters or animation clock changes.

## Reproduce

```sh
node tools/repro-live-wind-sampler.mjs --out wind-sampler-proof
```

The default target is [the published game](https://ael-dev3.github.io/Tervain/). The script enables motion, accepts a native tree strike, then records CPU wind queries during 120 native forest updates along a turning grove route. It replays the recorded coordinates, scroll offsets and strength through the published sampler and both source samplers, using the native `pushAt` caller. Source gust bytes must match the native texture before comparison. Every gust and push must match exactly. Instrumentation counts actual sampler entries, local reader expressions and remainder operations.

Screenshots compare the same frozen endpoint through the native renderer. They are endpoint controls, not independently simulated motion clips. Dynamic correctness comes from the captured query replay. Draw calls, triangles and texture counts describe that warmed endpoint, not the whole route.

The regression test compares against the original toroidal formula across scrolling, negative coordinates, seams, deterministic random points, very large coordinates and non-finite inputs. It also checks the power-of-two invariant.

This is a CPU-work reduction. It does not establish a hardware frame-time gain, heap allocation count, GC reduction, or a fix for the remaining village-pan hitches. Hardware play-gate verification remains required.

## Recorded result

Published build **0.0.18 · 421d34b**, software WebGL, accepted tree strike, 120 motion updates:

| Work | Before | After |
| --- | ---: | ---: |
| Native gust queries replayed | 600 | 600 |
| Remainder operations | 9,600 | 0 |
| Local texel-reader expressions | 600 | 0 |
| Endpoint draw calls | 138 | 138 |
| Endpoint triangles | 900,011 | 900,011 |
| Endpoint texture count | 110 | 110 |

All 600 gust/push pairs match the published sampler exactly (SHA-256 `d317d21afa40d5b3ec56866b945de5c67a7a78c77b6fb4184304dcdfea9f9271`). The source-generated gust field matches the native texture. Native/before/after endpoint pixels are identical.

[Machine-readable receipt](../../proofs/wind-sampler-wrap/report.json), [native control](../../proofs/wind-sampler-wrap/native.png), [before](../../proofs/wind-sampler-wrap/before.png), [after](../../proofs/wind-sampler-wrap/after.png).

Validation: 33 targeted tests pass across wind sampling, grass, foliage and leaf-burst idle coverage; production build passes.

The unchanged-source negative control also ran against the published build (`--candidate-ref 421d34b`): it correctly fails the work-reduction gate, retaining 600 reader expressions and 9,600 remainders while matching all values and pixels. [Negative-control receipt](../../proofs/wind-sampler-wrap/unchanged-source-control.json).
