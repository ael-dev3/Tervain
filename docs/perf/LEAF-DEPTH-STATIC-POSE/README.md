# Fixed leaf-prepass local matrices

Candidate `31644db58c7ad0df7d0a4caab7d58714b4c12a37`, baseline `635d63d2820e82694ac1dd5b9a5589fb5952699a`. The High forest's colour and shadow meshes already keep their local identity matrices fixed, while the 60 leaf depth-pass twins still recomposed them on scene updates. Tree placement remains in shared instance matrices, shader wind remains active, and parent world transforms still propagate. The fix is only `leafDepth.matrixAutoUpdate = false` at forest construction; it does not freeze world matrices or change the reusable prepass helper's generic contract.

## Render proof

One frozen High world, 640×360 DPR1, actual native post/MSAA/water and shadow rendering. The two modes toggle only that exact local-matrix flag. Six poses, two repeats per mode: 24 PNGs match RGB exactly, independently decoded with Sharp and Pillow. This is a source-paired same-scene proof, not independently loaded full-world determinism. [Raw report](report.json), [independent RGB hashes](independent-pixels.json).

| Pose | Draws before / after | Triangles before / after | Depth matrix compositions before / after | Changed RGB pixels |
| --- | ---: | ---: | ---: | ---: |
| fence | 647 / 647 | 7,469,521 / 7,469,521 | 60 / 0 | 0 |
| run-round | 719 / 719 | 7,897,931 / 7,897,931 | 60 / 0 | 0 |
| bow | 707 / 707 | 7,936,955 / 7,936,955 | 60 / 0 | 0 |
| birch | 436 / 436 | 5,641,032 / 5,641,032 | 60 / 0 | 0 |
| sea | 137 / 137 | 778,895 / 778,895 | 60 / 0 | 0 |
| forest | 431 / 431 | 4,959,581 / 4,959,581 | 60 / 0 | 0 |

No shader changes, texture taps, geometry, instance-buffer writes or rendering submissions added. 60 actual matrix compositions are removed in every measured rendered frame, including invisible depth meshes.

The integration regression moves and rotates the forest parent, spies on depth mesh matrix updates, and verifies inherited world matrices. Old code fails on a real `updateMatrix` call. Candidate: 30 focused foliage/shadow/coverage tests and production build pass.

## CPU scope

[Raw samples](report.json), [summary](cpu-summary.json). Plain, uninstrumented matrix methods: the composition-count wrappers used for native captures are removed before timing. Complete render CPU/driver submission at the warmed fence pose; GL draw entrypoints intercepted only in this separate phase, restored afterward. Three warm rounds, nine rotating measured rounds ×24 samples for each of original/candidate/unchanged-original control. This is not GPU execution, real frame pacing, Apple hardware or heat measurement.

| Mode | Average ms | p95 ms | Samples |
| --- | ---: | ---: | ---: |
| before | 1.554 | 1.700 | 216 |
| after | 1.575 | 1.800 | 216 |
| control | 1.568 | 1.800 | 216 |

The deterministic composition count is the firm result; small wall-clock differences should be assessed against the unchanged control. Historical live16 33 ms frames and Mac heat remain open.

Reproduce with `node tools/repro-leaf-depth-static-pose.mjs [output-directory]` with dependencies and headless Chrome configured. `PROOF_URL` can point the same read-only diagnostic at a published build; `PROOF_CPU_ONLY=1` retains existing native rows and reruns uninstrumented timing. Its original and fixed modes use the same scene, toggling only the production flag. Compiled stock exact-head budget is supplied separately.
## Targeted scene-update CPU

[Published-world raw blocks](scene-cpu.json), [summary](scene-cpu-summary.json). Published High world; uninstrumented actual scene.updateMatrixWorld path used by WebGLRenderer. Three warm rotating rounds, 12 measured rotating blocks of 240 traversals/mode. Batch-average CPU per traversal; not per-frame p95, rendering, GPU, pacing or heat.

| Mode | Average ms/traversal | p95 block-average ms/traversal | Measured blocks |
| --- | ---: | ---: | ---: |
| before | 0.168438 | 0.169167 | 12 |
| after | 0.168611 | 0.181667 | 12 |
| control | 0.177396 | 0.262083 | 12 |

Do not equate block-average p95 with individual frame p95. The full-render CPU result above remains inconclusive; the isolated update result and 60 avoided calls describe this small change. This is not a Mac heat or 60 fps claim.

[Unmodified compiled exact-head budget](budget.txt).
