# Coastal bay revision — 5 October 2026

The owner asked to reshape the map toward the supplied Gothic 3 coastal
screenshot. This extends [A52's art revision](gothic-direction-revision-2026-10-05.md)
within **0.0.12**, under [A53](../decisions.md). The image is a composition
reference: an open dark bay, broad ochre sand, low grassy rock shelves, a
lighthouse on a distinct headland, and a distant uninhabited coastal ridge.
Tervain builds its own geography and geometry. No reference pixels, terrain,
meshes, textures, code, names or fonts are copied into the main game, and the
image is not passed to image generation. The separate study routes are unchanged.

## Original landscape changes

The northern coast reaches farther seaward, framing a recessed cove opposite
Lantern Point while keeping the landing and first-town woodland route in their
established locations. The dry sand apron is broader; dunes begin farther inland
and have lower relief. Four irregular grass-capped benches form low coastal
terraces with exposed mineral lips and rubble toes. Their height, grass/sand/rock
paint, standing support and map appearance all read the same physical terrain.
They are local shelves, not a restored alpine wall across the beach horizon.

Lantern Point has a wider weathered cap and steeper foot. The existing original
round stone tower, rough keeper roof, supported spiral stairs, gallery and
enterable rooms are retained. The keeper compound still has a level terrace and
a real graded walking route; no extra buildings or ornamental banners are added.

An original low promontory across the bay gives the open water a distant edge.
It remains resident across graphics presets, with **10,556 triangles** and
private disposable geometry/material. It borrows the world's terrain textures
without taking ownership of them. The promontory is outside the playable world
and regional map: no settlement, discovery, quest, collider or new travel region
is implied. Offshore water uses this land mesh's sampled height and fixed
triangulation so the sea does not cover its dry sand/rock faces.
The wider sea and resident ridge add rendering work; no performance improvement
or minimum-PC qualification is inferred from their triangle budgets.

New shelf rocks gather in small uneven groups at selected sand/grass transitions.
Connected, tapered storm limbs lie close to the beach; short woody scrub has
attached, original painted cutout leaves. Independent seeded streams keep these
additions separate from established rock authoring and unrelated inland detail.
Whole detail envelopes reject roads, doors, pickups, source wood and one another.
Low driftwood/scrub are static presentation, not new movable cargo or full
collision meshes. Real blocking rocks retain source-triangle travel contacts and
remain visible across presets; nonblocking detail may be thinned by quality.

The sea now has a darker blue-green depth body and restrained silver reflections.
Existing wave relief, depth absorption, shore masking, reflection safeguards and
Reduced Motion behavior remain. This is a sheltered-bay color/value treatment,
not evidence of a different wave simulation or perfect native Gothic parity.

## Contact and continuity acceptance

Physical acceptance covers the safe arrival, dry sand/wading distinction,
coastal shelf caps and steep faces, rendered/support triangle agreement, regional
map land/sea color, and the distant land/water intersection. Grounded source tree
forms, the protected Pine, static attached foliage, hero motion/endurance,
compatible saves, items and score-led menu remain the established contracts.
Changed accepted world populations must be reported separately from retained
source binaries and cross-preset collision identities.

The independent preliminary lighthouse audit samples 200 foundation, tower-ring
and porch points at one exact **11.952917 m** terrace, with zero terrain mismatch.
Its 828 walking-strip samples retain a **3.2 m** route, minimum dry height
**0.935195 m** and maximum slope **0.280133**, below the existing 0.32 limit.
The original lighthouse aggregate is **19,998 triangles**. These measurements
check physical authoring; they do not substitute for the controller route tests
or native visual review.

### Final-source local verification

| Evidence | Result |
| --- | --- |
| Implementation | Original bay `7dc443a`, approach repair `ec66bdc`, final deterministic shelf-candidate repair **`f5a77ff1`**. Source tree/hero/NPC GLBs and separate study routes are unchanged in the source diff. |
| Combined suite | **1,120 tests in 113 files pass (43.96 s)** on the final implementation. No assertions, timeouts or configuration are relaxed. |
| Committed-source production build | Strict TypeScript and Vite build pass (**5.47 s**), retaining `0.0.12`; the existing large-main-chunk advisory remains. |
| Shelf authoring and preset mesh audit | Eight new shelf rocks with eight source contacts /two navigation proxies in the pure authoring audit. High /Medium /Low detail plans: driftwood 4 /3 /2, scrub 8 /6 /5; sea 47,836 /35,692 /29,436 triangles. These are plans/mesh sums, not submitted frame totals. |
| Native High panorama | Fresh production stamp **0.0.12 /f5a77ff1**, 1580×889 CSS /DPR1.8. Accepted source-fit population **447 trees (132 Pine /315 Meshy), 247 tree contacts**, 558 floor pieces; scatter 1,210 rocks, four wood /eight scrub. Player **(-248,4.9,14)** is grounded; promontory 10,556 triangles. |
| Native arrival and regional map | Ordinary 60° arrival at **(-268,0.5,27)** is grounded with the empty starting hotbar. The regional map shows the recessed bay/shelves and retained landing/road. |
| Native Low continuity | **335 trees (121 Pine /214 Meshy), same 247 contacts**, 784 rocks, two wood /five scrub and resident 10,556-triangle ridge. Arrival pose remains grounded; inspected Low shore retains the composition. |
| Fresh High restoration and console scope | New tab verifies **0.0.12 /f5a77ff1**, High /DPR1.8, the same 447 trees /247 contacts /1,210 rocks /four wood /eight scrub and grounded **(-248,4.9,14)**. Saved debug/capture size is **409×658**. Final scoped warning/error log is empty. |
| Required CI /approved hosting /served revision | Pending integration; local acceptance is not publication. |

The first combined pass exposed two real shore-salvage reach failures. Moving
the northern low bench away from the established wreck approach fixed them;
the next pass exposed shelf-candidate RNG dependence on a rejected tree neighbour.
Giving each shelf stone an independent seed/stream fixed that without changing
keys or adding a bespoke pickup pad. The final combined suite above supersedes
both intermediate failures and the preceding 1,110-test `108c5a8` art result.
The accepted High population adds two Meshy trees, two contacts and six floor
pieces over the preceding 445 /245 /552 art scene; exact source binaries remain
unchanged. The pure 947-tree /636-obstacle candidate plan is not the rendered
population. The manual panorama uses 70° FOV and a higher review camera;
ordinary gameplay stays at 60°. It is not an identical-frame reference comparison.
The raw native panorama is 1499×889, while its debug state reports the CSS/DPR
above; no equal-resolution comparison or performance result is inferred.
The native shore views use the existing Reduced Motion preference and are
static composition checks. They do not establish new moving-water frame timings
or a same-position High →Low →High loop; the fresh High-default restoration is
separate from the earlier same-arrival-pose High →Low change. Ordinary arrival/map/Low captures are `coastal-player-camera.jpg`,
`regional-map.jpg`, `coastal-low-camera.jpg` and `final-runtime-low.txt`.
Evidence is retained in `outputs/tervain-coastal-bay-review/`, including
`final-runtime-high.txt`, `coastal-bay-final.jpg`, `final-runtime-restored-high.txt`,
`coastal-bay-restored.jpg`, `final-console.json`, final test/build logs and audits, and the
[same-version release follow-up](../production/releases/0.0.12.md). A screenshot,
test duration or loading time is not a gameplay frame-rate measurement.

Bounded local landscape acceptance is complete on the final implementation.
Final-source CI, deployment and served version/revision verification are
pending integration. This record establishes neither a live build,
a minimum PC specification, exhaustive no-clipping proof, all-instance tree
fit nor a complete reconstruction of the reference game's world.
