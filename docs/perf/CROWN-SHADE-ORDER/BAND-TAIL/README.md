# Zero-coverage grass-band tails

Follow-up to the stale canopy-shade fix in #715. Correct shade changes a few grass acceptance decisions, and the preceding a221a5a8c head exceeded the stock triangle budget by 252. This follow-up trims existing invisible submissions rather than changing density or placement to compensate.

The grass vertex shader returns a clipped position for every vertex when its distance-band presence is zero. Tile streaming omitted rank-faded tail clumps, but retained tail clumps wholly outside the same shader band. The change adds a conservative 1 cm margin at each boundary and trims only the trailing certainly invisible instances. Interior entries and partially faded clumps remain. Main and capture cameras use their own distance calculations, and post-render restoration remains intact.

No shader, colour, density, placement, wind, tile source data or authored foliage geometry changes. A new regression checks both margins, unchanged buffers, per-pass capture recovery and restoration. Original code fails; candidate passes. Forty-two related tests and production build pass.

## Reproduce

`tools/repro-live-grass-band-tail.mjs --url <build-url> --native after --out <output-directory>` uses source-exact methods from the preceding a221a5a8ce433d173f2248bd43781e075ee6cfe2 revision and the current checkout. On the preceding build, use `--native before`. The default baseline can be changed with `--baseline-ref`. All assertions are mandatory.

Native High/MSAA4, frozen time and wind, seven views: meadow, fence, woodland, run-round, bow, budget-context and oak-context. Startup-only raster suppression, if supplied, is restored before kept frames. The native mode and restored mode verify method replacement has not hidden a state change. SHA-256 checks cover all four grass source buffers. Frame counts are full native renderer draws/triangles. These custom seven-view camera poses are not the stock gate's follow-camera route.

The first run on the preceding compiled a221a5a8c build is exact at all seven views, including restored controls. Triangle reductions are 11,208; 2,136; 120; 336; 19,524; 7,344; 1,296. The tool on the current compiled head additionally reports alternating before/after settled grass-layer CPU samples (60 samples per mode, 16 calls per sample, six alternating rounds). These timings exclude generation, rendering and whole-frame CPU. Software counts/pixels/timings do not establish Mac GPU FPS or heat.

Compiled 9cfcbd98ed0a77c599d1821e670a185ae860bd05: all seven before/after images and native/restored controls match exactly, all source-buffer hashes match, zero console errors. The unmodified exact-head stock gate passes (observed exit 0): live b317734 285 draws / 3,048,306 triangles / 0 errors; candidate 9cfcbd98e 284 draws / 2,899,302 triangles / 0 errors. Delta −1 draw / −149,004 triangles (−4.89%). Two same-revision live probes and four completed frames per probe; no allowance or startup override.

## Compiled paired measurements

| Pose x/z | Draws before→after | Triangles before→after | Grass-update avg ms before→after | p95 ms before→after |
|---|---:|---:|---:|---:|
| -210, 0 | 193→193 | 3,606,404→3,595,196 | 0.0606→0.0698 | 0.0625→0.0875 |
| -2, 38 | 133→133 | 1,818,198→1,816,062 | 0.0730→0.0775 | 0.0813→0.0875 |
| -180, 12 | 244→244 | 4,119,128→4,119,008 | 0.0572→0.0571 | 0.0625→0.0625 |
| -12.3, 44.8 | 122→122 | 1,782,070→1,781,734 | 0.0533→0.0938 | 0.0625→0.1000 |
| -4, 46 | 104→102 | 1,655,230→1,635,706 | 0.0672→0.0778 | 0.0750→0.0875 |
| -33.4, 55 | 80→80 | 1,372,699→1,365,355 | 0.0449→0.0928 | 0.0500→0.1000 |
| 128, -1 | 261→261 | 5,860,867→5,859,571 | 0.0624→0.0565 | 0.1000→0.0625 |

The largest paired mean increase is 0.04792 ms; the largest paired p95 increase is 0.05000 ms. This is a disclosed CPU tradeoff for omitting invisible submissions, not a claim of free CPU work. The measurements are settled grass-layer update timings, not whole-frame CPU or hardware GPU time. No new shader work or texture sampling sites are added.

Current-head shade recheck: all 18 masks match retained geometry, 0/209,630 terrain vertices disagree, and all 60 retained tree geometry pairs match the published-live baseline. The empty exploratory `crownProfiles` field establishes no shader-uniform or camera-bound result.

## Exact-head stock receipt

`play-gate: PASS 9cfcbd98e`

See `budget-gate.log`. The scoped CPU values above are for the seven custom capture poses, not the stock follow-camera path or an upper bound for every frame. Triangle counts do not establish an overall Mac FPS/heat improvement.
