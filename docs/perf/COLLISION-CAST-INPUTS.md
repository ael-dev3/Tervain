# Swept collision input copies

Published baseline: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/). The remaining turn/frame-pacing item is tracked in [#326](https://github.com/ael-dev3/Tervain/issues/326); `LATEST.md` still records the older `live16` GPU gate.

Every `Colliders.cast` first copied the nearby scenery and extra actor/support contacts into a joined array before testing them. Iterate the two inputs by index instead. The spatial-grid query still runs once, custom `near` overrides remain effective, and scenery precedes extra contacts so equal-hit ordering is preserved. Hit geometry, ignore-by-ID/identity, height and support filters are unchanged. No scratch storage is shared between queries.

```sh
node tools/repro-collision-cast-inputs.mjs --baseline 421d34b --out collision-cast-input-proof
npx vitest run tests/world/colliders.test.ts tests/presentation/playerMotion.test.ts
npm run build
```

The production-method fixture runs 6,000 observed custom-near queries with 12 scenery and three actor/support contacts, plus 1,000 ordinary spatial-grid queries. The joined-array observer excludes the existing scenery and extra input arrays.

- Joined input arrays: **6,000 → 0**; copied references: **90,000 → 0**.
- All 7,000 query results have identical hashes (3,190 hits), including collider identity labels, times, positions and normals.
- Native Grade/4×MSAA RGB: **0 changed channels**. Geometry and hit-marker submissions remain 17 draws, 148 triangles and 44 points. WebGL error is zero.
- All 72 collision/player-motion tests and the production build pass. The added regression covers a custom `near` implementation, equal-hit precedence, identity ignores and group ignores with actor extras.

[Receipt](proofs/collision-cast-inputs/report.json) · [before](proofs/collision-cast-inputs/before.png) · [after](proofs/collision-cast-inputs/after.png).

Counts cover joined input arrays only, not the existing `near` query, result records or total heap allocation. This demonstrates a removable repeated query cost, not the cause of the older missed refreshes or an M5 hardware improvement.

## Published-world movement and turn sample

```sh
node tools/measure-live-cast-inputs.mjs --url https://ael-dev3.github.io/Tervain/ --expect before --out published.json
node tools/measure-live-cast-inputs.mjs --url <candidate-build-url> --expect after --out candidate.json
```

The full-world probes execute native fixed steps, real movement keys and follow-camera turns, with drawing frozen. Each stage advances 90 synthetic 60 Hz steps at a `live16` lead position. These are position samples, not replays of the original GPU gate route.

| Position / action | Casts before / after | Joined arrays before / after | References copied before / after |
| --- | ---: | ---: | ---: |
| Fence (−2, 37), walk and turn | 212 / 212 | 212 / 0 | 6,344 / 0 |
| Run-round (−12.3, 44.8), run and turn | 228 / 228 | 228 / 0 | 8,654 / 0 |

Final player coordinates match exactly for both stages. [Published 421d34b receipt](proofs/collision-cast-inputs/published.json) · [compiled df11c4682 receipt](proofs/collision-cast-inputs/candidate.json). The observer identifies joined arrays by input-reference identity; diagnostic wrapper allocations are separate and excluded. Removing these 440 arrays/14,998 copied references establishes a real movement-path workload reduction, not a measured improvement in hardware frame time, GC pauses or GPU cost.
