# Apply drag when a bow muzzle starts underwater

A downward aim while wading can put the visible arrow tip below the surface before release. The projectile code only recognizes an above-to-below surface crossing, so that arrow never becomes wet and continues at air speed.

Check the launch position once on the first advancing update. If already submerged, use the existing water gravity/drag and floating transition without emitting a fictitious surface-entry splash. Air launches and real surface crossings retain their existing behavior. No bow geometry, pose, camera, UI or sound assets change.

## Published native repro

```sh
node tools/repro-live-submerged-arrow.mjs --out live-submerged-arrow-proof
```

The tool defaults to https://ael-dev3.github.io/Tervain/. On 0.0.18 · 421d34b it finds a shore position, uses the native player pose/release and projectile pool, and runs the actual hunting collision sweep. Only the candidate projectile-update method is borrowed from source.

At the sampled position near (-298, 0), the player is legally wading at 1.234 m depth, not swimming; the downward-aimed visible muzzle is 0.266 m underwater. After one 1/120 s collision-checked step:

| Measurement | Before | After |
| --- | ---: | ---: |
| Recognized as wet | No | Yes |
| Arrow speed | 65.058 m/s | 60.317 m/s |
| Scenery impacts | 0 | 0 |
| Surface-entry splashes | 0 | 0 |
| Bed clearance | 0.567 m | 0.567 m |

[Native receipt](../../proofs/submerged-arrow/native/report.json). This directly drives the native pose/release and update; it is not a complete input-command sequence or candidate-world replay. Terrain `walkable` is not used to reject the fixture: the native player permits wading beyond that terrain-only deep-water cutoff, and its own travel rule is asserted.

## Deterministic controls and diagrams

```sh
node tools/repro-submerged-arrow.mjs submerged-arrow-proof
npx vitest run tests/presentation/huntingArrow.test.ts tests/presentation/waterSurfaces.test.ts
npm run build
```

Actual source classes run for 0.5 s at 30, 60 and 120 Hz in a controlled pond with no solid impacts. Submerged shots travel 31.869 m forward before, remaining full-speed flights; after they travel 7.232 m forward and enter the existing floating state. No entry splash is emitted in either case. Ordinary air, dry-position and real surface-entry control paths match exactly before/after at each cadence.

[Compiled receipt](../../proofs/submerged-arrow/report.json), [complete paths](../../proofs/submerged-arrow/traces.json.gz), software-WebGL trajectory diagrams [before](../../proofs/submerged-arrow/before.png) / [after](../../proofs/submerged-arrow/after.png). The grid is the diagnostic water plane, with the flight path and endpoint marked; these are not full-game visual approval clips.

The new regression fails on the baseline; all 21 projectile/water tests and production build pass. No hardware timing/FPS result, night/mud lighting fix or general bow-clipping fix is claimed. Hardware play gate remains required before shipping.
