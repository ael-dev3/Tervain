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
