# Second static birch control: no repair promoted

Published 0.0.33 · b317734, High/MSAA4, frozen dusk. Selected `tree:wild:58:16` (birch/tree-1527), base (-12.341, 4.212, -62.428), uniform scale 1.0850456.

The native near source has 55 distance-flagged cards in seven far groups (`alpha:false`, world gap 0.75 m, wood reach 1.5 m). These are geometric distance subsets, not a count of visually separate opaque islands. Seating five eligible groups leaves 42 flags in two groups. Culling clears the flags by removing 110 of 12,000 source leaf triangles. Both preserve indexed source width/height/depth.

| Pose | Seating changed RGB pixels | Culling changed RGB pixels | Restored baseline |
| --- | ---: | ---: | ---: |
| Wider view | 1,180 | 2,038 | 0 |
| Closer view | 1,331 | 2,771 | 0 |
| Farther view | 265 | 505 | 0 |

The captures do not establish a separate visible island corresponding to those groups. Moving/culling the flags changes the near image substantially; a lower detector count alone is insufficient reason to change the crown. No production repair, fix PR, art-quality verdict or budget PASS is claimed. This rejects these generic trials as a validated fix, not every possible repair.

See `report.json` for exact cameras and native/seat/cull/restored draw and triangle counts; all twelve lossless PNGs are retained. The shared-template changes affect matching tree instances. The source geometry is cloned; only colour position/index are substituted. Native per-instance coverage stays aliased to its updater. Original shadow casters and warmed shadow maps are held unchanged per pose, and terrain/grass shade is not rebuilt from trial geometry. This is an isolated software colour study, not compiled-production or repaired-shadow proof. Native and restored controls match exactly; GL validity is checked by the script. No claim of a console-clean gate or hardware timing.

`repro.mjs` runs from a checkout with the existing browser prerequisites and supports `TERVAIN_URL` / `PROOF_OUT`. Optional startup raster suppression must restore before retained frames, as this run did. The script saves native/seat/cull/restored frames; the report's RGB differences were calculated losslessly with sharp after capture.
