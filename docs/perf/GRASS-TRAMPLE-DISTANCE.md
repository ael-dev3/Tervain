# Reject distant grass footprints before measuring distance

Target: [published 0.0.18](https://ael-dev3.github.io/Tervain/), revision `421d34b`.

The grass interaction field draws a full-screen pass and evaluates each selected actor/brush footprint at every texel. It measured distance and radial falloff even when a texel was outside the footprint's enclosing box, where its contribution is necessarily zero. Reject those cases before `length(d)` and retain the existing calculation for possible contacts. Accepted movers/stamps already require finite positions and positive radii.

## Reproduce

```sh
node tools/repro-live-grass-trample-distance.mjs --out grass-trample-distance-proof
node tools/repro-live-grass-trample-distance.mjs --candidate-ref 421d34b --images 0 --out grass-trample-distance-control
```

The candidate must pass; the unchanged-source control must fail. The script discovers the published interaction field, verifies its step shader against the baseline, and takes a native mover snapshot near the village. Native/baseline/candidate classes then replay 60 scripted walking updates, including a 103-stamp brush burst, field scroll and catch-up. Every update's half-float field bytes and pass sequence must match.

The endpoint fields are bound into native post rendering for pixel comparisons. Auxiliary captures are held at a common warmed state; this is a controlled scene comparison, not a real-time frame-pacing run.

Separate float diagnostic draws count logical GLSL distance evaluations at every texel using the native mover snapshot. The High-sized fixture uses the repository's 256² / 48 m field specification in the same Low world; it does not rebuild a High scene or measure hardware timings, instructions or power.

## Evidence

[Passing receipt](proofs/grass-trample-distance/report.json) · [unchanged-source control: FAIL](proofs/grass-trample-distance/control.json).

32 native movers were selected. Logical distance calls in one diagnostic interaction pass:

| Field fixture | Before | After |
| --- | ---: | ---: |
| Native Low, 64² / 28 m | 131,072 | 12 |
| Controlled High-sized, 256² / 48 m | 2,097,152 | 72 |

Both fixtures retain nonempty, bit-identical half-float fields. The separate 60-update replay executes 35 passes; native/baseline/candidate pass-sequence and all-frame field hashes match exactly, including the brush burst and scrolling/catch-up. Native endpoint vs baseline/candidate has **0 changed image channels**; all three retain 117 draws / 644,502 triangles.

[Native image](proofs/grass-trample-distance/native.png) · [before](proofs/grass-trample-distance/before.png) · [after](proofs/grass-trample-distance/after.png).

22 affected grass tests and production build pass. The unchanged-source control retains the original counts and correctly fails the work-reduction assertion.

## Limits

Hardware/play-gate verification remains pending. This reduces interaction-shader work without changing field resolution, recovery, footprints, grass density or materials. It does not establish an M5 FPS gain or resolve grass shimmer/foliage shape.
