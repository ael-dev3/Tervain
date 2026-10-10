# Crowns, branch ribbons, close grass, window views; arrivals without hitches (A79, 0.0.13)

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

The crowns' extra card layers (`thicken()`) fill what is left of each tree's budget. Near broadleaf trees stay at
19,500–19,800 triangles, and every tree is under its 20,000. The eleven files are 0.9 MiB larger in all (13.1 → 14.0 MiB); they load before entry.

The receipts (`docs/engineering/meshy-tree-assets.json`, `public/model-licenses.json`, `modelFiles.ts`) carry the new
bytes, hashes and triangle counts. The tool now refuses to cross seams, and its comment records why.

## 2. Crowns: noise, holes and dark clumps up close

**Cause.** A76's leaf masses did three things in the leaf shader (`foliageMaterial.ts`):

- they thinned the crown's outer shell between masses;
- they roughened every card's cut with fine noise;
- they darkened the spaces between masses by up to 45 %.

From a distance that broke the outline into clumps. Up close, every crown was dotted with holes, ragged edges and dark
patches.

Separately, a leaf card within a metre or two of the eye (the third-person camera under a low crown) filled the screen
as one large dark smear: the cards are up to 3 m across.

**Fix.** The gaps and the roughening are off, and the masses keep only a faint shading (0.45 → 0.15). Leaf cards fade
out between 0.6 and 1.6 m from the eye, in the colour pass only (their shadows stay). Under a crown, the camera now sees
past the nearest leaves instead of into them.

## 3. Grass: ribbons and slabs in front of a low camera

**Cause.** With the camera low in the meadow (as on a slope, or pushed down by obstruction), blades a few decimetres away
filled the view as wide, flat ribbons. The nearest crossed the camera's near plane, which cut them into flat-bottomed
slabs that seemed to hang in the air. Placement was not at fault: blades stand on the same ground as before.

**Fix.** In the grass vertex shader, a blade narrows to nothing between 0.9 and 0.3 m from the eye, so no blade reaches
the near plane. Blades are drawn at 55 % of their width at 1.2 m from the eye, rising to full width by 6 m. Beyond that
the meadow is as before (the eye-height views match). The sun's shadow pass sees the light's eye, far away, so shadows
keep every blade.

## 4. Window views: a 320 px cube magnified

**Cause.** The view through a window is a cube capture from the room's middle, 320 px a face, without mipmaps. On a 1080p
screen, a pane showed about 140 of its pixels stretched over 400.

**Fix.** 1,024 px a face on High, 640 on Medium, 320 on Low, mipmapped with anisotropic filtering. Each refresh already
draws one face a frame (A77, A78), so the larger face costs fill, not draw calls.

In house_a over 420 frames, the heaviest frame stays under 5 M triangles: 4.92 M, against 5.95 M on main. The panes show
the oak's leaves, trunks and the hill behind it where there was a blocky blur.

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

- Before and after views of the crowns (under, close, from 30 m), the branches inside a crown, the grass at the field
  fences (0.45 m, 0.7 m, 1.2 m and 1.7 m eye heights), and the window in house_a.
- All tests pass, including the tree budget (wood under 9,000 triangles, near crowns 19,500–19,800, every tree under
  20,000) and the receipts.

No Meshy credits spent.
