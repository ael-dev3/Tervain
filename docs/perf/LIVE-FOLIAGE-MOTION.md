# Published foliage motion and detail-level checks

These diagnostics exercise published native geometry and the native post/MSAA capture path. They change no foliage appearance. Software rendering provides repeatable correctness captures; it does not measure hardware frame pacing.

## Crown coverage at every detail level

The same alpha-aware support audit compares published 0.0.15 with 0.0.16, including all 453 registered forest targets (trees and shrubs). Alpha is sampled at six barycentric subdivisions; contact tolerance is 0.75 m and wood support reach is 1.5 m. All three level audits finish within the operation budget.

| Detail | Targets with wood | Disconnected candidates before | After |
| --- | ---: | ---: | ---: |
| Near | 453/453 | 792 | 0 |
| Middle | 453/453 | 495 | 0 |
| Far | 325/453 | 723 | 723 |

The other 128 far-level targets are pines with leaf geometry but no wood geometry. They are explicitly reported as missing support, rather than silently counted as passing. At seven sample points across each of the two native medium-distance transition bands, 6,342 samples cover all targets. There are 768 unmatched wood/leaf coverage samples and no entirely empty samples, in both published builds.

High keeps full models for non-shrubs; the transition audit explicitly exercises native medium-distance packing with distance detail enabled. Rest-geometry connectivity and transition packing do not prove connectivity under every wind deformation or every visible pixel. These findings therefore do not mean that near/middle visual fixes failed; they identify far-level and transition coverage still needing review.

[Before receipt](proofs/live-foliage-motion/before-crowns.json) / [after receipt](proofs/live-foliage-motion/after-crowns.json).

```sh
node tools/audit-live-crown-transitions.mjs --url "$BUILD_URL" --diagnostics "$DIAGNOSTIC_MODULE_ORIGIN" --out outputs/crown-transitions.json
node tools/capture-live-grass-walk.mjs --url "$BUILD_URL" --quality high --frames 31 --metres 12 --out outputs/foliage-motion
```

The diagnostic-module origin serves the checked-in source modules through Vite. Geometry and rendering come from the target build; the diagnostics import audit routines only. A white-pixel metric and same-camera streaming-change count are included in the walk capture. Their region of interest is not a semantic grass mask, so neither should be described as a complete visual quality score.

## Capture validity

The walk capture records errors retained from startup separately, clears them, and rejects any subsequent controlled draw with a WebGL error or lost context. Startup errors must remain visible in the receipt; a low flicker score is not a startup-health certificate. The sampled route begins at (-7, 45), uses 640×360 with native four-sample post/MSAA, and walks at a synthetic 60 Hz cadence. The 1.3 m video and 12 m streaming sweep cover that route only, not the entire meadow or all world streaming boundaries.

## Matched walk and streaming measurements

Clock (19:28), wind time/direction/scroll, sway phase and grade time match in the two receipts. The native scene is frozen while the camera moves 1.3 m at walk speed. Stationary controls have zero sparkle and zero white flicker in both builds. More than 99.5% of pixels remain usable after alignment. Every controlled capture draw passes the WebGL error check. Both builds retain startup error 1282 before that check; this startup failure is tracked separately by the cold-Continue fix.

| Grass-region measurement | Published 0.0.15 | Published 0.0.16 |
| --- | ---: | ---: |
| General sparkle share | 0.6451% | 0.5529% |
| Near-white flicker observations | 3 | 28 |
| Near-white flicker share | 0.0000965% | 0.0009007% |
| Abrupt streaming-change events across 12 m | 0 | 0 |
| Events per metre | 0 | 0 |

White candidates require every RGB channel ≥180, luma ≥200 and channel spread ≤40, then the existing aligned temporal sparkle test. Counts are pixel observations across frames, not distinct blades. The region also contains other scene surfaces. The tiny white sample does **not** establish a reliable improvement or regression for grass flowers, and does not close the reported white-spot bug. General sparkle improves about 14.3% on this route; a version comparison cannot attribute that to one particular change.

The pop-in detector compares images at the same camera before/after the native grass update, every 0.5 m. It counts connected changed-pixel components of at least 16 pixels with channel delta ≥20. Repeated same-camera captures change zero pixels. Zero detected events does not rule out a hard distance edge already present, gradual fades, other routes, trees or other streaming systems.

[Before walk receipt](proofs/live-foliage-motion/before-walk.json) / [after receipt](proofs/live-foliage-motion/after-walk.json), [before clip](proofs/live-foliage-motion/before-walk.mp4) / [after clip](proofs/live-foliage-motion/after-walk.mp4), [before frame](proofs/live-foliage-motion/before-walk.png) / [after frame](proofs/live-foliage-motion/after-walk.png). Clips use lossless H.264 encoding; metrics use original PNG pixels.

Validation: seven focused metric tests and type-check pass; both matched software-rendered walk/streaming probes pass all six measurement assertions. The crown audits complete at all three levels, while explicitly retaining missing support and unmatched transitions as unresolved quality findings. Hardware video/quality validation remains pending.
