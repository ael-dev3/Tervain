# A158: 0.0.38, pop-in measured on live; furniture fades behind the windows; grass light inside covered blades

## Pop-in on live

- Method (the replay from #717): at every pose of a walk the frame is drawn with the previous pose's state and again after the update, from the same camera, so camera motion cancels and only what the update changed remains. Anything that appears, disappears or changes shape in one step shows as a changed region: a channel change of 20 or more over 16 or more connected pixels, either sign. Wind, sky and clocks are frozen; native post and MSAA; a frame drawn twice is identical. Each run first detects a positive control (forest and grass hidden). Walks are 241 updates over 31.2 m at walking pace (0.13 m a step), 960×540.
- Forest and grass updates only (every tree, shrub, floor piece, falling leaf and grass tile), live 0.0.37 (8a1746d):

| Route | High | Medium | Low |
| --- | ---: | ---: | ---: |
| Meadow | 0 | 0 | 0 |
| Woods | 0 | 0 | 0 |

- The whole world (every module updated, the sun's shadow map redrawn for every capture), live 635d63d, on routes chosen for the most models inside an LOD crossfade: High through shrubs crossfading at 22 to 34 and 60 to 90 m, Medium past 70 trees crossfading at 120 to 180 m and through the village, Low past 30 trees crossfading at 64 to 96 m:

| Route | Changed regions |
| --- | ---: |
| High, shrubs | 0 |
| High, meadow | 0 |
| Medium, trees and village | 6 |
| Low, trees | 0 |

- No LOD pop: every tree, shrub and grass update changed at most a few scattered pixels (dither cells flipping as a crossfade advances).
- The Medium route's six regions: three are furniture appearing behind two house windows in one step as the walk came within range (below), two are the same windows when the replay first places its camera (a jump from where the game left it, not walking), and one is a one-pixel line on a doorstep that goes with the same furniture (it does not appear once the furniture fades).

## Furniture behind the windows

- A room's furniture is drawn only while it can be seen into (A66, A79): within 25 m of the eye through its windows, or within 34 m of the camera or the wanderer while its door stands open. Both were hard cuts, so walking toward or past a house the furniture behind its window openings appeared or vanished in one frame.
- Change: a room now shows its furniture by a share from 0 to 1: as far as its door stands open, and through its windows fading out over the last 4 m before 25 m; the 34 m range fades over its last 4 m the same way. Each instance draws that share of its pixels with the dither the trees fade with (`attachInstanceDistanceVisibility`, fixed to the world), so it fades in over a few steps. The rooms drawn are the same as before at every distance, so draws and triangles do not change.
- The village route (from (0, 20) heading 210°), same camera path on both builds; the camera placement at the first pose is a jump, not walking, and stays:

| Village route, 241 steps over 31.2 m | Live 635d63d | 0.0.38 |
| --- | ---: | ---: |
| High: furniture behind windows / a one-pixel line on a doorstep / camera placement | 3 / 1 / 2 | 0 / 0 / 2 |
| Medium: the same | 3 / 1 / 2 | 0 / 0 / 2 |
| Most draws / triangles on the route, High | 578 / 6,955,617 | 578 / 6,955,617 |
| Most draws / triangles on the route, Medium | 607 / 7,031,032 | 607 / 7,031,032 |

- Cost along the 39 m village walk at 60 frames a second (900-update blocks, median of 12 passes): the furniture update takes 2.9 and 2.4 µs a frame on live, 12.3 and 12.0 µs on 0.0.38, about 0.01 ms more while near houses and nothing elsewhere. GPU time at a village pose with fading furniture in view (timer query, 150 frames, six alternating pairs of the same build with and without the change): median 4.316 ms without, 4.313 ms with. No measurable cost.

## The crossfade mask

- High draws every tree at full detail at every distance. Medium and Low crossfade trees between adjacent models, and shrubs crossfade on every preset, with a dither. Each model reads the dither at its own surface, and the two surfaces at one pixel can lie metres apart in a crown, so a pixel can show neither model. On the Low walk (61 poses over 30 m, crossfading trees only) such holes are 24,494 of 4,782,669 pixels both models cover, 0.5%: dense crowns have several leaf layers per pixel, so some layer nearly always covers.
- A candidate reading the dither along the pixel's view ray, the same for both models, adds no CPU and cut those holes by 62% (to 9,402). It also makes the crossfade an exact per-pixel dissolve, so crown fringes only one model covers thin out more: background showing through crossfading crowns rose 165,942 → 189,500 (+14%). Side by side the crowns look about the same, a little more see-through at their edges. Not taken: no pop to fix, and the look is not the same or better.

## Grass light inside covered blades (#700, #701)

- Thin blades sparkle as the camera moves. Part of it was the grass's own light: a blade's sheen was gated by how thin the blade is, not by how much of the pixel it covers, and the lighting inputs could be read outside the blade at multisampled edges.
- Change (#700 and #701, merged together as #701): the unresolved sheen fades with the blade's pixel coverage (`gBladeCov`), and the grass lighting inputs are sampled inside the covered triangle (`centroid`). Shape, density, colour and the 0.0.35 tip cap are unchanged.
- Deterministic low-sun walk (same camera path, wind and sky stepped identically, 120 frames, 1470×956 at 2×, GPU):

| Live, same walk | 0.0.37 (a42f11f) | 635d63d (#701) |
| --- | ---: | ---: |
| Grass pixels jumping 40+ levels between frames | 29,456,223 | 28,976,361 (−1.6%) |
| Jumping 60+ levels | 14,507,146 | 14,117,684 (−2.7%) |
| Grass mean | 102.84 | 102.12 (−0.7%) |
| Bright grass at 180+ / flashes | 0 / 0 | 0 / 0 |

- The build measured before the merge gave the same counts within 0.01%. Side by side the grass looks the same; the general blade shimmer is mostly geometry crossing pixels as the camera moves, and this trims it a little.
- GPU time per frame at a frozen grass-heavy pose (timer query, 150 frames, two alternating runs each): 3.567 and 3.604 ms before, 3.572 and 3.486 ms after. No measurable cost.
- Also in this release: #737 (oak seating searches stop once a component has wood support; load time only, geometry identical).
