# Foliage — 0.0.13

The trees' foliage was reworked ([A62](../decisions.md)). The requirement was modern-looking leaves, wind animation,
foliage that answers physical contact, and a lighter frame rather than a heavier one. Every supplied tree keeps its own files,
geometry, UVs, triangle budget and placement; the change is in how the leaves are lit, how everything moves, and how
shadows are drawn. Gameplay tree and leaf motion had been paused since A16; A62 lifts that pause.

## One wind

The realm has one wind ([realmWind.ts](../../src/presentation/realmWind.ts)), created by the world and shared through
the build context. The grass and the trees answer the same gust field ([grass/wind.ts](../../src/presentation/grass/wind.ts)),
so a gust seen crossing a meadow moves on into the woods. The world steps it once a frame. Reduced Motion stops it and
holds every tree still.

## Trees in the wind

[foliageWind.ts](../../src/presentation/foliage/foliageWind.ts) moves every vertex of a tree in the vertex shader. It
needs no per-vertex data: each offset is computed from where the vertex sits relative to the tree's own root, so every
supplied model works unchanged.

- **Trunk:** bends downwind like a cantilever, more with height, with the steady push and each passing gust. It sways
  at a period set by the tree's own height, so saplings move faster than old trees. A bent trunk keeps its length, so
  what is pushed sideways also dips a little.
- **Branches:** swing with their reach from the trunk, coherently along their length, faster than the trunk.
- **Leaves:** flutter at their own quick rates inside the turbulence that rides in the gusts.
- **Kinds:** conifers are stiffer, palms looser, shrubs short and lively. Dead wood has no flutter.

Wood and leaves follow the same continuous field, so leaves stay on their branches. The same displacement is patched
into the shadow pass, so shadows move with the trees and the dappled light on the ground shifts. Even with every
term at its largest, the offsets stay inside the two-metre guard used to cull trees.

## Leaves lit as leaves

[foliageMaterial.ts](../../src/presentation/foliage/foliageMaterial.ts) extends each tree's own material without
replacing its textures:

- **Crown normals.** The baked foliage cards carry flat front, side and top normals, so a crown used to light up card
  by card. Each leaf now also takes the normal of a spheroid fitted to its crown, so the crown shades as one rounded
  mass, with the card's facing kept for detail.
- **Light through leaves.** When the sun or a lantern is behind a leaf it glows, most on the crown's outer shell.
  Skylight passes through leaves seen against the sky, so looking up into a crown it glows.
- **Depth.** Ambient light dies away inside the crown.
- **Colour.** Each tree varies a little in hue and value, and greens beyond a natural saturation are drawn back.

Wood gets the wind only.

## Touch and strikes

- **Bodies.** The hero and the nearest residents, bandits and animals push low foliage aside, such as the lowest
  branches and small shrubs.
- **Floor plants.** Ferns and low shrubs on the forest floor sway with the wind. They also read the grass's trample
  field, so walking through them parts and presses them down. Moss and litter lie still.
- **Strikes.** An arrow that stops in a trunk shakes that tree for a second or two: visibly for a sapling, hardly at
  all for an old oak. It also knocks a few leaves loose
  ([leafBurst.ts](../../src/presentation/foliage/leafBurst.ts)); they fall fluttering, drift with the gusts, settle and
  fade.
- **Falling leaves.** The woodland's ambient falling leaves drift downwind.
- **Sound.** The world's wind sound rises as each gust passes the listener.

## The title tree

The ancient tree's crown takes the same lighting and moves in the sea wind that rolls over the heath, so it glows
against the sunset. The carved trunk, the door, the rags and the lanterns hang from still wood. The crown therefore
swings at its branches and leaves only, and each attached sprig's stem root stays pinned. Its shadow moves with it.
The crows' avoidance envelope covers the swing.

## Cost

Tree shadows now come from shadow-only casters
([shadowCasters.ts](../../src/presentation/foliage/shadowCasters.ts)). These meshes are shown only for the sun's shadow
pass: hidden as each render of the scene begins and shown when the sun's shadow matrices are updated, so the colour
pass never draws them. They hold only trees inside the sun's shadow volume:

- the full model within 25 m of the camera;
- the middle source model to 70 m;
- the far model beyond, except the Pine, whose far model is four crossed planes, so its shadows stop at the middle
  model.

The leaf cards are the same baked atlas at every level, so the shadow shapes match. The colour pass draws only trees
the camera can see, and empty levels leave the render lists.

The low decorative shrubs, supplied trees scaled to about 1.5 m, fade to their own lighter models within a short walk,
by the same dithered coverage as before. High still draws full source trees in view at every distance.

Measured on the development machine (RTX 3080 Ti, 1600 × 900): render-only GPU time with the forest shown and hidden
in the same run, after warming the GPU, shadows included.

| View | Triangles a frame (before → now) | Forest GPU time (before → now) |
| --- | --- | --- |
| Deep woods | 8.2 M → 4.3 M | about 1.6 ms → about 1.2 ms |
| Far view from the overlook | 8.9 M → 4.9 M | about 2.3 ms → about 2.1 ms |

The richer leaf shading costs a little per pixel. Most of the saving is geometry, which matters most on GPUs weaker
than the development machine.

## Presets

| | Low | Medium | High |
| --- | --- | --- | --- |
| Wind, touch, strikes | yes | yes | yes |
| Tree shadows | none | shadow-only casters | shadow-only casters |
| Shrub levels | middle to 90 m, then far | full to 34 m, middle to 90 m, then far | full to 34 m, middle to 90 m, then far |
| Other trees | as before | as before | full source trees at every distance |

## Verification

- **Wind:** one shared wind; the tree patch is injected into Three's actual standard, depth and distance chunks and
  sits after `<begin_vertex>`. A pinning weight names only an identifier. Every moving term carries the strength,
  shakes and touches included, so a strength of 0 holds a tree still. Floor plants read the shared trample field. Each
  kind of tree answers by its own response.
- **Look:** the leaf light, crown normals, depth and sky light are injected into the actual standard and physical
  chunks. Earlier patches (the distance dither) and their cache keys are chained. Wood gets the wind only. If a chunk
  changes, the old look is kept rather than a broken one.
- **Shadows:**
  - the casting group is shown for the shadow pass only, and both hooks are restored on removal;
  - casters share the source buffers but not the colour mesh's visibility data, and keep the leaf cut-out;
  - the distance rules apply, and the Pine never casts from its crossed planes;
  - off-screen trees in the sun's volume are drawn only by casters; Low builds none.
- **Strikes:** a trunk hit shakes the right tree within four slots, and leaves are released. A miss, or a point high
  above the tree, hits nothing.
- **Leaves:** a fixed pool; the leaves fall, drift downwind and settle, and hold still in Reduced Motion. Detached
  falling leaves drift downwind for any wind direction.
- **Title tree:** the crown's wind is scaled once by its pinning weight, the spirits' light is still the last change
  to its shader, its shadow material is set, and Reduced Motion holds its clock.
- **Browser review:** captures of deep woods at noon, afternoon and evening (looking into the sun), the warm woods,
  the village, a far view and the title screen. Also frame sequences of the woods in the wind, a walk, and a struck
  tree, measured against the wind alone.

Not established: frame rates on reference or low-end hardware, a listening review of the gust-driven wind sound, or
physical-controller play.

## Limits

- The supplied models carry no branch skeleton: motion is a smooth field computed from position, not a simulation of
  each branch.
- The player's body pushes foliage visually only; leaves are not colliders, and trunks keep their existing collision.
- Only arrows strike trees. Leaves knocked loose start inside the crown and are seen as they drift below it.
- The supplied leaf textures are unchanged, so their painted clusters remain.
