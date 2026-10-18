# Grass capture lighting focus

The shared grass phase helper passed `player.group.position` to `SkyRig.update`. That container stays at the scene origin; the physical player moves through `player.x/y/z`. The sky uses the supplied focus to position its light targets, shadow frustum and dome. Captures could therefore freeze lighting around the origin while measuring grass elsewhere.

Use a separate vector populated with the physical player position. Preserve the stationary container and avoid aliasing the focus of a previous capture.

## Before / after

[Deterministic receipt](proofs/grass-phase-focus/contract.json), against the helper in published 0.0.22 · d40777b:

| Physical player | Previous focus error | Corrected focus error |
| --- | ---: | ---: |
| (-2, 1.176, 35) | 35.077 m | 0 m |
| (-7, 1, 45) | 45.552 m | 0 m |
| (-268, 2, 27) | 269.364 m | 0 m |

Reproduce from the repository root:

```sh
node tools/repro-grass-phase-focus.mjs
npx vitest run tests/tooling/grassPhaseControls.test.ts
```

The new regression test also moves the player between calls and checks that neither the origin container nor the previous focus vector changes.

This is a capture-tool correction, not a game lighting change. The receipt verifies the argument supplied to the real sky API; it does not render the shadow-map snap or establish a visual improvement. Existing within-pair shader comparisons remain useful for their tested conditions, but their strict-white counts do not establish live grass clearance. Re-record gameplay evidence with corrected focus, refreshed shadow maps, normal follow-camera motion and the intended viewport density. Hardware pacing remains a separate gate.
