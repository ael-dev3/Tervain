# Forest reflection swap records

Camera movement can refresh the sea's reflection every frame. Each capture temporarily substitutes middle-model forest geometry, including the leaves' depth twins, and restores the original geometry afterwards. Previously every substitution created another two-element restoration array on every capture.

Retain restoration records in reusable frames owned by the forest. A separate frame handles each simultaneously active capture, preserving nested restoration. Repeated/stale callbacks cannot restore a later capture that reused the frame; disposal releases the saved references. Geometry choices, culling, instance packing, materials, upload decisions and capture cadence stay the same. One release closure per capture remains; this is not a claim of zero total allocation.

## Reproduce

```sh
node tools/repro-reflection-swap-records.mjs --baseline 421d34b --out reflection-swap-proof
npx vitest run tests/presentation/foliageEngine.test.ts tests/presentation/solitaryPine.test.ts tests/presentation/distanceVisibility.test.ts
npm run build
```

The fixture runs actual baseline/current forest sources with delivered pine templates and procedural broadleaf templates. It observes restoration-pair identities for 120 captures, checks original geometry is restored after each, then renders six native capture-proxy directions and the primary view. It uses production packing/proxy logic and compares full RGB images and renderer counters. It is not the complete delivered broadleaf world or a hardware timing test.

| 120 captures with 40 swapped meshes | Before | After |
| --- | ---: | ---: |
| Restoration-pair identities | 4,800 | 40 |
| RGB channels changed across seven views | — | 0 |
| Nominal texture image/mip payload | 85,263,368 B | 85,263,368 B |
| Initial proxy source uploads | 2,797,440 B | 2,797,440 B |

Draw calls and triangle counts match in every paired view; later uploads are zero in both versions. All draws pass GL-error checks. The forty records include cold construction; the next 119 captures reuse them. Warm repeated calls allocate no additional swap records. These are allocation-site identity counts, not a total heap or frame-time measurement.

25 foliage/pine/distance tests pass, including nested restoration, repeated callbacks and stale callbacks after reuse. The production build passes.

[Receipt](proofs/reflection-swap-records/report.json) · [Before capture](proofs/reflection-swap-records/before-capture.png) · [After capture](proofs/reflection-swap-records/after-capture.png) · [Before primary](proofs/reflection-swap-records/before-primary.png) · [After primary](proofs/reflection-swap-records/after-primary.png).

Published baseline: https://ael-dev3.github.io/Tervain/ (0.0.18 · 421d34b). Hardware gains remain unverified.
