# Native tree-leaf motion capture

The existing crown graph and root audits cannot measure alpha-edge motion. This runner captures the delivered forest's leaf surfaces through the selected preset's native grading and MSAA, with its ordinary leaf/depth shaders. It hides wood and other drawables after **every** world update, so newly created grass or spray cannot contaminate the leaf-only image. It uses no replacement foliage shader. Images are deliberately isolated diagnostic views, not the game's normal appearance and not evidence that all the pictured leaves float.

The camera rotates about a fixed eye, with simulation/shader time held still. The first capture prepares the shadows; subsequent frames retain that frozen shadow state. It captures a stationary control and a deterministic pan, checks actual framebuffer samples during the scene pass, then encodes lossless frames before motion-compensated analysis. A headed option uses the selected browser's hardware path; it does not turn these synthetic readback captures into a frame-time benchmark.

```sh
# Headless software functional check:
node tools/capture-tree-edge-motion.mjs --url https://ael-dev3.github.io/Tervain/ --frames 3 --degrees .3 --out artifacts/tree-edge
# Longer comparison on a graphics-capable host, without software fallback flags:
node tools/capture-tree-edge-motion.mjs --url https://ael-dev3.github.io/Tervain/ --headed true --frames 120 --degrees 4 --out artifacts/tree-edge-long
```

Options also include `--quality high|medium|low`, `--hour`, `--x` and `--z`. Defaults select the grove near (−40,0), High, noon, 24 pan frames and four degrees. No game source or assets change.

## Published 0.0.18 · 421d34b functional receipt

This software-WebGL **three-frame smoke sample** checks the runner, not tree quality. There is only one usable temporal triplet in each route; a longer comparison is still required for a quality decision.

| Measurement | Stationary | 0.3° pan |
| --- | ---: | ---: |
| Captured frames | 3 | 3 |
| Usable triplets | 1 | 1 |
| Mean temporal luma residual (0–255) | 0 | 3.66333 |
| Bright residual share, 18/255 threshold | 0% | 1.98745% |
| Motion-alignment coverage | 99.375% | 99.0701% |
| Observed native scene MSAA | 4 samples | 4 samples |
| Steady draws / triangles | 55 / 2,185,016 | 55 / 2,185,016 |

The first shadow-preparing control frame submits 90 draws / 2,502,617 triangles; the remaining views share the steady counters. Every capture reports zero GL errors and no context loss. All stationary PNGs are identical; the pan changes pixels. Replacing the pan with the stationary pixels correctly fails the no-motion validity control. This rejects a misleading zero-residual "pass" when the camera never moved.

[Receipt](proofs/tree-edge-motion/report.json) · [no-pan rejection](proofs/tree-edge-motion/no-pan-control.json) · [stationary](proofs/tree-edge-motion/stationary.png) · [pan start](proofs/tree-edge-motion/pan-start.png) · [pan end](proofs/tree-edge-motion/pan-end.png) · [lossless three-frame pan](proofs/tree-edge-motion/pan-frames.mkv).

The lossless sample has a synthetic 60 fps encoding cadence, not measured presented frames; three frames last 0.05 s. Leaf-surface residual includes cutout rasterization, texture detail, shading and occlusion edges. It is **not alpha-only attribution**, a full-scene score, a before/after visual-fix claim or a hardware performance result. `pass` means capture validity; `qualityPass` remains null.
