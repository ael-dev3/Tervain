# Retain cleared slots in the struck-tree leaf pool

On published 0.0.18 · 421d34b, one native tree strike releases four leaves, but each of the following thirty 1/60 s forest updates writes all 48 instance matrices: 1,440 writes for 120 living poses. [Published baseline receipt](../../proofs/struck-slots/live-baseline.json).

Inactive slots are already zero. The change clears initially unused slots on the first presentation, then retains those matrices. A leaf that expires is still cleared immediately; releases still reuse free slots normally. Simulation, draw prefix, upload ranges and transparency sorting are unchanged. This addresses CPU work, not floating crown geometry or grass appearance.

## Repeatable proof

```sh
node tools/repro-live-struck-slots.mjs --out live-struck-slot-proof
node tools/repro-struck-slots.mjs struck-slot-proof
node tools/repro-struck-slots.mjs struck-slot-frozen-proof --frozen-integration
npx vitest run tests/presentation/leafBurstIdle.test.ts
npm run build
```

The live tool defaults to https://ael-dev3.github.io/Tervain/. Use `--url` and `--expect after` against a served candidate to assert one write per living leaf over the same thirty-update window. It drives native forest updates after a strike and counts CPU matrix writes; it does not measure hardware frame times.

The source proof runs both actual implementations with the same deterministic releases for 240 updates, including overlapping ground/air releases, pool saturation, expiry, reuse, paused frames and reduced motion. Nine image pairs include six nonblack views. It compares full matrix storage after every update, plus active/draw state, attribute versions/ranges, sorting bounds, terrain queries and rendered draw/triangle/upload counters.

| Measurement | Before | After |
| --- | ---: | ---: |
| CPU matrix writes | 10,416 | 3,990 |
| Four-living-leaf control, writes/update | 48 | 4 |
| Terrain height queries | 1,595 | 1,595 |
| Draws across nine captures | 16 | 16 |
| Triangles across nine captures | 1,200 | 1,200 |
| Source upload bytes across captures | 13,136 | 13,136 |

All matrix hashes, other counters, sorting bounds and PNG pixels match, with no WebGL errors. The material uses no textures; texture count remains zero. Uploaded bytes include first-draw initialization but exclude uniform updates. The images are isolated leaf-pool diagnostic views, not full-game screenshots. No hardware FPS gain is asserted.

[Compiled receipt](../../proofs/struck-slots/report.json), [per-update traces](../../proofs/struck-slots/traces.json.gz), [before populated pool](../../proofs/struck-slots/before-61.png), [after](../../proofs/struck-slots/after-61.png).

Four focused tests and production build pass. The new regression fails on the baseline's repeated dead-slot writes and covers zeroed holes with later survivors and their reuse. The [optional integration receipt](../../proofs/struck-slots/frozen-integration-report.json) applies #505's frozen-clock guard to both source versions: 10,224→3,832 writes with the same state/render counters and pixels. It preserves that policy independently of this change. Hardware play gate is still required before shipping.
