# Reuse shared-goal candidate offset lists

Every shared-goal query rebuilt the same 13 relative candidate offsets for each peer, including intermediate arrays and trigonometric work. The offsets depend only on peer count and sorted peer index. Cache those local lists; recompute world positions, terrain and collision clearance on every query. This is independent of #415's roster cache.

## Production-function before/after

The reusable source A/B calls the actual placement function with authored definitions, controlled flat terrain and the real collider implementation. It alternates two shared anchors over 1,000 queries and varies body height.

| Measurement | Before | After |
| --- | ---: | ---: |
| Candidate offset-list generation batches | 2,000 | 2 |
| Roster scans/sorts (unchanged by this PR) | 1,000 | 1,000 |
| Changed positions/yaws/companion lists | — | 0 |

Both anchors in this fixture have two peers, so the two peer-index lists are shared. A blocker added after warmup still causes the same new clear stance on both versions. The regression test keeps overhead clearance height-sensitive: a short body can stand below a beam; a taller body chooses a different stance, and removing the beam restores the original.

[Receipt and source hash](npc-offset-proof/report.json). Re-run:

```sh
node tools/repro-npc-goal-offsets.mjs --out npc-offset-proof.json
npx vitest run tests/presentation/npcMovement.test.ts tests/presentation/residentBehaviour.test.ts
npm run build
```

Twenty-five movement/behavior tests, typecheck and build pass. The script imports baseline 0b45a36 through Vite without changing the checkout, measures generation calls and compares complete numerical outputs. The cache stores local immutable candidates, not actual stances or clearance results.

This removes repeated preparation work and is not hardware frame-time proof or attribution of the tracked 32 ms frames. No animation, material, geometry, menu or art changes. Full-world/hardware gate remains required.
