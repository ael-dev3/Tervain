# Grass interpolation hypotheses: no production fix

Read-only experiments on published **0.0.33 · b317734**, following the noon sheen attribution. No application shader, colour, geometry or material was changed in the repository. Each browser-session variant preserves the lighting expressions and parameters and changes only one varying's sampling qualifier.

- **Intensity centroid:** `vGInfo`, containing through/sheen weights, switches to centroid interpolation in both stages.
- **Normal centroid:** the native normal declaration switches `vNormal` to centroid interpolation in both stages. Other native chunk content stays intact.

Three poses, 1.3 m strafe and −8°→+8° yaw, hour 11.5. Requested 1470×956/DPR2, native High **2205×1434**, post/MSAA4, explicit frozen wind/cloud/post phase. This is a short synthetic camera path, not real-time input locomotion or hardware frame timing. All original/inactive and per-pose restored RGB controls match exactly; deployment is unchanged, with zero console/GL errors.

## Result

| Candidate | Changed pixel observations | Baseline / candidate luminance ≥180 in affected set | Baseline / candidate jumps >60 in affected union |
| --- | ---: | ---: | ---: |
| Intensity centroid | 26,055 | **53 / 51** | **5,125 / 5,129** |
| Normal centroid | **0** | empty set | empty set |

Intensity centroid barely changes the bright count and slightly increases temporal jumps. Its maximum baseline/candidate luminance is **203.4644 / 203.3922**. Normal centroid is pixel-identical at every retained pose. Neither is supported as a useful fix for this route; no production PR is proposed. This does not globally rule out all interpolation faults or clear sparkle at other distances/phases.

These are per-frame observations, not unique pixels or tracked blades. The temporal domain is the union of changed pixels at consecutive poses, including normal camera disocclusion and possible background endpoints. The affected population differs between candidates and from the lighting-ablation study; **53/51 must not be directly compared with that study's 1,165/23 population**. Empty sets have null maxima, not evidence of black grass. Whole-image strict-white RGB≥245 count is zero at every pose.

The sheen-ablation result remains a useful attribution of bright grass-lighting observations. It does not justify removing intended sheen. This experiment does not find a numerical qualifier fix that preserves the look and meaningfully reduces those observations.

## Cost collection and rejected trials

All retained pictures still use native `renderWorld`, including auxiliary captures, water and post-processing. The collector only **reads counter deltas** around scene renders using the main camera. It includes both opaque and water scene passes (two here), with no resets inside them. It requires equal main-camera pass counts, draws and triangles at each pose. It records whole-world counters separately.

| Pose | Main-camera scene draws, all variants | Main-camera scene triangles, all variants |
| --- | ---: | ---: |
| 0 | 114 | 2,288,883 |
| 1 | 108 | 2,224,226 |
| 2 | 106 | 2,236,515 |

Whole-world counters vary with auxiliary-capture cadence: at pose 1, baseline reports 189 draws versus 113 in subsequent variants, while restored pixels are exact. **This is not a performance reduction.** Auxiliary images can remain cached rather than being regenerated under every variant; results concern direct main-camera grass shading. No compiled candidate or release-budget PASS is claimed. Renderer bookkeeping does not measure shader cost or JS frame CPU.

Earlier trials were rejected: one compared whole-frame draws across different auxiliary-capture frames; another incorrectly required one main-camera scene pass when the water path uses two. A startup fetch failure also produced no completed receipt. The final protocol records both pass types, retains whole-world counters and preserves the restored-image/error assertions.

[Full report](proofs/grass-centroid-fields/report.json) · [summary](proofs/grass-centroid-fields/summary.json) · [all source RGB hashes](proofs/grass-centroid-fields/rgb-manifest.json) · [baseline](proofs/grass-centroid-fields/baseline-1.webp) · [intensity centroid](proofs/grass-centroid-fields/infoCentroid-1.webp) · [normal centroid](proofs/grass-centroid-fields/normalCentroid-1.webp). Stills are lossless WebP with decoded RGB checked against native PNGs.

```sh
node tools/study-grass-centroid-fields.mjs --route strafe --controls docs/perf/proofs/grass-centroid-fields/controls.json --width 1470 --height 956 --dpr 2 --out centroid-fields
node tools/summarize-grass-centroid-fields.mjs centroid-fields
```

`--url` accepts another build. Shader markers must appear exactly once; failures produce no completed report. This is reusable diagnostic evidence, not a visual-quality gate or an art change.
