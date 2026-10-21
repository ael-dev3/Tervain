# Dense-fir forced shadow refresh

Live baseline: **0.0.45 / 9394371** at https://ael-dev3.github.io/Tervain/.
Captured candidate source: **91445ad8f9755948f005f615593c407288a0ff58**.

The identical patch is now rebased onto 0.0.46 main `cb389782c` as **56c9795f9a7dc7f860c1dbbc77577503ade28d14** (`git range-diff` reports unchanged). Native pairs below retain their original 0.0.45 labels. Current-head budget validation is separate; no 0.0.46 native capture is claimed here.

A pending `renderer.shadowMap.needsUpdate` bypasses Reflector's `autoUpdate=false`. A forced refresh therefore redraws the sun map from the reduced reflection cast list, then redraws it again for the main picture. The fix defers that pending refresh until the main view when the sun already has a comparison map. A cold map retains the original initialization path. Error restoration preserves both shadow flags.

This is a **forced-refresh** saving. Ordinary-frame draws/triangles remain unchanged; this is not a demonstrated fix for the historical 33 ms frames or a steady-state heat claim. The first box-culling candidate saved only 448 triangles / zero draws at the sampled angles and was dropped.

## Native fixed-pose proof

High, 640×360 DPR1, native post/MSAA, frozen time/wind, seven angles around the dense-fir camera. All load-only draw suppression was restored before any image, counter or game-frame measurement. No scene modules, materials or shadow casters were disabled for proof. Every angle explicitly requests a shadow refresh and invalidates the reflection, identically before/after.

Centre camera `(97.9290386, 12.3989607, 122.7305845)`, target `(89.9026499, 27.5806306, 87.6012495)`, hour 15; player placed at the camera's ground coordinates before world culling/light updates. Other angles rotate the camera offset by −0.12, +0.12, −0.24, +0.24, −0.4, +0.4 radians.

| Pose | Total draws | Total triangles | Shadow draws | Shadow triangles | Changed RGB pixels |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0 | 781 → 639 | 9,570,772 → 8,839,405 | 299 → 157 | 1,474,954 → 743,587 | 0 |
| 1 | 717 → 581 | 8,294,225 → 7,597,887 | 287 → 151 | 1,404,896 → 708,558 | 0 |
| 2 | 841 → 699 | 10,659,944 → 9,920,788 | 299 → 157 | 1,490,532 → 751,376 | 0 |
| 3 | 690 → 556 | 7,588,982 → 6,918,415 | 283 → 149 | 1,353,354 → 682,787 | 0 |
| 4 | 906 → 764 | 12,084,049 → 11,352,992 | 299 → 157 | 1,474,334 → 743,277 | 0 |
| 5 | 645 → 509 | 7,037,330 → 6,379,699 | 285 → 149 | 1,327,878 → 670,247 | 0 |
| 6 | 970 → 829 | 13,012,244 → 12,278,688 | 298 → 157 | 1,478,928 → 745,372 | 0 |

Centre saving: **142 draws / 731,367 triangles** (18.2% total draws, 7.6% total triangles); shadow submissions alone 299→157 draws and 1,474,954→743,587 triangles. Seven native RGB buffers are identical byte for byte; all GL/console errors zero. PNGs and full per-submission JSON are in `before/` and `after/`.

The historical 766 / 10.1M capture used a different light-focus/update sequence. This paired proof uses a coherent player/light/culling setup; it must not be presented as an exact rerun of that older counter.

## Original Reduced-Motion game-loop trace (software, not Apple hardware)

**These original 0.0.45 samples retain Reduced Motion from the shot setup (wind held still).** After the fixed images, the helper restores the original simulation, presentation and render methods and records 10 completed game frames at the fixed camera through the application's PerfMeter. It also records V8 CPU sampling profiles. The first two samples include capture warm-up and are excluded from the following advisory summaries; raw samples remain intact.

- Ordinary draws/triangles agree: 330 / 5,653,317, later 331 / 5,684,605 in both runs.
- JS CPU mean/p95 (remaining 8 frames): **66.41 / 86.10 ms before, 52.16 / 70.20 ms after**. These are short, instrumented software samples, not a statistically established CPU win.
- Rendered intervals mostly ~11 seconds in both runs: SwiftShader raster bottleneck, not 60 Hz hardware performance. GPU timer query unavailable (`gpu:null`). Queued short intervals remain in raw data; no claim of fixing frame pacing.
- CPU sampling is dominated by idle waiting for software rendering, with GC and simulation among active samples. It cannot establish the cause of the old GPU-machine 33 ms samples.

Profiles are gzipped Chrome CPU profiles. Decompress before opening in DevTools. The candidate preview origin was anonymized; function positions and samples are preserved. A quiet hardware replay is still required for Mac pacing/heat.

## Deferred load ordering

The live observer saw loading hide at 37,913.5 ms with `worldArrived:false` and `furnitureReady:false`; `world.arrived` settled at 50,881.1 ms (12,967.6 ms later). Two prior software probes showed the same order (14,414.2 and 10,566.4 ms gaps). These are instrumented software load observations, **not native startup-speed measurements**.

The ordering is intentional: `WorldScene.create` starts deferred furniture/wildlife loads only after `open()`; `world.arrived` joins those loads. At the later snapshot all 15 waiting resident roles were downloaded (`missingRoles:0`); that count alone is not a missing-download bug. Adoption/preparation is separately deferred. Terrain is built before the world opens. This confirms the loading-order lead but does not show a terrain-load race or prove the budget's fixed 15-second wait always reaches a complete scene. No startup/gate readiness behavior is changed by this PR.

## Regression and budget

The new orchestration regression fails on the old source: reflection shadow refresh count 1, expected 0. It passes with the fix and checks restoration after failure. A second test preserves cold comparison-map initialization. **43 water/window tests and production build pass.**

| Cost | Delta |
| --- | --- |
| Centre forced total draws / triangles | −142 / −731,367 |
| Ordinary-frame draws / triangles | unchanged in trace |
| Shaders, taps per shaded pixel, geometry, textures | unchanged |
| JS bookkeeping | save/restore one flag on reflection refresh; one readiness boolean |
| Native pixels | all seven pairs exact |
| Hardware GPU ms / Mac pacing | not measured here |

Reproduce:

```
npx vitest run tests/presentation/waterRenderPass.test.ts tests/presentation/windowView.test.ts
npm run build
node tools/repro-dense-fir-shadow.mjs --url <build-url> --out dense-fir-proof --frames 10
```

Software runs used `--skip-loading-raster true` to avoid wasting raster work during loading; the helper asserts restoration before native proof. Leave it off for ordinary hardware startup traces. `--headed true` uses a headed browser. The stock budget gate is run separately without this option or any injected hooks/allowances. See `budget.log` for its exact-head result when attached.

## Current-head 0.0.46 stock budget receipt

On source head `56c9795f9a7dc7f860c1dbbc77577503ade28d14`, live `cb38978`: **284 draws / 2,956,234 triangles / 0 console errors**, equal candidate maxima. Two same-revision live probes and four completed samples each; original sampler/thresholds, no init hook or allowance.

`play-gate: PASS 56c9795f9`

Raw budget output is in `budget.log` (preview origin anonymized). The earlier gate spanning the 0.0.45→0.0.46 deployment was aborted/discarded and is not used. Tests/build logs are from the rebased current head. Native images remain the separately labelled 0.0.45 pairs.

## Additional live 0.0.46 normal-wind trace

`motion-0.0.46/` adds an unpaired current-live trace, revision `cb38978`, High, 640×360 DPR1, same dense-fir camera. **All 8 frames explicitly record `windStrength:1` and `reducedMotion:false`.** Simulation, presentation, wind and native post rendering run normally during these frames. A separate setup still is frozen; it is not a motion screenshot.

After the first two capture warm-up samples, software-rendered intervals span **12,499.5–13,116.1 ms**, instrumented JS CPU **37.9–57.2 ms**, with up to **555 draws / 8,634,093 triangles**. GPU timer unavailable throughout. These are not a before/after CPU comparison with the Reduced-Motion traces, and do not identify the historical hardware ~33 ms stall. Per-draw counters and CPU sampling add observation overhead; no hardware/Apple-GPU pacing claim. Normal-wind reflection refreshes also make these counts different from the stationary Reduced-Motion trace.

Portable read-only repro in `tools/trace-fir-motion.mjs`: run with `--url 'https://ael-dev3.github.io/Tervain/?motion=1' --frames 8 --out <output-directory>`. The software run additionally used `--skip-loading-raster true`; raster is restored before setup and frame measurements. The helper records one setup image rather than seven comparison images and records wind/settings on every completed frame.

This adds evidence only. Source head and its budget receipt are unchanged.
