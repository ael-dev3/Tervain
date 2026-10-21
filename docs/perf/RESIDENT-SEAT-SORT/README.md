# Resident seat preparation sort

Candidate `d0f900eeb4f765a4fe074563fe0cb321d0288534`, live base `ca869ecd2a479148292580fa01670f94982b72f9` (0.0.38). Resident preparation sorts each complete skinned seat surface with a JS comparator before choosing its lowest one-percent height and the patch within 3 cm. Shipped rigs have 13,347 and 8,488 candidate points. This is an uninterrupted preparation slice, not per-frame steady-state work. The earlier route CPU profile found resident preparation active during traversal, but this does **not** establish the cause of historical live16 ~33 ms frames.

Reuse one numeric Float64 height array across the three sampled moments; use native numeric sorting for the percentile and object-sort only the retained patch. Stable patch ordering retains the original summation order. Non-finite or negative-zero heights retain the original full-comparator semantics. Additional temporary scratch is eight bytes per candidate (about 104 KiB for the larger measured rig), retained only until that preparation completes. No geometry, animation, material, shader, texture, style or menu changes.

## Reproduction and regression

`npx vitest run tests/presentation/residentSeatPreparation.test.ts tests/presentation/residentRetargetPreparation.test.ts tests/presentation/residentRig.test.ts`: **16 tests pass**, build passes. The modified regression fails on original code (largest object sort 13,347 / 8,488 instead of <1,024). Historical expected seat offsets keep their pre-existing tolerance; the separately paired original/candidate comparisons assert exact equality.

After fetching this proof branch, run from the candidate checkout with dependencies: `node tools/repro-resident-seat-sort-cpu.mjs [output-directory]` and `node tools/repro-resident-seat-sort-native.mjs [output-directory]` with Chrome configured. The CPU driver creates and removes its own private test and baseline module; it refuses to overwrite an existing test. The native tool adds a source-pair wrapper and checks original/candidate offsets on the actual resident preparation inputs before returning the candidate offset. Fetch the pinned baseline commit when using a shallow checkout.

## CPU, paired rotating order

Three fresh test processes, each warming both implementations three times then 27 rotating original/candidate/unchanged-original rounds. **81 complete preparations per mode per resident**. Each row retains all generator resume times and exactly equal output. These are Node/V8 helper/preparation CPU timings, not browser frame CPU, software GPU timings, Mac hardware, heat or steady-60fps measurements. The unchanged-original control and outliers remain visible.

| Resident | Mode | Mean complete ms | p95 complete ms | Mean largest resume ms | Worst resume ms |
| --- | --- | ---: | ---: | ---: | ---: |
| rillford-reeve | before | 9.505143 | 11.374865 | 2.230955 | 3.707695 |
| rillford-reeve | after | 6.151700 | 7.418483 | 0.972401 | 3.676933 |
| rillford-reeve | control | 9.431256 | 11.457900 | 2.320366 | 4.496161 |
| ash-recorder | before | 6.298542 | 7.699254 | 1.523794 | 3.465316 |
| ash-recorder | after | 4.066036 | 4.903322 | 0.720077 | 2.289162 |
| ash-recorder | control | 6.497417 | 8.619704 | 1.699339 | 7.943720 |

Candidate outliers remain (the larger rig's worst resume is about 3.68 ms). This reduces average preparation cost and its usual long slice; it does not provide a hard upper wall-clock bound or eliminate scheduler/GC delays.

## Native rendered proof

High 640×360 DPR1, frozen time/wind, actual source-paired world with post/MSAA and auxiliary passes. **19 actual seat preparations** assert x/y/z bit-identical before installation. The arrival queue was not fully drained before capture; stepping and integration are frozen during the fixed views. These are fixed scene views, not a seated animation comparison or a walking frame-time replay. The legacy run-round camera now points indoors. Twenty PNGs (two repeats/mode at five poses) are independently RGB-identical. All draw and triangle pairs match.

| Pose | Before draws | After draws | Before triangles | After triangles | Changed RGB pixels |
| --- | ---: | ---: | ---: | ---: | ---: |
| fence | 648 | 648 | 7,354,739 | 7,354,739 | 0 |
| run-round | 241 | 241 | 2,337,668 | 2,337,668 | 0 |
| bow | 711 | 711 | 8,120,783 | 8,120,783 | 0 |
| birch | 438 | 438 | 5,732,946 | 5,732,946 | 0 |
| sea | 137 | 137 | 778,895 | 778,895 | 0 |

The source wrapper runs both implementations, so no native timing claim is made from these captures. The unmodified compiled current-head budget receipt will be added separately; no PASS is inferred from source captures.
## Current-head compiled budget

Unmodified stock gate on `d0f900eeb4f765a4fe074563fe0cb321d0288534`: live and candidate both **285 draws / 3,046,047 triangles / 0 console errors**. Two same-revision live probes and four distinct completed frames per probe/candidate; default limits, no allowances or sampler edits, native rendering enabled. [Raw receipt](budget.txt). This fixed budget placement is not a walking hardware frame-pacing test and does not establish the historical live16 ~33 ms cause.
