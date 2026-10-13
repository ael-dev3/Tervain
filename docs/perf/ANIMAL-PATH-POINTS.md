# Wildlife path grid-point reuse

Local wildlife A* reconstructed the same grid coordinates for each priority scan and neighbour check. Reuse one coordinate record per touched grid cell within each search. The cache holds coordinates only: collision/terrain validity and search ordering remain unchanged, and no cache is shared between searches.

Run `node tools/repro-animal-path-points.mjs animal-path-points.json`. It loads actual original/current planners, the authored dog definition, controlled thin-wall/active-contact cases, and real terrain/static scenery with a resident blocking the route.

Grid-point factory allocations: **650 → 74 (88.6% fewer)** across 11 cases. Every returned route matches, and every returned segment passes the normal body-volume collision/ground check. The authored-terrain resident case alone falls **113 → 18**. Straight-path and inactive-contact controls allocate zero grid points on both sides.

[Per-case before/after routes and counts](animal-path-point-proof/report.json). Diagnostic counters are injected by the repro loader, not production. Counts exclude the new per-search cache array and other planner allocations; they are not total heap, GC-time or hardware frame-time measurements.

Build/typecheck and 22 wildlife/world tests pass, including a regression that mutates a returned waypoint and toggles a collider before a fresh search. These remain independent searches with fresh collision state. No rendering/animation changes. Hardware play-gate and live evidence remain outstanding.
