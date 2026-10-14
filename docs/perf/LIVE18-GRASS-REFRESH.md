# Published 0.0.18 grass motion refresh

Captured the published 0.0.18 · `421d34b` build at the existing meadow route (x −7, z 45), High, hour 19.3. The whole native scene goes through post-processing and 4-sample MSAA at 640×360 in software WebGL. Clock, wind, actors and interactions are frozen; the camera follows a synthetic 2.6 m/s path at 60 Hz steps. These are image measurements, not hardware FPS or M5 timing.

| Measurement | Stationary control | Walk |
| --- | ---: | ---: |
| Captured frames / analysed triplets | 51 / 49 | 51 / 49 |
| Near-white flicker observations | 0 | 0 |
| General sparkle share | 0 | 0.25052% |
| Alignment validity | 100% | 99.52857% |

The 51-frame walk spans 2.1667 m. Near-white thresholds are minimum RGB channel 180, minimum luma 200, maximum channel spread 40. The 512×216 ROI starts at (64,126); it is not a semantic grass mask. The separate 24 m pop-in route uses 0.5 m steps and same-camera before/after streaming updates: **zero events**, with a 20-value pixel-delta threshold and minimum connected area of 16 pixels. The repeat control changes zero pixels. This does not exclude smaller or off-route changes.

Setup producer stats: 20,524 grass instances, 1,003,104 nominal triangles and 53 producer draws. These are producer statistics, not GL timing or whole-scene GPU counters. Startup GL errors are empty; each captured render checks GL validity and context loss. The procedural measurement assertions pass; **qualityPass remains null**. This supports the dusk white-speck regression result, not every wind phase, noon, camera angle or visual-quality claim.

## Video and replayable evidence

- Viewing clips: [stationary](proofs/live18-grass-refresh/stationary-view.mp4), [walk](proofs/live18-grass-refresh/walk-view.mp4). These H.264 4:2:0 clips are for viewing, not metric recomputation.
- Exact RGB clips: [stationary](proofs/live18-grass-refresh/stationary-lossless.mkv), [walk](proofs/live18-grass-refresh/walk-lossless.mkv). Lossless H.264 RGB, decodable with FFmpeg; browser codec support varies.
- [Summary](proofs/live18-grass-refresh/summary.json), [full capture report](proofs/live18-grass-refresh/capture.json.gz), [per-frame RGB/PNG hashes](proofs/live18-grass-refresh/frames.json).
- Native walk frames: [first](proofs/live18-grass-refresh/walk-0.png), [middle](proofs/live18-grass-refresh/walk-25.png), [last](proofs/live18-grass-refresh/walk-50.png).

`node tools/verify-grass-motion-clips.mjs` decodes both lossless clips, checks all **102 full-frame RGB hashes against the original PNGs**, and recomputes the complete stationary/walk metrics. [Verification](proofs/live18-grass-refresh/clip-verification.json) passes exactly, not within a tolerance. It does not remeasure the pop-in frames; their full numeric records are retained in the capture report.

The source capture command is `node tools/capture-live-grass-walk.mjs --quality high --hour 19.3 --frames 51 --metres 24 --out live-grass-walk`; the existing optional URL/test-host preload supports verified asset serving. This run predates the [phase-record repair](GRASS-PHASE-ROUNDTRIP.md) and used no `--controls`. Its legacy phase metadata lacks the hour/cloud phase needed for strict source-phase replay; no matched before/after production change is claimed here. New captures record those fields.

Trees, bark, real movement/wind, noon behaviour and hardware performance still need their respective gates. The original night/mud hitch remains unproven fixed.
