# Constant-coverage forest-floor distance work

Live reproduction: 0.0.29 · d244d39, High. Isolate the native forest-floor module's update method, count `Math.hypot` calls, and move its camera through the first 80 metres of the woods route. Every moving update computes 705 full distances for 705 pieces, including pieces whose coverage is already exactly zero or one. [Initial live measurement](proofs/floor-distance-bands/live-baseline.json).

Candidate application: `f508dc257ec2060bb8413dd37039f37ab3604698`. Compute squared distance first and return the constant coverage outside the transition. Keep the original hypot/smooth fade throughout the transition and a one-micrometre boundary guard. Authored distances, geometry, colours, materials and shaders do not change. One closure is created per floor module; there are no additional per-update allocations.

## Published-scene render verification

The native published module, original-code rebuild and candidate rebuild use the published world's terrain, tree population, exclusions and canopy field in the same scene. High, 492×320, native post/MSAA, frozen reduced motion. Initial loading raster suppression is restored before native captures. Other scene modules remain present. The original rebuild must match the native module before candidate equality is accepted. These are controlled module replacements, not two-binary pixel comparisons.

| Woods metres / turn | Hypot calls original → candidate | Draws, both | Triangles, both | Pixel / drawn-buffer differences |
| --- | ---: | ---: | ---: | ---: |
| 0 / 0 | 705 → 507 | 364 | 5,848,988 | 0 |
| 10 / 0 | 705 → 459 | 354 | 5,759,954 | 0 |
| 20 / 0 | 705 → 400 | 348 | 5,506,485 | 0 |
| 40 / 0 | 705 → 296 | 316 | 4,914,246 | 0 |
| 80 / 0 | 705 → 142 | 271 | 3,396,477 | 0 |
| 0 / −0.6 | 705 → 507 | 375 | 6,512,391 | 0 |
| 0 / +0.6 | 705 → 507 | 263 | 3,884,710 | 0 |

Across these views: 4,935 → 2,818 hypot calls. All native/original/candidate drawn matrix and Float32 coverage buffer hashes match. All three PNG byte hashes also match per pose, so one image is retained per group: [0](proofs/floor-distance-bands/view-0.png), [1](proofs/floor-distance-bands/view-1.png), [2](proofs/floor-distance-bands/view-2.png), [3](proofs/floor-distance-bands/view-3.png), [4](proofs/floor-distance-bands/view-4.png), [5](proofs/floor-distance-bands/view-5.png), [6](proofs/floor-distance-bands/view-6.png).

[Counter, hash and CPU summary](proofs/floor-distance-bands/summary.json); [full raw report and timing samples](proofs/floor-distance-bands/report.json.gz).

## Component CPU confirmation

Time only the actual floor update, after 1,200 warmup updates per variant. Repeat the same 80 m camera path in balanced A,A,B,B,B,A,B,A blocks, 1,500 measured updates/block, 6,000 per variant. No native renders occur in this separate timing phase. This measures a small CPU component, not complete game frames or GPU time.

| Component CPU ms/update | Original | Candidate |
| --- | ---: | ---: |
| Average | 0.02585 | 0.01893 |
| p95 | 0.10000 | 0.10000 |
| Block-average range | 0.02527–0.02640 | 0.01813–0.01973 |

The p95 is limited by timer granularity. This is a small average component saving; it does not establish a hardware frame-rate or heat improvement and does not explain the reported 33 ms frames by itself. Console errors: zero. Shader instructions/taps, rendering submissions and per-frame allocation deltas: zero.

## Tests and reproduction

18 focused tests and production build pass. The coverage tests compare 33,900 values across all three authored quality bands, threshold neighbours and long camera offsets, requiring exact equality to the original formula. They also assert that constant-coverage cases avoid hypot while transition and threshold cases retain it.

Run the checked-out candidate's reusable [live-scene driver](../../tools/repro-live-floor-distance-bands.mjs):

```sh
node tools/repro-live-floor-distance-bands.mjs --out floor-distance-proof --url https://ael-dev3.github.io/Tervain/ --baseline-ref d244d39
```

The driver imports the original and candidate floor modules against the current shared helper; the existing smooth-fade routine is unchanged. The production change is independently exercised by the exact-head compiled budget run. Software WebGL is used here; no Apple GPU timings are claimed.

## Exact-head budget

The native High Retina budget run is in progress for the immutable compiled candidate f508dc257ec2060bb8413dd37039f37ab3604698. Producer tooling includes #673's shot-start correction and #678's distinct-completed-frame recorder. It keeps two live probes, four completed samples per probe, no allowances and zero-error/revision requirements. No PASS receipt is claimed yet.
