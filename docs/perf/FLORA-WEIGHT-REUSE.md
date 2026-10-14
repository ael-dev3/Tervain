# Reuse fixed tree detail weights

At High quality, ordinary trees always use the same `[1,0,0]` detail weights. Each lookup nevertheless allocated that array, and the forest copied it before reading it. Camera movement or rotation refreshes the forest immediately, repeating this for visible trees.

Return one frozen tuple for High and read weight tuples directly. Forced-detail inspection builds its tuple once per forest instead of once per tree per refresh. Shrub fades and changing Medium/Low weights retain their existing calculations and values. No geometry, distance bands, culling or shaders change.

## Source proof

The original and changed functions agree on **118,827** comparisons: all nine species, three presets and quarter-metre distances from 0 through 1,100 metres. For 120,000 High-quality non-shrub calls, distinct returned arrays fall **120,000 → 1**. The consumer's redundant spread copy is also removed. This measures returned object identities, not JavaScript heap bytes, GC pauses or frame times.

[Weight receipt](proofs/flora-weight-reuse/weights.json).

```sh
node tools/repro-flora-weight-reuse.mjs --baseline 5da2776 --out flora-weight-proof
node tools/repro-flora-weight-render.mjs --baseline 5da2776 --out flora-weight-render-proof
npx vitest run tests/presentation/foliageEngine.test.ts tests/presentation/pineForestIntegration.test.ts tests/presentation/distanceVisibility.test.ts --testTimeout=90000
npm run build
```

Thirty-five foliage/pine/distance tests pass, including forced detail levels. The production build passes.

## Native rendering control

The source-backed software-WebGL fixture uses delivered solitary-pine models plus the procedural broadleaf catalog and five camera movements at High. The original forest loads the original weight provider; the candidate loads the changed provider. The final RGB images are identical. Both retain **62 calls, 1,612,531 triangles, 19,676 warm-frame source upload bytes, 24 textures and 85,263,368 nominal texture-image payload bytes**. Initial source uploads are 69,841,706 bytes in both. Every draw reports zero WebGL errors.

[Native receipt](proofs/flora-weight-reuse/render.json) · [Original](proofs/flora-weight-reuse/baseline.png) · [Changed](proofs/flora-weight-reuse/candidate.png).

This control verifies the allocation-oriented change leaves rendered output and GPU counters unchanged. It is not the full shipped asset catalog or a hardware performance gate. Texture estimates exclude framebuffer/depth storage and driver overhead; uploads exclude uniforms. Other forest refresh allocations remain outside this change.
