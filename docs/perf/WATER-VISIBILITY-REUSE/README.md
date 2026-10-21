# Reuse sea visibility within one render

Published baseline: **0.0.47 · 9cc3589**. Candidate source: **533b034915e77c3a402d554e17476e8e8dc14902**.

The main water decision already tests the sea's conservative bounds. The planar reflection tested them again before anything changed the view or sea. The candidate passes the already-known boolean into that decision; if an earlier visible channel skipped testing the sea, the reflection keeps its original search. A negative result remains meaningful. No cache survives into the next frame.

## Matched native proof

Seven High 640×360 DPR1 post/MSAA renders, using the published world, geometry and renderer. Only candidate `render`/`captureReflection` methods are substituted into the existing water pass. Time, wind and simulation are fixed; the shadow map is warmed and then fixed. Raster draws are enabled throughout. Each pair has a restored-original control. Source method substitution is a scoped native A/B, not a claim of cross-session whole-build pixel identity; the stock budget separately executes the compiled candidate.

Pose 0 is the dense-fir view; 1/2 turn that view; 3 is inland stream; 4/5 are shoreline controls; 6 is walk-fence. Exact positions are in `report.json`.

| Pose | Sea predicates before → after | Bound transforms before → after | Draws, both | Triangles, both | Changed RGB pixels / restored control |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0 | 2 → 1 | 36 → 18 | 588 | 8,434,426 | 0 / 0 |
| 1 | 2 → 1 | 8 → 4 | 627 | 10,984,765 | 0 / 0 |
| 2 | 2 → 1 | 852 → 426 | 410 | 6,225,154 | 0 / 0 |
| 3 | 2 → 1 | 1,067 → 534 | 354 | 7,018,770 | 0 / 0 |
| 4 | 2 → 1 | 156 → 78 | 199 | 1,540,715 | 0 / 0 |
| 5 | 2 → 1 | 128 → 64 | 168 | 1,468,750 | 0 / 0 |
| 6 | 2 → 1 | 852 → 426 | 364 | 5,697,869 | 0 / 0 |

All seven pairs and seven restored controls have **zero changed RGB pixels**. Console and GL errors: **0**. Images are lossless `0-before.png`, `0-after.png`, etc.

The counts are calls to the native water pass's conservative bounding-box transform. They are not timings or draw calls. Shader instructions, texture taps, texture sizes, source geometry, reflection cadence and quality settings are unchanged. This does not prove a Mac frame-rate/heat gain or resolve the historical ~33 ms frames in live16.

## Regression and build

- The once-per-view regression fails on the original source: two sea predicates where one is required (`old-code-test.log`).
- 44 water/window tests pass, including negative visibility, turning away/back, and an earlier channel short-circuiting the search (`tests.log`).
- Production TypeScript check/build pass (`build.log`).

## Reproduce

Check out candidate source and install dependencies. With a Chrome executable configured for WebGL:

```sh
node tools/repro-water-visibility-reuse.mjs --url https://ael-dev3.github.io/Tervain/ --out artifacts/water-visibility
```

The build-URL option supports a separately served baseline. It asserts live duplicate work, equal draws/triangles, no increased transform count, zero RGB differences/restored differences, zero console/GL errors and an unchanged published revision during measurement. It writes `report.json` only after assertions pass.

## Stock compiled-build budget

The unmodified gate completed against the compiled candidate head, with no hooks or allowances. Raw output: `budget.log`. It uses two live probes and four completed samples per probe.

```text
# Budget gate: PASS

- Live (https://ael-dev3.github.io/Tervain/, revision 9cc3589): draw calls 284, triangles 2916635, console errors 0
- Candidate (<candidate-preview>, revision 533b03491): draw calls 284, triangles 2916635, console errors 0
- Draws not above live: yes; triangles not above live: yes; no console errors: yes; revision matches head 533b034915e77c3a402d554e17476e8e8dc14902: yes; maximum over four samples; live is the larger of two live probes
- Not measured by the page: texture taps, shader cost, JS frame CPU. Each PR posts its own cost table; the gate does not claim them.
- Wall-clock pacing (over-25 ms share, p95): advisory only, see docs/perf/LATEST.md (A/A band 1.7 points). Not a pass/fail condition.

play-gate: PASS 533b03491
```

Software WebGL budget receipt; no hardware pacing claim.
