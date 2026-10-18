# Consecutive-frame grass changes

This diagnostic measures live grass motion through the native post-processing/MSAA path. It does not change game rendering. Raw screen-space changes include normal camera movement and cannot alone establish a shimmer defect.

## Reproduce

```sh
node tools/repro-grass-white-attribution.mjs --url https://ael-dev3.github.io/Tervain/ --controls docs/perf/proofs/grass-temporal/controls.json --x 6 --z 26 --frames 31 --modes baseline,mask --out grass-walk
node tools/grass-temporal-counts.mjs grass-walk
node tools/repro-grass-white-attribution.mjs --url https://ael-dev3.github.io/Tervain/ --controls docs/perf/proofs/grass-temporal/controls.json --x 6 --z 26 --frames 31 --modes baseline,mask --stationary true --out grass-stationary
node tools/grass-temporal-counts.mjs grass-stationary
npx vitest run tests/tools/grassTemporalCounts.test.ts
```

Use Chromium with software WebGL in a sandbox or a hardware browser for the same image diagnostic. These synthetic samples do not measure real display cadence or hardware frame times.

The meadow start matches the visual gate’s named meadow spot `(6,26)`. The High preset captures 640×360 at 1× with native post/MSAA. At sample `i`, distance `d=i*2.6/60` metres; camera is `(6, terrain(6,26+d)+1.4,23+d)`, looking at `(6, terrain(6,26+d)+0.3,28+d)`. The 31 frames cover 1.3 metres at a synthetic 60 Hz cadence. Clock, wind and actor simulation remain fixed. The stationary control holds `d=0`. Controls are versioned and recorded in each report.

Mask capture retains native depth/discard/coverage, substituting white for grass and black for other material fragments before post-processing. It represents grass contribution, not exclusive semantic ownership; transparent effects and post-processing can affect its boundary. The original and inactive-instrumentation image must match every channel before measurements start.

For each consecutive pair, pixels must have mask value at least 64 in both masks. Luminance is decoded RGB weighted by `(0.2126,0.7152,0.0722)`; count absolute differences **strictly greater than 20/255**. Record eligible pixels and the count/share for every pair. A separate mask-change count includes pixels entering or leaving the mask; it is not an object-pop count. The bright subset also requires either frame to have minimum RGB ≥180, luminance ≥200 and channel spread ≤40. Counts are pixel observations, not distinct objects or unique pixels across the clip.

The report also compares the preflight control image with frame zero at the same camera pose, using frame zero’s mask. These draws straddle one zero-dt grass prepare/update. This is a repeated-pose control, not an independently sampled stationary clip.

The capture also reports motion-adjusted three-frame sparkle residuals. Keep those separate from the raw two-frame counts. A stationary zero does not prove grass is fixed during motion, and a nonzero raw walk count does not prove temporal instability.

## Cost scope

Only developer capture and offline analysis tools change. Production draws, triangles, shaders and frame CPU are unchanged. No hardware performance or quality PASS is inferred from this diagnostic.

## Live receipts

The supplementary village-edge dusk sample (the legacy route at `x=-7,z=45`) ran on **0.0.24 · 06ef770**. Across 30 pairs it recorded 762,007 eligible observations, 30,455 changes above 20/255 (3.9967%; mean 1,015.17 pixels/pair; p95 1,099), and **0 near-white changed observations**. The separate motion-adjusted near-white count was also zero. This is a short sampled route, not proof that the meadow is fixed.

[Per-frame counts](proofs/grass-temporal/village/temporal.json) · [Capture receipt](proofs/grass-temporal/village/capture.json) · [First still](proofs/grass-temporal/village/baseline-00.png) · [Middle still](proofs/grass-temporal/village/baseline-15.png) · [Last still](proofs/grass-temporal/village/baseline-30.png) · [Grass mask](proofs/grass-temporal/village/mask-00.png) · [4× slow viewing clip](proofs/grass-temporal/village/walk-4x-slow.mp4).

### Meadow, noon — 0.0.24 · 63604e2

The named meadow route records **677,253 changed observations / 2,183,781 eligible observations (31.0129%)**, mean **22,575.1 pixels/pair**, p95 **23,842**, across 30 consecutive pairs. There are **0 strict near-white changed observations**. The repeated first pose has **0 changes / 86,334 eligible grass pixels**. Inactive instrumentation changes **0 image channels** ([decoded RGB hashes](proofs/grass-temporal/meadow/pixel-proof.json)).

The separate existing motion-adjusted metric reports a **3.3262% positive sparkle-residual share** over its rectangular ROI, 99.3420% alignment coverage, and **0 grass-masked near-white residual observations**. Its generic residual is not restricted to grass, and neither it nor the raw 31% change rate is a calibrated visual-quality failure. Thin moving blades, parallax, occlusion and camera movement all contribute. This short frozen-wind sample does not reproduce strict white specks; it does not establish that they are absent on hardware or other routes/phases.

[Per-frame counts](proofs/grass-temporal/meadow/temporal.json) · [Capture receipt](proofs/grass-temporal/meadow/capture.json) · [First still](proofs/grass-temporal/meadow/baseline-00.png) · [Middle still](proofs/grass-temporal/meadow/baseline-15.png) · [Last still](proofs/grass-temporal/meadow/baseline-30.png) · [Grass mask](proofs/grass-temporal/meadow/mask-00.png) · [4× slow viewing clip](proofs/grass-temporal/meadow/walk-4x-slow.mp4).

The clip plays the 60 Hz synthetic samples at 15 fps for inspection; counts come from lossless PNGs, not the compressed viewing clip. The cloud clock was read without mutation during the frozen capture: [observed phase](proofs/grass-temporal/meadow/observed-cloud-phase.json). The replay fixture explicitly sets that value. The original capture input left the legacy cloud field unset; its actual measured phase is retained separately rather than rewriting its receipt.
