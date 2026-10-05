# World sound: effects, ambience and in-world score

Recorded 5 October 2026 for two owner requests. The first ([A50](../decisions.md)) asked for custom music, sound effects and ambience for every NPC, every item interaction and every part of the world, generated with the owner's ElevenLabs account. The second ([A51](../decisions.md)) asked for more music and effects crafted programmatically, to give the game more soul. The world's sound therefore has two halves:

- **Generated:** 99 ElevenLabs generations from original text prompts: foley, place beds, wildlife, and a first score.
- **Crafted in code:** music composed and instruments synthesized in [tools/world-audio/compose/](../../tools/world-audio/compose/). It holds the Tervain theme and its arrangements, fight loops, stings and a motif for each region, three tunes heard from the inn, and world sounds tuned to the same key (the town bell, the shrine's wind chime, the spring's bubbles, crickets and a heartbeat).

Nothing comes from Gothic, Gothic 3, Warpkeep or another game. The owner-supplied menu score ([A28](menu-score.md)) is unchanged and still plays only in menus.

None of this audio has been heard by a person yet. Both halves were checked by measurement, not by ear:

- levels, onsets, spectrograms and loop seams;
- for the crafted half also pitch tracking, bar-by-bar harmony and melody salience.

The [audition page](#audition-page) exists so the owner can review every take, cue, bed and piece before the work is relied on.

## What the player hears

| Area | Sounds | Driven by |
| --- | --- | --- |
| Feet | Walk and run on grass, dirt road (with loose gravel now and then), stone, sand, water and wooden decks; a jump's push-off, a landing scaled by fall speed, the cloth-and-step of a dodge | The Wanderer's actual heel strikes; surface from the existing player rules |
| Fighting | Light and heavy swings (a quicker, lighter rush of air bare-handed), blade hits, blocks and parries, fist blows, the player's hurt and fall voices, breathing when exhausted | Player actions and the hit outcomes already computed |
| Wounds | Below a third of health, the player's own heartbeat: faster and louder as death nears (72 to 120 beats a minute) | Health in the sound frame |
| Enemies | The thornback's growl on noticing the player, its wind-up and lunge, hurt and death; a toll-jumper's shout on noticing, a call on some wind-ups, swings, hurt and death; footfalls for ground covered | `onGrowl`, and the enemy state machine as it changes |
| Items | A pickup sound for every item (coin, iron and keys with the satchel, herbs and reeds, food, cloth, the brace), eating, chewing a herb, applying a poultice, drawing and sheathing the blade, the satchel opening and closing, journal pages, unfolding the map | Pickups, grants, use, equip and the inventory, journal and map panels |
| The world | The archive door, the forced shutter, the trail lever and gate, the sluice brace, the jammed sluice, water surging through the channel, the rite at the spring (with crafted singing bowls and rising bubbles), the town bell | The existing world actions (captions unchanged), the bell from its tower |
| The town bell | A bronze bell cast in code on D, the score's key. The drought bell is two strikes of the great bell; the all-clear a peal of three smaller bells rung high to low (A, F sharp, D) | `ringBell` |
| Objects | Barrels and crates knocking into things, harder for a harder knock, lower for barrels; lifting and throwing them | Physics velocities (a sudden loss of speed is an impact) |
| Residents | Each resident's work: the quarry hand's chisel, the mender's saw, sweeping, kneading dough, a quill, ledger pages, the spring steward's bucket, the mill hand's sacks; footsteps for ground actually walked; indistinct talk when two residents talk; now and then a cough or a shift of clothes; the hamlet's net-mender at work | Each person's animation mode and work gesture (`npcStyle`), with a few personal trades |
| Places | Surf on the strand, wind on the lighthouse rock, the deepwood by day and by night, open meadow, Rillford and the hamlet by day and by night, the uneasy quiet of the Cut, the brook at its nearest bank following the water actually flowing, reeds and frogs at the ford and the spring's wetland, the mill wheel while it turns, the quarry while it works, the spring, the strand fire, the archive's room tone and the shrine hall's low hum | Listener position, the sky's night measure, stream flows and the mill/quarry state |
| Wildlife | Gulls over the sea by day, songbirds and a dawn chorus in the woods, small birds, a woodpecker, crows over open ground and the forest ruin, owls at night, frogs by the water, dogs, hens and a dawn rooster in the villages, a horse at the wagons, creaking timber in the woods and at the wreck | Twelve emitter rules with rates that follow place and hour |
| Crafted life | Crickets from dusk into the night, chirping faster in warm air (Dolbear's law) and silent in the cold before dawn, each keeping its own voice and spot; the shrine's wind chime, five tubes on the theme's mode, stirring in short bursts; small bubbles rising at the spring | A temperature curve over the day, and two more emitter rules |
| The inn | From 18:30 to 23:30 a lute plays inside the inn: the Wanderer's Air (the theme), the jig Hearthsmoke and the slow air Salt and Rope, heard through its walls with rests between tunes. A fight drowns it, and the score keeps quiet while it plays | The inn's place and the hour |
| Score | A piece for the mood of the place (vale, wild, sacred, night), then a quiet interval of 35–80 s, Gothic-style. The first time a mood is heard, its own arrangement of the Tervain theme plays. A low danger loop when an enemy hunts the player, a battle loop in a fight, each fight in one voice. Stings for a newly found place (its region's motif), a step of the story or a skill, a won fight and a fall | [musicDirector.ts](../../src/presentation/sound/musicDirector.ts) |

Interface navigation stays silent, as before. Captions remain for the growl, the toll-jumper's shout, the world's moving parts and the bell.

## Crafted in code

The crafted half is about 1,600 lines of plain JavaScript in [tools/world-audio/compose/](../../tools/world-audio/compose/). It renders offline at 48 kHz. Every render is deterministic: the seeds are part of the composition, and two renders are identical.

### Instruments

Each instrument is modelled on how the real one makes its sound ([instruments.mjs](../../tools/world-audio/compose/instruments.mjs), on the signal tools in [dsp.mjs](../../tools/world-audio/compose/dsp.mjs)).

- **Lute and harp: plucked strings.**
  - One period of noise, shaped by the touch and the plucking point, circulates in a delay line tuned by an allpass (after Karplus–Strong and Jaffe–Smith).
  - The loop filter is solved per note so that every harmonic loses energy at a rate in time, as gut does, rather than once per trip round the loop. Bass notes therefore darken within half a second, as real ones do.
  - The lute pairs its low courses with octave strings and its middle courses with slightly detuned unisons, like a Renaissance lute. The pluck's brightness closes quickly (soft fingers on gut).
  - A body of resonant peaks colours each instrument: the lute's bowl and the harp's soundboard.
- **Fiddle, viola, viols and drones: bowed strings.**
  - A 1/k harmonic series (Helmholtz motion) passes through the body's resonances. Vibrato therefore sweeps each harmonic across the peaks, so the tone shimmers as a real string's does.
  - New bows scoop slightly in pitch and dip at the bow change. Slurs glide.
  - Bow noise, slow pitch drift, and tremolo for the danger music.
- **Wooden flute.** A few harmonics carried on breath noise filtered at the note and its octave. A puff of "chiff" on tongued notes only, breath vibrato, and grace notes in the deepwood.
- **Wordless voices.** A glottal series shaped by vowel formants ("oo", "oh", "ah"; women's voices about 12 % higher). Vibrato moves harmonics across the formants, with aspiration noise in the same formants. Small ensembles sing the chorale.
- **Frame drum and war drum.** The inharmonic modes of a circular membrane, the brief upward glide of a struck skin, the slap of a hand or beater, and muted strokes.
- **Bells, chimes and the singing bowl.** Struck modes in their real ratios, each split into a slowly beating pair:
  - the church bell's hum, prime, minor-third tierce, quint and nominal;
  - the free-free bar of a chime tube;
  - a bowl's few partials.
- **Small lives.**
  - A field cricket's chirp: three to five pulses near 4.7 kHz, each falling slightly in pitch.
  - Bubbles at their Minnaert resonance, rising in pitch as they near the surface (after van den Doel).
  - A heartbeat heard from inside.
- **Rooms.** Synthetic stereo impulse responses: an inn room, a wooden hall, a forest, a night and a stone hall. Each has sparse early reflections and a tail whose highs die faster than its lows.

### The theme and its arrangements

Everything grows from one 16-bar theme in D Dorian, written in [pieces.mjs](../../tools/world-audio/compose/pieces.mjs):

- a rising fifth;
- the Dorian sixth (B natural), which gives the vale its hope;
- a climb to the high D;
- a modal cadence from C.

[notation.mjs](../../tools/world-audio/compose/notation.mjs) reads music written as text and checks every bar against its meter, so a miscounted bar stops the render.

| Piece | Mood | Arrangement |
| --- | --- | --- |
| Rillford at Work (84 s) | vale | Lute arpeggios and a bass viol; the fiddle sings the theme, then the harp varies it over a fiddle counter-line; a held high D to close |
| The Deepwood (72 s) | wild | A wooden flute walks the theme over a bowed D–A drone; harp notes drop between phrases |
| Embers (67 s) | night | A harp alone, rubato, in D Aeolian (B flat for B); a low viol warms the second half |
| The Spring (77 s) | sacred | A four-part viol chorale on the theme; voices join from the fifth bar; the last chord turns to D major; singing bowls |
| Something Watches (20 s loop) | danger | A held drone, a creeping semitone, a heartbeat drum, a trembling high cluster |
| Steel at the Ford (19.6 s loop) | combat | 6/8 frame drums and war drum, a falling string ostinato, the theme hurried into the fight |
| A Fight Won, The Fall, A Step of the Story | stings | The theme's rising fifth to D major; its descent slowed over a drone; its cadence on the lute |
| Six region motifs | discovery | The theme's opening in each region's voice: the strand (harp run and flute), the deepwood (low flute), the vale (lute and fiddle), cut stone (viol and drums), holy water (voices and bowl), Lantern Point (high harp and flute) |
| The Wanderer's Air, Hearthsmoke, Salt and Rope | the inn | Lute solos: the theme and its variation; a jig in G Mixolydian; a slow air in A Aeolian |

Loops are rendered as three identical passes. The middle one is kept, with its reverb tails, and joined by a linear crossfade: head and tail are the same music, so the level stays even across the seam.

### Checks on the crafted half

- **Instruments.**
  - Plucked notes measure within 2 cents.
  - Bowed and blown notes centre on the written pitch.
  - The bell's nominal and hum, and each chime tube, sit on their notes.
  - Clicks were looked for and removed: harmonic levels glide between control blocks, and the top of each series fades out rather than switching off.
- **Music.**
  - The first pass of Rillford at Work matches its written chord in all 16 bars.
  - The fiddle's note is the strongest pitch in its register on every beat checked.
  - The inn's lute tunes keep the written melody among the three strongest pitches in nearly every slot (the thumb's bass was softened so the tune leads).
- **Balance.**
  - Spectral balance sits within the range of the generated score.
  - Night is darkened with a gentle shelf.
  - Stereo correlation is about 0.8.

## Runtime

[audio.ts](../../src/presentation/audio.ts) remains the facade. Its menu score, procedural wind/channel/surf beds, captions, volume buses and lifecycle are unchanged. The recorded world lives under [src/presentation/sound/](../../src/presentation/sound/):

- [worldAudioManifest.ts](../../src/presentation/sound/worldAudioManifest.ts) is generated: sprite offsets, and durations for loops, pieces and inn tunes. Each music entry records whether it was generated or composed.
- [clips.ts](../../src/presentation/sound/clips.ts) names every clip and picks takes without repeating the last one. A cue may name a take instead, as the peal does.
- [foley.ts](../../src/presentation/sound/foley.ts) holds the tables from game facts to layered cues (items, surfaces, world actions, the bell, combat, work).
- [soundscape.ts](../../src/presentation/sound/soundscape.ts) holds pure functions of place, hour and world state:
  - bed levels and positions, and the wildlife rules (with bursts);
  - the day's temperature and the cricket rate;
  - the inn's evening;
  - the ground under other feet.
- [musicDirector.ts](../../src/presentation/sound/musicDirector.ts) decides the score from mood, threat, discoveries and the inn's music, without audio objects.
- [soundWorld.ts](../../src/presentation/sound/soundWorld.ts) turns those decisions into Web Audio nodes.

The world sound is created on the first world frame after the audio context runs, so menus allocate nothing. Construction failures are contained; the procedural beds and captions continue without it. Each frame the app passes a `SoundFrame`: camera position and direction, player state and health, sky, flows, mill and quarry, indoors, threat, residents, enemies and physics props. Enemies and props are read every frame, so strikes and knocks keep their timing. Beds, wildlife, crickets, residents, the inn and the score are updated twenty times a second.

- **One-shots** play from seven decoded mono sprites at 48 kHz: six generated and one crafted.
  - Each voice varies its take, pitch (a few percent) and level (±0.7 dB). Tuned sets (the chime, the peal) keep their pitch.
  - World sounds pass an air-absorption low-pass beyond 12 m, then an equal-power panner with inverse distance. The player's own sounds are not panned.
  - Voice budgets are 28 effects, 18 ambience, 6 dialogue and 4 music; the oldest voice in a full bus ends first.
  - Distant sounds beyond their audible range are never started.
- **Beds** are looping buffers, decoded when first needed.
  - Every gain and position change is smoothed. Automation is bounded as in the facade: an unchanged target schedules nothing, and a new target replaces the pending ramp.
  - Each loop starts at a random point, so returning to a place never restarts it identically.
  - Outdoor beds pass a shared muffle: open air, 5.2 kHz while a panel or conversation is open, 1.1 kHz indoors.
  - Placed beds (brook, marsh, mill, quarry, spring, fire, surf) only pan; their place level already carries distance.
  - A bed silent for 45 s releases its decoded memory.
- **Crickets** keep their spots around the listener. Each has its own voice and a little of its own tempo, and one left behind moves to a new spot. Up to six sing, at the rate the hour's temperature sets.
- **The heart** beats below a third of health, at 72 to 120 beats a minute.
- **The inn** streams its tunes through a lowpass (the walls) from the inn's place. A tune ends naturally; then the player rests 25–70 s. Walking away fades it; staying away 12 s lets it stop.
- **Reverb** comes from two procedurally generated impulse responses: open air among trees and walls (1.8 s) and a stone room (1.1 s). Being indoors switches between them, and distance adds send.
- **The score** streams each piece through a media element, so a piece is never decoded whole.
  - The danger and battle loops and the stings are decoded when first needed and released after 150 s unused.
  - A sting ducks a playing piece, loop or inn tune under itself.
  - A menu stops the in-world score, and a panel opened mid-fight keeps the fight's music.
  - Fights alternate their voice by encounter; the first fight of a session hears the composed music.
  - Two stings in three come in the composed voice.
- **Procedural beds** step back while recorded beds sound: wind to 45 %, channel water to 25 %, surf rumble to 40 %, hiss to 20 %.
  - They return in full under menus and wherever no recorded bed has loaded.
  - The procedural wind band follows the crowns overhead: higher in needles, lower in broadleaf and open ground.

**Decoded memory.**

- The sprites take about 54.7 MB: 284.7 s of mono audio at 48 kHz in float, of which the crafted bank is 52.8 s.
- A typical place adds two to five beds of 2.2–9.5 MB each.
- The fight loops add up to 15 MB while in use.

**Downloads.**

- Everything comes to 16.8 MB of Ogg Opus. Browsers that play Opus never fetch the 19.8 MB of AAC fallbacks.
- A browser that names Opus but cannot decode or stream it switches to AAC, as the menu score does.
- All seven sprite banks (1.6 MB) load at world entry.
- These load when first needed:
  - beds, 2.7 MB in all;
  - the generated score, 5.2 MB;
  - the composed score, 5.8 MB;
  - the inn's tunes, 1.5 MB.

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
| Outside the inn at 21:20: crickets, the inn's tune, the score holding back (dev server) | −41 | −29 | −37 (the tune through the walls) | — |

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

The trims lowered steps by 3 dB, the rite by 3.5 dB and the surge by 1.2 dB after the first check. Composed pieces are loudness-matched to the generated ones (−21 dB active RMS, inn tunes −22). Nothing approached clipping. These are signal measurements, not a listening review.

## Sources and provenance

### Generated

All 99 sources were generated on 5 October 2026 with the ElevenLabs Sound Effects API (`POST /v1/sound-generation`, model `eleven_text_to_sound_v2`, 44.1 kHz 128 kbit/s MP3) from prompts written for Tervain. They total 919 requested seconds. The Eleven Music API refused the free plan before generating anything (`402 paid_plan_required`), so the generated score was made through the sound-effects model from musical prompts: eight pieces of about 30 s, danger and battle loops, and five stings.

- The unchanged generations are archived in [assets/audio/source/world/](../../assets/audio/source/world/) (14.8 MB).
- Each prompt, duration, prompt influence, loop flag, processing rule, source hash and derivative hash is recorded in [world-audio-assets.json](world-audio-assets.json).
- The prompts and processing plan are in [tools/world-audio/plan.json](../../tools/world-audio/plan.json).
- No prompt names or imitates another game, composer or work.

**Terms.** ElevenLabs' published terms, as read for the free plan on 5 October 2026, allow royalty-free use of generated sound effects, including commercial use, provided ElevenLabs is credited (elevenlabs.io). The game's About text and the repository NOTICE carry the credit. This is a summary of the service's terms as read on that date, not legal advice or an independent rights review. If the account's plan or the terms change, check them again before a commercial release. The Eleven Music terms, which restrict some commercial uses on the free plan, do not apply because the Music API was not used.

**Key handling.** The API key stays outside the repository. It does not appear in source, history or this record.

### Crafted

The crafted half has no source recording: the code and its seeds are the source. [world-audio-assets.json](world-audio-assets.json) lists each of its 25 renders under `composed` with:

- its title and render entry (`tools/world-audio/compose/index.mjs#<id>`);
- a SHA-256 of the rendered samples;
- the derivatives' hashes.

`node tools/world-audio/compose/index.mjs <id> out.wav` renders any one item to a float WAV for listening outside the game.

## Preparation

[tools/world-audio/prepare.mjs](../../tools/world-audio/prepare.mjs) rebuilds every derivative, the manifest and the provenance (`node tools/world-audio/prepare.mjs`; needs FFmpeg with libopus; about 90 s). It works from two inputs:

- the archived generations and the plan;
- the composer's renders.

Muxing is bit-exact, so two runs produce identical files.

- **One-shots.**
  - Each generation is decoded to 48 kHz float and split into takes by onset detection on its envelope, or by hand-chosen spans where onsets merge.
  - Crafted sounds arrive as separate takes.
  - DC is removed, then each take is matched on active loudness under a −1 dBFS peak ceiling and given short cosine fades.
  - Takes are laid end to end in seven sprites (steps, combat, items, world, nature, people, crafted) with 60 ms of silence between. They are encoded as 40 kbit/s mono Opus with an AAC fallback: 218 takes under 75 clip names.
- **Beds.** Loops are trimmed and loudness-matched. Their seam is an equal-power crossfade of the tail into the head, so the joint continues the sound. Point sources are mono; surrounding beds are stereo.
- **Score.**
  - Pieces, loops and stings are trimmed to their active span, loudness-matched (−19 to −22 dB active RMS) and faded.
  - Generated music is encoded at 64 kbit/s per channel, composed music at 48.
  - Composed loops join with a linear crossfade.
  - The inn's tunes are mono.

## Audition page

`npm run dev`, then open `/tools/sound.html` (not part of the build). The page plays:

- every take of every clip;
- every game cue layered as in play: each item, surface, world action, fight sound, resident's work, the bell's sequences and the crafted life;
- each bed alone, starting just before its seam;
- each piece of score, generated and composed, by title;
- the inn's tunes;
- a live soundscape for any place, hour and threat, run by the game's own `SoundWorld`, optionally badly wounded.
  - Hours: dawn, day, dusk, evening, night, before dawn.
  - "Outside the inn" in the evening plays the inn.

`?mute=1` keeps scripted checks silent.

## Checks

- [worldAudio.test.ts](../../tests/presentation/worldAudio.test.ts) covers:
  - every shipped file (both formats, headers), its source or render record, every hash and the requested length of every generation;
  - sprite cuts, take picking and named takes;
  - foley coverage for every item, surface, world action and resident, and the bell's sequences;
  - place beds at the strand, deepwood, Rillford, the hamlet, mill, quarry, spring, the Cut, the lighthouse and inside the archive, by day and night;
  - wildlife placement and timing, including the chime's tuned bursts and the spring's bubbles;
  - crickets against Dolbear's law and the night, and the inn's evening;
  - the score's pacing: each mood's own theme first, fights in one voice, region motifs for every place, giving way to the inn, stings, sacred ground and menus;
  - the runtime against a scripted audio graph:
    - loading, segments, panning and voice budgets;
    - beds and streaming pieces, the battle loop;
    - residents, enemies and impacts;
    - crickets, the heartbeat, the inn's tune and the peal;
    - disposal and failure clean-up;
  - the facade's lazy creation and fallbacks.
- [composer.test.ts](../../tests/presentation/composer.test.ts) checks the crafted half:
  - the tuning of plucked, bowed and blown notes;
  - strings losing their highs in time;
  - the bell's and the chime's partials, and the decay of a drum and a bubble;
  - the pulses of a cricket's chirp;
  - the notation's refusal of a miscounted bar, and the tempo's ritardando;
  - deterministic renders, with a render for every composed entry.
- The existing audio tests are unchanged and still pass.
- Browser sessions on the dev server and on the production build (relative asset base) confirmed:
  - no console errors and no decode failures;
  - Ogg Opus loading, with range-streamed pieces;
  - beds at each visited place, day and night, and a piece after the opening quiet;
  - the battle loop and stings in a real fight, a death and respawn;
  - in the evening at Rillford: crickets, the inn's tune with the score waiting, the crafted bells in sequence, the heartbeat at low health, and a discovery's region motif;
  - the levels above.
- The audition page loaded and ran a place live without errors.

## Limits

- **Not yet heard.** Taste, realism and how both halves sit together need the owner's ears.
  - Some generated takes may need regeneration or a different cut.
  - Some crafted parts may need different notes, levels or instruments.
  - The plan, the composer and the prep tool make either a local change.
- **Synthesis has its limits.**
  - The plucked strings, drums, bells and chimes are close to their physics.
  - The bowed strings and the flute are convincing models but still models.
  - The wordless choir is the least natural instrument; it is kept to soft doubling beneath the viols.
- **Two voices in one score.**
  - The generated pieces are short (about 30 s) and in various keys.
  - The composed ones are longer (67–84 s) and share D.
  - Pieces are never layered; quiet intervals separate them.
- **No real occlusion.** Indoors is a muffle and a room reverb; a ridge does not block the quarry. Panning is equal-power stereo, not HRTF.
- **Voices are non-verbal.** Murmurs, coughs, shouts and hurt sounds use the dialogue bus; there is no spoken line or lip sync.
- **The inn has no visible player.** The tunes come from inside the inn, which the player cannot enter yet.
- **Merge order.** This work touches the same audio, app and player files as the open `0.0.11` work. Merging one after the other needs a small, mechanical conflict resolution.
