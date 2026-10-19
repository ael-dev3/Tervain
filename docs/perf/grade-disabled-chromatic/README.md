# Skip disabled chromatic-separation texture reads

The High gameplay look has chromatic separation set to zero. The final colour pass nevertheless fetches the identical centre scene texel twice for red and blue. Reuse the existing centre sample only when the uniform is zero, retaining the original mix arithmetic (and its rounding). Nonzero chromatic separation takes the original reads. No look values, colours, geometry, draw distance, menu settings or uniforms change.

Actual production fragment shaders are compared on a deterministic HDR half-float texture. Sixteen nonempty pixel comparisons cover zero/nonzero chromatic separation, sharpening off/on, day/dusk and underwater off/on. Every comparison is pixel-identical. Both fixture screenshots are included.

Run 1, 40 warmed balanced pairs at 2205×1434: synchronized final-pass wall mean **143.7775→119.505 ms**, p95 **164.5→130.2 ms**. These SwiftShader numbers include actual raster completion, forced by a one-pixel readback; they are not hardware GPU time, Mac FPS, whole-game timing or a heat measurement. The earlier submission-only calibration did not synchronize raster completion and is deliberately excluded. Repeat runs and native scene/budget receipts will be attached after completion.

```sh
node tools/repro-grade-disabled-chromatic-fixture.mjs output
node tools/repro-live-grade-disabled-chromatic.mjs output BUILD_URL
node tools/repro-grade-budget-timings.mjs --url BUILD_URL --budget-url LIVE_URL --head HEAD --tri-allowance 0
```

The timing observer derives the stock budget gate and keeps its baseline probes, completed-frame recorder, thresholds, exact-head check and PASS/FAIL calculation unchanged. It only adds the existing frame interval and CPU fields to each completed sample and prints them as advisory data. Four samples per probe are a budget receipt, not a statistically robust frame-pacing study. Budget timings and the synchronized final-pass measurement are separate scopes.


Run 2 (all 40 balanced pairs retained): mean **282.8175→276.305 ms**, p95 **469.1→411.9 ms**, same 16 nonempty pixel-exact controls. Concurrent renderer load changed absolute times substantially; no hardware or whole-game speedup is inferred from these values. Source-level saving is two scene texture operations per default final-pass pixel, with one uniform branch. Draws, triangles, uniforms and varying payload are unchanged.
