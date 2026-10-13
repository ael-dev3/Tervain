# Skip grass blades whose shader width is already zero

Distant grass clumps submit every blade, even when `gBladeKeep` makes the later blades' width exactly zero. Their triangles are degenerate, but still execute the vertex shader.

The grass tile now draws only a conservative prefix of the existing indexed geometry. It uses the tile's nearest anchor distance to bound the largest blade share and retains a small float-rounding margin. Blade indices, seeds, density, width rules, wind, lighting, materials and buffers are unchanged. Secondary capture cameras calculate their own prefix before rendering; the main-camera prefix is restored for the main draw. Grass tiles do not cast shadows, so this is a main/capture draw cut, not a sun-shadow cut.

## Actual-build repro

```sh
node tools/repro-grass-draw-tail.mjs --url http://127.0.0.1:4173/ --expect before --out grass-before
node tools/repro-grass-draw-tail.mjs --url http://127.0.0.1:4173/ --expect after --out grass-after
```

Run the first command against the original production build, then the second against the changed build. The script freezes native simulation and compares each actual draw with a full-index control in the same state. On the original build those counters match. On the changed build the control still submits the original triangles while the actual draw omits the invisible tail. Counters cover native scene renders without postprocessing; screenshots are raw native scene output. They are not hardware timing or final graded appearance comparisons.

High preset, 640×360 software WebGL; all four full/optimized images are byte-identical:

| Terrain location | Full triangles | Actual triangles | Saved | Draw calls | Upload bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| (-7,45) | 1,514,905 | 1,499,356 | 15,549 | 106 | 0 |
| (18,20) | 1,857,365 | 1,846,007 | 11,358 | 132 | 0 |
| (46,68) | 1,566,022 | 1,563,445 | 2,577 | 83 | 0 |
| (-7,45), stream camera 30 m behind capture | 974,857 | 973,801 | 1,056 | 91 | 0 |

Draw calls and upload bytes are unchanged between each pair. The original-build receipt contains the first three routes; the changed-build receipt adds the different-camera regression control. Root/instance counts also match across the corresponding original and changed routes. Field triangle stats now account for the main camera's actual draw ranges instead of multiplying by full clump size; these stats remain an upper bound before frustum culling.

This is a modest reduction of demonstrated unnecessary geometry. It is not a 60-fps, heat or Apple GPU timing claim, and it does not fix grass sparkle. No buffer or texture-memory reduction is claimed. Camera-sensitive coverage and hardware timing should still be verified on the normal play gate.

Validation: 25 focused grass/visibility tests, TypeScript check, production build, before/after native repro, exact-image controls, and a closer-camera prefix/restoration regression test. Receipts and native screenshots are committed in `grass-draw-tail-proof/`.
