# A162: 0.0.42, real bark on the supplied broadleaves that had none

## Before

- The verdant-sentinel (11 trees, assigned by the moist broadleaf habitat to the birch slot (7) and the oak slot (4)): its atlas paints the trunk a smooth, near-black green that reads blue in the light, with blue highlights on its limbs.
  - In the oak slot the metre-scale oak bark (A133, mix 0.4) barely showed. Its large-scale brightness follows the source's, and this source is nearly black.
- tree-4815 (now 4 orchard trees, since 0.0.40's birches replaced it in the birch slot): a flat orange trunk, which the oak bark at 0.4 only browned.

## Change

- **Override** (meshyTrees.ts `SUPPLIED_BARK`): these two supplied trees take the oak bark in whichever species slot they stand.
  - verdant-sentinel: mix 0.85, brightness 1.8.
  - tree-4815: mix 0.75, brightness 1.5.
- **Fixed brightness** (treeMaterials.ts, `installBarkDetail`'s `macro`): replaces the brightness the bark otherwise derives from the source (its luminance × 4, clamped to 0.65 to 1.35). It has its own program key.
- Other trees are unchanged.

## Evidence

- Close views of both slots' verdant-sentinels and an orchard tree-4815: grey-brown furrowed bark replaces the blue-black and orange trunks.
- A real-play walk past two verdant-sentinels (12 s, fixed 1/60 s steps, wind running), against live 0.0.41:

| Spikes against live 0.0.41 | Change |
| --- | ---: |
| 40+ levels, crown band (upper 45%) | −3.9% |
| 40+ levels, whole frame | −1.2% |
| 60+ levels, whole frame | −10.7% |

- A spike is a pixel that jumps and comes back within a frame. The lighter bark stands out less against the bright ground and sky.
- Draws and triangles: unchanged (shading only).

## Self-score against Gothic 3

| | Before | After |
| --- | ---: | ---: |
| Other broadleaves (verdant-sentinel, supplied oaks, orchard, shrubs) | 6 | 6.25 |

- Their crowns are unchanged: the orchard trees are still dense, even balls.
