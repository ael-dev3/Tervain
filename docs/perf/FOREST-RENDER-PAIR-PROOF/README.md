# Forest render-pair reuse

Source `eba5bae11b60c6b9a3c47720596f3960ac2fa7b9`. Live 0.0.33 · b317734 vs candidate eba5bae11. Native High 640×360 post/MSAA4, six fixed camera/wind poses, no geometry/material/bounds/render overrides. Every independent before/candidate RGB hash matches; each build also repeats every render with exact RGB and equal draw/triangle counts. Real raster is enabled for all retained frames.

Observed eligible temporary two-element array iterations during each native World.update: **180→0** at every pose. Integration fixture regression: **243→0**. These count the three known forest pair-list allocation sites during a refresh, not all allocations or idle-frame costs. The old actual production source fails the regression; 25 focused tests and production build/typecheck pass.

Draws, triangles and texture counts are equal at all six poses; see both reports for each full-render count. The stock budget gate runs independently with normal startup, no initialization override and no allowances. Its exact-head result is in `budget.log`. No hardware frame time, Apple GPU, FPS or heat improvement is claimed.

Run `node tools/repro-forest-render-pairs.mjs --url BUILD_URL --out OUTPUT_DIRECTORY` separately against each build; add `--expected 0` to assert the repair. Compare report hashes/counts. The maintained script removes a stale report before launch and only writes PASS after every pose, repeat, version and console assertion succeeds.
