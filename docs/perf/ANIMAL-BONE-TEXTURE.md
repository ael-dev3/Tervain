# Wildlife bone-texture padding

Baseline: published **0.0.23 · 670b96d**, High. All nineteen wildlife rigs have 29 bones.
Three allocates a square 12×12 RGBA32F bone texture (2,304 bytes), but 29 matrices
occupy 116 texels. Ten rows at the same width contain all 116 texels; the last two
rows are never addressed. `getBoneMatrix` uses `textureSize(boneTexture, 0).x` and
four integer `texelFetch` operations, so retaining the width retains every fetch
address. Trimming only bottom rows changes neither matrices nor shaders.

The patch trims textures at creation/rebuild, retaining Three's ordinary animation,
update, dirtying and upload paths. It adds no per-frame comparison, callback or
allocation. The subarray retains the original CPU backing allocation; this is a GPU
texel-storage/API-upload reduction, **not a JavaScript heap saving**.

## Paired moving-pose renderer check

The reusable probe applies the actual production helper to separate texture controls
on the published native rigs. It rotates each head bone, updates world matrices,
and checks every active matrix word for all nineteen animals in each A/B pair.
Normal and compact textures remain allocated for both modes, avoiding allocation
inside timed intervals. The extra retained controls are probe overhead, not a
production texture-count increase.

Each of three independent runs has 120 warm pairs followed by 120 measured pairs,
with balanced A/B order. No samples/runs were discarded. CPU uses Chromium's renderer
thread clock, with native raster draw entrypoints suppressed from page creation;
matrices, callbacks, GL texture uploads and intended draw counters still execute.
It excludes simulation, GPU waits and native raster draw-driver CPU. These are
software-renderer measurements, **not Mac FPS, GPU time or heat measurements**.

| Cost | Normal | Compact | Delta |
| --- | ---: | ---: | ---: |
| Bone texture dimensions | 12×12 | 12×10 | width unchanged |
| Bone texture bytes/rig | 2,304 | 1,920 | −16.7% |
| Texel storage, nineteen rigs, excluding driver overhead | 43,776 B | 36,480 B | −7,296 B |
| Measured wildlife uploads/frame | 14 | 14 | 0 |
| Measured wildlife upload bytes/frame | 32,256 | 26,880 | −5,376 B (−16.7%) |
| Max intended draws in paired forest replay | 406 | 406 | 0 |
| Max intended triangles in paired forest replay | 3,317,406 | 3,317,406 | 0 |
| Retained A/B probe texture count | 288 | 288 | 0 |
| Bone-matrix texture fetches/vertex | 4 | 4 | 0 |
| Added per-frame JS calls / allocations | 0 / 0 | 0 / 0 | 0 |
| Pooled renderer CPU average, 360 pairs | 3.792 ms | 3.833 ms | +0.041 ms |
| Pooled renderer CPU p95 | 5.586 ms | 5.601 ms | +0.015 ms |

This is not a CPU-speed improvement. The raw timing results are retained below,
including run 2's worse p95; the deterministic improvement is smaller texture payload.

| Run | Average normal → compact (ms) | p95 normal → compact (ms) |
| --- | ---: | ---: |
| 1 | 3.846 → 3.856 | 5.147 → 4.899 |
| 2 | 3.522 → 3.560 | 5.374 → 6.365 |
| 3 | 4.009 → 4.083 | 5.782 → 5.500 |

Raw [run 1](proofs/animal-bone-texture/cpu-run-1.json),
[run 2](proofs/animal-bone-texture/cpu-run-2.json),
[run 3](proofs/animal-bone-texture/cpu-run-3.json),
[pooled calculation](proofs/animal-bone-texture/cpu-pooled.json).

## Native animated-pose image proof

[Native report](proofs/animal-bone-texture/native.json): five close cat head poses,
native High post/MSAA4, rasterization enabled, shadow maps refreshed. Every A/B
pose has **zero changed RGB pixels** and bit-identical active matrices for all
nineteen wildlife rigs. First-to-last posed image changes 394 pixels, and every
pose has a different matrix hash: this is not an accidentally frozen control.
A further changed-pose assertion still uploads thirteen visible/shadowed skeletons.

Each pose submits 311 draws / 2,626,088 triangles in both modes. Its thirteen
wildlife uploads total 29,952 → 24,960 bytes. The first A/B pair initializes the
extra control textures (texture counter 275 → 288); subsequent pairs retain both
sets at 288. This is temporary probe overhead; the production patch replaces no
texture and creates no additional texture object.

[Before stepped-pose clip](proofs/animal-bone-texture/before.mp4) ·
[After stepped-pose clip](proofs/animal-bone-texture/after.mp4) ·
[Before first pose](proofs/animal-bone-texture/pose-0-before.png) ·
[After first pose](proofs/animal-bone-texture/pose-0-after.png).
The clips show five captured poses at two poses/second, not a real-time FPS replay.
All ten full-resolution PNGs are alongside the report.

Tests: 39 targeted tests pass, including bone-count/texture-row boundaries,
animated matrices through the last bone, existing textures, and texture rebuilds.
Production type-check and build pass. The exact-head deterministic gate receipt
is posted separately on the pull request after the final source/proof commit.

## Reproduction

Use a supported Chromium executable via `CHROME`. Native image proof runs with
rasterization enabled; never preload CPU suppression for image checks:

```sh
node tools/repro-animal-bone-texture.mjs --out artifacts/animal-bone-pixels
REPRO_INIT_FILE=tools/repro-renderer-cpu-init.js node tools/repro-animal-bone-texture.mjs --cpu true --out artifacts/animal-bone-cpu
npx vitest run tests/presentation/animalBoneTexture.test.ts tests/presentation/animals.test.ts tests/presentation/animalConstruction.test.ts tests/presentation/npcSkinning.test.ts
npm run build
```

The baseline URL defaults to the published Pages build. The A/B setup expects native
square wildlife textures; use a baseline build without this patch after it ships.
