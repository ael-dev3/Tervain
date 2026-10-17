# Preserve tree-strike motion across the wind-clock wrap

Target: [published 0.0.18](https://ael-dev3.github.io/Tervain/), revision `421d34b`, native oak `tree:wild:40:42`.

The wind clock wraps every 16,384 seconds (4 h 33 m 4 s). Strike selection already computes wrapped ages, but the vertex shader used `t - start` directly and rejected negative ages. A strike just before the wrap therefore lost its remaining three-second response immediately afterward.

Correct negative ages by one clock period, retaining the original arithmetic for ordinary ages. Expire strike slots during world updates after the wind clock advances, so stale timestamps cannot replay on a later cycle. Colour, shadow and floor-plant program keys are refreshed for the shared shader change.

## Reproduce

```sh
node tools/repro-live-foliage-shake-wrap.mjs --out foliage-shake-wrap-proof
node tools/repro-live-foliage-shake-wrap.mjs --candidate-ref 421d34b --images 0 --out foliage-shake-wrap-control
```

The first run must pass and the unchanged-source control must fail. The script loads the published world and uses its actual `forest.strike` method at clock 16383.75, then samples the native oak's wood and leaf vertices at clock 0.25. Time is advanced directly; this reproduces the clock boundary without waiting several hours.

A controlled reference timestamp of -0.25 gives the original shader the same 0.5-second elapsed age without crossing the wrap. Candidate wrapped positions must match that reference exactly and differ from an unstruck tree. This reference timestamp is a diagnostic input, not a stored game timestamp. Actor interaction is disabled consistently across these captures to isolate strike motion.

The expiry check keeps the fresh hit, expires it after three seconds and confirms it stays retired on a later clock cycle. A source guard verifies expiry is wired after the real world's wind update.

## Evidence

[Passing candidate receipt](proofs/foliage-shake-clock-wrap/report.json) · [unchanged-source control: FAIL](proofs/foliage-shake-clock-wrap/control.json).

| Maximum sampled strike displacement | Before wrap fix | After wrap fix | Equivalent-age reference |
| --- | ---: | ---: | ---: |
| Wood (256 vertices) | 0 mm | 72.1 mm | 72.1 mm |
| Leaves (256 vertices) | 0 mm | 85.2 mm | 85.2 mm |

Both candidate wrapped position hashes match the original shader's equivalent-age reference exactly. Ordinary-age reference and unstruck positions also match across the fix. Fresh-hit retention, expiry after its lifetime, and remaining retired on a later cycle all pass; the unchanged-source control fails expiry.

The wrapped before/after images differ in 7,260 channels, restoring the missing response. Candidate wrapped vs reference has **0 changed channels**; the unstruck before/after pair also has **0 changed channels**. All six captures retain 186 draws / 1,166,253 triangles; tree geometry hashes match.

| Capture | Before | After / reference |
| --- | --- | --- |
| Wrapped strike | [missing response](proofs/foliage-shake-clock-wrap/before-wrapped.png) | [restored response](proofs/foliage-shake-clock-wrap/after-wrapped.png) |
| Equivalent age | [reference](proofs/foliage-shake-clock-wrap/before-reference.png) | [candidate](proofs/foliage-shake-clock-wrap/after-reference.png) |
| Unstruck control | [before](proofs/foliage-shake-clock-wrap/before-none.png) | [after](proofs/foliage-shake-clock-wrap/after-none.png) |

47 affected foliage, bark, pine-integration and forest-floor tests pass; production build passes.

## Limits

Software WebGL verifies native GPU positions and full-scene post images. This is a long-session interaction correctness fix, not a hardware frame-rate result, an art change or a fix for canopy shape. Hardware/play-gate verification remains pending.
