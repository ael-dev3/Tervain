# Cull footprints that cannot reach the grass interaction field

Target: [published 0.0.18](https://ael-dev3.github.io/Tervain/), revision `421d34b`.

The field selected actors globally, then sent them all through each interaction pass. Actors far outside its extent still increased the per-texel loop bound. The earlier shader rejection (#590) avoids their distance calculation, but their loop iterations remain.

Filter each pass's footprint records against the current field bounds after scrolling. Retain edge-crossing footprints with a texel and float-upload margin, preserve the order of included records, and keep the source actor list so actors can enter on later updates. Queued stamps retain their consumption timing; recovery passes still run when all inputs are outside.

## Reproduce

```sh
node tools/repro-live-grass-field-movers.mjs --out grass-field-mover-proof
node tools/repro-live-grass-field-movers.mjs --candidate-ref 42bfaa504 --images 0 --out grass-field-mover-control
```

The candidate must pass; the unchanged-parent control must fail. The baseline is #590, isolating CPU culling from its shader distance rejection. The script also verifies the published original shader and replays native/original, parent and candidate fields across 60 walking updates, a 103-stamp brush burst, field scroll and catch-up. Exact half-float bytes at every update and pass layouts must match. Endpoint fields are bound into the same warmed native post rendering, with auxiliary captures frozen.

A native mover snapshot drives field-size fixtures. A separate controlled fixture checks an edge-crossing footprint and an out-of-field footprint. The High-sized fixture uses 256² / 48 m in the same Low world, not a High scene. Instrumented counter draws report logical loop visits at every texel.

## Evidence

[Passing receipt](proofs/grass-field-movers/report.json) · [unchanged-parent control: FAIL](proofs/grass-field-movers/control.json).

| Diagnostic fixture | Submitted movers before → after | Logical loop visits before → after |
| --- | ---: | ---: |
| Native Low, 64² / 28 m | 32 → 2 | 131,072 → 8,192 |
| Controlled High-sized, 256² / 48 m | 32 → 3 | 2,097,152 → 196,608 |
| Controlled edge contact, 64² / 28 m | 3 → 2 | 12,288 → 8,192 |

All three fixtures have nonempty, bit-identical fields. The edge fixture retains a partially overlapping footprint and drops the distant one.

Across the 60-update replay, submitted mover records fall **1,127 → 167**. All 35 passes, including one scroll, retain their layout and exact all-frame half-float field hash. Native/baseline/candidate endpoint images have **0 changed channels**; all retain 117 draws / 644,502 triangles.

[Native image](proofs/grass-field-movers/native.png) · [before](proofs/grass-field-movers/before.png) · [after](proofs/grass-field-movers/after.png).

23 affected grass tests and production build pass. The new regression retains an edge-crossing footprint, admits a retained actor after scrolling, and prevents an already consumed out-of-field brush stamp from replaying. The unchanged-parent control retains the old counts and correctly fails.

## Limits

Hardware/play-gate verification remains pending. Record and logical loop counts do not establish physical uniform-upload savings, GPU instruction counts, frame times or an M5 FPS gain. Uniform array capacity stays unchanged. Grass density, recovery, footprint shapes and materials are unchanged.
