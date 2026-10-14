# Air cuts (playtest 6)

Cuts toward the [Mac budget](MAC-BUDGET.md): GPU median ≤ 2.0 ms, p95 ≤ 3.0 ms, ≤ 250 draws, ≤ 1.5 M triangles on the gate machine at the mac profile (1440×900 at device scale factor 2, High, pixel ratio capped at 1.5).

Numbers come from `tools/bench.mjs --headed --quality high --size 1440x900 --dpr 2` (the whole benchmark route, the game's own GPU timer) unless marked *per object*: those come from timer queries around each draw at one fixed view (Rillford, 11:00), which separate one cost from the rest. On this desktop GPU the route median moves about ±0.3 ms between identical runs, because the card changes clock state at these light loads; small cuts can only be seen per object.

## Cuts

| Cut | GPU median | GPU p95 | Triangles | Draws | Visual check |
| --- | ---: | ---: | ---: | ---: | --- |
| Baseline (0.0.15 with the profiling switches) | 9.92 · 10.01 · 9.95 ms | 15.8 · 16.1 · 16.0 ms | 4.31 M | 342 | — |
| 1. Leaf depth pre-pass (Medium, High) | 10.08 → 7.37 ms | 16.3 → 10.7 ms | 4.02 → 5.05 M | 338 → 359 | Rillford noon and landing 17:00 captures identical apart from grass sparkle (0.06 % of pixels differ by more than 8/255, none in crowns) |
| 2. Leaf masses from a baked noise volume; unused rough-cut noise skipped | 7.37 → 7.26 · 7.14 ms | 10.7 → 10.2 · 9.8 ms | ≈ 5.3 M | ≈ 363 | Crown masses fall in a different random pattern of the same size and strength (mean difference 0.4–0.5/255) |
| 3. Shadow pass writes depth only; depth pass skips the mass noise | no change measurable here (per object: casters 1.09–1.16 ms either way) | — | — | — | Shadows identical by construction (depth unchanged) |
| 4. Tree shadow casters only where their shadow can reach the view (outdoors) | per object: casters 1.15 → 0.72 ms; route within noise | — | 5.31 · 5.03 → 4.87 · 4.86 M | 364 · 350 → 331 · 327 | Rillford 11:00 and 18:20, landing 09:00: no shadow differs |
| **Final** | **7.68 · 7.11 ms** | **10.9 · 9.7 ms** | 5.13 M | 340 | Visual gate (mac profile): bow, vault 18/18 and shimmer pass; shimmer sparkle 0.047 against the baseline's 0.058 |

How each works:

1. **Leaf depth pre-pass.** A crown is many cut-out cards deep, and a cut-out shader (discard, alpha to coverage) stops the GPU rejecting hidden fragments before shading, so every card behind the nearest was lit, shadowed and coloured. Leaves now draw a depth-only pass first (the same program and cut-out, ending after it), then shade with depth test EQUAL, no depth write and no cut-out of their own: only the nearest leaf's samples pass, the very samples the depth pass covered, so multisampled edges are unchanged. Both passes declare `invariant gl_Position`. The pass costs a second run of the leaves' vertices, which the triangle count shows. `?prepass=0` turns it off.
2. **Baked leaf-mass noise.** Two octaves of 3D value noise per leaf pixel (sixteen hashes) became two fetches from a tiling 64³ volume of the same noise.
3. **Depth-only shadow pass.** Three's PCF shadow target has an RGBA8 colour buffer that nothing samples; its writes are masked for the shadow pass (`?shadowcolor=1` restores them). Expected to matter more on a tile-based GPU than here.
4. **View-aware shadow casters.** Off-screen trees inside the sun's shadow volume cast only if their bounds, swept 260 m away from the light, touch the view's left or right side. Top and bottom are not tested, so the water's reflection keeps its shadows; indoors, and while a window capture is shown, every caster stays.

## Where the remaining time goes

Per object at Rillford, 11:00, after the cuts (ms of GPU a frame):

| Part | ms |
| --- | ---: |
| Leaves, depth pass (near models) | 0.70–0.79 |
| Leaves, colour pass (near models) | 0.57–0.72 |
| Tree shadow casters | 0.72 |
| Settlement | 0.43–0.53 |
| Terrain | 0.44–0.53 |
| Trunks and branches | 0.35–0.44 |
| Water, groundcover, post passes | 0.2–0.4 each |

At a quarter of the resolution the leaves, trunks and settlement cost nearly the same (leaves 0.38 + 0.44 ms, trunks 0.34 ms, settlement 0.36 ms): they are bound by vertices and triangles, not pixels. Taking the wind out of the leaves' vertex shader changed nothing, so it is the triangle count itself.

The final build is about 5 ms over the 2.0 ms median and 7 ms over the 3.0 ms p95; triangles (5.1 M) and draws (340) are over too.

## Batch 10 findings (tried, measured, not kept)

Same route and profile; each A/B pair run back to back, three laps each. The machine was shared with other GPU work during these runs, so laps with a CPU median above about 9 ms are contended and their GPU time is not comparable.

| Trial | GPU median | Triangles | Draws | Visual check | Verdict |
| --- | ---: | ---: | ---: | --- | --- |
| Uncontended baseline (same session) | 7.11 · 7.24 · 7.24 ms | 5.08–5.16 M | 335–341 | — | — |
| High trees crossfade to middle 90–130 m, far 300–400 m, every species (`?highlod=90,130,300,400&highlodsp=…`) | 7.43 ms (uncontended lap) | 4.35–4.38 M | 337–357 | Broadleaf crowns thin out and turn more see-through beyond 100 m; the dithered crossfade shows on bushes | Rejected: visible, no GPU gain |
| The same with bands 160–220 / 450–600 m | not benched | — | — | Broadleaf crowns still visibly thinner at about 200 m | Rejected |
| Conifers only, 90–130 / 300–400 m | 7.18 · 7.35 ms | 4.38–4.74 M | 337–359 | Firs indistinguishable at that range; solitary pines slightly flatter | Not kept: tris −8 %, GPU unchanged |
| Tree instances packed nearest first (so hidden crowns fail the depth test) | per object, leaf depth pass 1.26 → 1.37 ms, colour 0.99 → 1.05 ms | — | — | Identical by construction | Rejected: no gain, so the leaves are not fill-bound |

What these show on this card:

- **Resolution does not move the route time.** At 480×300 and device scale 1 the GPU median was 7.60 ms, against 7.1–8.0 ms at the Air profile (2160×1350 drawn).
- **Triangles alone do not either.** Hiding the whole forest (1.56 M triangles left, 238 draws) gave 7.22 ms; turning shadows off 8.30 ms; the reflection off 9.60 ms (a contended lap).
- Per pass at Rillford (camera at (−60, 16) looking east, 11:00): main view 5.3 ms, shadow map 0.69 ms, post passes about 0.4 ms. Per object in the main view: leaf depth pass 1.1–1.3 ms, leaf colour 0.65–1.0 ms, terrain 0.54 ms, near trunks 0.43–0.57 ms, settlement 0.41 ms.
- So on the gate machine the route median is dominated by fixed cost and clock state, not by pixels or triangles, and cuts of a few tenths of a millisecond cannot be seen there. The budget has to be judged on the Air itself (frame time and heat), or with a locked GPU clock; the triangle and draw counts are the dependable proxies here.

## Distance look (batch 10)

- **Dusk haze.** From dusk the fog colour is the horizon colour dimmed by up to 35 % with nightness, and night thickens the fog by 0.0006 instead of doubling it (0.0019 → 0.0038). At 19:48 a crown 400 m away keeps about 40 % of its own colour (was 17 %), so far woods read as a dark treeline against the glowing sky instead of pale ghosts lighter than the trees in front. Day is unchanged by construction (nightness 0). Captured with the visual gate's `woods`, `meadow` and `grove` runs at 19.8 against the previous build.

## Next cuts

- **Fewer near-crown triangles.** The near leaf models carry about 11–12 k triangles a tree (cluster canopies, 6,000 cards) and High draws them to 1 km. A lighter near model, or the middle model from a distance where the two cannot be told apart, attacks the largest cost three times over (depth, colour, shadow). Needs side-by-side captures; "Lighter distant trees" alone did not help on the route, because most leaf cost is within 120 m.
- **Shadow casters at a cheaper model.** Middle-model trunks (about 4,900 triangles) cast from 16 to 70 m; an earlier test with the far model from 24–36 m flattened crown self-shadowing visibly, so it needs a dedicated shadow model rather than the far one.
- **Settlement and terrain vertices.** Both cost about the same at a quarter of the resolution; merging and LOD for distant buildings, and terrain tile LOD, are the candidates.
- **Measure on the Air itself.** This card's clock states blur cuts under 0.3 ms; a locked-clock run or the Air's own frame time is needed to confirm the small ones.
