# A156: 0.0.36, oak crowns hold to their wood

- Why the hero oaks kept their detached clumps: the canopy audit counts a card as detached when its nearest point lies more than 1.5 m (world) from the wood, and the hero oaks are planted at scales up to 1.42. Per template, about 1,000 of 6,000 near-crown cards were past the reach at the largest tree scale (about 60 at scale 1). Chained through each other, those outer-shell cards form one crown-sized clump whose centre lies inside its own radius, so the radius-gated clump snap (A152) left all of them.
- The overshoot is small: measured to the closest point on the wood, the far cards sat a median 0.07 to 0.19 and at most 0.75 template units past the reach at the largest scale.
- Change: `seatFarCards` moves each card that is still past the reach straight toward its nearest wood by its overshoot, ending just inside it (0.97 of the reach at the largest tree scale), measured against the final wood with its grown twigs. No card is removed and every other attribute is kept. It runs on oaks after the clump snap and the twig-root reconnection.
- Hero oak templates, near crown: cards moved per template 981 to 1,083, median 0.2, at most 0.81 template units; crown extent shrinks by 1.5 to 2%. Middle crown: medians about 0.37, at most 1.26; extent about 3.5% smaller.

| Canopy audit (LOD 0, gap 0.75, reach 1.5 m) | Live 0.0.35 | 0.0.36 |
| --- | ---: | ---: |
| Hero oaks: detached clumps / cards | 443 / 5,211 | 0 / 0 |
| All oaks | 509 / 5,948 | 0 / 0 |
| Whole world | 648 / 8,332 | 139 / 2,384 |
| tree:wild:26:25 (hero-oak-b, scale 1.08) | 38 / 159 | 0 / 0 |
| tree:wild:32:27 (hero-oak, scale 1.42) | 10 / 973 | 0 / 0 |

- Firs, birches and palms are unchanged (the remaining 139 clumps). The canopy gate against the live audit as baseline passes with no regressions.
- Fixed pose (tree:wild:26:25, camera 20 m south, 2 m up): the 159 far cards, painted red on live with the audit's own measure, lie over the crown's outer shell; on 0.0.36 none remain, and the unpainted crowns look the same.
