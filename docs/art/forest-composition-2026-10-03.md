# Forest composition: scoped candidate, 3 October 2026

This dated handoff preserves the original component source, counts, captures and publication authority. The owner subsequently approved its integration with the Wanderer and source-faithful Solitary Pine as `0.0.9` under A40. Final imported-geometry population checks and publication acceptance belong to the [combined release record](../production/releases/0.0.9.md); the component measurements below remain historical.

The arrival woodland should read as a connected landscape with local character, shaded reaches and occasional glimpses. The owner authorised this scoped placement correction after the audit. It retains the sparse strand, existing hilly arrival route, fork sign, inland settlement and frozen gameplay tree sway. Version remains **0.0.8**. Numerical settings below are prototype defaults under visual review, not final ecological or performance requirements.

## Verified starting point

The audit pinned current main to **[d0dc8de140ece35fe82b679beb6e9956055e316c](https://github.com/ael-dev3/Tervain/commit/d0dc8de140ece35fe82b679beb6e9956055e316c)**. The old Windows edffb5d checkout was preserved and excluded from current-source conclusions. A complete recursive-tree comparison with open [hero PR #11](https://github.com/ael-dev3/Tervain/pull/11), head **75a2ee61ef2a6d679563a5443a655c6f526f8e7a**, found identical vegetation, groundcover, terrain and world-layout blobs. This candidate changes no hero source or asset.

Main's forest used a jittered 6.2 m grid, mostly 80–98% occupied inside one axis-aligned habitat, with independent oak/pine/fir/birch rolls. Its species therefore had little neighbourhood identity even though individual trees had branches, cards and tiers. Placement did not check previously authored trees/rocks; the exact current generator produced 23 overlapping trunk-circle pairs and 10 tree–rock-circle pairs. One extra 1 m exclusion changed 76 outside-patch entries, including 61 over 25 m away and one 356.22 m away, because acceptance and appearance shared a sequential random stream.

## Placement defaults tested

The implementation is in [floraPopulation.ts](../../src/presentation/floraPopulation.ts), [world/forest.ts](../../src/world/forest.ts), [flora.ts](../../src/presentation/flora.ts), [forestFloor.ts](../../src/presentation/forestFloor.ts) and [scatterPopulation.ts](../../src/presentation/scatterPopulation.ts).

- Groves use 48 m cells with jittered centres and 18–35 m normalized influence radii. A grove selects a dominant species and companion from stream wetness/height, with 76% dominant, 18% companion and 6% accent trials. A smoothly blended neighbour contributes up to 35% at grove boundaries.
- Independent keyed randomness supplies candidate position, acceptance, age, appearance and conflict priority. IDs derive from cell/child keys. Fixed-priority symmetric conflict suppression avoids greedy removal cascades; canonical trunks keep at least **.35 m** clearance. Rocks and understory use actual canonical tree information where applicable.
- Woodland density varies over a 28 m field, from .4–.9 before terrain/shoulder/opening rejection. The inner forest edge has independent smooth x/z offsets; the original outer authoring envelope and coast clearance stay fixed. Roadside density grades outside the hard safe travel strip.
- Three small named light pockets reveal the waystone, overlook and waystation approach. Their density multiplier eases from .16 to 1; they are not guaranteed bare holes. Existing route geometry and interaction points are unchanged.
- Veteran/mature/young/sapling trials are 15/60/20/5%, with species-scaled size ranges and radial associated regrowth. Patch tint plus small individual deviation replaces broad unrelated random value rolls. Cohorts still use the existing seeded tree models.

## Evidence and gates

Exact Node 24.19.0 generator measurements with the lockfile's **Three.js 0.186.1** changed 1,490 plants / 1,033 blocking trunks to 1,055 / 731. Canonical trunk-circle overlaps fell 23→0; the minimum measured trunk-circle gap is **.3686 m**. A 1 m extra exclusion leaves transforms, appearance and obstacle IDs outside the documented 16 m influence radius unchanged. The full world layout intentionally changes from main; graphics preset changes retain every canonical trunk and obstacle identity.

Species grouping was compared in the **same geographic rectangle**, x−215…−95, z−75…80, including all blocking trunks and saplings in both versions. That sample has 423 main versus 239 candidate trunks. Nearest same-species matches rise **26.48%→63.18%**; independent-mixture baselines are **28.66%→36.20%**. The candidate's grouping exceeds its mixture baseline, so the improvement is more than substituting one global species mix. Dynamic interior masks with different sample sizes are reported separately in the external audit.

[forestCohesion.test.ts](../../tests/presentation/forestCohesion.test.ts) checks mutual trunk clearance, spatial species correlation without a monoculture, stable distant transforms under three local exclusion edits, light-pocket shoulders and age spans. Existing flora/navigation/arrival checks retain road/building/interaction clearance, sparse beach entry, sign direction, graded terrain and reachable approaches. [forestTrees.test.ts](../../tests/presentation/forestTrees.test.ts) checks lower/upper height strata and sampled enclosed-route crown/depth envelopes instead of requiring the old uniform population count or many birches everywhere. Crown envelopes are composition proxies; native captures decide actual leaf/sky coverage.

Final local validation passed typecheck, all **667 tests in 62 files**, production build and whitespace checks. Five paired native views use unchanged terrain, matching FOV and at most .029 mm camera settling difference at 1280×720. Served candidate population is verified as **1,055 plants, 731 blockers and 933 High floor pieces**. A stale occupied port was detected and its preliminary captures/timings discarded; final candidate verification uses port 5183.

Native culling checks retain zero idle tree uploads and immediately refresh all 120 tree batches for a rapid 180° camera pan or vertical 2 m movement. A complete native 72 s route warms each fresh browser profile before the measured repeat. On Chrome 154 / RTX 3080 Ti / ANGLE D3D11 at 1280×720 High DPR1 with hour re-pinned to 11:00, baseline and candidate both measure **p95 17.1 ms / p99 17.2 ms**. Warmed worst intervals are 33.6 ms versus 17.5 ms. Route-sampled submitted triangles average 1.60M versus 1.28M, including shadow/reflection/postprocess submissions; draw calls average 285 versus 283. These display-limited wall-clock intervals establish no measured regression on this device, not an FPS gain, GPU headroom or 1080p qualification. First-route spikes remain around half a second.

Independent inspection of the corrected native pixels finds layered depth, varied cohorts and readable gaps; the margin view separates an oak-led hill from a conifer hollow without an obvious straight wall. Yellow grass still reads as a repetitive carpet, some conifer fans occupy player-height sightlines, and foliage/bark palette differences remain. Low keeps the tree enclosure with a barer floor. These are follow-up visual gates, not claimed solved by statistics.

## Explicit limits

Large oak crowns remain much wider than trunk circles (about 13.7 m radius at scale 1 in sampled variants), and deliberate canopy overlap remains. This pass does not guarantee open sky in each light pocket or eliminate alpha overdraw. Age cohorts scale existing forms rather than adding juvenile/veteran morphology. Bark and foliage texture/material cohesion, terrain-conformed root endpoints, far-LOD silhouette fidelity and smooth LOD transitions remain further art/geometry work.

Gothic 3 is the experiential reference. The changes are independent original rules, not imported assets or a claimed reconstruction of Gothic 3's placement algorithm. Exact matching of game/reference cameras and materials remains a separate visual acceptance task; source statistics alone cannot establish the same game feel. The original supplied-reference materialisation blocker and inspected/uninspected evidence are retained in the external audit.

No workflow triggers or permissions are changed. Source publication and a draft PR remain subject to the current Actions allowance/approval gate; local completion is not evidence of publication.
