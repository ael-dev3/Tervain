# Avoid unchanged fixed-collider backend state reads

On published [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/), both `RealmPhysics.step` and every `traceProjectile` subsegment scan all fixed collider enabled states through Rapier's WebAssembly boundary. Each ballistic segment repeats this scan even when no door or other canonical source changed. The native world in this replay contains 1,178 such colliders.

RealmPhysics owns these fixed colliders and all production writes to their backend enabled flags. The candidate records the enabled value when creating each collider, then compares the authoritative source's `active` flag with that JavaScript value. A change still calls `setEnabled` immediately and adds the collider to the existing direct-query dirty set. Both physics steps and projectile queries use this synchronization. Actual ray-filter/direct-contact enabled checks remain intact; the fixed list is still scanned in JavaScript.

## Published-world before/after

`tools/repro-live-fixed-enabled.mjs` borrows the actual baseline and candidate projectile methods onto the published native physics world. The unmodified published method is an independent control. It runs 80 short ballistic-length segments along x=-2, z=34.6→39.5 with turning directions, then eight active/inactive source states on the authored archive door, before advancing physics.

| Measurement, 88 queries | Published / baseline | Candidate |
| --- | ---: | ---: |
| Fixed colliders | 1,178 | 1,178 |
| Fixed-collider backend enabled reads | 103,678 | 14 |
| Backend enabled writes | 4 | 4 |
| Complete fence-route contact hash | `633d3f16…fde28bca` | same |
| Eight door-state contact results | baseline | exactly equal |
| Native Grade/post pixels after restoration | baseline | identical |

The difference is exactly 1,178 avoided getters per query. All active-door cases hit at the same distance (about 0.05 m from the short ray's start), all inactive cases are clear, and repeated unchanged states add no setters. Source changes therefore still affect the very next query without waiting for the broad phase's next physics step.

The candidate's state fields are seeded from the native backend outside the measured counters because the published instance predates those fields. A normal candidate constructor sets them alongside creating each collider; it does not need these diagnostic seed reads. The script restores source/backend states, dirty-query membership and prototype instrumentation afterward.

Receipts: [JSON](../../proofs/fixed-enabled/report.json), [before](../../proofs/fixed-enabled/before.png), [after](../../proofs/fixed-enabled/after.png).

## Independent regression

The new real-Rapier test constructs 100 distant fixed boxes, runs 120 full physics steps plus 120 clear projectile traces, and counts those boxes' enabled getters. The published baseline makes **24,000 reads**, causing the new assertion to fail. The candidate makes **0**, with all 120 physics steps completed and all projectile queries still clear.

Existing tests cover inactive/reenabled doors across a frame shorter than a fixed step, direct door/cargo contacts, moving actor blockers and restored cargo poses. All **34 physics/projectile tests** and the production build pass.

```sh
node tools/repro-live-fixed-enabled.mjs --url https://ael-dev3.github.io/Tervain/ --out fixed-enabled-proof
npx vitest run tests/presentation/projectileContacts.test.ts tests/worldPhysics.test.ts
npm run build
```

This is a deterministic reduction in backend calls, not a measured hardware frame-time or Apple GPU gain. It does not establish the cause or removal of the historical live16 33 ms spikes, or prove the night/mud hitch gone. Complete candidate-build hardware play-gate evidence remains required. No visual changes are proposed.
