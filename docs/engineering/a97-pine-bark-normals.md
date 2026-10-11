# The solitary pine's grey slivers: bark normals repaired (A97, 0.0.13)

## The fault

Seen from below, the solitary pine's branch stubs showed as pale grey fins covered in a fine dot grid. They read as
broken slivers sticking out of the trunk. The dark, thorn-like dead-branch stubs around them are the source model's own
geometry and are not part of the fault.

## Cause

Each suspect was ruled out by measurement and by eye in the served build on the GPU, from the same camera under a pine
at the north-western wood:

| Suspect | Test | Result |
| --- | --- | --- |
| Thin triangles (391 on the near bark) | Long edges flipped where the neighbour lies flat | 40 of 893 improved; no visible change |
| The baked atlas: each stub its own tiny island | 1,667 islands re-projected onto a swatch of trunk bark | Loaded in the game; no visible change |
| Shadow acne | Shadow receiving off on the pine wood | Grid unchanged |
| The shadow-only caster fighting the wood | Caster hidden | Grid unchanged |
| The distance dither | Coverage read as full; the discard removed | Grid unchanged |
| Back faces of thin stubs | The wood is single-sided already | — |
| **The material** | A plain material on the same geometry | **Grid gone** |
| The atlas map | Map removed, bark detail kept | Grid unchanged |

The fault lay in the bark detail shader working on bad normals. On the near level 2,075 of the 7,644 bark vertex
normals pointed against the faces that use them, and on the mid level 1,176 of 4,405. Interpolated across a triangle,
such normals pass near zero. The bark detail's triplanar weights (`normalize`, then `pow 5`) then change from pixel to
pixel. No other flora model has more than 2 % of its wood normals in that state.

## Fix

`tools/repair-pine-normals.mjs` recomputes each disagreeing normal from the faces that use it, weighted by area. Every
other normal, and every other byte of the two files, keeps its value. Only the bark's normal data is re-encoded, and
the tool decodes it again and compares before keeping it. The geometry and triangle counts are unchanged (near 9,706,
mid within budget). The near file grows by 21 KiB and the mid by 12 KiB. The tool reproduces the committed files byte
for byte.

A test (`tests/presentation/pineBarkNormals.test.ts`) fails if any bark normal on either close level points against
its faces again.

## Checked

In the served build on the GPU, before and after, from five cameras: up the trunk, the trunk from below, among the
branches, the wood from the side, and the stand from 30 m. The fins now carry bark and shade with the trunk, and the
dot grid is gone.

No Meshy credits spent. The pine stays the owner's model, with only its normals repaired.
