# Hunting — 0.0.13 candidate

This review candidate adds a hunting loop to the woodland journey while preserving the unarmed coastal arrival, existing exploration and water-dispute state. Combined tests and browser gameplay/cover checks pass. The game has not been deployed at 0.0.13; the verified served baseline is 0.0.12 at source revision `c02e29c2`, without hunting. See [the release record](../production/releases/0.0.13.md).

## Bow and skinning

Take the bow, skinning knife and 24-arrow bundle beside the early woodland trail, near x −229, z 29 m. Equip the bow from inventory or a quick slot. Hold aim, hold draw, then release draw to launch a moving arrow at 65 m/s. Reticle aiming compensates for gravity; swept flight stops at the first animal or terrain/scenery contact. Each launched arrow spends exactly one arrow, including misses. The draw bar follows the charge pose; kill thresholds remain one head hit or two body hits, independently of draw time.

| Action | Keyboard and mouse defaults | Controller |
| --- | --- | --- |
| Aim | Right mouse button or L | LT |
| Draw, then release to shoot | Left mouse button or J | RT |
| Skin a nearby carcass | V or the on-screen Skin button | D-pad left |
| Take supplies / exchange a hide | E | A |

RT draws the equipped bow rather than sprinting. Keyboard bindings remain configurable. Controller mappings are implemented; physical controller acceptance is separate from automated input checks.

Approach the flank of a dead animal with the knife in inventory and start Skin. The action uses the decoded model's collapsed chest and requires a valid nearby stance within 0.4 m of the player. The Wanderer kneels and works for 3.2 seconds. Completion grants one hide and species-dependent raw meat: one for cats, two for dogs/wolves, three for lions/tigers/deer, and four for bears/boars/stags. Moving cancels even on the final animation frame; cancellation or interruption grants nothing. Completion rechecks the corpse, knife and close stance, and commits the harvested state and all loot together. A corpse can be harvested once.

Bring one hide back to the hunter's supplies for six arrows. Restocking is bounded at 40 carried arrows. Raw meat is stored as a carried material. Hunting guidance begins when gear is taken, hunting progress exists or Deepwood is discovered, and moves through finding gear, equipping, hunting, skinning and restocking. The untouched beach arrival keeps its original guidance; retained investigation objectives take priority once that quest begins.

## Persistence and effects

Format-1 saves retain body wounds, death/harvest state and fixed corpse poses for known animal identities. Reloads and graphics rebuilds preserve kills and cannot duplicate harvest loot. Older saves receive empty hunting records and retain their existing progress; they receive no automatic bow or arrow grant. Arrow flight and unfinished skinning are transient actions.

Impacts add restrained blood droplets and embedded arrows, followed by a posed collapse and a grounded corpse stain. Reduced Effects keeps blood subtle and suppresses the more prominent particles. These presentation effects have bounded lifetimes and counts.

## Sound and models

Six hunting clips were generated offline with ElevenLabs `eleven_text_to_sound_v2`: bow draw, bow release, flesh impact, ground impact, skinning and completion. The skinning sound loops only during the action. They are packaged locally under the existing Effects/Master controls; the client makes no provider request. Prompts, actual model IDs, processing and hashes are in [the hunting sound manifest](hunting-sounds.json). An earlier actual `eleven_v4` sound-effect request returned HTTP 422; v4 is not claimed as the source of these clips.

The candidate retains all 18 accepted animal derivatives from [the animal integration](animals-0.0.11.md) and its [local validation record](../production/releases/animal-assets-candidate.md), with distinct source textures, native rigs and authored procedural clips. Their complete meshes range from 10,000 to 44,500 triangles. `Meshy_AI_BOAR_1005174818_texture.glb` remains unavailable; `boar-c` is reserved without a substituted model. This is not a complete 19-model release.

## Validation status

Strict TypeScript, the production build and the final combined suite pass: 1,575 tests in 157 files (125.91 seconds). Production-package hashes match all 18 prepared models, whose maximum is 44,500 triangles, all 18 calls and all six hunting clips.

Combined browser review passed 13 normal-control checks and five crate-cover checks without recorded errors. It retained 342 trees (225 supplied-tree instances and 117 custom Pines), eleven named NPC rigs, all eighteen animal homes and the upstream audio integration. The hosted-mode build passes its artifact guard at 710,918,293 bytes (about 711 MB), with model copies omitted from `dist/` and source assets retained. Its packaging proof used the baseline revision; final commit pinning and hosted animal-asset verification remain separate. The review candidate has not been deployed as a game. Earlier standalone hunting checks passed 1,146 tests in 103 files before the upstream integration.

There are 18 finite individuals and no respawn. The seated cat retains its source posture; other source stances also constrain procedural motion. Corpse placement and paw support are approximations, without physical foot IK. Generated audio and supplied models retain separate media provenance outside the software-code license. No minimum PC specification, High-preset acceptance or reference-hardware performance result is established by this candidate.
