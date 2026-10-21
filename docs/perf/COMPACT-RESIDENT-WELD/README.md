# Compact exact-weld hash buckets

Candidate `24d5ded4f5bf9915b674c16dda46c338022f78e6`, technical base `bd0ac2518fa1cf42bab41dae68b40099463cac44` (#744). During resident preparation, `weldExact` and its staged variant store an array for every hash bucket even though the shipped models' distinct surface points do not share hashes. UV-seam duplicates already reuse the same point ID. Keep a scalar ID for a one-point bucket; allocate a list only when different exact positions collide in the Float32 hash. Exact coordinate comparisons, collision encounter order, signed-zero behaviour, output node/first arrays and staged work limits remain unchanged. No approximate welding or model alteration.

This is a small follow-up to the preparation suspension fix; it updates both entry points. The earlier published simulation profile on 0.0.37 caught background resident preparation, not a confirmed stack for live16's 33 ms hardware frames. This proof measures helper throughput and bucket values, not full-frame/GPU performance or heat.

## Plain CPU and observed bucket arrays

Three fresh processes, two delivered geometries, both entry points. Each process warms both functions then runs nine rotating original/candidate/unchanged-original blocks of 24 complete welds per mode. 648 measured calls/mode/model/entry point in total. Equality checks run outside timing; counters are restored before timing. The bucket-array diagnostic observes arrays passed to the bucket Map's `set`; it is not a measured heap-byte total. On these actual models no distinct hashes collide, so candidate retains zero bucket arrays. Deliberate collision tests still create the required list.

[Raw run 1](cpu-run-1.json), [run 2](cpu-run-2.json), [run 3](cpu-run-3.json), [summary](cpu-summary.json). `p95` below is of 27 **block averages**, not individual calls or frames.

| Model | Entry point | Bucket arrays original / candidate | Mean ms original / candidate / control | p95 block-mean ms original / candidate / control |
| --- | --- | ---: | ---: | ---: |
| rillford-reeve | sync | 21,474 / 0 | 2.614 / 1.995 / 2.625 | 3.539 / 2.161 / 3.418 |
| rillford-reeve | staged | 21,474 / 0 | 3.784 / 2.409 / 3.675 | 4.588 / 2.675 / 4.543 |
| ash-recorder | sync | 17,112 / 0 | 1.781 / 1.455 / 1.818 | 2.106 / 1.548 / 2.248 |
| ash-recorder | staged | 17,112 / 0 | 2.225 / 1.684 / 2.301 | 2.513 / 1.849 / 2.924 |

Every returned node and first-representative array matches the original. Tests retain platform-independent delivered-model graph hashes and deliberately exercise distinct doubles that collide in the Float32 hash; both old entry points fail the new bucket allocation guard. Existing interleaving/collision-work and surface/rig/seat/retarget regressions still pass. 29 focused tests and build pass. [Old regression](old-regression.txt).

## Native masks and rendered output

The original and candidate surface-preparation functions run on the native world's actual source geometry, joint names and axes, and compare every mask word before installation. 4 preparations match; 4 installed mask attributes are controlled. This is the observed subset, not all roles. The proof harness additionally runs original preparation only during loading; it supplies no native timing claim. The runtime was captured before committing, then committed unchanged (SHA above).

One frozen native High scene on the 0.0.38 base, 640×360 DPR1, actual post/MSAA and auxiliary passes; five fixed poses, two repeats/mode. 20 PNGs match RGB exactly, independently Sharp/Pillow decoded. No independent-session pixel identity claim. [Native masks/stats](native.json), [RGB hashes](independent-pixels.json).

| Legacy fixed pose | Draws original / candidate | Triangles original / candidate | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| fence | 606 / 606 | 7,294,085 / 7,294,085 | 0 |
| run-round | 241 / 241 | 2,337,668 / 2,337,668 | 0 |
| bow | 711 / 711 | 8,120,783 / 8,120,783 | 0 |
| birch | 438 / 438 | 5,732,946 / 5,732,946 | 0 |
| sea | 137 / 137 | 778,895 / 778,895 | 0 |

The run-round illustration now looks inside a building; these are fixed diagnostic cameras, not a new real-play route clip. [Fence before](fence-before-0.png) / [after](fence-after-0.png). Shader code/texture taps, final geometry/buffers and normal steady-state rendering are unchanged. No claim that the historical 33 ms frames are resolved.

Reproduce with dependencies/headless Chrome configured from the candidate checkout: `node tools/repro-compact-weld-cpu.mjs [output-directory]` and `node tools/repro-compact-weld-native.mjs [output-directory]`. The CPU driver writes/removes only its own generated test and leaves baseline/report files in the output directory. Fetch the pinned #744 base commit first if the checkout is shallow. Compiled unmodified current-head budget is supplied separately.
## Compiled current-head budget

Unmodified stock gate on `24d5ded4f5bf9915b674c16dda46c338022f78e6`: live 285 draws / 3,046,047 triangles / 0 errors; candidate 285 / 3,046,047 / 0. [Raw receipt](budget.txt). Two live probes, four distinct completed samples each, default limits; no sampler or allowance changes. The published three-process CPU repro was also executed successfully; its independent raw runs are included as portable-verification-1/2/3.json. No hardware frame pacing or Mac heat claim.
