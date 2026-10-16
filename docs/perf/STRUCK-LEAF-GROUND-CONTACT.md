# Keep landed struck leaves above terrain

Target: [published 0.0.18](https://ael-dev3.github.io/Tervain/), revision `421d34b`, native oak `tree:wild:40:42`.

Leaves knocked loose by a tree strike landed by clamping their centre to terrain + 3 cm. Their folded geometry was still tilted while settling, so a vertex could be below the surface despite a valid centre height. Slopes also exposed this after landing.

Seat each changed landed pose using its actual transformed vertices, retaining the existing centre-height minimum and the 12 mm vertex clearance already used for ordinary falling leaves. Recompute as the leaf settles or shrinks, so it can lower back toward the ground. Cache support for unchanged settled/held poses. Airborne physics, spin, scale, lifetime and pool counts stay unchanged.

## Reproduce

```sh
node tools/repro-live-struck-leaf-contact.mjs --out struck-leaf-contact-proof
node tools/repro-live-struck-leaf-contact.mjs --candidate-ref 421d34b --images 0 --out struck-leaf-contact-control
```

The candidate must pass; the unchanged-source control must fail. The script invokes the native forest strike API, records its release arguments, and replays that exact release with the original/candidate leaf pools. Every baseline instance matrix must match the published pool throughout the accelerated fixed-step simulation. Every airborne candidate matrix must remain identical to the baseline.

Measure actual transformed geometry vertices after landing against native terrain. Record penetration counts, worst gap, pool lifetime and terrain queries. A 120-update held-pose check must add no terrain queries. The slope unit regression fails on the baseline with a vertex 35.8 mm below ground.

Images isolate the worst landed contact against native terrain using native post rendering; forest and grass groups are hidden equally for inspection. This is a close contact inspection, not a player-camera route or a hardware frame-time run.

## Evidence

[Passing receipt](proofs/struck-leaf-ground-contact/report.json) · [unchanged-source control: FAIL](proofs/struck-leaf-ground-contact/control.json).

The native strike releases six leaves. Across 1,475 simulated updates:

| Measure | Before | After |
| --- | ---: | ---: |
| Landed vertex observations | 7,200 | 7,200 |
| Penetrating observations | 37 | 0 |
| Minimum vertex clearance | -43.8 mm | 12.0 mm (within float precision) |
| Terrain queries | 6,286 | 8,836 |
| Extra queries during 120 held-pose updates | 0 | 0 |

All 6,280 airborne matrices match exactly. Active counts, draw prefixes and expiry match the native pool throughout; both finish empty. The support correction adds **2,550 terrain queries across 24.6 simulated seconds**, only as landed poses/size change. Held poses reuse the support.

[Before contact inspection](proofs/struck-leaf-ground-contact/before.png) · [after](proofs/struck-leaf-ground-contact/after.png). The pair differs in 13,068 channels, restoring the clipped lower part of the leaf. Both retain 113 draws / 763,199 triangles; source geometry matches the native pool.

48 affected foliage, bark, pine-integration and forest-floor tests pass; production build passes. The relocated slope regression also passes independently after failing on the baseline.

## Limits

This checks landed vertices, not full triangle/terrain intersections or airborne edge contact. Terrain support adds sampling work when the landed pose changes; cached unchanged poses avoid repeat queries. Hardware/play-gate receipt remains pending. Geometry and materials are unchanged; this does not close canopy quality or grass shimmer.
