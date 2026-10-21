# Bound resident surface preparation bursts

Candidate `4b6b4ed190fd97c8345397bfb5106cc5eedc5c06`, published baseline **0.0.37 · 635d63d**. The actual App.step walk-fence/run-round probe observed approximately 0.8 ms per world update, not the historic 33 ms hardware frame. Its sampling profile also caught background resident preparation. The surface generator claims a 3 ms work budget but calls a whole synchronous 65,659-vertex weld and copies whole vertex/index/normal/skin buffers before its next suspension. [Published actual-step spans](live-route-profile.json), [sampling profile](live-cpu-profile.json). Scripted held-key state, real physics/actors/world modules; rendering suppressed. Nested spans are inclusive, and background preparation samples are not attributed as synchronous App.step cost.

The change adds a resumable exact-weld path (including hash-collision checks) and suspensions inside those buffer copies. The existing synchronous weld is unchanged. Hashing, encounter order, numeric operations, triangle tests, attributes, shading and final buffers stay the same. This addresses a real one-time arrival preparation burst; it does **not establish the cause or resolution of live16's missed refreshes**.

## CPU fixture evidence and tradeoff

Two shipped models, three repeated original/candidate/unchanged-original-control sequences with rotating order. Raw steps and exact output hashes in [paired-cpu.json](paired-cpu.json). Every completed mask matches byte for byte, including 31,396 hidden vertices on the larger model and 360 on the other. These are CPU fixture timings, not GPU, Apple hardware, frame pacing or an assertion that every resume finishes below 3 ms.

| Model | Repeat | Total ms original / candidate / control | Worst resume ms original / candidate / control |
| --- | ---: | ---: | ---: |
| rillford-reeve | 1 | 96.90 / 92.08 / 66.56 | 18.36 / 5.32 / 4.35 |
| ash-recorder | 1 | 22.47 / 36.55 / 23.28 | 4.00 / 3.11 / 4.34 |
| rillford-reeve | 2 | 66.51 / 74.44 / 51.35 | 5.89 / 4.68 / 4.54 |
| ash-recorder | 2 | 16.94 / 28.61 / 17.73 | 3.02 / 3.06 / 3.03 |
| rillford-reeve | 3 | 43.73 / 49.96 / 46.13 | 3.25 / 3.28 / 3.73 |
| ash-recorder | 3 | 16.25 / 17.75 / 16.15 | 3.01 / 3.02 / 3.03 |

In the first cold larger-model pair the worst resume falls from 18.36 to 5.32 ms; warmed runs approach the existing 3 ms grid/ray budget. Candidate still has occasional 4–5 ms slices. Resumption/bookkeeping can **increase total one-time CPU**: retain all three runs and unchanged controls above. This is a latency tradeoff, not a throughput/heat win. The builder already consumes multiple generator resumes until its per-frame budget expires; this does not schedule a whole animation frame per yield. After residents are prepared, the changed code performs no per-frame work.

The regression witnesses 25,663 position reads in one old-code resume (limit 2,048), then passes after the repair. A second test uses distinct double positions with the same Float32 hash to ensure collision-bucket searches yield too; interleaved welds preserve results. [Old failure](old-regression.txt). 25 focused resident tests and production build pass.

## Native same-scene proof

Actual original/candidate functions run with the world's actual preparation inputs and axes; mask bits are checked before installation. 4 preparations match, 3 installed native mask attributes are controlled. This is the observed native subset, not a claim that all roles finished loading. The harness runs original preparation additionally during loading only; no native timing claim is made from that diagnostic world. Five fixed High poses, two repeats/mode: 20 PNGs are RGB-identical by Sharp and independent Pillow decode. [Raw mask/native results](native.json), [pixel hashes](independent-pixels.json).

| Pose | Draws original / candidate | Triangles original / candidate | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| fence | 644 / 644 | 7,170,911 / 7,170,911 | 0 |
| run-round | 240 / 240 | 2,291,711 / 2,291,711 | 0 |
| bow | 707 / 707 | 7,936,955 / 7,936,955 | 0 |
| birch | 436 / 436 | 5,641,032 / 5,641,032 | 0 |
| sea | 137 / 137 | 778,895 / 778,895 | 0 |

Shader code, texture taps, geometry, final per-frame allocations/uploads and rendering submissions are unchanged. [Fence before](fence-before-0.png) / [after](fence-after-0.png); [run-round before](run-round-before-0.png) / [after](run-round-after-0.png). Independent full-session image identity is not claimed.

Reproduce from the candidate checkout with dependencies and headless Chrome configured: `node tools/profile-live-routes.mjs [build-url] [output-directory]`; `node tools/repro-resident-preparation-cpu.mjs [output-directory]`; `node tools/repro-resident-slices-native.mjs [output-directory]`. CPU driver writes/removes only its own generated test, leaving raw baseline modules/report under the output directory. Native proof uses Vite and pinned original Git sources. Compiled unmodified exact-head budget is supplied separately.
## Rebased compiled receipt

Current candidate `bd0ac2518fa1cf42bab41dae68b40099463cac44`, rebased onto **0.0.38 · cacffa0**. The preparation runtime files are byte-identical to captured `4b6b4ed190fd97c8345397bfb5106cc5eedc5c06`; the native source-paired host above remains 0.0.37. No independent-session pixel identity on the new furniture release is claimed. 25 focused tests and build pass again. The incomplete old-base gate was discarded when Pages changed revisions. [Unmodified current-head compiled budget](budget.txt): live 285 draws / 3,046,047 triangles / 0 errors; candidate 285 / 3,046,047 / 0. No sampler or allowance changes.

The fixed run-round illustration uses the legacy camera coordinates, now inside a building; it is not a new real-play route clip. The actual CPU route report separately records start/end positions and uses scripted held-key state. Instrumented full-step CPU on 0.0.37: walk-fence average 5.64 ms, p95 9.0, max 17.7; run-round average 4.84, p95 7.3, max 12.4. These diagnostic simulation timings exclude rendering and are not hardware frame times.
