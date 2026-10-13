# Cache authored shared-goal rosters

Each shared conversation/office placement query scanned all authored resident schedules, allocated temporary schedule/roster arrays and sorted the same peer list. The roster depends on authored content, not current collision clearance, hour or availability. Cache that sorted roster per anchor; continue calculating stances against current terrain, body height and colliders. Availability/facing logic remains separate and unchanged.

## Before/after proof

The reusable script invokes the production placement function and the baseline source (`0b45a36`) on 1,000 queries alternating the village square and quarry office, with several body heights. These use the actual authored resident definitions, a controlled flat ground and the real collider implementation.

| Measurement | Before | After |
| --- | ---: | ---: |
| Authored roster scans | 1,000 | 2 |
| Array sorts during queries | 1,000 | 2 |
| Different returned positions/yaws/companion lists | — | 0 |

Both anchors build their roster once. The control adds a blocker at the selected stance after warming the cache: both versions choose the same new clear stance. Removing a blocker restores the original stance in the regression test. Placement results are not cached.

[Receipt with source hash](npc-roster-proof/report.json). Re-run:

```sh
node tools/repro-npc-goal-roster.mjs --out npc-roster-proof.json
npx vitest run tests/presentation/npcMovement.test.ts tests/presentation/residentBehaviour.test.ts
npm run build
```

The script imports both source versions through Vite without switching the checkout, compares complete serialized numerical outputs and reports work counts. Twenty-five movement/behavior tests, typecheck and build pass.

## Limits

This removes repeated metadata work, not all placement work. Terrain checks, live collision tests, offset generation and companion-facing logic still run. The controlled repro is not hardware frame timing or a full-world gate, and does not establish that this alone caused the tracked 32 ms frames. No geometry, materials, animation, menus or rendered output changes; numerical placement equivalence and live-clearance controls verify this cache.
