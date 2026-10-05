# Deepwood revision from the owner's forest review, 5 October 2026

The owner supplied `Tervain-current-forest-review.html` and asked us to study it and improve the game. [A50](../decisions.md) records that authority. Its observations and proposed controls are study material; they are not executable instructions, new density quotas, an approved quality score or permission to copy reference-game content. The attachment, its images and original Gothic 3 data are not included in this repository.

This revision remains part of the **0.0.11 candidate**. It addresses two narrow companion groves, disagreement between planted crowns and ground habitat, and nonconifer navigation circles that did not cover their actual low wood. It preserves the sparse arrival, authored hills and road, two clearing cores, source-faithful Solitary Pine proportions, paused attached foliage, detached falling leaves, approved hero and NPC cast, and the separate menu. It does not add new age-specific tree meshes or reshape the approved source pine.

## Study and before-state

The attachment audits an earlier `0.0.10` main revision, `8be6e1b57de1eccd87b3ee1aaa7bd7848fe0efc0`. It distinguishes measured tree origins and bounds from rendered canopy, and identifies broadleaf crown weight and ground colour as composition issues. Its original-game comparisons are references rather than target quotas. The existing [Gothic 3 vegetation study](gothic3-vegetation-study.md) and [historical stand record](forest-stands-2026-10-03.md) retain their own methods and dated evidence.

For this implementation, the immutable before-state is Git source **`3b8542e5df5dc97dcf7fde53de2206a9f7698f05`**, the current `0.0.11` candidate before these edits. A read-only Git archive of source, fixtures and Tervain model binaries reproduced **612 plants / 376 canonical tree blockers**, matching the attachment's regular forest counts. This candidate also has **four separately placed Guardian trees** from A49, so its complete tree-blocker total is **380**, not 376.

The after-state is the working source captured in `current-source-receipt.json` after the final grove controls, conservative cached wood slabs and deferred Guardian-aware forest-floor initialization. The local audit writes `baseline-measurement.json`, `current-measurement.json` and `canonical-collider-delta.json` in the task workspace's `outputs/forest-revision/`. Each current copied-source file has a SHA-256 receipt; this measurement is not a claim of a committed or hosted after-revision. No original-game transforms or attachment images are needed by the audit.

## Implemented changes

[forestStands.ts](../../src/world/forestStands.ts) replaces the narrow single-ellipse companion fields with overlapping original grove cores. The swale cores use half-axes **21 × 12 m** and **14 × 12 m**, with 10 m shoulders; the eastern cores use **15 × 20 m** and **16 × 15 m**, with 12/10 m shoulders. Correlated warping and a rough continuous boundary keep the margins irregular. These are engineering controls, not copied coordinates or a new owner density target. Positions, appearance streams and symmetric conflict priority remain keyed; roads, terrain, crowns and real wood still reject candidates.

[treeGrounding.ts](../../src/presentation/treeGrounding.ts) now measures nonconifer navigation footprints from all three woody LODs through the existing **2.6 m player-clearance slab**, including edges that cross its upper plane and the real buried origin. The query rounds the local upper plane upward by at most **6.25 cm**, caches source edges/radii and adds 4 cm radial padding. Imported conifers retain their measured source-wood callback. This gives conservative movement circles; it does not change the authority of finite near-model cargo contacts or make every tree a player triangle collider.

[plantedCrowns.ts](../../src/presentation/plantedCrowns.ts) supplies one planted-crown field to terrain, grass and forest-floor habitat. It projects the actual near leaf triangles into a cached **24 × 24** mask per geometry, includes thin projected card edges, preserves crown holes and softens the mask by one cell. Accepted placement yaw and uniform scale transform the mask. The four Guardian accents add their actual crown parts before terrain and forest-floor initialization. Canonical and Guardian wood footprints both exclude low plants from their bases.

This field is a **geometric shade proxy**. It does not read foliage alpha texels, calculate optical transmission or measure visible leaf pixels. Decorative nonblocking horizon trees do not contribute to the canonical shade field. The older fallback kernels remain available to isolated authoring tools and synthetic fixtures that omit a planted source field.

[forestFloor.ts](../../src/presentation/forestFloor.ts) adds nonblocking shrubs with connected leaf geometry, moist fern/moss colonies and pine-needle or broadleaf litter according to the shared field. Under shaded crowns, [grass.ts](../../src/presentation/ground/grass.ts) reduces pale grass density, height and sun-cured tint; exposed meadow remains warmer and fuller than shaded grass, with stronger patch gaps and a slightly quieter gold tint. The terrain's woodland earth blend uses the same field. This is a coordinated ground treatment, not a global tree-density increase.

[floraPopulation.ts](../../src/presentation/floraPopulation.ts) also accepts an optional authoring observer. It reports exactly one terminal result per proposed planting claim: site rejection, wood clearance, clearing envelope, spacing or acceptance. A grid cell rejected by its density roll never proposes a plant and is deliberately outside this denominator. Claims include blocking trees and decorative plants; they must not be confused with accepted canonical-stem counts.

## Measured composition

The regional denominator is accepted canonical stems with `standId` inside the Deepwood authoring bounds, including saplings and young trees. Adults mean logical **mature or veteran** cohorts. Named-stand adult measurements include accent families tagged to that stand; they are not an oak-only count. Guardian accents, shrubs, decorative horizons, orchard and unrelated world trees are separate.

| Measurement | Immutable before | Current working source |
| --- | ---: | ---: |
| Regular plants / canonical blockers | 612 / 376 | 535 / 336 |
| Separate Guardian blockers | 4 | 4 |
| Accepted regional stems | 135 | 124 |
| Regional pine / oak / other stems | 101 / 24 / 10 | 87 / 27 / 10 |
| Regional pine / oak / other shares | 74.81 / 17.78 / 7.41% | 70.16 / 21.77 / 8.06% |
| Swale adults | 7 | 11 |
| Swale adult-origin convex hull | 198.99 m² | 865.66 m² |
| Swale adult PCA minor-axis span | 7.86 m | 22.31 m |
| Swale occupied adult-origin 5 m cells | 7 | 11 |
| Eastern adults | 11 | 7 |
| Eastern adult-origin convex hull | 384.51 m² | 581.56 m² |
| Eastern adult PCA minor-axis span | 11.65 m | 15.22 m |
| Eastern occupied adult-origin 5 m cells | 11 | 7 |
| Oak share of summed near-leaf radial-disc proxy | 40.10% | 45.20% |
| Pine share of that proxy | 55.31% | 49.88% |

The swale now occupies a broader two-dimensional footprint. The eastern adult footprint also widens, while accepting fewer adults under the corrected wood constraints. The whole world has fewer regular plants and blockers. The owner's approximate **75/20/5** regional direction remains a design target; the measured result above must not be reported as an exact match.

Convex hulls measure the area enclosed by stem origins, not leaf cover. PCA spans measure the range along the minor axis of the actual point cohort. Five-metre occupied cells count stem-origin bins, not dense vegetation pixels; widening a stand can lower its occupied bounding-box fraction. The radial-disc proxy sums `π × measured near-leaf radial extent²` after uniform placement scale. Overlap is counted repeatedly. Oak's proxy share rises in this candidate, despite fewer regular trees, so native silhouettes remain an acceptance gate.

The fixed study rectangle **x = −215…−95, z = −75…80 m** has 102 → 96 canonical stems. Current nearest-neighbour family matching is **76.04%**, versus the current mixture baseline of **51.26%**; before it was 79.41% versus 57.40%. These describe this sample, not a universal clustering rule or an overall quality score.

The observer makes the changed acceptance visible. Swale adult claims rise from **7 to 22**, with **7 → 11 accepted**. Eastern adult claims rise from **13 to 25**, with **11 → 7 accepted**. Current eastern adult losses include actual wood clearance, site/clearing rejection and symmetric spacing. Enlarging a family field does not guarantee more accepted adults, and no rejection-until-quota loop was added.

## Shared crown and forest-floor evidence

The current shared field includes the Guardian crown parts before the low-plant pass, and that pass receives their movement footprints. The fixed study rectangle's 800 nodes at 5 m spacing have mean geometric cover **0.4872**, mean broadleaf contribution **0.1603**, and **57.38%** of nodes above 0.5 cover. These are values of the authored geometric proxy, not rendered canopy occupancy.

| Accepted low, nonblocking detail | Before | Current |
| --- | ---: | ---: |
| Fern | 105 | 204 |
| Litter | 123 | 221 |
| Moss | 25 | 91 |
| Shrub | 0 | 17 |
| Log | 3 | 6 |
| Fungi | 3 | 5 |
| Total, High | 259 | 544 |
| Total, Medium | 183 | 367 |
| Total, Low | 97 | 182 |

The detail remains nonblocking and graphics-thinned. More pieces do not by themselves prove more convincing ground composition or lower rendering cost.

## Collision, continuity and source evidence

The independent source-geometry audit measures projected woody triangle polygons retained below the upper player-clearance plane, including crossing edges and buried roots conservatively. It finds **zero near or all-LOD road intersections**, with at least **0.4396 m additional clearance beyond the authored road half-width plus the 0.55 m player clearance**. The before-state minimum was 0.0429 m. All-LOD radial geometry envelopes have **zero intersections with either clearing core**; their minimum conservative clearances remain approximately **7.21 / 5.10 m** for the north/south glades, including Guardian checks.

Corrected movement circles cover the measured woody slab: **143 undercovered regular trees before → zero now**. This is a consistency measurement, not evidence that the old road was blocked. The slab uses the terrain height at the planted origin; it does not establish an exact terrain-following player contact surface for every elevated branch.

Measured basal polygon vertices lie at least **6 cm below soil** for regular and Guardian trees. This vertex audit complements, rather than replaces, the existing exact terrain-facet/interior grounding regressions. The minimum regular canonical pair gap is **0.3892 m**, above the retained 0.35 m spacing control. The 32-route navigation audit includes the eight core routes, NPC schedule/override transitions, canonical trees, Guardian accents, scatter and landmarks; **32/32 connect**. Transient moving NPC bodies are outside that static audit.

The deliberate regular-blocker change is **376 → 336**: **331 retained IDs, 5 added and 45 removed**. Among retained IDs, 10 change family and 115 change radius; **no retained x/z origins move**. Guardian IDs remain separate. High/Medium/Low render populations are **535 / 481 / 422**, all sharing the same 336 canonical blockers and blocker hash. Repeated generation is identical. Existing saved-player recovery remains necessary when a corrected circle occupies a formerly free position.

Approved source GLB binaries and the grounding/yaw/uniform-scale policy remain unchanged. Potential regular-tree triangle sums with every plant at near geometry are **3,247,052 → 2,998,546**, a **7.65% decrease**; the separate Guardian geometry and low-plant increase are outside that sum. This is neither the triangles submitted by a particular camera nor a GPU performance result.

## Verification and publication status

The final combined local checks pass on 5 October 2026: strict TypeScript, **1,040 tests in 99 files (89.15 s)**, production build (Vite 5.05 s; existing large-chunk advisory) and diff checks. The canonical source fixtures now use complete nonconifer wood footprints rather than the historical legacy-radius population. Native production review captures six matched ground views on High plus the swale on Medium and Low at 1422 × 800, with initial hour 11, actors hidden and normal motion. All views load successfully with empty warning/error logs. Live clock/wind/falling-leaf phases are not pixel-synchronized; these are appearance comparisons, not image-difference tests. A separate visual review found clearer path edges and coherent companion groves without source-form or contact regressions. The preceding NPC/coastal test totals and device timings in [0.0.11](../production/releases/0.0.11.md) belong to their recorded source and do not validate this forest revision. No frame-rate improvement, reference-hardware capacity, original-game runtime parity or finished-game quality score is claimed here.

### Native route timing and limits

The final control uses a fresh production build of immutable source `1a3fd11`, which has the same forest as the doc-only `3b8542e` before-state. The revised production source is identified by the copied-file receipts above; its pre-commit build still stamps `3b8542e`. Both run the existing approximately 72-second F3 camera route after one full route warm-up, on High at **770 × 658 CSS pixels, DPR 1.7999999523** (approximately 1386 × 1184 rendering pixels), Chrome 154 and Apple M5 / ANGLE Metal. Each begins with the same query camera and authored noon control, with ordinary actors and motion. No tests or builds run during either measured sample. Visibility and viewport remain settled throughout the final pair. The clock finishes at 13:12 and is not pinned; corrected collider recovery also gives slightly different resolved starting player positions.

| Warmed sample | Before, 09:41:26 UTC | Revised, 09:46:26 UTC |
| --- | ---: | ---: |
| Recorded frames | 2,454 | 2,313 |
| Median frame interval | 33.30 ms | 33.30 ms |
| 95th percentile | 50.00 ms | 50.00 ms |
| 99th percentile | 50.80 ms | 50.40 ms |
| Worst interval | 67.2 ms | 66.9 ms |
| Last-frame draw calls | 283 | 279 |
| Last-frame submitted triangles | 5,597,037 | 5,255,563 |

The full DOM reports are saved as `before-matched-warmed-benchmark.txt` and `after-matched-warmed-benchmark.txt` beside the comparison captures. Both warning/error logs are empty. These single device samples show comparable median/tail intervals at this settled viewport, not a statistically established speedup or a frame-rate qualification. Last-frame counts are not route averages. Frame intervals include display scheduling and CPU/GPU work; they are not isolated GPU timings.

Earlier preview sessions are retained separately rather than silently treated as the final control. At 1422 × 800 / DPR 1.8, the earlier before sample recorded 33.40 / 50.30 ms median/p95; an early revised warm-up recorded 33.50 / 50.90 ms, while a later fresh revised session recorded 50.00 / 67.20 ms. Another run changed viewport size and is excluded from comparison. That session variation does not establish performance at the larger resolution; stable repeated full-resolution and reference-hardware qualification remains a publication gate where required. The final narrower matched pair must not substitute for it.

At this handoff, [PR #26](https://github.com/ael-dev3/Tervain/pull/26) remains unmerged. Its required [run 37284131498](https://github.com/ael-dev3/Tervain/actions/runs/37284131498) failed before runner steps because of the account billing/spending-limit blocker. The last read-only repository metadata reports private visibility and Pages disabled. This forest work is retained locally; successful required final-source CI, an approved hosting destination and a served version/revision remain separate publication gates. Workflow triggers and required checks are preserved, and no rerun, merge, visibility change or deployment was performed by this study.
