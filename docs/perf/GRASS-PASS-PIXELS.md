# Grass subpixel coverage uses the current pass viewport

Grass estimates blade and seed/flower-head projected width with `uGrassPx`. The material callback previously used canvas drawing-buffer height for every pass. A smaller reflection/window target therefore estimated heads as several times wider than the pixels actually being rendered, defeating the existing subpixel fade.

Read the physical current viewport height instead. This also handles cropped targets and default-framebuffer pixel ratio. The vector is retained per material, with no new per-draw allocation. Shader equations, fade thresholds, geometry, lighting and colour constants are unchanged.

## Native software-rendered fixture

Same production grass shader/clumps, 640×480 physical canvas, 160×120 four-sample capture target. Only the material callback differs, published 5da2776 versus candidate.

| Measurement | Before | After |
| --- | ---: | ---: |
| Main-pass pixel-height input | 480 | 480 |
| Capture-pass pixel-height input | 480 | 120 |
| Scene draw calls in either pass | 1 | 1 |
| Scene triangles in either pass | 480 | 480 |
| WebGL errors | 0 | 0 |

Main-camera pixels are identical. Thirty-seven capture pixels change (maximum RGB channel delta >10), as the existing subpixel fade now sees the correct size. Capture screenshots are copied to the canvas for inspection. This standalone fixture does not measure whole-scene temporal shimmer or hardware frame times.

[Receipt](proofs/grass-pass-pixels/fixture.json), [before capture](proofs/grass-pass-pixels/before.png), [after capture](proofs/grass-pass-pixels/after.png).

## Actual compiled-build callbacks

The native compiled grass material is exercised with a 640×360 default framebuffer, 128×128 target and 128×64 cropped viewport. The published build uses 360 for all three; the candidate uses 360, 128 and 64, then restores 360 for the next main pass. [Published receipt](proofs/grass-pass-pixels/live-before.json) / [candidate receipt](proofs/grass-pass-pixels/live-after.json). The candidate filename and SHA-256 distinguish its code from the published program; its displayed revision names the pre-commit base.

```sh
node tools/repro-grass-pass-pixels.mjs --out outputs/grass-pass-pixels
node tools/repro-live-grass-pass-pixels.mjs "$BUILD_URL" outputs/live-grass-pass-pixels
npx vitest run tests/presentation/grassPassPixels.test.ts tests/presentation/grassEngine.test.ts
```

Fifteen tests, production build/type-check, native shader fixture and candidate compiled-world callback checks pass. The published callback probe fails as the expected reproduction. Hardware play/video gate remains pending. This corrects capture-view pixel-footprint input; it does not establish the cause or resolution of the remaining outdoor white-spot flicker.
