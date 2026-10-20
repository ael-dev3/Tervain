# A155: 0.0.35, grass tip cap in scene light

- Why the 0.0.32 cap read brighter than live: it did nothing at all. The grass writes scene light into the grade's half-float target, and the final pass tone maps it afterwards (ACES at exposure 1.22, sRGB, the day contrast curve). 0.0.32 applied 0.62, a screen level, to that scene light; 0.62 reaches about 233 of 255 on screen, above every blade tip. Drawn into the same frozen frame, 0.0.32's numbers leave it pixel-identical to no cap at all five poses below. Its brighter readings were differences between captures (grass motion, grain); a frozen frame drawn twice is identical, so the comparisons below are exact.
- One-pixel dump (frozen frame, low sun behind the camera, hour 17.5): a blade tip at (234, 194, 145) on screen, luma 199, holds scene light (0.453, 0.313, 0.203), luminance 0.334. That is under 0.62, so 0.0.32 left it alone. The new cap takes it to luminance 0.220 with its red-to-green ratio kept (1.449 to 1.450), 166 on screen. At noon the brightest tip, luma 209 (scene luminance 0.470), goes to 158.
- Change: the cap starts at the scene light that reaches about 158 on screen by day (0.200) and eases toward the level for about 166 (0.220). It acts as the lit colour is written, before tone mapping and fog, so it holds with or without the grade (`GRASS_TIP_CAP`; `displayToSceneLuminance` in grade.ts inverts the day transfer). The levels are a uniform (`uTipCap`), so one frame can be drawn with and without the cap.
- Same frozen frame with and without the cap (Sol's #695 freezing: wind, sway, clouds, grain and simulation held; 2205×1434, High, MSAA 4). Grass is every pixel a near-zero cap darkens; the core is grass giving more than three quarters of the pixel, which leaves out blade edges over bright sky. Luma is 0.2126 R + 0.7152 G + 0.0722 B on screen.

| Pose (hour) | Grass core at 180 or more | At 170 or more | Grass core mean | Frame mean | Grass pixels changed | Pixels brighter |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Low sun behind the camera (17.5) | 698 → 0 | 2,359 → 0 | 112.65 → 112.59 (−0.05%) | 82.93 → 82.91 | 12,610 | 0 |
| Noon, toward the sun (12) | 3,003 → 0 | 7,317 → 0 | 85.69 → 85.19 (−0.59%) | 90.06 → 89.94 | 42,386 | 0 |
| Low sun ahead (17.5) | 0 → 0 | 0 → 0 | 53.99 → 53.99 | 76.35 → 76.35 | 18 | 0 |
| #695's meadow edge (17.5) | 0 → 0 | 9 → 0 | 56.04 → 56.04 | 84.99 → 84.99 | 101 | 0 |
| Arrival route (17.5) | 0 → 0 | 0 → 0 | 64.97 → 64.97 | 87.14 → 87.14 | 318 | 0 |

- Draws and triangles are the same with and without the cap at every pose.
- Live control: live 0.0.34 drawn into the same frozen frames, in its own browser, matches this build with the cap off in every pixel (3,161,970 of 3,161,970 at both the low-sun and the noon pose). With the cap on, 12,610 and 42,393 pixels differ from live, none of them brighter.
