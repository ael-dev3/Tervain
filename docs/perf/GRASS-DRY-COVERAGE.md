# Dry-grass tint at subpixel widths

The pale dry-leaf colour mix used `gDry * 0.8` even when the existing projected-width coverage said a blade was unresolved. Tip lift and several lighting contributions already used that coverage. This left a bright colour lift on subpixel dry leaves as the camera moved.

Multiply only that dry-tint weight by the existing `gBladeCov`. Palette constants, coverage thresholds, geometry, density, distance settings and the seed-head term are retained. At coverage one the original colour is unchanged. The grass shader cache version advances for the changed shader.

## Before/after evidence

The published 0.0.17 whole-scene walk attributes **28 → 14** near-white observations to removing the entire straw mix ([attribution](https://github.com/ael-dev3/Tervain/pull/451)). This fix preserves the mix and applies its existing width coverage instead.

In the targeted native whole-scene window, source frames 7–11 at a synthetic 60 Hz, dry-tint coverage improves **5 → 1** white observations across the three interior frames. Inactive instrumentation is pixel-identical and the native post target uses four samples. This small window is not a complete meadow or hardware gate. [Window receipt](proofs/grass-dry-coverage/window.json).

The separate source-backed software-WebGL fixture compares the original material against the actual changed material through native Grade/MSAA. The resolved-width images match exactly; 2,215 thin-grass pixels change by more than ten channel levels. All six rendering assertions pass.

| Fixture measurement | Before | After |
| --- | ---: | ---: |
| Draw calls per image | 5 | 5 |
| Triangles per image | 1,348 | 1,348 |
| Textures | 4 | 4 |
| Texture-image payload bytes | 756,736 | 756,736 |
| MSAA colour payload bytes | 2,457,600 | 2,457,600 |
| Initial buffer/texture upload bytes | 68,420 | 68,420 |
| Subsequent image upload bytes | 0 | 0 |
| WebGL errors | 0 | 0 |

Payload estimates exclude depth buffers and driver overhead; uploads exclude uniforms. These are deterministic correctness and cost counters, not hardware frame-time measurements.

[Fixture receipt](proofs/grass-dry-coverage/fixture.json) · [Resolved before](proofs/grass-dry-coverage/resolved-before.png) · [Resolved after](proofs/grass-dry-coverage/resolved-after.png) · [Thin before](proofs/grass-dry-coverage/thin-before.png) · [Thin after](proofs/grass-dry-coverage/thin-after.png)

## Reproduce

```sh
npx vitest run tests/presentation/grassEngine.test.ts tests/presentation/grassFlowers.test.ts --testTimeout=90000
node tools/repro-grass-dry-coverage.mjs --baseline 5da2776 --out grass-dry-fixture
npm run build
```

The native whole-scene controls are included in `proofs/grass-dry-coverage/controls.json`. The attribution tool linked above reproduces both baseline and coverage-only variants. A production-build capture, without shader overrides, can be run against a served build:

```sh
node tools/repro-grass-coverage-build.mjs \
  --controls docs/perf/proofs/grass-dry-coverage/controls.json \
  --start 7 --frames 5 --out grass-coverage-build
```

## Full walk and compiled build

The complete matched walk improves **28 → 15 near-white observations** (46% fewer), and ROI sparkle **0.552% → 0.404%** (27% lower). Every one of the 31 normal frames matches the original reference exactly before its contribution mask is reused. Inactive shader instrumentation changes zero image channels. [Full walk receipt](proofs/grass-dry-coverage/walk.json).

An actual production build, without shader overrides, reproduces every RGB channel of all five candidate-window frames. It has the native hero and four-sample post target; the tested candidate asset is `tervain-Cu3ddvLd.js` (the preview retains the base revision label). [Compiled-build receipt](proofs/grass-dry-coverage/compiled-build.json) · [Frames](proofs/grass-dry-coverage/frames).

For an exact comparison using the same software backend, add `--expected docs/perf/proofs/grass-dry-coverage/frames` to the build-capture command. Hardware backends should collect their own matched reference instead of using these images as portable golden snapshots.

Fifteen white observations remain on this route. This is a partial flicker reduction; it is not a live-fix, hardware performance or overall quality-pass receipt.

[Matched walk clip](proofs/grass-dry-coverage/normal-vs-coverage.mp4): original on the left, coverage on the right. The 31 source frames are sampled at a synthetic 60 Hz and shown at 12 fps (5× slow motion); each side is the same 512×216 grass ROI. Every decoded RGB channel matches the source captures. [Video verification](proofs/grass-dry-coverage/video-verification.json).
