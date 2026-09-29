# Gothic 3 look reference: Ardea and the Myrtana coast

**Status:** owner direction (see decisions A12–A15) and the measurements behind it. This is a study for *inspiration*. Nothing from Gothic 3 is copied, extracted into the repository or shipped: the measurements below were read from the owner's licensed local install with read-only tools, and every texture, mesh, tree and sound in Tervain is generated or authored here.

## What the owner asked for

The first place the player sees should be as close to Ardea in Gothic 3 as possible: a coast with a lighthouse, a beach, a great deal of empty terrain, some trees and forests in the distance. The whole game should look like old-school Gothic 3: not cartoonish, rugged, rough around the edges, not perfect, not smooth, human.

## How the reference was read

`C:\Program Files (x86)\Steam\steamapps\common\Gothic 3\Data` holds 19 archives (`.pak`, plus patch archives `.p00`–`.p02`). Every archive header and entry reports no encryption; entries are zlib-compressed or stored. A small local indexer listed them; `.ximg` textures (DXT1/3/5) were decoded to view and to compute average colours; `.xcmsh` mesh headers give a bounding box; `.spt` names the SpeedTree definitions; `Ini/ge3.INI` gives engine settings. Object *placement* for Ardea is stored as serialised entity data that was not parsed, so this study reports what exists and how big it is, not a map of where every object stands.

## What Ardea is made of

| Finding | Value |
| --- | --- |
| World projects | `Ardea_City` (dynamic objects, two NPC layers, navigation zones) and `Ardea_Outdoor` (dynamic objects, fishers' camp, vegetation, navigation zones). |
| Buildings | Palisaded town: Ardea two-storey house 15.6 × 12.2 × 19.8 m, Ardea storage house 18.5 × 17.6 × 22.9 m, palisade sections 4–68 m long and 6–10 m tall, six flights of stairs (1.3–10 m rise). Heavy timber and stone, on a slope. |
| Coast | Fishing house 12.0 × 10.3 × 14.2 m, fishing plank (jetty), harbour net stand, rolled nets, net piles, a shipwreck 9.5 m long, reeds, six "beach stuff" object groups, forest watchtowers, ruined stone towers 6.3 m wide and 14–19 m tall. **There is no lighthouse mesh or template in the data**; the lighthouse is the owner's brief, drawn here from those ruined towers and the harbour language. |
| Props at the start | Benches, stools, log stands, campfires, torches, barrels, poor tables, candles, sign board, dung heap, crystals. |
| People | Slaves (weak, skinny, pants), peasants, a rebel bandit king, bandits, orc scouts, warriors and a boss. Bodies are weathered and thin; clothes are rags, leather and coarse wool. |
| Sound | `coast_birds`, `water_beach`, `water_coast` ambient loops. |
| Units | One engine unit is one centimetre: a barrel is 90 × 110 cm, a bench 240 × 70 × 60 cm. |

## The colours

Every albedo is dark and desaturated. Mean sRGB of the decoded textures:

| Surface | Mean sRGB |
| --- | --- |
| Grass (various) | (34–64, 35–57, 24–35) |
| Forest floor | (54, 46, 35) |
| Bare earth | (42, 30, 19) |
| Gravel / stone ground | (19–84, 17–75, 15–61) |
| Path | (26–90, 26–85, 24–78) |
| Dune sand (the beach base) | (90–116, 64–79, 39–48) |
| Rock transition | (88, 62, 42) |
| Timber (planks and beams) | (34–58, 28–54, 18–33) |
| Roofs: thatch, shingle, tile | (57–61, 44–48, 29–34), (61, 45, 31), (50, 37, 27) |
| Brick / rubble | (38–77, 38–67, 35–52) |
| Tree foliage atlases | (46–73, 46–66, 34–42) |
| Tree bark | (36–107, 32–88, 26–68), mostly under 60 |

The Myrtana shore material blends dune sand (90, 64, 43) with gravel (84, 75, 61) and a detail map; grass and Spanish grass have wet-sand transitions. The engine lights everything with vertex hemisphere lighting with overbright, a bloom threshold of 0.5 and a depth-of-field band from 10 to 80 m, so the frame reads warm, hazy and contrasty although the albedos are close to black.

## Engine numbers that shape the picture

Field of view 60°, near plane 10 cm, far plane 100 m for full meshes and 700–1000 m for low-poly stand-ins, vegetation range 70 m, 30 fps target. Distant land is a simplified mesh, not fog alone.

## Vegetation

The Myrtana set has 52 SpeedTree definitions in five size classes (XS to XXL): Douglas fir, longleaf pine, red oak, pin oak, sycamore, honey locust, pagoda tree, paw paw, crepe myrtle, buckthorn, holly, crab apple, aspen, linden, willow, cypress and dead trees ("rotten tree" meshes). Foliage is alpha-cut cards holding a twig of leaves, hung on a real trunk-and-branch skeleton. Ground plants and underbrush are separate meshes.

## Design rules taken from this

1. **Dark albedo, strong light.** Textures are dark and dirty; the sun, haze and a filmic curve bring the colour up. Nothing is bright.
2. **Empty is the point.** The strand and the heath are open ground with tufts and stones; trees are rare and characterful; forests stand back on the higher ground and in the distance.
3. **Scale is big.** Buildings are large and low, towers are tall, and a person is small against them. The lighthouse shaft is 17 m; pines run to 19–25 m.
4. **Nothing is square.** Posts lean, boards stand at different depths, stones are uneven, roofs sag, doors hang wrong, tools lie where they were dropped.
5. **Weathered materials.** Timber is grey-black, plaster is stained and peeling, rope is frayed, iron is rusted; hems of clothes are dirty.
6. **People are worn.** Thin, tired, mended. Faces have brows and jaws; hands are big; clothes are wool and leather in earth colours.
7. **Haze, not clarity.** Distance dissolves into warm grey. Far forests are silhouettes.

## Where each rule lives in the code

| Rule | Implemented in |
| --- | --- |
| Dark palette | `kit.ts` (`PAL`), `terrainTextures.ts`, `buildingTextures.ts`, `treeTextures.ts`, `treeGen.ts` (`LEAF_GAIN`), `humanGeo.ts` |
| Light, haze and grade | `sky.ts` (keyframes, `FogExp2`), `environment.ts`, `grade.ts` |
| Coast and headland | `world/coast.ts`, `world/terrain.ts`, `sea.ts`, `groundSplat.ts` |
| Empty heath, distant forests | `flora.ts` (placement), `ground/habitat.ts`, `ground/grass.ts` |
| Rough buildings, the palisade and its gate | `structures.ts`, `buildings.ts`, `props.ts`, `roofs.ts`, `settlement.ts` |
| Worn people | `humanGeo.ts`, `characters.ts` |

## Not done, and why

The reference has real depth of field and bloom; Tervain has neither yet (one grade pass only). Gothic 3's placement of Ardea's own buildings was not reproduced because it was not read. Performance has not been measured on any device; the frame counts in `docs/engineering/prototype.md` are headless-browser counts, not a frame-rate claim.
