# Skip supported oak seating samples

Production head `58ac0c40a9b9b6f21d0d758af9afe3336b3c13e8`; baseline/live source `41a754200b6992a9ae39edd6dbfc0440d9a190a7` (0.0.36). Only `seatFarCards` changes: once a sample is within reach, the minimum cannot increase and the component will stay put. Stop sampling it. Components that require movement retain the complete original search order, nearest contact and shift. Thresholds and geometry policy do not change.

## Real-input proof

The native candidate world retained **16 actual pre-seat inputs** (leaf attributes/indices, final wood, reach and inside factor). Replaying original and candidate produces exactly matching **every geometry attribute and index**, moved counts and returned-reference behavior for every input. This includes wind/pivot attributes. The hook is not in production. Raw per-input counters, retained-input assertions and nine rotating timing batches are in [report.json](report.json).

| Construction nearest-wood queries | Original | Candidate |
| --- | ---: | ---: |
| All retained calls | 334,985 | 158,095 |

Warmed replay of all retained calls, milliseconds per complete construction replay (not per frame):

| Mode | Mean | Median | p95 |
| --- | ---: | ---: | ---: |
| before | 1987.72 | 1995.20 | 2022.50 |
| after | 1134.91 | 1124.50 | 1177.40 |
| control | 1979.39 | 1966.60 | 2027.60 |

`control` repeats unchanged original source; modes rotate across nine rounds after three warmups. This measures construction work only, with software Chrome and diagnostic counters in both modes. It is not a gameplay/GPU/heat benchmark.

## Native pixel proof

Two independently loaded native High worlds at 640×360, DPR 1, original/candidate production source. Captured at `45bd19063`; all renderer/runtime source is identical on the final production head (only the regression counter classification and its type guard changed afterward). The compiled budget gate below was rerun on the exact final head. Three hero-oak eye-height views (20 m south), forest and sea; frozen time/wind, native post/MSAA, no manual geometry replacement. Each pose is rendered twice: **all 20 PNGs match RGB exactly by pose**. An independent Pillow decode agrees with the repro's Sharp comparison; see [independent-pixels.json](independent-pixels.json). These are fixed eye-height positions, not verified walkable camera routes.

| Pose | Original and candidate draws | Original and candidate triangles | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| 0: tree:wild:32:27 | 519 | 8,002,752 | 0 |
| 1: tree:wild:68:13 | 326 | 4,297,113 | 0 |
| 2: tree:wild:26:25 | 417 | 6,074,777 | 0 |
| 3: forest | 607 | 7,400,350 | 0 |
| 4: sea | 139 | 778,897 | 0 |

[Before hero](before-0-0.png) · [after hero](after-0-0.png) · [before forest](before-3-0.png) · [after forest](after-3-0.png). All PNGs retain explicit mode/pose/repeat names.

## Budget and regression

[Unmodified compiled budget result](budget.txt): exact production head, stock automatic journey startup, two stable published baseline probes, maximum over four distinct completed frames, zero allowance and zero console errors. Only the candidate endpoint is redacted. Shader source, texture taps, per-frame JS code and upload behavior are unchanged; frame CPU and hardware pacing are not measured here.

The regression counts only wood-triangle searches (excluding the separate leaf-centre projection): five on original source and one on candidate, with the same returned input geometry. Existing shell seating tests remain. 36 focused tests and the build pass. Portable two-fresh-world repro from a checkout of this evidence commit (its production files match the final production head):

```sh
node tools/repro-oak-seating-samples.mjs oak-seating-proof
```

The tools live in this evidence commit. The ordinary render path is used; no load-only raster suppression hook is required by the public script. A software-capable Chrome can be selected through `CHROME`.

## Independent published crown follow-up — not a repair claim

[Selected live audit](live36-audit.json), published 0.0.36 · 41a7542, gap 0.75 m, woodReach 1.5 m, 300M operation ceiling, near LOD:

| Tree | Unmasked detached cards / clumps | Alpha-aware detached triangle components / groups |
| --- | ---: | ---: |
| tree:wild:32:27 | 0 / 0 | 2,111 / 54 |
| tree:wild:68:13 | 0 / 0 | 560 / 105 |
| tree:wild:26:25 | 0 / 0 | 53 / 37 |

Alpha mode works on opaque triangle components, so these are not directly comparable card counts. All three have **zero unsupported connected-crown candidates** at the 0.75 m gap. Finite opaque probes yield witnessed/sample distances, not a measured empty gap; flags alone do not establish visible floaters. Native published-build views at 960×540, DPR 1, 20 m, terrain +1.7 m, frozen High at hour 15: [hero A](live36-hero-0.png), [hero C](live36-hero-1.png), [hero B](live36-hero-2.png); [camera/cost records](live36-views.json). No clearly isolated player-visible clump was established in those views; no placement/culling change was justified. The initial audit and later version check both reported 41a7542. These single live views are not before/after repair proof or the compiled budget result.

Read-only repro tools: `tools/repro-live-oak-cutout-audit.mjs [build-url] [output.json]` and `tools/capture-live-hero-oaks.mjs [build-url]`. Audit imports the pinned checkout's helper through a temporary development server; run with the production head or pinned baseline helper source. No floating-crown closure or 10/10 claim.
