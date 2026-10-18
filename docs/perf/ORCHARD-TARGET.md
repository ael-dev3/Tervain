# Orchard inspection target

Read-only follow-up to issue #326: `tree:orchard:0:2`, species orchard, source `tree-4815`, world position **(-49.971630, 0.115092, 30.661973)**.

The loaded **0.0.25 · bd30438** native audit records **298 detached leaf components / 1 detached-subset clump**, 5,674 total components, **1 whole-crown connected chunk**, and **0 whole disconnected-chunk candidates**. Parameters: near LOD, alpha disabled, gap 0.75 m, wood reach 1.5 m, 500M operation cap. Components are welded geometry, not necessarily authored cards; these predicates do not establish visual severity. The distance search is capped, so its non-finite maximum serializes as null and must not be read as zero.

The same snapshot's full root audit is complete at all three LODs: 451 roots each, zero unsupported samples among 5,559 / 5,574 / 4,870 samples. This is sampled rest-geometry contact evidence, not a guarantee about every rendered root surface or animation.

[Measurements](proofs/orchard-target/measurements.json) · [Front view](proofs/orchard-target/front.png) · [Reverse view](proofs/orchard-target/reverse.png) · [Occluded third angle](proofs/orchard-target/occluded.png).

Views use native High post/MSAA at hour 15, camera at tree position plus `(12*sin(angle),4,12*cos(angle))`, looking at tree position plus `(0,5,0)`, angles 0, 2.094 and 4.188 radians. The forest is updated for each camera before drawing. The middle angle sits inside a neighbouring crown and is not a clear target view.

**Capture identity limit:** these inspection views were collected during the 0.0.25→0.0.26 deployment. The endpoint reported 0.0.26 · 03d82c3, but the loaded module revision was not retained. They are review views, not a matched release comparison or before/after fix proof. The separately recorded measurement build comes from the audit's compiled revision and agrees with its endpoint snapshot.

No geometry, placement, materials or style were changed. Leave attachment/appearance decisions to the tree work; no visual-quality PASS is claimed.
