# Camera near-plane versus posed hero

This read-only repro sweeps the compiled `CameraRig.follow()` against real tree and crown collision data. It tests the actual hero triangles after skinning with the production dual-quaternion CPU twin and the packed bone motions from the running build. Standard linear skinning would give the wrong geometry for this hero.

```sh
node tools/repro-camera-hero-clearance.mjs --url http://127.0.0.1:4173/ --pose walk --phase 0.5 --out camera-hero-proof
```

Repeat with `--pose idle`, `--pose run --phase 0.25`, and other phases in `[0,1]`. Each pose settles for two seconds, followed by up to one second of gait advancement. The `phase` argument selects that additional interval; it is not a normalized animation-clip phase. Node, Vite and Chromium are required; `--driver` selects a compatible CDP launcher.

For six tree circles nearest `(46,68)`, the check samples four standing approaches, twelve camera yaws, four pitches and five points in a sixty-step camera settlement. Blocked player positions are excluded. It checks both near-plane edges against body triangles and triangle edges against the near-plane rectangle. The hero has 87,874 vertices and 149,974 triangles. Posed geometry is cached before the camera sweep.

## Findings

| Sampled pose | Scenarios | Camera samples | Hidden-body samples | Visible near-plane contacts | Injected control contacts |
| --- | ---: | ---: | ---: | ---: | ---: |
| Idle | 1,152 | 5,760 | 2,460 | 0 | 205 |
| Run, additional 0.25 s | 1,152 | 5,760 | 2,460 | 0 | 94 |
| Walk, additional 0.5 s | 1,152 | 5,760 | 2,460 | 0 | 258 |

The unobstructed control had zero contacts in every run. The deliberately body-intersecting camera produced contacts in every run, proving the detector is not simply returning zero. The walk run saves the shortest visible-body boom sample: about 1.165 m, with no triangle contact. See [numeric receipts](camera-hero-proof/walk.json), [native frame](camera-hero-proof/walk-shortest-visible-boom.png), and the authorized [playtest reference at 31 seconds](camera-hero-proof/playtest-31s.jpg). Earlier [idle](camera-hero-proof/idle.json) and [run](camera-hero-proof/run.json) receipts cover the other sampled poses.

These results **do not reproduce or clear the reported shoulder clipping**. They cover three poses and six trees, not all gait phases, headings, obstacles or motion transitions. A plane entirely contained inside a closed body without crossing its surface can evade this contact test; coplanar contact is also excluded. CPU skinning uses actual float-packed motions but double-precision arithmetic, so shader pixel agreement needs native review. Hidden-body samples are excluded from contact counts. `qualityPass` remains `null`; `pass` only verifies the controls and that the sweep ran.

The receipts use revision `62af8c8d1`, with camera/hero/skin code matching live `0b45a36` and only an unrelated idle-dust optimization. They are software-WebGL evidence, not hardware frame-time results. Camera behavior, colliders and visuals are unchanged.
