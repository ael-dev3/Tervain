# Front-lit Retina grass capture: excluded control failure

Loaded live **0.0.27 · 885436d**. High, browser 1440×900@2×, drawing buffer 2160×1350, native post/MSAA4 through ANGLE SwiftShader. The follow-up front-lit measurement is **excluded** from grass-flicker conclusions because its same-pose control changes.

An instrumented attempt changed 389 channels before enabling the footprint intervention. A separate run with **no material instrumentation** also changes at the same pose:

| Native image pair | Changed RGB channels | Maximum channel delta |
| --- | ---: | ---: |
| First image → first repeat | 389 | 158/255 |
| First repeat → second repeat | 136 | 28/255 |
| Repeats after stopping both app frame and presentation | 33 | 7/255 |

The first pair's differences lie in x499–648, y918–924 of the 2880×1800 screenshot, near a background prop. Stopping presentation does not establish a fully repeatable image. This does not isolate an engine defect, software-renderer defect, secondary capture or other cause. No helper patch, grass white-speck count or quality PASS is justified by these images.

The camera is outdoors: `(3,terrain.heightAt(6,26)+1.4,24.9)`, looking at `(35,height+0.3,36.7)`. A separate footprint check finds 0 camera positions inside any of 19 building footprints expanded by 1 m; minimum clearance from the expanded footprints is 1.166 m. An earlier camera inside a house was discarded entirely.

Clock, wind, cloud phase and camera are fixed by the retained controller. It calls native `grade.render` directly with dt 0; it is not full gameplay or a timing replay. The unfrozen pair disables the normal app draw/simulation methods; the frozen pair additionally stops frame/presentation. The latter still changes, so presentation alone is not established as the cause.

- [Measured report](proofs/grass-frontlit-control/report.json), [full-image comparisons](proofs/grass-frontlit-control/comparisons.json), [full-image PNG hashes](proofs/grass-frontlit-control/capture-sha256.json).
- Lossless native crops, x440/y850/w300/h160: [first](proofs/grass-frontlit-control/original-crop.png), [first repeat](proofs/grass-frontlit-control/unfrozen-0-crop.png), [second repeat](proofs/grass-frontlit-control/unfrozen-1-crop.png), [frozen first](proofs/grass-frontlit-control/frozen-0-crop.png), [frozen second](proofs/grass-frontlit-control/frozen-1-crop.png).
- [Uninstrumented acquisition controller](proofs/grass-frontlit-control/acquisition.mjs), with repository-relative imports and [fixed controls](proofs/grass-frontlit-control/controls.json). From the repository root: `node docs/perf/proofs/grass-frontlit-control/acquisition.mjs --controls docs/perf/proofs/grass-frontlit-control/controls.json --x 6 --z 26 --frames 3 --out frontlit-control`. This prints measurements, not a quality PASS.

This failed follow-up does not alter #666's separate 0.0.26 backlit result: that view's inactive control changes 0 channels, its compiled poses match within 1/255 in four of 46,656,000 channels, and its exact-head budget passes. #666 remains a partial bright-transient fix with a documented 7.2% lower mean grass luminance; strict white specks remain open.
