# Advancing-wind grass coverage receipt

Read-only native software-WebGL comparison on published **0.0.33 b317734**, not a new production fix. The session-only probe applies the exact #700 sheen expression (`gBladeCov`) versus published `gThin`; it does not apply #701, #710 or other pending changes. Initial inactive instrumentation is RGB-exact; all 17 restored controls are exact. This is an additional controlled study for #700, not a replacement compiled-head budget gate.

Requested 1470×956 at DPR2; actual native post/MSAA4 raster **2205×1434** after the native cap. Camera walks x=6→10.16, z=23, 1.6 m above terrain, turns −8°→8°, hour17.5. Seventeen samples at 10Hz, 2.6m/s, over 4.16m. Wind/flutter and sway clocks advance 3→4.6s; recorded gust direction/scroll, clouds, actors and shadow maps are held fixed. Each before/after/restored pair shares the identical phase and camera. Groundcover prepares along the route; other world simulation/culling updates are held fixed. Water reflection is invalidated equally for each render. This is **not** a 60Hz real-play video, hardware pacing/M5 heat measurement, or full dynamic-shadow test.

| Observation | Published → coverage probe |
| --- | ---: |
| Affected full-scene warm-bright observations, Y≥140 | 14,552 → 11,900 |
| Affected bright temporal jumps >60, endpoint Y≥140 | 21,408 → 18,298 |
| Affected near-white Y≥180 | 0 → 0 |
| Affected strict-white min RGB≥245 | 0 → 0 |
| Fixed foreground crop bright observations Y≥140 | 8,019 → 6,752 |
| Fixed crop isolated bright pixels (8-neighbour, interior only) | 532 → 380 |
| Fixed crop bright jumps >60, endpoint Y≥140 | 9,757 → 8,385 |
| Fixed crop near-white Y≥180 | 0 → 0 |

Mean full-scene display luminance 62.687585→62.458871. Draws and triangles match in every pair, including auxiliary passes; raw per-pose numbers are in report.json. Zero console errors. The diagnostic uniform/branch is not native production shader timing evidence; hardware shader/frame CPU cost is unmeasured here. No new budget PASS is claimed.

The effect-union counts include post neighbours/reflections and disocclusion. The fixed crop (x100,y850,width960,height560) is predominantly foreground grass, **not a semantic grass mask**. Neither is motion-compensated tracking or a pure shimmer score. Counts are observations across frames, not unique world blades or events. The route does not reproduce strict-white specks; warm-motion improvement must not be labelled a white-speck cure or 10/10 coverage.

The two lossless RGB clips contain all native-resolution crop frames at 10fps, without interpolation/resizing. Every decoded RGB frame is hash-verified against its retained PNG. Full first-pose before/after images, all crop PNGs, full-frame hashes, raw metrics and portable reproduction are retained. The clips' endpoint transition is not included in temporal metrics.

Reproduce on a build of the pinned baseline (not an already-patched candidate): from repository root run `CHROME=... node docs/perf/GRASS-MOVING-WIND-PROOF/repro.mjs --url BASELINE_URL --frames 17 --hour 17.5 --out OUTPUT_DIRECTORY`; then `python docs/perf/GRASS-MOVING-WIND-PROOF/measure-crop.py OUTPUT_DIRECTORY`. Use `python docs/perf/GRASS-MOVING-WIND-PROOF/encode-clips.py OUTPUT_DIRECTORY` for the verified clips (requires FFmpeg). Python uses Pillow and NumPy. Fetch the pinned PR source object with `git fetch origin pull/700/head` before the repro; its preflight verifies the candidate expression against that commit. The report records the full source SHA-256. The script uses the existing native renderer and readiness helper; any optional startup raster suppression must restore native draws before retained images (the script asserts this). No source game edits.
