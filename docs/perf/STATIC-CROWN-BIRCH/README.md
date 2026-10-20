# Live birch crown follow-up

Published 0.0.33 · b317734, High, native 640×360 post/MSAA4 at dusk. Read-only measurement; no repair, budget PASS, hardware timing or art-quality clearance is claimed.

`tree:wild:71:20`, birch/verdant-sentinel, base (70.897643, 2.165980, -39.023334), uniform scale 1.0636663. Native near audit: 76 distance-flagged components, 11 groups, zero whole-chunk candidates. Options: alpha:false, gap 0.75 world m, woodReach 1.5 world m, maxOperations 300000000. `audit.json` includes the next nine non-oak targets.

`groups.json` repeats the shared component graph on the exact exported native buffers. Centres are world-space transformed local component-box centres. Sizes are local box side lengths multiplied by uniform scale; they are **not** rotated world-AABB sizes. A group's distance flags alone do not prove visual disconnection. These are rest-geometry measurements; alpha masks and wind are excluded.

`wide.png` and `close.png` show the two fixed native views recorded in `views.json`. Clock/wind are frozen, startup raster suppression is restored before rendering, GL errors/context loss were checked, and MSAA samples are 4. Wind-motion quality is not tested. The camera poses are diagnostic outside views, not the recorded play-gate route. The close view does not frame every upper-crown group.

Visible upper patches require further opaque-surface tracing before repair. The unmasked audit links the entire crown into one box-connected chunk despite the separate far-from-wood subsets. No claim that a distance flag corresponds one-to-one with a floating silhouette.

Existing #690 fixes four orphaned birch twig roots but explicitly leaves leaf-distance reports unchanged. This receipt is a separate lead, not a duplicate root repair or evidence that its four roots regressed.

No production source, geometry, shader, placement or styling was changed. No before/after fix proof or stock budget run is claimed for this read-only receipt.
