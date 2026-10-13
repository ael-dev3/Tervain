# Software WebGL rendering cost receipts

The software gate previously recorded readiness and a screenshot only. Schema 2 adds per-native-frame draw calls, submitted triangles/points/lines, source upload bytes, shadow draw calls, grass instance/triangle/tile totals, pixel ratio, nominal texture storage, heap occupancy and an allocation sampling estimate. The existing CI job runs this same command and uploads its report.

```sh
node tools/software-webgl-check.mjs --url http://127.0.0.1:4173/ --out proof --timeout 240000
node tools/software-webgl-check.mjs --url http://127.0.0.1:4173/ --quality high --out proof-high --timeout 300000
node tools/repro-render-cost-report.mjs docs/perf/render-cost-proof/before.json proof/report.json
```

The replay verifies a built journey in SwiftShader and asserts three complete native renders after assets arrive. Counters begin before application startup, so texture estimates include initial allocation and observed mip generation. Warmup is excluded from frame counters. All shadow, water and postprocessing draws count; `shadowInvocations` may include calls that submit zero shadow draws.

The saved before receipt is the prior smoke schema; it contains no rendering cost measurements. The after receipt demonstrates the new measurements on a later build. **This tooling PR makes no product performance reduction claim, and these receipts are not a same-revision performance comparison.**

[Before report](render-cost-proof/before.json) · [After low report](render-cost-proof/after-low.json)

Limitations:

- These are stationary renders, with simulation frozen. Use gameplay traces as well for streaming, animation, turning and pause/resume.
- Uploaded bytes are source bytes handed to buffer and texture upload calls. Allocation-only null/numeric buffer calls contribute zero. Unit tests cover source offsets, zero-length remainder semantics, mip storage and deletion.
- Texture storage is nominal texel storage for observed uncompressed textures/mips. Driver padding, compressed texture storage and renderbuffers are excluded. This is not measured GPU memory; unknown formats are explicitly counted.
- Heap occupancy is not allocation count. Allocated bytes use Chromium sampling across warmup plus three renders, including diagnostic overhead. Sampling varies and is not a deterministic pass threshold.
- Submitted grass triangles/instances do not measure fragment overdraw. A real GPU can remain fill-rate limited after draw/geometry reductions.
- No software-renderer frame-time number establishes hardware frame pacing, thermal behavior or a 60 fps pass.

## Captured cost leads

Both captures use 640×360 at DPR 1 on the same compiled revision. These are separate preset captures, not before/after optimization results.

| Counter per stationary frame | Low | High |
| --- | ---: | ---: |
| Draw calls, all passes | 142 | 305 |
| Submitted triangles, all passes | 804,575 | 2,837,778 |
| Shadow draw calls | 0 | 146 |
| Upload source bytes | 4,608 | 6,912 |
| Grass instances | 3,838 | 21,507 |
| Grass triangles (field statistic) | 124,578 | 1,294,332 |
| Nominal texture storage | 528,095,032 bytes | 1,295,785,568 bytes |

[High report](render-cost-proof/after-high.json). Grass field statistics are active submissions before camera frustum culling; they do not identify the actual visible grass draws or fragment count. Allocation samples are recorded in each receipt with their limitations.
