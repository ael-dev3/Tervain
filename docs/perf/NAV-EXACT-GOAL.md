# Keep obstructed exact goals out of navigation paths

Related: #326 movement/navigation. Built on #534's navigation-specific collision query. Published repro target: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/).

## Repro

Near the bell tower, request a route from **(-1, 7)** to **(-0.48338, 5.24724)**. The grid correctly snaps the obstructed goal to the free cell at (-1, 7), but the final exact-goal optimization replaces that safe endpoint with the original obstructed point. Its line sampler excludes the endpoint and can skip the blocked cell entirely on this short segment.

The published route ends inside the actual standing-player capsule contact with the tower. The same bug reproduces at the well, an eastern sluice post, and two trees. These are finite Rapier contacts, not only approximate grid classifications.

## Fix and controls

Before appending/replacing with an exact goal, check that point against the navigation collision footprint. A free exact point remains usable even when its coarse grid cell is blocked; the fix does not reject all goals in blocked cells.

```sh
node tools/repro-live-nav-exact-goal.mjs --url https://ael-dev3.github.io/Tervain/ --out nav-exact-goal-proof
```

[Receipt](../../proofs/nav-exact-goal/report.json) · [before scene](../../proofs/nav-exact-goal/before.png) · [after scene](../../proofs/nav-exact-goal/after.png).

The script reconstructs the full published grid, which must match the native grid exactly, and searches native circular obstacles for short routes that return an obstructed exact endpoint. Each baseline route must also match the published solver's result. The search stops after eight discovered cases; it is not exhaustive goal-space coverage.

- Returned endpoints intersecting real standing-capsule scenery/wood: **8 → 0**, across five obstacle IDs.
- All eight baseline routes match the native published solver.
- Reconstructed baseline grid matches the native grid.
- Native scene pixels remain identical; only the returned waypoints change.

The source change adds one final collision guard and uses the navigation-only query from #534. It adds no geometry, styling, menus or shaders. The screenshot is the actual first repro location; identical scene pixels are expected. No hardware timing or frame-rate claim.

Validation: **24 focused tests** and production build pass. New regressions cover a physically obstructed exact goal and an unobstructed exact point inside a coarse blocked cell. The obstructed-goal check failed on the baseline, returning the original blocked point.
