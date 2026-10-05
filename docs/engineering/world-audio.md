# World sound: effects, ambience and in-world score

Recorded 5 October 2026 for the owner's request ([A50](../decisions.md)) to give Tervain custom music, sound effects and ambience for every NPC, every item interaction and every part of the world. The owner supplied an ElevenLabs account for this task with a 10,000-credit allowance. Everything here was generated for Tervain from original text prompts; nothing comes from Gothic, Gothic 3, Warpkeep or another game. The owner-supplied menu score ([A28](menu-score.md)) is unchanged and still plays only in menus.

None of this audio has been heard by a person yet. The generations were checked by measurement (levels, onsets, spectrograms, key, loop seams), not by ear. The [audition page](#audition-page) exists so the owner can review every take, cue, bed and piece before the work is relied on.

## What the player hears

| Area | Sounds | Driven by |
| --- | --- | --- |
| Feet | Walk and run on grass, dirt road (with loose gravel now and then), stone, sand, water and wooden decks; a jump's push-off, a landing scaled by fall speed, the cloth-and-step of a dodge | The Wanderer's actual heel strikes; surface from the existing player rules |
| Fighting | Light and heavy swings (a quicker, lighter rush of air bare-handed), blade hits, blocks and parries, fist blows, the player's hurt and fall voices, breathing when exhausted | Player actions and the hit outcomes already computed |
| Enemies | The thornback's growl on noticing the player, its wind-up and lunge, hurt and death; a toll-jumper's shout on noticing, a call on some wind-ups, swings, hurt and death; footfalls for ground covered | `onGrowl`, and the enemy state machine as it changes |
| Items | A pickup sound for every item (coin, iron and keys with the satchel, herbs and reeds, food, cloth, the brace), eating, chewing a herb, applying a poultice, drawing and sheathing the blade, the satchel opening and closing, journal pages, unfolding the map | Pickups, grants, use, equip and the inventory, journal and map panels |
| The world | The archive door, the forced shutter, the trail lever and gate, the sluice brace, the jammed sluice, water surging through the channel, the rite at the spring, the drought bell and the all-clear | The existing world actions (captions unchanged), the bell from its tower |
| Objects | Barrels and crates knocking into things, harder for a harder knock, lower for barrels; lifting and throwing them | Physics velocities (a sudden loss of speed is an impact) |
| Residents | Each resident's work: the quarry hand's chisel, the mender's hammer and saw, sweeping, kneading dough, a quill, ledger pages, the spring steward's bucket, the mill hand's sacks; footsteps for ground actually walked; indistinct talk when two residents talk; now and then a cough or a shift of clothes; the hamlet's net-mender at work | Each person's animation mode and work gesture (`npcStyle`), with a few personal trades |
| Places | Surf on the strand, wind on the lighthouse rock, the deepwood by day and by night, open meadow, Rillford and the hamlet by day and by night, the uneasy quiet of the Cut, the brook at its nearest bank following the water actually flowing, reeds and frogs at the ford and the spring's wetland, the mill wheel while it turns, the quarry while it works, the spring, the strand fire, the archive's room tone and the shrine hall's low hum | Listener position, the sky's night measure, stream flows and the mill/quarry state |
| Wildlife | Gulls over the sea by day, songbirds and a dawn chorus in the woods, small birds, a woodpecker, crows over open ground and the forest ruin, owls at night, frogs by the water, dogs, hens and a dawn rooster in the villages, a horse at the wagons, creaking timber in the woods and at the wreck | Twelve emitter rules with rates that follow place and hour |
| Score | A piece for the mood of the place (vale, wild, sacred, night), then a quiet interval of 35–80 s, Gothic-style; a low pulsing danger loop when an enemy hunts the player and a battle loop in a fight; short pieces for a newly found place, a step of the story or a skill, a won fight and a fall | [musicDirector.ts](../../src/presentation/sound/musicDirector.ts) |

Interface navigation stays silent, as before. Captions remain for the growl, the toll-jumper's shout, the world's moving parts and the bell.

## Runtime

[audio.ts](../../src/presentation/audio.ts) remains the facade. Its menu score, procedural wind/channel/surf beds, captions, volume buses and lifecycle are unchanged. The recorded world lives under [src/presentation/sound/](../../src/presentation/sound/):

- [worldAudioManifest.ts](../../src/presentation/sound/worldAudioManifest.ts) is generated: sprite offsets, loop and piece durations.
- [clips.ts](../../src/presentation/sound/clips.ts) names every clip and picks takes without repeating the last one.
- [foley.ts](../../src/presentation/sound/foley.ts) holds the tables from game facts to layered cues (items, surfaces, world actions, combat, work).
- [soundscape.ts](../../src/presentation/sound/soundscape.ts) computes bed levels and positions, wildlife rules and the ground under other feet, as pure functions of place, hour and world state.
- [musicDirector.ts](../../src/presentation/sound/musicDirector.ts) decides the score from mood and threat, without audio objects.
- [soundWorld.ts](../../src/presentation/sound/soundWorld.ts) turns those decisions into Web Audio nodes.

The world sound is created on the first world frame after the audio context runs, so menus allocate nothing. Construction failures are contained; the procedural beds and captions continue without it. Each frame the app passes a `SoundFrame`: camera position and direction, player state, sky, flows, mill and quarry, indoors, threat, residents, enemies and physics props. Enemies and props are read every frame, so strikes and knocks keep their timing. Beds, wildlife, residents and the score are updated twenty times a second.

- **One-shots** play from six decoded mono sprites at 48 kHz. Each voice varies its take, pitch (a few percent) and level (±0.7 dB). World sounds pass an air-absorption low-pass beyond 12 m and an equal-power panner with inverse distance; the player's own sounds are not panned. Voice budgets are 28 effects, 18 ambience, 6 dialogue and 4 music; the oldest voice in a full bus ends first. Distant sounds beyond their audible range are never started.
- **Beds** are looping buffers, decoded when first needed. Every gain and position change is smoothed. Automation is bounded as in the facade: an unchanged target schedules nothing, and a new target replaces the pending ramp. Each loop starts at a random point, so returning to a place never restarts it identically. Outdoor beds pass a shared muffle: open air, 5.2 kHz while a panel or conversation is open, 1.1 kHz indoors. Placed beds (brook, marsh, mill, quarry, spring, fire, surf) pan only; their place level already carries distance. A bed silent for 45 s releases its decoded memory.
- **Reverb** comes from two procedurally generated impulse responses: open air among trees and walls (1.8 s) and a stone room (1.1 s). Being indoors switches between them, and distance adds send.
- **The score** streams each piece through a media element, so a piece is never decoded whole. The danger and battle loops and the stings are decoded when first needed and released after 150 s unused. A sting ducks a playing piece or loop under itself. Menus, the fall and conversations are handled: a menu stops the in-world score, and a panel opened mid-fight keeps the fight's music.
- **Procedural beds** step back while recorded beds sound: wind to 45 %, channel water to 25 %, surf rumble to 40 %, hiss to 20 %. They return in full under menus and wherever no recorded bed has loaded. The procedural wind band follows the crowns overhead: higher in needles, lower in broadleaf and open ground.

Decoded memory is about 44.5 MB for the sprites (231.9 s of mono audio at 48 kHz, float). A typical place adds two to five beds of 2.2–9.5 MB each. The fight loops add up to 15 MB while in use. Encoded downloads are 9.1 MB of Ogg Opus for everything; browsers that play Opus never fetch the 11.5 MB of AAC fallbacks. A browser that names Opus but cannot decode or stream it switches to AAC, as the menu score does. All six sprite banks (1.2 MB) load at world entry. Beds (2.7 MB in all) and score (5.2 MB) load when first needed.

## Measured mix (browser checks, 5 October 2026)

Measured in Chromium with the default volume settings, with master output muted for the checks and each bus tapped before master. Levels are power averages over 10–14 s, with peaks, in dBFS:

| Situation | Ambience | Effects | Music | Dialogue |
| --- | --- | --- | --- | --- |
| Rillford by day, quiet interval (dev server) | −42 (calls peak −14) | — | — | −53 (residents) |
| Rillford by day, a vale piece fading in (production build) | −44 | −33 | −36 | −53 |
| Rillford at night, the piece continuing (production build) | −40 | −42 | −30 | −63 |
| The ford by day, a vale piece (dev server) | −38 | — | −30 | −70 |
| The quarry by day (dev server) | −37 | −35 | −34 | — |
| The Cut, attacked by the thornback (dev server) | −38 | −27 (peaks −8) | −29 (battle loop) | −37 |

One-shot peaks on the effects bus, after the final trims:

| Sounds | Peak |
| --- | --- |
| Walking or running step | −14 dB |
| Hard landing | −5 dB |
| The world's moving parts | −6 to −11 dB |
| The rite | −8 dB |
| Blade hit | −6 dB |
| Swing | −15 dB |
| Coin or blade draw | −9 to −11 dB |
| The bell at half its audible distance | −15 dB |

The trims lowered steps by 3 dB, the rite by 3.5 dB and the surge by 1.2 dB after the first check. Nothing approached clipping. These are signal measurements, not a listening review.

## Sources and provenance

All 99 sources were generated on 5 October 2026 with the ElevenLabs Sound Effects API (`POST /v1/sound-generation`, model `eleven_text_to_sound_v2`, 44.1 kHz 128 kbit/s MP3) from prompts written for Tervain. They total 919 requested seconds, charged at 10 credits per second: about 9,190 of the owner's 10,000-credit allowance. A single test of the Eleven Music API was refused before generation (`402 paid_plan_required` on the free plan, no credits charged). The score was therefore generated through the sound-effects model from musical prompts: eight pieces of about 30 s, danger and battle loops, and five stings.

- The unchanged generations are archived in [assets/audio/source/world/](../../assets/audio/source/world/) (14.8 MB).
- Each prompt, duration, prompt influence, loop flag, processing rule, source hash and derivative hash is recorded in [world-audio-assets.json](world-audio-assets.json).
- The prompts and processing plan are in [tools/world-audio/plan.json](../../tools/world-audio/plan.json).
- No prompt names or imitates another game, composer or work.

**Terms.** ElevenLabs' published terms, as read for the free plan on 5 October 2026, allow royalty-free use of generated sound effects, including commercial use, provided ElevenLabs is credited (elevenlabs.io). The game's About text and the repository NOTICE carry the credit. This is a summary of the service's terms as read on that date, not legal advice or an independent rights review. If the account's plan or the terms change, check them again before a commercial release. The Eleven Music terms, which restrict some commercial uses on the free plan, do not apply because the Music API was not used.

**Key handling.** The API key was used only from a local script outside the repository. It never appears in source, history, logs or this record. It was deleted locally after the work; rotating it is recommended.

## Preparation

[tools/world-audio/prepare.mjs](../../tools/world-audio/prepare.mjs) rebuilds every derivative, the manifest and the provenance from the archived sources and the plan (`node tools/world-audio/prepare.mjs`; needs FFmpeg with libopus). It is deterministic: muxing is bit-exact, and two runs produce identical files.

- **One-shots.** Each generation is decoded to 48 kHz float and split into takes by onset detection on its envelope, or by hand-chosen spans where onsets merge. DC is removed. Each take is matched on active loudness under a −1 dBFS peak ceiling and given short cosine fades. Takes are laid end to end in six sprites (steps, combat, items, world, nature, people) with 60 ms of silence between, and encoded as 40 kbit/s mono Opus with an AAC fallback: 191 takes under 68 clip names.
- **Beds.** Loops are trimmed and loudness-matched. Their seam is an equal-power crossfade of the tail into the head, so the joint continues the sound. Point sources are mono; surrounding beds are stereo.
- **Score.** Pieces, loops and stings are trimmed to their active span, loudness-matched (−19 to −22 dB active RMS) and faded, then encoded at 64 kbit/s per channel.

## Audition page

`npm run dev`, then open `/tools/sound.html` (not part of the build). The page plays:

- every take of every clip;
- every game cue layered as in play (each item, surface, world action, fight sound and resident's work);
- each bed alone, starting just before its seam;
- each piece of score;
- a live soundscape for any place, hour (dawn, day, dusk, night) and threat, run by the game's own `SoundWorld`.

`?mute=1` keeps scripted checks silent.

## Checks

- [worldAudio.test.ts](../../tests/presentation/worldAudio.test.ts) covers:
  - every shipped file (both formats, headers), its source hash, its derivative hash and the credit total;
  - sprite cuts and take picking;
  - foley coverage for every item, surface, world action and resident;
  - place beds at the strand, deepwood, Rillford, the hamlet, mill, quarry, spring, the Cut, the lighthouse and inside the archive, by day and night;
  - wildlife placement and timing, and the score's pacing, threat, stings, sacred-ground and menu behaviour;
  - the runtime against a scripted audio graph: loading, segments, panning, voice budgets, beds, streaming pieces, the battle loop, residents, enemies, impacts, disposal and failure clean-up;
  - the facade's lazy creation and fallbacks.
- The existing audio tests are unchanged and still pass.
- Browser sessions on the dev server and on the production build (relative asset base) confirmed:
  - no console errors and no decode failures;
  - Ogg Opus loading, with range-streamed pieces;
  - beds at each visited place, day and night, and a piece after the opening quiet;
  - the battle loop and stings in a real fight, a death and respawn;
  - the levels above.
- The audition page loaded and ran a place live without errors.

## Limits

- **Not yet heard.** Taste, realism and how the generations sit together need the owner's ears. Some takes may need regeneration or a different cut; the plan and prep tool make that a local change.
- **Score from the effects model.** The pieces were generated as sound effects from musical prompts. They are short (about 30 s), and their keys differ, so pieces are never layered; quiet intervals separate them.
- **No real occlusion.** Indoors is a muffle and a room reverb; a ridge does not block the quarry. Panning is equal-power stereo, not HRTF.
- **Voices are non-verbal.** Murmurs, coughs, shouts and hurt sounds use the dialogue bus; there is no spoken line or lip sync.
- **One bell.** The drought bell and the all-clear use one large and one small generated bell, not the authored story bell the art direction imagines.
- **Merge order.** This work touches the same audio, app and player files as the open `0.0.11` work. Merging one after the other needs a small, mechanical conflict resolution.
