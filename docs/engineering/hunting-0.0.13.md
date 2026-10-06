# Hunting — 0.0.13

This integration adapts the hunting loop from [PR 34](https://github.com/ael-dev3/Tervain/pull/34) to the existing nineteen supplied animals and their proximity call mixer. It preserves the unarmed coastal arrival, exploration and water-dispute state. The original integration shipped at 0.0.13 through PR 34; see the coordinating [release record](../production/releases/0.0.13.md) for current validation and publication evidence.

## Bow and skinning

Take the bow, skinning knife and 24-arrow bundle from the level wooden counter beside the early woodland trail, at an off-road camp near x −216, z 31 m, reached by a narrow branch from the woodland track. Its legs fit the terrain, equipment rests on the actual top plane, and the sign post stays behind its lettering. Rowan Vale sorts hides and provisions beside the counter from 06:00 to 20:00, remains awake until 22:00, then rests at his lean-to. A drying rack, raised provision trays, bedroll and stored trade goods explain his work; the main road remains clear. His original greeting uses the existing designed woodland baritone through ElevenLabs `eleven_v4`, packaged in Opus/AAC under Dialogue/Master. It waits for playable audio and cannot repeat while you linger; a return requires departure beyond 11 m and a 120-second game-clock cooldown. E can also request his advice without a dialogue window. Equip the bow from inventory or a quick slot. Hold aim, hold draw, then release draw to launch a moving arrow at 65 m/s. Reticle aiming compensates for gravity; swept flight stops at the first animal or terrain/scenery contact. Each launched arrow spends exactly one arrow, including misses. The draw bar follows the charge pose; kill thresholds remain one head hit or two body hits, independently of draw time.

| Action | Keyboard and mouse defaults | Controller |
| --- | --- | --- |
| Aim | Right mouse button or L | LT |
| Draw, then release to shoot | Left mouse button or J | RT |
| Skin a nearby carcass | V or the on-screen Skin button | D-pad left |
| Take supplies / exchange a hide | E | A |

RT draws the equipped bow rather than sprinting. Keyboard bindings remain configurable. Controller mappings are implemented; physical controller acceptance is separate from automated input checks.

Approach the flank of a dead woodland animal with the knife in inventory and start Skin. The action uses the decoded model's collapsed chest and requires a valid nearby stance within 0.4 m of the player. The Wanderer kneels and works for 3.2 seconds. Completion grants one hide and species-dependent raw meat: two for wolves, three for lions/tigers/deer, and four for bears/boars/the red deer stag. Moving cancels even on the final animation frame; cancellation or interruption grants nothing. Completion rechecks the corpse, knife and close stance, and commits the harvested state and all loot together. A corpse can be harvested once. All three cats, both dogs and the saddled deer remain protected companions: impacts cannot wound them, they cannot be harvested, and hunting objectives never require their skins. The saddled deer rests with the inland caravan near x −99.8, z 30.4, beside a hitching rail, feed/water trough and transport baggage. It stays out of the hunter camp and wild herd; the wild stag lives deeper in the woods. The saddle remains decorative: riding is not implemented.

Bring one hide back to Rowan for six arrows, or sell one cut of carried meat for two coins for Rillford’s kitchens. Both trades require Rowan awake and the player alive and close to camp. A successful delivery is recorded in the journal without advancing the separate water-dispute quest. Restocking is bounded at 40 carried arrows. Raw meat is stored as a carried material. Hunting guidance begins when gear is taken, hunting progress exists or Deepwood is discovered, and moves through finding gear, equipping, hunting, skinning and restocking. The untouched beach arrival keeps its original guidance; retained investigation objectives take priority once that quest begins.

## Persistence and effects

Format-1 saves retain body wounds, death/harvest state and fixed corpse poses for known animal identities. Reloads and graphics rebuilds preserve kills and cannot duplicate harvest loot. Any earlier record that wounded, killed or skinned the saddled deer is removed on load, restoring it alive while retaining items and wild-animal progress. Older saves receive empty hunting records and retain their existing progress; they receive no automatic bow or arrow grant. Arrow flight and unfinished skinning are transient actions.

Impacts add restrained blood droplets and embedded arrows, followed by a posed collapse and a grounded corpse stain. Reduced Effects keeps blood subtle and suppresses the more prominent particles. These presentation effects have bounded lifetimes and counts.

## Sound and models

Six hunting clips were generated offline with ElevenLabs `eleven_text_to_sound_v2`: bow draw, bow release, flesh impact, ground impact, skinning and completion. The skinning sound loops only during the action. They are packaged locally under the existing Effects/Master controls; the client makes no provider request. Prompts, actual model IDs, processing and hashes are in [the hunting sound manifest](hunting-sounds.json). An earlier actual `eleven_v4` sound-effect request returned HTTP 422; v4 is not claimed as the source of these clips.

The integration retains all nineteen distinct supplied models from [the animal preparation record](meshy-animal-assets.json), including `Meshy_AI_BOAR_1005174818_texture.glb`. Every complete animal is capped at 50,000 triangles. The existing wildlife controller retains the complete population on every graphics preset, real skeletal clips and actual sole support. Thirteen woodland animals are huntable. Durable semantic hunt identities map explicitly to their numeric model IDs in `src/game/hunting.ts`; their bones, textures, geometry and movement remain owned by the current wildlife integration.

The sixteen existing animal calls remain on the Ambience/Master graph and fire from the real Call gesture at the located head. Hunting introduces only its six Effects/Master recordings. It imports none of PR 34's separate eighteen-model population, FK rigs, animal sound assets or animal sound controller. Generic animal movement capsules remain available to player/NPC contacts, while arrow casts ignore those capsules and use posed animal triangles. NPCs, cargo, terrain, rocks and wood remain projectile blockers.

## Validation status

The adapted checks pass 273 tests in eleven files across hunting commands/save migration, projectile flights and cover, peaceful pet guards, hunting audio lifecycle, the six packaged recording hashes, player bow/skinning poses, movement/contact preservation, camera aiming, input and pickups. This is focused local evidence; the combined suite, native browser hunting review and hosted artifact check remain coordinated in the release record. Earlier PR 34 results describe that draft's different eighteen-model runtime and do not certify this adapted candidate.

There are nineteen finite individuals and no respawn. The seated cat retains its supplied posture. Generated audio and supplied models retain separate media provenance outside the software-code license. No reference-hardware performance result is established by this document.
