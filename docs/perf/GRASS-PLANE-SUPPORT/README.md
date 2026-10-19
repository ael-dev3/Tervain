# Grass tile plane-support cache

Native High, 640×360, post/MSAA 4×, published 0.0.33 · b317734. Candidate 4a34eeb7d. Six fixed views; original and candidate culling kernels use the same native tile spheres/transforms. Each pair includes a restored control. All six have identical RGB, identical draw/triangle counts and zero console errors.

| Pose | Draws, both | Triangles, both | RGB |
| --- | ---: | ---: | --- |
| 0: (-7, 45), yaw 0 | 227 | 2,328,434 | [before](pose-0-before.png) / [after](pose-0-after.png), exact |
| 1: (-7, 57), yaw 0.5 | 207 | 1,755,760 | [before](pose-1-before.png) / [after](pose-1-after.png), exact |
| 2: (18, 20), yaw 1 | 279 | 3,331,372 | [before](pose-2-before.png) / [after](pose-2-after.png), exact |
| 3: (46, 68), yaw 2 | 270 | 3,147,687 | [before](pose-3-before.png) / [after](pose-3-after.png), exact |
| 4: (-210, 0), yaw 0.8 | 417 | 6,058,753 | [before](pose-4-before.png) / [after](pose-4-after.png), exact |
| 5: (-210, 0), yaw 3 | 228 | 3,682,147 | [before](pose-5-before.png) / [after](pose-5-after.png), exact |

Timing: nine alternating pairs per pose, each timed batch repeating its tile set 300 times. Divide by 300 for the reported kernel time per tile set. Pooled mean 0.002698 → 0.002358 ms; p95 0.003333 → 0.003000 ms. These are culling-kernel timings, with sub-microsecond absolute savings. Whole-frame CPU, hardware GPU cost, laptop heat and frame pacing are unmeasured. Pose 0 median increased 0.002667 → 0.003000 ms; other five medians decreased.

The focused regression uses six identical oblique planes: 100 translated tile tests previously recomputed 1,800 hypotenuses; after a cold 18-call setup, the cache recomputes zero. It also compares 2,000 culling decisions while camera normals, rotations and nonuniform scales change.

Geometry, shader source, materials, texture taps and upload code are unchanged. Cache rows are weakly keyed by plane, compare transported normal components, and mutate existing rows when normals change.

Reproduce after checking out the candidate branch:

```sh
node tools/repro-grass-plane-cache.mjs --url "$BUILD_URL" --out artifacts/grass-plane-cache
npx vitest run tests/presentation/vegetationExtentCull.test.ts tests/presentation/grassPassPixels.test.ts tests/presentation/groundVisibility.test.ts tests/presentation/grassMainDistance.test.ts
```

The capture probe applies identical additional conservative horizontal culling after native hooks; original native culling stays active. Its paired kernels use a 4 m conservative shader reach, plus tile half-width and margin. The generic regression covers changing transforms and shape bounds. `report.json` includes raw paired timings and PNG hashes, including restore controls. An initial un-warmed draw-count pair and disk-full attempts are excluded.

Validation: 22 focused tests passed; TypeScript/Vite build passed. [Exact-head stock budget: PASS](budget.md). Live and candidate both reached 285 draws / 3,048,306 triangles, with zero console errors; two live probes and four distinct completed frames per probe.
