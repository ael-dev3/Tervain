# Leaf-island search scratch proof

Feature head: `d778ff65b8ffa82a7829771e1cd64cb13fc7a214`. Baseline: `7f679b9`. This is a load-time allocation reduction. It does **not** repair or close the floating-crown report, demonstrate a 60 Hz/frame-time improvement, or measure Apple GPU performance or heat.

## Native construction replay

The candidate world retained the 60 actual pre-repair leaf geometries, woods, decoded alpha samplers and production options. Original and candidate algorithms replayed each independently. Every geometry attribute (including wind/pivots), index and repair result matches exactly. Instrumentation records identical work: **254,350 neighbour visits and 1,756 nearest-part searches**.

| Targeted source-allocation sites | Before | After |
| --- | ---: | ---: |
| Neighbour arrays | 254,350 | 60 |
| Nearest-search vectors | 5,268 | 120 |
| Nearest-search sample arrays | 1,756 | 0 |
| Nearest-search result records | 1,756 | 0 |

Counts are source allocation sites multiplied by measured invocations, **not a sampled heap profile, exact bytes or total game allocations**. Unrelated allocations remain. The new per-function scratch is local, not shared across worlds; each island retains its winning contact in independent vectors. Sample order, query cutoffs, tie handling, grid visits and placements are unchanged.

Nine rotating warmed batches, each evaluating the three most search-heavy inputs, give elapsed mean/median **20.20/19.90 ms before, 20.66/21.00 ms after, 20.51/20.60 ms unchanged control**. Timing overlaps: no speedup is claimed. Input clones/disposal are excluded; this is not whole loading latency, frame CPU or GPU timing. Raw batches and input indices are in `summary.json`.

## Native same-camera rendering

Four views on two separate native worlds: three High forced-far (`lod=2`) hero-oak diagnostics and a sea control. These are **not normal-distance walking or follow-camera evidence**; two cameras are elevated. All 16 PNGs (two repeats per view/build) match RGB by pose. Draws/triangles and camera/quaternion match. Pillow independently decoded and checked every PNG; see `independent-pixels.json`.

| Pose | Draws, both builds | Triangles, both builds | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| hero-oak-b | 159 | 1,454,424 | 0 |
| hero-oak-c | 410 | 3,095,656 | 0 |
| hero-oak / Tree32 | 401 | 3,428,325 | 0 |
| sea control | 147 | 713,403 | 0 |

[Before](before-0-0.png) / [after](after-0-0.png), [Tree32 before](before-2-0.png) / [after](after-2-0.png). Zero captured console/WebGL errors. Geometry summaries retain per-template position/index hashes and lengths; full numeric geometry dumps are omitted to avoid duplicating model payloads. The portable repro outputs the complete report.

The pinned original-world captures were reused from the earlier read-only contact study: the baseline source, all poses and unchanged production files were checked before reuse. The final candidate uses scratch reuse only; no exploratory contact-policy edit is included. The published repro runs both worlds fresh and asserts RGB/counter equality, plus every native-input attribute/index/result equality. The small capture-only input snapshots and counters are excluded from production and budget runs.

## Validation

The regression fails on original code (six centre-target objects versus two); 42 focused tests and production build pass. No changed shader, material, texture or per-frame loop. See `old-regression.log`, `tests.log`, `build.log`, `source-pins.json` and the **unmodified exact-head stock gate** in `budget.log`. It used ordinary startup, no raster-suppression init, no allowance and the same four-completed-frame sampler. Its result does not establish hardware pacing or heat.

## Reproduce

Check out this proof commit, install the repository's locked dependencies and select a headless software-WebGL Chrome through `CHROME`. From the repository root:

```sh
node tools/repro-live-leaf-island-search.mjs leaf-island-search-proof
```

Both worlds run sequentially. No save changes, geometry swaps, hidden raster suppression during captures, production source edits or automatic publication occur. The original revision must be available in local Git history. The candidate is the checked-out `leafIslands.ts`; keep it at the feature head for comparison.

For the compiled stock gate, build the feature head, serve its output, then run the unchanged repository tool with your candidate URL:

```sh
node tools/play-gate.mjs --url CANDIDATE_BUILD_URL --budget-url https://ael-dev3.github.io/Tervain/ --head d778ff65b8ffa82a7829771e1cd64cb13fc7a214
```

Floating crowns remain open. See `rejected-contact-graph.json` for the read-only, shared-template check at the repair-specific thresholds (not the pinned visual audit). The exploratory geometry policy changed placements without improving the sampled far hero-oak disconnected-component counts (0 to 0 at that measurement's own reach/gap); it was rejected, not shipped. Individual triangle-distance flags are not equivalent to detached clumps or visible quality.
