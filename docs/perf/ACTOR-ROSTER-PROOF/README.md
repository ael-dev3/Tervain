# Actor roster membership receipt

Source `7b66e8bd9c39e307aa11599b0f15663e8ca23aad` (#722), based on published **0.0.33 b317734**. Only actor roster membership changes in game code: replace a new per-call ID Set plus additions/lookups with a bounded per-contact presence serial. Clear stale marks before rollover. Rendering, geometry, materials and actor interpolation formulas have no source changes.

## Published native reproduction

At player (−33.4,55), 24 real native fixed-step calls with 34 actors each perform **816 Set.add + 816 Set.has** calls on live. Compiled candidate: **0 + 0** for the same workload, zero console errors. Instrumentation is scoped to syncActors and restored afterward. Source-accounted roster-Set constructions 24→0; this is **not a V8 heap-byte/allocation sampling result**, and other allocations remain in synchronization. No CPU timings are taken under these API observers. Both source function hashes and revisions are retained.

`node tools/repro-live-actor-roster.mjs --url BASELINE_URL --head b317734 --out before.json`

`node tools/repro-live-actor-roster.mjs --url CANDIDATE_URL --expect after --head 7b66e8bd9c39e307aa11599b0f15663e8ca23aad --out after.json`

The retained baseline counter was collected with the initial equivalent counter harness before the reusable CLI was added; its native Set observers and warm-up workload are the same. Candidate uses the committed CLI. Both collections suppress raster work and retain no images. These are native game simulation counters, not hardware timing.

## Isolated synchronization timing

Three independent processes, actual Rapier, 32 actors; 12 rotated-order batches per process/mode, 1,000 calls per batch. Two independent baseline A/A worlds and a candidate world; **36,000 calls per mode** pooled below. No Set/API/allocation observers run during timing. Main-thread CPU covers only synchronization plus loop/clock bookkeeping, not rendering or the complete game frame. Elapsed per-call p95 can include scheduling. All raw samples, per-batch CPU and separate process summaries are retained.

| World | Average elapsed ms/sync | P95 elapsed ms/sync | Thread CPU ms/sync incl. bookkeeping |
| --- | ---: | ---: | ---: |
| baseline-a | 0.005927 | 0.006379 | 0.005623 |
| candidate | 0.004728 | 0.005088 | 0.004739 |
| baseline-b | 0.005889 | 0.006399 | 0.006145 |

The candidate is below both controls in every process for p95 and main-thread CPU. This is a small method-level saving (about 0.0012 ms/sync elapsed in this fixture), **not a demonstrated fix for 33 ms frames, Mac FPS or heat**.

Each process also compares the same 240-frame / 7,680-actor-state fixture and a moving crate: exact values for pose, capsule size, enabled/active state and sweep endpoints. It includes variable substeps, teleports, deactivation/reactivation, missing and duplicate IDs, resize, and forced serial rollover. Trace hashes match. These are three repetitions, not 23,040 unique test cases.

`node tools/repro-actor-roster.mjs report.json b317734`

## Native pixels and stock gate

Seven High native post/MSAA4 views at **640×360**, including five standard forest views, a forest turn and sea control. In the compiled candidate world, the original b317734 sync method and actual compiled candidate method receive the same warmed native roster. Actor snapshots and before/inactive/after/restored RGB are exact for all seven poses; independent PNG verification agrees. These are controlled static views; moving physics correctness comes from the Rapier fixture above. No shader/renderer code changes.

Reflection invalidation is requested before every measured render. The first five views have no water capture; the forest turn and sea each perform one actual capture in **every** mode. Do not interpret the zero-capture views as freshly rendered reflections. All per-view GL draw calls and native triangle counters match. Sea is 738 draws / 10,335,587 triangles on every mode; forest turn 314 / 5,114,280. Native source and build fingerprints are in the report. Real raster draws are restored before images; zero console errors. Optional startup raster suppression is not used by the stock gate.

`node docs/perf/ACTOR-ROSTER-PROOF/native-repro.mjs --url CANDIDATE_URL --head 7b66e8bd9c39e307aa11599b0f15663e8ca23aad --out native-pixels`

Exact-head unmodified budget receipt is in budget.log: normal startup, four completed samples per probe, two same-revision live controls, no sampler modifications or triangle allowance. No game renderer/shader/texture-tap changes. This does not measure hardware shader cost or whole-frame CPU.

`play-gate: PASS 7b66e8bd9`

## Tests

Both new regressions fail on old source: the warm roster constructs a Set, and it lacks rollover handling. Candidate passes **25 focused physics tests**, typecheck and production build. The membership test restores the global constructor before assertions/cleanup; it is not a performance timing harness. The rollover case prevents a missing actor from inheriting a reused presence mark. Build/software-WebGL and test-shard CI pass; the receipt check is refreshed after posting the real result.

`npx vitest run tests/actorRosterPresence.test.ts tests/worldPhysics.test.ts tests/presentation/physicsScout103.test.ts`

Repros run from repository root with the pinned baseline object available, Node supporting process.threadCpuUsage for CPU counters, Chrome/software WebGL and existing package dependencies. Public evidence contains no private preview addresses or execution paths. Tree floating clumps and strict-white grass specks remain separate unresolved reports.
