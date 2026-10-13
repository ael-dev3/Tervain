# A137: shade fill and soft sun shadows

Playtest 6 reported a hard-edged bright square of light and shadow following the hero across the ground, and near-black shade under the trees by the stream. Both came from one cause. The square was the real, static shadow of a village house under a low sun (16:30). Shaded ground was near black beside bright sunlit grass, and the shadow's edges were razor-hard and straight, so the long house shadow read as a dark slab around the hero as he walked through it. Shadow projection was correct. The fault was in the lighting.

## Changes

| Where | What |
| --- | --- |
| `softShadows.ts` (new) | A cheap PCSS for the sun built from comparison samples only. Three's PCF reads a comparison sampler, so a blocker's depth cannot be read directly. It can be bracketed instead: a comparison made 2 m or 7 m nearer the light than the receiver says whether the blocker stands at least that far above it. Five rotated taps across the widest penumbra (0.42 m) tell whether the pixel is near an edge at all. Fully lit pixels stop there, at the same five taps Three's PCF uses. Near an edge, the two brackets estimate the distance to the caster, and an eight-tap disc of 2.8 cm per metre of that distance (at least 3.5 cm) gives the edge. Contact shadows from feet, fence posts and roots stay crisp, and a house shadow 15 m from its eaves gets a soft edge. The patch applies only to a shadow whose `radius` is negative (the sun's), so any other shadow keeps Three's PCF. |
| `sky.ts` | The sun uses it (`shadow.radius = SOFT_SUN_SHADOW`). By day the hemisphere fill is 6.5× its former value (`DAY_FILL_LIFT`) and the sun is at 0.66 (`DAY_SUN_SCALE`). Both fade out with `day`, so dawn, dusk and night are unchanged. When the sun is low, its shadow keeps 0.82 of the sun's light out (`LOW_SUN_SHADOW`) instead of all of it: long evening shadows sit under a wide, bright sky. `SKY.ambient` (water) is unchanged. |
| `environment.ts` | The generated sky's image-based light is 1.3× by day (`ENV_DAY_LIFT`). Larger lifts turned crowns and water milky, so most of the fill comes from the hemisphere: blue from above, earthy from below. |

The earlier experiment of a uniform `shadow.radius` of 1.5 to 2.5 washed out thin casters and showed a grid. Here the penumbra grows only where the caster is far, so thin casters near the ground stay sharp.

## Measurements

These were measured on a GPU at 1440×900. The figures are mean linear luminance of a shaded patch over a sunlit grass patch in the same frame, with the display-space (sRGB) ratio in brackets.

| Spot | Before | After |
| --- | --- | --- |
| Meadow by the houses, 16:33, house shadow beside the hero | 0.13 (0.36) | 0.38 (0.63) |
| Stream under the oak by the mill, 15:00 | 0.11 (0.27) | 0.27 (0.51) |
| Same, 11:00 | 0.22 (0.43) | 0.41 (0.64) |
| Giant oak by the haystacks, 15:00, shaded trunk luminance | 0.0044 | 0.0175 (×4) |

Under a crown the ground stays darker than in an open shadow, because the terrain's canopy sky-occlusion still applies. That is intended.

Bench (High, 1440×900, two laps per run, two runs each): GPU frame median was 6.96 to 10.0 ms before and 7.6 to 8.5 ms after. The machine's run-to-run spread (about 1.5 ms) is larger than the change. Sunlit and fully shaded ground pays the same five taps as before, and only edge pixels pay 18 more.

![Meadow by the houses at 16:33, before and after](a137-shade-fill/meadow-before-after.jpg)

![Stream under the oak at 15:00, before and after](a137-shade-fill/stream-before-after.jpg)

![Giant oak at 15:00, before and after](a137-shade-fill/oak-before-after.jpg)

## Tuning

Raise `DAY_FILL_LIFT` for lighter shade. Lower `DAY_SUN_SCALE` for less glare on the sunlit side. Keep `ENV_DAY_LIFT` small, because it also lifts sunlit surfaces and greys crowns. The penumbra is set by `PENUMBRA_PER_METRE` and `PENUMBRA_MAX` in `softShadows.ts`.
