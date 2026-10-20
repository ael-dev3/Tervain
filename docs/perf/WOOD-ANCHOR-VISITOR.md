# Reuse the nearest-wood visitor

Canopy construction and leaf-island repair repeatedly ask `woodAnchor` for the nearest wood triangle. On published 0.0.18 · 421d34b, that helper creates a recursive visitor inside every query. The change creates it once per wood index, resetting the query inputs, distance limit and found flag for each call. Triangle storage and scratch vectors were already reused per index.

No traversal order, pruning, distance arithmetic, tie handling, reach limit or hit output changes. No canopy appearance or geometry changes are intended; this does not claim to fix floating leaf islands.

## Native-input replay

```sh
node tools/repro-live-wood-anchor.mjs --out wood-anchor-proof
npx vitest run tests/presentation/canopy.test.ts tests/presentation/leafIslands.test.ts
npm run build
```

The repro defaults to https://ael-dev3.github.io/Tervain/. It obtains all unique nonempty wood/leaf geometry pairs across the published Low forest's retained LOD targets, then runs both actual source implementations on evenly strided leaf vertices at reach limits 0.01 m, 0.75 m and unlimited. Misses must preserve a supplied hit sentinel. Instrumentation counts visitor declaration evaluations, visited nodes and exact triangle tests; it does not measure heap bytes or hardware timings.

| Measurement | Baseline | Candidate |
| --- | ---: | ---: |
| Native geometry pairs | 57 | 57 |
| Nearest-wood queries | 45,612 | 45,612 |
| Visitor creations | 45,612 | 57 |
| Node visits | 1,442,072 | 1,442,072 |
| Triangle tests | 269,063 | 269,063 |

Every full distance/hit-coordinate hash matches, including bounded-search misses. [Complete per-pair receipt](../../proofs/wood-anchor-visitor/report.json).

This is replay of sampled native inputs, not a count of every query during a real world load, a whole-scene performance trace, or proof of an FPS improvement. It changes CPU query setup only: no draw, triangle, texture or upload budget changes. There is no changed visual behavior to illustrate with a screenshot. The existing canopy and leaf-island tests and production build validate integration; hardware play gate remains required before shipping.
