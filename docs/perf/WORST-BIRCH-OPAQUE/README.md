# Worst retained birch: opaque-coverage follow-up

Fresh published **0.0.33 · b317734**, High, `tree:wild:71:20` (birch/verdant-sentinel), base **(70.898, 2.166, -39.023)**, scale **1.0636663**. Fixed native camera **(82, 8, -28) → (76.4, 9.42, -33.56)**, 640×360, native post/MSAA4. `native.png` is this run's original frame: 201 submissions / 4,502,744 triangles in the frozen-shadow custom view, not the stock budget route or hardware timing.

| Detector mode, world gap 0.75 m / wood reach 1.5 m | Components | Distance-flagged parts | Far groups | Whole graph chunks | Wholly unsupported chunks |
| --- | ---: | ---: | ---: | ---: | ---: |
| Unmasked welded surfaces | 5,569 | 76 | 11 | 1 | 0 |
| Native opaque cutout samples | 11,138 | 352 | 23 | 1 | 0 |

**The units differ:** opaque mode splits cards into sampled triangle parts; 352 is not a count of unique leaf cards or newly visible floating clumps. The 286-part largest far subset spans roughly 9.17×11.42×9.10 m along scaled model axes. Its centre is transformed to world space in the report; those side lengths are not rotated world-AABB dimensions. It is spread through the crown, not a traced isolated object.

Both detectors link sampled bounds by proximity. One connected graph is not proof of visually continuous opaque foliage, and zero wholly unsupported graph chunks does not clear the report. Shader wind, camera occlusion and distant mip coverage are not part of this rest-geometry audit. The count alone does not identify a visible island safe to move or delete.

## Repair decision

No safe repair was validated in this pass. The previous same-session native trials at this labelled camera reduced the flags with generic seating/culling but changed scattered near-crown pixels without proving which visible unsupported island was repaired. Seating eight groups left 63 flags; culling cleared flags by dropping 152 source leaf triangles. Neither result justifies calling the crown fixed. A repair is expected to change pixels; the missing evidence is a traced defect-to-repair correspondence, not simply nonzero pixel differences.

The [retained seating/culling trials](https://github.com/ael-dev3/Tervain/tree/993483c52adbc35028cdf2c440d2ca228459489e/docs/perf/BIRCH-SAFE-REPAIR) remain historical same-session comparisons. This new cold-load original differs from that older original by 72,595 image channels at the same camera, so **do not use images from those two runs as a new before/after pair**. No code-change effect is inferred from that difference.

The earlier thin-needle sampling repair is already present in current source despite its legacy open PR. The remaining fir flags are not declared covered or fixed by this birch pass. The pending birch twig-root repair leaves the leaf-distance flags unchanged.

No production geometry/material/generator edit, new fix PR, regression-test success, budget PASS or art-quality verdict is claimed here. The crown issue stays open. The next investigation is grass white-speck/sparkle motion, as requested, using in-session paired and restored controls.
