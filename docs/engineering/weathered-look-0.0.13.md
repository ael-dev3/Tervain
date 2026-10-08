# Weathered look — 0.0.13

The world looks less glossy and more weathered ([A67](../decisions.md)): rugged, dirty and Gothic, at a higher
resolution where it helps. Four changes make it:

- the buildings' surfaces are baked offline at four times the resolution, with weathering and grime;
- rough surfaces lose their sheen;
- walls darken towards the ground;
- the final grade is earthier.

No model, sound or music file changes, and no geometry or texture coordinate moves.

## Building surfaces

Twelve tileable surfaces dress the buildings and the props built in code: plaster, timber, planks, stone, cobble,
roof tile, thatch, slate, cloth, bark, rock and bronze. They were generated at load time at 192 or 256 px, about 75
to 230 texels a metre, and read as flat and blurred up close.

Now [bake-buildings.py](../../tools/textures/bake-buildings.py) bakes them offline at 1024 px, from the seamless noise
and cell fields in [texkit.py](../../tools/textures/texkit.py). It uses numpy and Pillow, and the same command always
gives the same files. Cloth and bronze are baked at 512 px, which is enough for the 0.6 m and 1.2 m they cover.

What each texture shows:

| Texture | What it shows |
| --- | --- |
| Stone | Coursed rubble of mixed sizes and earthy greys, each stone mottled, pitted and chipped, some stained with iron. Bedded in recessed, dirty lime mortar, with grime in the joints, rain streaks, lichen on the faces and moss in the joints. |
| Plaster | Dingy lime render with an uneven trowelled skin, hairline cracks, rain streaks, damp and mould. Where it has fallen away it shows the straw-bound daub or the rubble behind, inside a broken lip. |
| Planks | Six boards of uneven width. The soft grain is worn away between hard ridges, silvered where the weather reaches. Split and knotted, with dark gaps, butt joints, rusting nail heads, and mould where water lingers. |
| Timber | Hewn beams with adze scallops across the grain, long drying checks and knots, darkened by age and smoke. |
| Roof tile | Shallow barrel tiles set a little unevenly, chipped at the lower edge, in uneven browns and dull reds. Sooted and streaked, with lichen crusts, moss in the shaded laps and a few blackened replacements. |
| Thatch | Old straw in uneven courses, bleached grey-brown, dark and rotting in the laps, with clumps of moss. |
| Slate | Dark grey slates with green and blue casts, ragged at the lower edge and layered. Pale lichen crusts, soot, and moss where the courses lap. |
| Cobble | Rounded field cobbles in packed mud, with grass and moss in the joints. |
| Cloth | Coarse sacking in plain weave, with slubbed threads, stains and worn patches. |
| Bark | Long furrowed ridges broken into plates, with lichen on the ridges and moss in the furrows. |
| Rock | Blocks parted by open joints, bedded strata, weathering and rain streaks, pits, lichen and moss. |
| Bronze | Dark tarnish over brown metal, casting pores, verdigris in the hollows and streaks, and soot. |

**Unchanged.** Each texture covers the same metres as before and keeps its layout:

- the long grain runs along u on planks and timber;
- shingled courses run down v on roofs and thatch;
- furrows run along v on bark.

Normal maps come from the same height fields, with the convention the game's generated maps use. Rock has 4.2% of its
texels steeper than 30°, under the 5% that the existing rock check allows.

**Brightness.** Each albedo is levelled to a mean brightness a little under the generated texture it replaces. The
change is in detail and grime, not in a darker world. Roof tile and bronze sit lower on purpose: weathered clay and
tarnished metal instead of bright orange and polished gold.

**Files.** The textures ship as 24 JPEGs in `public/textures/buildings/`, 5.9 MB in all. A manifest lists each texture's
size and each file's bytes and SHA-256.

**Loading.** [bakedTextures.ts](../../src/presentation/bakedTextures.ts) handles them.

- It fetches the files while the world's models download and checks each against the manifest.
- It decodes off the main thread at the preset's size, without colour management, so normals stay data.
- It hands them to [buildingTextures.ts](../../src/presentation/buildingTextures.ts), where `makeTexPair` serves them
  in place of the generated textures.
- Anything that fails to load or decode keeps its generated texture. A warning goes to the console; it is never an
  error.

The title screen never waits for them. A material set made before they arrive, such as the title camp's, takes them up
as soon as they are installed.

| Preset | Texels across | Anisotropic samples | GPU memory if every surface is drawn |
| --- | --- | --- | --- |
| High | 1024 (cloth, bronze 512) | 16 | about 112 MiB |
| Medium | 512 | 8 | about 32 MiB |
| Low | 256 | 4 | about 8 MiB |

The generated set used about 8 MiB. The renderer clamps anisotropic samples to what the GPU offers.

## Matte surfaces

**Sky light.** The generated sky light put a tight, bright sun in its image. As that reflection blurred across rough
timber, stone, cloth and skin, each took a polished sheen. The sun in the sky light is now spread over about three times
the sky at a third of the peak (peak 1.9 → 0.6, width 0.11 → 0.2 radians). It carries about the same energy, so walls
keep their warm fill under a low evening sun, but without the sheen. The directional sun still carries the strong
light.

**Imported models.** Some carry roughness maps that read as wet plastic. [matte.ts](../../src/presentation/matte.ts)
puts a floor under the final roughness, keeping the maps' variation above it:

| Applies to | Change |
| --- | --- |
| The wanderer | Roughness at least 0.7 |
| Furniture | Roughness at least 0.72; sky reflection at 0.8 |
| Every animal | Never metallic; roughness at least 0.8; sky reflection at most 0.75 |
| Residents | Skin roughness 0.52 → 0.6, leather 0.64 → 0.74, steel 0.4 → 0.52; cloth's grazing sheen 0.22 → 0.14 |
| Metal props built in code | Barrel and crate hoops, residents' weapons and tools, arrows and the hunting steel: roughness 0.7–0.74, metalness 0.45–0.5 |
| Movable props' wood | Roughness 0.86 → 0.92 |
| Grass | Sheen 0.5 → 0.34; since A68 the grass's whole light is matte (see the [loading and grass record](loading-performance.md#slow-connections-returning-visitors-and-parallel-downloads-a68-0013)) |

Two of the boars were authored almost fully metallic, and a cat, a deer and a dog were polished.

## Grime

The settlement's walls darken towards the ground ([buildKit.ts](../../src/presentation/buildKit.ts), `GRIME`):

- rising damp up to a tide line that wavers between 0.55 and 1.15 m, a little greener and browner;
- splashed mud in the lowest 0.3 m.

Only upright faces take it: floors, treads and paving stay as they are. Height is measured from what the wall stands on:
the terrain outside, a room's floor inside. It lives in the vertex colours, so it costs nothing to draw.

## Grade

The final pass ([grade.ts](../../src/presentation/grade.ts)) is earthier:

- **Colour.** Grass and leaves lean to olive and lose a third of their chroma. The sky's blue loses about a fifth.
  Reds, golds and browns keep theirs, so the warm and cool contrast survives. This is not a blanket desaturation (A20).
- **Contrast.** It rises from 1.06 to 1.1, but the curve now turns at 0.4 instead of mid grey. The extra contrast goes
  into the lights, and shadows keep their detail.
- **Vignette** rises from 0.10 to 0.18, **film grain** from 0.004 to 0.012, and overall saturation eases from 0.94 to
  0.92.

The title keeps its stronger vignette and grain and gains the earthier colour. Shot mode accepts `earth` (0 to 1) with
the other look parameters.

## Measured

Mean brightness of ten fixed High views, before and after, as display luma from 0 to 1:

| View | Before | After |
| --- | --- | --- |
| Street | 0.328 | 0.315 |
| Mill | 0.221 | 0.208 |
| Timber house | 0.127 | 0.110 |
| Room interior | 0.112 | 0.097 |
| Forest | 0.237 | 0.234 |
| Resident | 0.297 | 0.292 |
| Shrine | 0.244 | 0.237 |
| Coast | 0.630 | 0.637 |
| Evening | 0.105 | 0.096 |
| Night | 0.115 | 0.107 |

Bright areas hold their level. The darker surfaces (the timber house, the room inside, the evening street) lose 9–13%,
mostly in shadow. Two of the views were also reviewed on Medium and Low, and the title screen on High.

## Reproduce

```
python tools/textures/bake-buildings.py [--size 1024] [--only stone,plaster] [--preview DIR]
```

It rewrites the JPEGs and the manifest in about a minute and a half. `--preview` also writes a 2 × 2 tiled view of each
texture and its normal map, to check the seams by eye. The script reports each texture's size and its share of steep
normals.

## Limits

- The terrain, the trees and the people keep their own textures. Only the surfaces built in code are baked.
- There is no screen-space ambient occlusion. Corners and eaves darken only where the textures and the grime put dirt.
- The first visit downloads 5.9 MB more, alongside the models. The extra GPU memory on High has no reference-hardware
  qualification.
- The generated textures remain as the fallback and for tests, so the two sets can drift apart if one is edited without
  the other.
