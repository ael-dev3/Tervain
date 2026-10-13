# Distant loose-prop contact casts

Player support, ceilings and restored movement perform direct Rapier shape casts against every loose prop. Direct casts are important because a restored body can move before the broad phase's next step. They still ran for every prop when the player was far away.

Reject only props outside a conservative swept bound. Read each collider's current position and actual shape, including replaced shapes. Rotation-independent primitive radii enclose the query and target. Include float32 rounding slack; unfamiliar shapes keep the exact cast. Existing rock rejection and hit ordering stay unchanged. Reuse a position already read for an accepted hit.

Run `node tools/repro-prop-cast-bounds.mjs report.json`. It loads baseline `0b45a36` and this branch's actual contact method against the same real Rapier world. Queries cover authored prop placements and terrain coordinates, plus restored/rotated cuboids, cylinders and balls, unknown target/query shapes and a confirmed float32 overlap at large coordinates.

[Receipt](prop-cast-proof/report.json): 1,054 exactly equal results, including 143 hits, normals and witness points. Prop shape casts **9,486 → 268** (97.2% fewer). This counts calls to the exact narrow-phase API, not heap bytes or hardware frames.

Uninstrumented timing commands:

- `node tools/repro-prop-cast-bounds.mjs timings.json --timings`
- Add `--near` for queries above the authored props.
- Add `--clustered` for an overlapping-prop stress case where every exact cast is still needed.

The nine alternating pairs discard their first pair. These are component workloads, not real-play or Mac frame times.

| Corpus | Queries per batch | Before median ms | After median ms |
| --- | ---: | ---: | ---: |
| [Terrain grid and authored props](prop-cast-proof/timings.json) | 14,320 | 363.841 | 32.634 |
| [Near authored props](prop-cast-proof/near-timings.json) | 10,800 | 206.865 | 75.239 |
| [Overlapping-prop stress](prop-cast-proof/clustered-timings.json) | 10,000 | 296.877 | 310.796 |

The dense stress case regresses about 4.7%, or 0.0014 ms per query, because bounds add work without rejecting any cast. The authored grid and near-prop batches improve about 91% and 64%. Hardware gate evidence is still needed to assess real play. These results do not establish the cause of historical bow/window stalls.

Validation: 35 physics/rock tests, including current-shape support immediately after restore, production build and the numerical before/after repro. No rendering, animation or visual changes. Tracked live GPU evidence: [LATEST.md](LATEST.md).
