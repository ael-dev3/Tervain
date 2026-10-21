# Selected Low-preset fir support repro

Published 0.0.45 · `9394371`; source build/end revisions match. Low preset, original post, 640×360 DPR1, software WebGL, hour15. This is not High main-view or hardware timing evidence.

Find `fir/fir-spire` by origin **(89.929,1.071,87.731)**, uniform scale 2.183634. Its fallback label is **`tree:1:54`** on Low, versus `tree:2:62` on High; use asset/position rather than comparing those labels. Camera **(97.929,12.399,122.731)**, target **(89.903,27.581,87.601)**, ground +1.7 m.

After native updates, the target is present in visible **fir-spire:1:wood** and **fir-spire:1:foliage**, both with coverage **[0,1]**. Thus this preset actually selects the retained middle geometry; it is not merely an audit of unused High LODs. Placement matrices match across all three levels.

Wood reaches 49.787 m above its base at near detail but only 20.427 m at middle/far; leaf geometry reaches 52.407 m. The final fir/shorepine/palm support pass in flora.ts is limited to l===0. This identifies a lower-detail support-geometry gap. The normal images show the selected representation; do not treat every distance flag or thin silhouette island as independently proven visible floating geometry.

The complete Low middle alpha-aware audit flags **1375 sampled opaque components in 9 groups** for this tree. The coarse High retained-middle audit counted 48 cards in one group: these are different representations/metrics, not a before/after increase. Null maxWoodGap means no finite distance from the bounded search, not measured infinity. The raw audit and active-instance evidence are in report.json.

Both native stills are RGB-identical, zero console/GL errors. Load-only raster suppression is restored/asserted off before rendering; time/wind are frozen. No geometry/material/style change is proposed. A budget-preserving visual repair requires separate judgment; none is claimed here. Hardware pacing and general shimmer remain open.
