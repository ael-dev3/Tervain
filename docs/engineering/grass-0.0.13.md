# Grass — 0.0.13

The grass was rebuilt as an engine of its own ([A61](../decisions.md)). The requirement was lush, detailed grass;
characters, animals and anything else moving through it should push it aside and leave a trail. Wind should cross it
the way it crosses a real meadow. On the title screen the meadow is the centre of the scene, and the cost to the frame
stays modest. The 0.0.10 folded tufts, their cluster texture and patch material are removed. Tree and leaf sway stays
paused ([A16](../decisions.md)); grass wind remains a separate effect.

## Blades

A clump is a tiny shared mesh ([bladeGeometry.ts](../../src/presentation/grass/bladeGeometry.ts)). Each blade is a
strip of quads narrowing to a tip vertex. A vertex stores only its blade's index, how far up the blade it sits and
which edge it is on. One buffer serves every clump in the world. The vertex shader
([grassMaterial.ts](../../src/presentation/grass/grassMaterial.ts)) builds the actual blade from the clump's seed:

- **Root:** a jittered sunflower spiral within the clump, on the ground plane fitted under it.
- **Shape:** height and width vary per blade. Most blades are leaves tapering to a point. Some are flowering stems
  holding a spindle of seed, and a few are small flowers: white, yellow and violet, or purple in heather.
- **Bend:** a quadratic Bézier from the root to a tip tilted by the rest lean, the wind and anything pushing through.
  It is rescaled to the blade's own length, so a bent blade never stretches. A share of old leaves droop over.
- **Facing:** each blade's face turns partly toward the viewer, so few are seen edge-on. Its normal is rounded toward
  its edges.
- **Colour:** the clump's tint varies per blade. Roots are darker inside the tuft and tips paler and drier. Dry
  blades and seed stems bleach toward straw.

The material is Three's Lambert with its direct-light term replaced for thin leaves. Sun, lanterns, shadows, the sky
light and fog all reach the grass the way they reach everything else. The replaced term adds:

- wrapped diffuse;
- light passing through the blade when the light is behind it, strongest in the upper blade, seed heads and petals;
- a soft sheen where blades turn toward the light.

## Wind

[wind.ts](../../src/presentation/grass/wind.ts) holds a tileable gust field: broad gust fronts tens of metres across,
with finer turbulence. It is scrolled downwind at the wind's speed, so a gust is seen as a band of bending,
brightening grass travelling across a meadow. Inside a gust each blade also flutters at its own frequency; shorter
blades flutter faster. The prevailing direction veers a few degrees either way. Strength changes ease in over seconds.

The same field is evaluated on the CPU, so other things move with the gusts the grass shows. On the title screen the
standard flies harder in each gust that crosses it. The wind's sound rises as each gust seen rolling up the slope
reaches the lens. Reduced Motion keeps only a faint, still lean.

## Things moving through it

[trample.ts](../../src/presentation/grass/trample.ts) keeps a small field on the GPU of where things have pushed
through. Each texel holds a push direction and how flat the grass lies. Every step:

- both values fade: a bend springs back in under a second, and flattened grass rises over several seconds;
- every mover is stamped in, keeping the stronger push, so crossing paths never add up.

Grass leans away from a mover and along its direction of travel, and lies down under anything heavy enough. A walk
through long grass leaves a trail that slowly closes. The field steps at a fixed 30 Hz, so recovery is the same at any
frame rate.

In the realm the field follows the hero in whole texels, so nothing it holds slides against the ground. Movers are:

- the hero;
- residents and bandits;
- every active animal, its footprint and weight from its size;
- barrels and crates, at rest and rolling.

At most 48 movers are kept, the nearest to the hero first.

## The realm's meadows

[grassField.ts](../../src/presentation/grass/grassField.ts) sows clumps in tiles streamed around the camera at two
levels of detail:

- **Near:** clumps of many four-segment blades.
- **Far:** fewer, wider two-segment blades that thin with distance.

The two hand over across a distance band without a seam ([tileStream.ts](../../src/presentation/ground/tileStream.ts)).
Ranks are stable, so clumps fade in and out in the same order at any distance, and blades narrow away rather than pop.
Tile bounds cover the tallest, widest blade the shader can build, bent flat in any direction.

What grows where comes from the shared habitat, so grass agrees with the terrain colouring, the trees' shade, paths,
water and everything placed in the world:

- lush in open, damp ground;
- golden and shorter where the soil is sun-cured;
- thin, short and dark under crowns;
- trimmed along paths and on steep ground;
- patchy where a slow colony field says so.

The terrain material darkens and greens its grass and heath layers slightly, so the gaps between blades read as the
shaded floor of a sward rather than bare soil.

## The title meadow

[menuMeadow.ts](../../src/presentation/menu/menuMeadow.ts) lays out the headland's heath for the fixed camera alone.
There are three levels of detail by distance from the lens, each drawn in its own band and handing over to the next.
Nothing is sown where the lens cannot see. Clumps are ordered nearest first, so the depth test skips blades hidden
behind nearer ones.

Nothing grows on:

- the wheel ruts and the camp's trodden pan;
- the rock at the ancient tree's feet;
- the stones' rise;
- anything the camp has claimed;
- the ground past the brow.

The hump between the ruts and the track's verges are short. Under the crown the heath is thin and dark. Toward the
brow, where nobody walks, it is tall and golden. Heather grows in patches on the drier ground. The track itself is
narrowed to two muddy ruts with grass between and beside them.

The low sun stands in front of the lens, so the meadow is lit from behind: dark tufts with glowing tips and seed heads.
A sea wind comes up the slope from the sun's side and past the lens, and swells with the score while it is audible.
It eases in over seconds, so it follows phrases, not beats.

What moves through the heath ([menuScene.ts](../../src/presentation/menuScene.ts)):

- **The pointer:** it brushes through the grass, stamped along its whole path so a quick sweep leaves no gaps, and
  the stroke closes behind it.
- **A stag** ([menuDeer.ts](../../src/presentation/menu/menuDeer.ts)): it works its way across the heath, grazing,
  lifting its head toward the camp, crossing the track and wandering off past the tree. Its fore and hind legs part
  the grass and lay it down. Its round is a function of the menu clock alone, so Reduced Motion holds it exactly in
  place. It is the same model the wildlife uses, loaded once. If it cannot load, the menu simply has no stag.
- **The spirits:** skimming low, they part the grass without laying it down.
- **Seed fluff** ([menuFluff.ts](../../src/presentation/menu/menuFluff.ts)): it drifts downwind over the heath on
  the same gust field. Gusts lift and brighten it, and it glows against the sun.

## Presets

| | Low | Medium | High |
| --- | --- | --- | --- |
| Realm near clumps | 10 blades × 3 segments, 1.9 per m², to 9–13 m | 14 × 3, 3.0 per m², to 12–17 m | 18 × 4, 4.2 per m², to 15–21 m |
| Realm far clumps | 8 × 2, 0.9 per m², thinning 14–48 m | 10 × 2, 1.4 per m², thinning 20–66 m | 12 × 2, 2.1 per m², thinning 24–82 m |
| Realm trample field | 64² over 28 m | 128² over 40 m | 256² over 48 m |
| Shadows on realm grass | no | yes | yes |
| Title meadow (near, mid, far) | 12 × 3, 8 × 2, 5 × 2 | 18 × 4, 11 × 3, 7 × 2 | 24 × 5, 14 × 3, 9 × 2 |
| Title meadow clumps / triangles | about 2,400 / 54,000 | about 4,700 / 207,000 | about 7,600 / 508,000 |
| Title trample field | 128² over 72 m | 256² over 72 m | 512² over 72 m |
| Title seed fluff | 70 | 140 | 220 |

No grass casts shadows.

## Cost

Measured on the development machine (RTX 3080 Ti, 1600 × 900): render-only GPU time with the grass shown and hidden,
in the same run, after warming the GPU to its working clocks.

| | Frame | Without grass | Grass |
| --- | --- | --- | --- |
| A meadow in the realm, High | 3.2 ms | 3.2 ms | about 0.08 ms |
| Title screen, High | 0.9 ms | 0.8 ms | about 0.13 ms |

The grass's CPU work is about a tenth of a millisecond a frame: tile counts by binary search over stable ranks, a
handful of uniforms, and the movers. GPU timer queries in a headless browser proved too noisy to report; the figures
above use repeated renders closed by a pixel read.

## Verification

- **Blades:** clump buffers encode each blade's rows, edges and tip, indexed into the stated triangle count.
- **Wind:** the CPU lookup matches the texture the shader samples and tiles seamlessly. Gust fronts travel downwind
  at the wind's speed. Strength eases, the direction veers within a few degrees, and Reduced Motion holds the field.
- **Trample:** the nearest movers are kept and invalid ones dropped. A fixed field counts only movers inside it. A
  disposed field never touches the renderer.
- **Material:** the blade and thin-leaf light are injected into Three's actual Lambert chunks, sharing the live wind
  and trample uniforms. If the chunks change, the grass hides itself rather than drawing garbage.
- **Realm meadows:** along the arrival route clumps stand on the terrain with its slope, clear of solid things, within
  the shader's bounds. Levels draw nothing outside their band, and the rank prefix keeps every clump the shader keeps.
- **Title meadow:** nothing on the ruts, camp, tree's feet, brow or claimed ground. Every clump is within the view and
  its level's ring. Builds are deterministic and within budget on every preset.
- **Title scene:** the pointer brushes along its path and lifts out, and pointing at the sky touches nothing. Reduced
  Motion skips the field's steps and freezes the wind. The stag stands on the ground, walks its round without jumps,
  keeps clear of the camp, tree, stones, standard and brow, hides when away, and is released with the scene.
- **Browser review:** headless captures of the title screen on every preset, with the stag grazing and crossing the
  track and the pointer brushing the heath. Also checked: wind across frame sequences; a walk through a realm meadow
  with its trail directly after and as it closed; and meadows near the river and the village.

Not established: frame rates on reference or low-end hardware, a listening review of the gust-driven wind sound, or
physical-controller play.

## Limits

### Integration fixes

The integration retains pointer samples across render frames until the 30 Hz
GPU pass consumes them. Samples beyond one 48-mover pass drain through further
batches without repeating recovery or edge fading. These batches preserve the
current nearest body movers and every queued pointer stamp.

Flower and seed heads now use a row at `t = 0.88` in every configured blade LOD.
The fifteen realm/title bands keep their existing vertex and triangle budgets.
Focused regressions cover 60/120 Hz scheduling, overflow, no replay, aliases,
catch-up, failed rendering, disposal and actual configured LOD geometry.

The integration review exercised the local title scene on High, Low and Medium,
including pointer brushing. A new High game reached the rendered shoreline;
movement and the pause/resume round trip retained health 100 and six coins.
No warning or error appeared in the captured browser console. The earlier performance figures above are the
original contribution's recorded measurements; this integration did not run
a new performance benchmark.

### Rendering limits

- The trample field holds at most 48 movers and covers a square around the hero; trails leaving it fade at its edge.
- Grass casts no shadows and is not used for concealment.
- Movers are circles: a stag is two, a cart would be one.
- Grass is not cut or burned.
