# Gothic 3 look reference: Ardea and the Myrtana coast

**Status:** owner direction (see decisions A12–A15, A20, A22, A26, A27 and A28) and the measurements behind it. This is a study for *inspiration*. Nothing from Gothic 3 is copied, extracted into the repository or shipped: the measurements below were read from the owner's licensed local install with read-only tools. Tervain scene geometry is generated or authored here; the approved Hegemony emblem is specifically reused from its recorded Warpkeep source. The owner's 30 September clarification governs how these measurements are interpreted for art direction.

## What the owner asked for

The first place the player sees should be as close to Ardea in Gothic 3 as possible: a coast with a lighthouse, a beach, a great deal of empty terrain, some trees and forests in the distance. The whole game should look like old-school Gothic 3: not cartoonish, rugged, rough around the edges, not perfect, not smooth, human.

On 30 September the owner clarified the intended reading: **similarly exaggerated fantasy**, rather than clinical realism. Heavy expressive shapes, oversized ornament, broad painted value/color groups, rich earthy reds/golds, warm/cool contrast, and selective large wear belong to the direction. “Not cartoonish” retains a serious rugged tone; it does not require photorealism, plain framing, or universal desaturation. Control and body text remain accessible, motion remains calm, and all assets remain original. This art clarification does not introduce lore or gameplay systems, and the version remains `0.0.4`.

The later A22 menu direction uses an original native 3D desert market with sand, palms, spices, silk, and gentle cloth wind. It replaces the static lone-banner/beach menu, while the playable coastal start remains Ardea-inspired. The approved Hegemony emblem appears as integrated fabric identity under a specific owner authorization, not as a copied Gothic asset or an invented replacement symbol. The coastal measurements below do not claim to measure or reconstruct Gothic 3's desert market.

The subsequent `0.0.5` direction ([A27](../decisions.md)) keeps a sparse coastal landing but replaces the former wagon/open-heath introduction with amnesia, a dense original woodland trail, and settlement farther inland. Boring Forest supplies the additional forest reference; these historical Gothic measurements do not validate the new forest or its performance. No dialogue windows are offered in that exploration pass. See the [current prototype scope](../engineering/prototype.md#forest-arrival-pass-30-september-2026) and [forest study](../references.md#boring-forest-study-30-september-2026).

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

The sampled albedos have low mean sRGB values. These measurements summarize base textures; they do not describe the complete lit image or prescribe the saturation, ornament, and painted grouping of Tervain's art. The recorded mean sRGB values remain:

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

1. **Weathered bases, dramatic color and light.** Earthy surface values support broad painted color groups, rich reds/golds, and strong warm/cool relationships. Sun, haze, and expressive shading shape the finished image; low texture means do not prohibit luminous carved edges or vivid dyed cloth.
2. **Empty is the point.** The strand and the heath are open ground with tufts and stones; trees are rare and characterful; forests stand back on the higher ground and in the distance.
3. **Scale is big.** Buildings are large and low, towers are tall, and a person is small against them. The lighthouse shaft is 17 m; pines run to 19–25 m.
4. **Heavy, expressive irregular forms.** Posts lean, thick rails and stones carry uneven profiles, roofs sag, and cloth folds deeply. Enlarge selected carving and ornament to strengthen the silhouette; keep the geometry connected and useful spaces navigable.
5. **Weathered materials.** Timber is grey-black, plaster is stained and peeling, rope is frayed, iron is rusted; hems of clothes are dirty.
6. **People are worn.** Thin, tired, mended. Faces have brows and jaws and are painted, not smooth; hands are big; clothes are layers of wool, linen and leather in earth colours. See [People](#people).
7. **Atmospheric drama.** Warm/cool separation and broad value groups give the scene its fantasy mood. Distant forests resolve into silhouettes, while close expressive shapes retain deliberate painted emphasis. Core interface text stays accessible.

## Where each rule lives in the code

This maps the existing `0.0.4` world treatment to its source. A20 is the accepted direction, not a claim that every world asset already has the revised exaggeration pass.

| Rule | Implemented in |
| --- | --- |
| Weathered base palette | `kit.ts` (`PAL`), `terrainTextures.ts`, `buildingTextures.ts`, `treeTextures.ts`, `treeGen.ts` (`LEAF_GAIN`), `human/outfits.ts` |
| Light, haze and grade | `sky.ts` (keyframes, `FogExp2`), `environment.ts`, `grade.ts` |
| Coast and headland | `world/coast.ts`, `world/terrain.ts`, `sea.ts`, `groundSplat.ts` |
| Empty heath, distant forests | `flora.ts` (placement), `ground/habitat.ts`, `ground/grass.ts` |
| Rough buildings, the palisade and its gate | `structures.ts`, `buildings.ts`, `props.ts`, `roofs.ts`, `settlement.ts` |
| Worn people | `characters.ts`, `human/` (skeleton and weights, heads and painted faces, clothes, costumes), `npcStyle.ts`; see [People](#people) |

## The title menu

Studied on 30 September 2026 for the menu rework (A26), read-only, from the same install; decoded images and sounds stayed in a scratch folder and nothing is in the repository.

| Finding | Value |
| --- | --- |
| Main menu backdrop | `G3_HUD_View_Menu_Main_Back` (1024 × 1024, shown at 1024 × 768): a scratched, painted dusk. Mean sRGB: zenith (17, 28, 32); upper sky (43, 61, 61); horizon glow (144, 105, 31); ruined cliff (60, 31, 9); lit ground (104, 47, 11). Median luminance is 31 of 255 and the 95th percentile 111: a very dark picture with amber highlights. |
| Frame and panel | A thin double bronze rule inset round the screen with interlace corner ornaments; a central dark panel (mean (14, 9, 0)) framed in bronze with stepped, notched corners and a thin teal inner line. The logo is pitted cast metal. Across the panel's edge: a 1–2 px bronze rule, a mat of darkened backdrop, a thin bronze–teal–bronze inner line, then the dark field. Every band is filled, so frame and panel read as one object; the confirmation is oxblood leather with a brass edge laid flush on it. |
| Layout | `g3.gui.res` places the choices at 1024 × 768 as 252 × 32 buttons, one above another and centred (New Game, Load, Save, Options, Credits, Quit); the buttons are stacked edge to edge (bar one 4 px step before Credits) and fill the panel to within about 18 px of its inner line. The logo stands directly above the panel. A confirmation opens in its own box above the panel, never over the choices. Back sits in a small bronze tab at the bottom. |
| Lettering | The GUI resources name Times New Roman, which the engine substitutes with its bundled `Gothic3.ttf`: a heavy, rough-edged, uncial-flavoured serif. |
| GUI theme | One 2048² atlas (`theme_g3_00.dds`): thin pitted bronze rails, a grey grunge plate behind buttons with a soft sunken inner shadow, a brass cursor, a round dented bronze knob, an amber progress fill. |
| Other screens | Options and file screens reuse the collage backdrop with dark list panels; the loading screen is a parchment map with sepia concept sketches and a bronze bar; a confirmation is oxblood leather with a thin brass edge; in-game letters and books are stained parchment. |
| Sound | `GUI_Open` / `GUI_Close`: soft 0.45–0.5 s breaths of noise; `GUI_SelChange`: a 35 ms dry tick; under the menu, an 11.5 s crackling-fire loop and a 17.4 s wind-gust loop. |

What Tervain takes from it: a dark picture with amber light and a cool upper sky; rough cast metal for the name; choices as plain worn lettering in a sunken, framed, dark panel; parchment for forms and oxblood for a confirmation; dust and scratches over everything; and the way the pieces hold together: a frame filled from its rule to the field, choices as touching cells, the name standing directly on its panel, and a confirmation that never shows over the choices. What it does not take: any image, font, sound, proportion or measurement, logo shape or ornament. Tervain's backdrop is a live 3D scene, its frame has no interlace corners and no outer border (A25), its lettering is original, and its menu makes no sound of its own (synthesized interface tones were removed in 0.0.4; the existing procedural wind bed plays until reviewed recordings exist).

## People

Studied on 30 September 2026 for the character rework (A28), read-only, from the same install, alongside the owner's own study of the actor geometry (Rimy3D OBJ inspection exports of the body, head, hair and beard resources, with the template and world-layer references behind them). Rasterised views and decoded textures stayed in a scratch folder; nothing is in the repository.

| Finding | Value |
| --- | --- |
| Construction | Actors are modular and skinned: an NPC template links a skeleton (`G3_Hero_Skeleton`), a body (45 `G3_Hero_Body_*` resources: peasants, slaves, bandits, mercenaries, paladins, women, the player…) and a head; hair (47) and beards (43) are separate small meshes hung on the head. Named people reuse the parts: Ardea's Jack is the Peasant body with Zuben's head. |
| Budgets | Bodies 2,051–6,237 vertex records and about 4,000–11,400 triangles; heads 452–3,519 records; hair 39–757, beards 22–125. A head carries separate skin, eye and mouth material regions. |
| Proportions | Measured on the ordinary bodies as fractions of stature: crotch 0.50, waist 0.65, chest 0.74, shoulder line 0.83, shoulder span 0.29, arm 0.38; the head is about an eighth of the height. Arms spread about 132 units at 173–188 units tall; costume, not the skeleton, changes the silhouette's depth (a slave 33 units deep, a paladin 50, a nomad 77). |
| Faces and clothes | Faces are painted: hair on the scalp, heavy brows, shadowed sockets, stubble and painted beards, warm ears and noses. Clothes are layered with hard edges (collars, cuffs, belts, folded boot tops, wrapped shins, straps), and wear and weave live in the textures. Hands are large, with separate fingers. |
| The hero at the start | The player's template inventory holds only `Head_Player` and `Body_Player`: no weapon and no shield. Among the weapons in the data are a stick (1.4 m long), a club (0.9 m), rusty one- and two-handed swords (1.1 m and 1.8 m) and a rusty axe (1.1 m). |

What Tervain takes: skinned people on one skeleton each, a separate denser head with eyes set behind lids, hair and beards as separate shells over painted hair and stubble, the measured proportions and a head of about an eighth, large working hands, layered costumes whose silhouette says who someone is, and a hero who starts with nothing and takes up arms from what the land offers. What it does not take: any mesh, texture, skeleton, animation, face, costume design or name. Tervain's people are generated in code from original shapes, and the numbers above are used as proportions, not copied geometry. See the [people notes](../production/releases/0.0.5-people.md).

## Not done, and why

The reference has real depth of field and bloom; Tervain has a modest bloom (medium and high presets only, in `grade.ts`) and no depth of field yet. Gothic 3's placement of Ardea's own buildings was not reproduced because it was not read. Reference-hardware performance remains unverified. The [prototype notes](../engineering/prototype.md) distinguish historical headless counts from the later local browser run recorded with its limits in the [0.0.4 release notes](../production/releases/0.0.4.md).
