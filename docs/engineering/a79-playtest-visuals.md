# Crowns, branch ribbons, close grass, real windows; arrivals without hitches (A79, 0.0.13)

The owner playtested on an RTX 3080 Ti and reported four visual faults:

- near crowns noisy, smeared and blotchy;
- long dark ribbon-like polygons stretching out of crowns near the camera;
- grass blades up close as oversized flat ribbons, some hanging in the air;
- window views as a blurry, pixelated blob.

Each was reproduced in the served production build on that GPU, traced to its cause, fixed, and checked again from the
same cameras. Screenshots were taken before (`main`) and after (this branch), at 1600×900 on High, at 11:00.

## 1. Branch ribbons: the wood's UVs collapsed across seams

**Cause.** A72 (`tools/rebalance-tree-wood.mjs`) simplified each near tree's wood from about 14,000 to 6,000 triangles
with meshoptimizer's *Permissive* mode, which lets an edge collapse across a UV seam. The exported wood's atlas is cut
into many small islands, so a collapse dragged a branch's texture over its neighbours'.

The share of the wood's surface whose texture mapping is stretched more than 8:1 (singular values of the 3D-to-UV map,
area-weighted):

| Near file | Export | A72 | A79 |
| --- | ---: | ---: | ---: |
| oak-elder | 1.0 % | 22.6 % | 1.3 % |
| tree-0208 | 0.8 % | 7.8 % | 0.9 % |
| tree-1505 | 1.9 % | 17.6 % | 1.9 % |
| tree-4815 | 1.7 % | 24.7 % | 2.1 % |
| tree-4949 | 0.2 % | 5.0 % | 0.2 % |
| palm-fan | 0.0 % | 13.7 % | 0.2 % |
| palm-lean | 0.0 % | 40.4 % | 0.1 % |
| verdant-sentinel (all three levels) | 3.9 % | 13.2 % | 4.6 % |
| tree-1521 | 11.1 % | 19.2 % | 8.8 % |

Up close, a branch with its texture stretched along it reads as a long dark strip streaked with the atlas's leaf
greens. Thin branches flattened into folded strips. These are the "ribbons".

Two other suspects were ruled out by measurement. Removing the leaf cards with degenerate UVs (5–10 % of every crown, a
quirk of the exports) changed nothing visible. Neither did the alpha roughening (below).

**Fix.** The eleven files were taken back to their state before A72 and re-simplified with the UV seams kept (no
Permissive), within the same error ceiling. Wood comes to about 8,000 triangles (oak-elder 8,492; palm-lean 12,084).
The surface deviation averages 0.1–1.0 cm, and trunk radius, height and foot are held as before.

The crowns' inner card layer (`thicken()`, section 2) takes as much of what is left as fits, and every tree stays under
its 20,000 triangles (the near broadleaf trees under 19,800). The eleven files are 0.9 MiB larger in all (13.1 → 14.0
MiB); they load before entry.

The receipts (`docs/engineering/meshy-tree-assets.json`, `public/model-licenses.json`, `modelFiles.ts`) carry the new
bytes, hashes and triangle counts. The tool now refuses to cross seams, and its comment records why.

## 2. Crowns: noise, smear, holes and dark clumps

Each of the following was switched on and off in the served build and compared by eye from the same cameras.

**Smear: a doubled crown.** A72's `thicken()` filled near broadleaf crowns with two more layers of the crown's own cards,
turned and scaled about its middle. The layer at 90 % lay just under the surface and showed through every gap as a
second, offset copy of the outer cards. Close up, the crown read as smeared and busy. Without it, leaf clusters are
distinct and the branch structure reads, near and far. The inner layer (80 %) stays: it fills the crown's body behind
the outer cards.

**Noise, holes and dark clumps.** A76's leaf masses did three things in the leaf shader:

- they thinned the crown's outer shell between masses;
- they roughened every card's cut with fine noise;
- they darkened the spaces between masses by up to 45 %.

Up close, every crown was dotted with holes, ragged edges and dark patches. The gaps and the roughening are off, and the
masses keep a faint shading (0.15).

**Smears at the lens.** A card within a metre or two of the eye covered the screen as one dark smear (cards are up to 3 m
across). Leaf cards now fade between 0.6 and 1.6 m from the eye, in the colour pass only.

Ruled out:

- **The leaf atlases' WebP compression:** their alpha is lossless (VP8L, no quantisation).
- **The alpha roughening alone:** no visible change.

## 3. Grass: wide flat ribbons, slabs in the air

**Cause.** With the camera low (on a slope, or pushed down by obstruction), close blades filled the view as wide, flat,
evenly shaded strips. A tall blade leaning into the lens crossed the camera's near plane and was cut into a
flat-bottomed slab hanging in the air. Placement was not at fault: blades stand on the same ground as before.

**Fix (`grassMaterial.ts`, `grassField.ts`).**

- Each point of a blade narrows by its own distance from the eye: to nothing between 1.0 and 0.35 m, so no blade reaches
  the near plane, and slimmer up to 5 m.
- Near blades are 15 mm wide at scale 1 (21 mm before) on High, with 32 blades a clump (24 before), so the meadow covers
  the ground as before at eye height. Medium and Low are narrowed in proportion.
- A midrib is shaded in: paler down the middle, darker toward the edges, so a blade reads as a creased leaf.

In the sun's shadow pass the eye is the light's, far off, so shadows keep every blade. The near clump costs a third more
triangles: 32 × 7 = 224 a clump, against 24 × 7 = 168.

## 4. Window views: real openings

**Cause.** A window seen from inside was a painted pane on a solid wall, showing a cube captured from the room's middle:
320 px a face, no mipmaps, and from the wrong place. On a 1080p screen it was a blocky, blurred image of roughly what lay
outside.

**Fix.** The windows of the houses (`buildStandard`) are real openings through the walls:

- **Walls:** the room walls (`roomWalls`), the timber houses' outer boards (`plankFace`) and the plastered houses' timber
  frame (`timberFrame`) are built with the openings cut out. Their reveals show the wall's depth.
- **Inside:** the world itself is seen through clear glass that reflects a little sky.
- **Outside:** the rooms are seen from outside, with their furniture shown while the camera is within 25 m.
- **At night:** the room's lamplight shows over the glass from outside only.

The windows are placed by each building's own random sequence after its walls are drawn. A first pass into a scratch
region finds where they fall, then the walls are built around them, so every tone, shutter and prop is as it was.

The cube capture is kept only for the shrine hall, whose windows are still panes, so the houses no longer pay for it. It
is captured at 1,024 px a face on High (640 Medium), mipmapped.

## Arrivals without hitches

Residents who take their model after the world opens build their rig a step at a time, about 3 ms of each frame
(`createMeshyNpcRigSteps`; covered layers, finger plan, clips and hands each yielded). The finished rig is handed over
out of sight once its shaders are compiled.

The animals and furniture that arrive after entry also have their colour and shadow shaders compiled in parallel before
they show (`renderer.compileAsync` against the grade's scene target, under the scene's lights and the daylight alone).

In the first minute of play on the route, the worst frame fell from 0.96–1.06 s to 0.28–0.44 s (four sessions each).
Frames of 33–100 ms remain, about one per build step on the slowest steps (finger plan, clips, hands: 15–25 ms each).

**Still open:** one 0.26–0.3 s stall the first time the animals' shadows are drawn. Its two depth programs differ from
every variant compiled ahead by a flag that has not been identified.

## Checked

- Before and after views, compared by eye in the served build:
  - the crowns: under, close and from 25 m;
  - the branches inside a crown;
  - the grass at the field fences (0.45, 0.7, 1.2 and 1.7 m eye heights) and inside the palisade;
  - the window from inside house_a;
  - three houses from outside, by day and at night.
- All tests pass, including the tree budget (wood under 9,000 triangles, near broadleaf trees under 19,800, every tree
  under 20,000), the receipts, and the buildings' coplanar-face check.

No Meshy credits spent.
