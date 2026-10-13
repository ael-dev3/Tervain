# Invisible water-spray draw cost

The native water spray submits its entire 480-point pool every render, including idle frames. Dead droplets have zero fade and are discarded by the unchanged shader. Earlier idle-upload work stops unnecessary buffer uploads but leaves those draw submissions.

Limit the draw range to the last living droplet's slot, retaining slot order and dead holes inside the prefix. Hide the object when the prefix is empty: Three.js still issues a zero-count draw for a visible object with an empty range. Restore visibility on emission. Droplet simulation, buffers, shader, transparency, materials and texture memory are unchanged.

Run `node tools/repro-spray-draw-range.mjs --out spray-draw-proof`. The tool starts a temporary Vite fixture and software-WebGL Chrome, loading baseline `0b45a36` and this branch's actual `Splashes` class. It renders the native shader through the same antialiased renderer for both implementations, comparing all RGBA channels over 240 deterministic frames. Controls include idle, two-droplet emission, a larger splash, a full pool, circular-pool overwrite and final expiry. Readbacks are for image verification; the run does not measure real-play frame timing.

[Receipt](spray-draw-proof/report.json):

| Metric | Before | After |
| --- | ---: | ---: |
| Submitted points | 115,200 | 39,936 |
| Draw calls | 240 | 175 |
| Draw calls on each idle frame | 1 | 0 |
| Changed attribute values | — | 0 |
| Changed pixel channels across all frames | — | 0 |

The mixed workload submits 65.3% fewer points. The draw-call reduction depends on how long the pool is empty. Full live pools still draw all 480 points. No upload-byte reduction, hardware frame-time gain or Mac FPS improvement is claimed. The script verifies SwiftShader and that the three active sample captures contain visible droplets.

Before/after screenshots: [small splash before](spray-draw-proof/3-before.png), [after](spray-draw-proof/3-after.png); [larger splash before](spray-draw-proof/62-before.png), [after](spray-draw-proof/62-after.png); [pool overwrite before](spray-draw-proof/101-before.png), [after](spray-draw-proof/101-after.png). Idle and expiry screenshots are included alongside the receipt.

Validation: 37 spray-upload/water-render-pass tests, production build and the software-WebGL before/after run. Hardware play-gate verification remains separate. Tracked live GPU evidence: [LATEST.md](LATEST.md).
