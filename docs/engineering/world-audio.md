# World sound: effects, ambience, score and voices

Recorded 5 October 2026 for two owner requests and extended on 6 October 2026 for a third.

- The first ([A56](../decisions.md)) asked for custom music, sound effects and ambience for every NPC, every item interaction and every part of the world, generated with ElevenLabs.
- The second ([A57](../decisions.md)) asked for more music and effects crafted programmatically, to give the game more soul.
- The third ([A58](../decisions.md)) asked:
  - to replace every generated sound made without a commercial licence;
  - for voices and new dialogue for the hero and the residents;
  - for more effects and music;
  - for all of it to be high quality, deep, and ready for later content.

The world's sound therefore has three parts:

- **Generated:** 110 ElevenLabs generations from original prompts, all made on the owner's paid plan:
  - effects, place beds and wildlife;
  - a score from the Eleven Music API, with two sung songs;
  - three of the hero's sounds in his own voice.
- **Crafted in code:** music composed and instruments synthesized in [tools/world-audio/compose/](../../tools/world-audio/compose/). It holds:
  - the Tervain theme and its arrangements;
  - fight loops, stings and a motif for each region;
  - three tunes heard from the inn;
  - world sounds tuned to the same key: the town bell, the shrine's wind chime, the spring's bubbles, crickets and a heartbeat.
- **Voices:** twelve voices designed from written descriptions speak 244 lines in the world:
  - exchanges with the hero;
  - remarks;
  - overheard scenes;
  - the hero's own remarks.

  The text-first story dialogue is voiced as well, for a future conversation window. See [Voices](#voices).

Nothing comes from Gothic, Gothic 3, Warpkeep or another game, and no voice is cloned from a person. The owner-supplied menu score ([A28](menu-score.md)) is unchanged and still plays only in menus.

None of this audio has been heard by a person yet. It was checked by measurement and transcription, not by ear:

- levels, onsets, spectrograms and loop seams;
- for the crafted half also pitch tracking, bar-by-bar harmony and melody salience;
- for the generated score, its tonal centre, loudness, gaps and endings;
- for the voices, each voice's pitch and a transcript of every take.

The [audition page](#audition-page) lets the owner review every take, cue, bed, piece and line before the work is relied on.

## What the player hears

| Area | Sounds | Driven by |
| --- | --- | --- |
| Feet | Walk and run on grass, dirt road (with loose gravel now and then), stone, sand, water and wooden decks; a jump's push-off, a landing scaled by fall speed, the cloth-and-step of a dodge | The Wanderer's actual heel strikes; surface from the existing player rules |
| Fighting | Light and heavy swings (a quicker, lighter rush of air bare-handed), blade hits, blocks and parries, fist blows; the hero's hurt and fall, and his breathing when exhausted, in his own voice | Player actions and the hit outcomes already computed |
| Wounds | Below a third of health, the player's own heartbeat: faster and louder as death nears (72 to 120 beats a minute) | Health in the sound frame |
| Enemies | The thornback's growl on noticing the player, its wind-up and lunge, hurt and death; a toll-jumper's shout on noticing, a call on some wind-ups, swings, hurt and death; footfalls for ground covered | `onGrowl`, and the enemy state machine as it changes |
| Items | A pickup sound for every item (coin, iron and keys with the satchel, herbs and reeds, food, cloth, the brace), eating, chewing a herb, applying a poultice, drawing and sheathing the blade, the satchel opening and closing, journal pages, unfolding the map | Pickups, grants, use, equip and the inventory, journal and map panels |
| The world | The archive door, the forced shutter, the trail lever and gate, the sluice brace, the jammed sluice, water surging through the channel, the rite at the spring (with crafted singing bowls and rising bubbles), the town bell | The existing world actions (captions unchanged), the bell from its tower |
| The town bell | A bronze bell cast in code on D, the score's key. The drought bell is two strikes of the great bell; the all-clear a peal of three smaller bells rung high to low (A, F sharp, D) | `ringBell` |
| Objects | Barrels and crates knocking into things, harder for a harder knock, lower for barrels; lifting and throwing them | Physics velocities (a sudden loss of speed is an impact) |
| Residents | Each resident's work: the quarry hand's chisel, the mender's saw, sweeping, kneading dough, a quill, ledger pages, the spring steward's bucket, the mill hand's sacks; footsteps for ground actually walked; indistinct talk when two residents talk; now and then a cough or a shift of clothes; the hamlet's net-mender at work | Each person's animation mode and work gesture (`npcStyle`), with a few personal trades |
| Voices | Interacting with a resident plays their next exchange: the hero's question when there is one, then the answer from where they stand. Residents remark as the player passes, by place, hour and the state of the valley. Pairs talk among themselves at the quarry, the mill and in the square, each scene once a game day. The hero speaks on waking, on reaching each place, at what he inspects and finds, at a beast, when badly wounded, at nightfall and dawn, and at the story's turns | Interaction, the remark and scene rules and game events, timed by the [speech director](../../src/presentation/speech.ts) on the game clock |
| Places | Surf on the strand, wind on the lighthouse rock, the deepwood by day and by night, open meadow, Rillford and the hamlet by day and by night, the uneasy quiet of the Cut, the brook at its nearest bank following the water actually flowing, reeds and frogs at the ford and the spring's wetland, the mill wheel while it turns, the quarry while it works, the spring, the strand fire, the archive's room tone and the shrine hall's low hum | Listener position, the sky's night measure, stream flows and the mill/quarry state |
| Wildlife | Gulls over the sea by day, songbirds and a dawn chorus in the woods, small birds, a woodpecker, crows over open ground and the forest ruin, owls at night, frogs by the water, dogs, hens and a dawn rooster in the villages, a horse at the wagons, creaking timber in the woods and at the wreck | Twelve emitter rules with rates that follow place and hour |
| Crafted life | Crickets from dusk into the night, chirping faster in warm air (Dolbear's law) and silent in the cold before dawn, each keeping its own voice and spot; the shrine's wind chime, five tubes on the theme's mode, stirring in short bursts; small bubbles rising at the spring | A temperature curve over the day, and two more emitter rules |
| The inn | From 18:30 to 23:30 music plays inside the inn, heard through its walls with rests between tunes. A lute plays the Wanderer's Air (the theme), the jig Hearthsmoke and the slow air Salt and Rope. Two original songs are sung there: The Drought Bell, a slow ballad for a baritone with lute and fiddle, and Bread and Water, a drinking jig for a woman's voice with the drinkers joining the chorus. A fight drowns it, and the score keeps quiet while it plays | The inn's place and the hour |
| Score | A piece for the mood of the place (vale, wild, sacred, night), then a quiet interval of 35–80 s, Gothic-style. The first time a mood is heard, its own arrangement of the Tervain theme plays. A low danger loop when an enemy hunts the player, a battle loop in a fight, each fight in one voice (the two generated takes of each loop come in turn). Stings for a newly found place (its region's motif), a step of the story or a skill, a won fight and a fall | [musicDirector.ts](../../src/presentation/sound/musicDirector.ts) |

Interface navigation stays silent, as before. Captions remain for the growl, the toll-jumper's shout, the world's moving parts and the bell. Exchanges, scenes and the hero's lines are captioned with the speaker's name when captions are on; a remark shows as a bubble over the speaker.

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

## Voices

### Cast

Each voice was designed from a written description with ElevenLabs Voice Design (`eleven_ttv_v3`) and saved to the owner's account. Of three previews, the one whose sample line transcribed correctly and whose pitch suited the person was kept. [voices.json](../../tools/world-audio/voices.json) keeps the description, the sample and the voice's id.

| Speaker | Voice | Lines | Story |
| --- | --- | --- | --- |
| The hero (the Wanderer) | Late thirties, no memory: a low, rough baritone, quiet and wary, with dry humour; neutral northern English | 85 | 102 |
| Joss Merrin, caravan master | Around sixty: warm, gravelly and unhurried; rural northern English | 12 | 5 |
| Mara Venn, reeve of Rillford | Around forty: firm and practical, tired but resolute; West Country | 22 | 18 |
| Sister Edda Sorn, keeper of the spring | In her seventies: calm, soft, slightly husky; gentle Scottish | 14 | 14 |
| Darin Kest, quarry foreman | Fifties: deep, loud and gravelly, blunt; broad Yorkshire | 20 | 17 |
| Ila Rusk, seasonal stoneworker | Mid twenties: quick and dry, slightly hoarse; light Scandinavian-tinged English | 13 | 11 |
| Oren Halvek, estate steward | Sixties: a precise, clipped, dry tenor; received pronunciation | 11 | 5 |
| Sel Anrit, ash recorder | A soft, mid-pitched voice that could be a woman's or a man's; careful diction, a faint Irish lilt | 11 | 5 |
| Tolan Harrow, shrine warden | Sixties: a deep, authoritative bass-baritone, terse; slight Welsh | 11 | 8 |
| Bess Corran, mill hand | Early thirties: bright and plain-spoken, a laugh close by; East Anglian | 14 | 4 |
| Pell Dunmore, quarry hand | Around forty: a rough, husky tenor, weary gallows humour; Midlands | 15 | 5 |
| Hesper Lowe, village baker | Fifties: round, motherly, quick and kind; Cornish | 16 | 5 |

"Lines" are the 244 spoken in the game. "Story" counts the 199 recordings of the text-first dialogue; its 258 keys include replies offered in several places, which share one recording.

### What they say

The lines are written in [voice.ts](../../src/content/voice.ts). They keep to the existing people and story; their wording, like the songs' lyrics, is a proposal, not a lore decision.

- **Exchanges (87).** Each resident's introduction, then what the hero can ask about and the answers, following the state of the valley.
  - 42 open with the hero's question.
  - Once everything has been heard, 30 repeatable ones come round in turn.
- **Remarks (48)**, in [npcs.ts](../../src/content/npcs.ts). They are said in passing by place, hour (18 have hours) and story (24 have conditions).
- **Overheard scenes (6).**
  - The foreman and his hand at the quarry, while it waits and once it works again.
  - The mill hand and the reeve at the dry mill and at the turning one.
  - The baker and the reeve in the evening square, before and after the valley settles.

  A scene plays once a game day, when its two people stand within 22 m of each other and the player is within 16 m of them.
- **The hero (42 cues).** Waking and the bell, each place he reaches, what he inspects and finds, his first blade, a beast, bad wounds, a won fight, getting up again, nightfall and dawn, the rescue, the shortcut, the rite and the gate.

Words in square brackets ([sighs], [shouts], [calls out]) direct the delivery. The voice model performs them, and [`shown()`](../../src/content/voice.ts) removes them from every caption and bubble.

The story's text-first dialogue ([dialogue.ts](../../src/content/dialogue.ts)) was written for a conversation window, which A27 keeps out of the game. Every node and choice is voiced word for word by its speaker (the hero for the choices), so a future window can play it without new recordings.

### How they were made

- **Speech.** Every line was generated with Eleven v4 (`eleven_v4`, 44.1 kHz 192 kbit/s MP3) in its speaker's voice.
- **Check.** Every take was transcribed with ElevenLabs Speech to Text (`scribe_v1`) and compared with the words as shown. A take whose words differed was retaken up to twice, and the closest was kept.
  - 392 of the 443 recordings transcribe word for word once numbers and punctuation are normalised. Over all 6,469 words the transcripts differ by 1.0 %.
  - Most remaining differences are spellings of names (Rillford as "Rilford", Darin as "Darren", Ila as "Isla", Rimeward as "Reamwood") or homophones (rite as "right", reed as "read", floury as "flowery").
  - Two are one-word slips: "has stopped" for "is stopped", and "costs" for "cost".
  - In one line the foreman's accent makes "Pell" sound like "Pal"; it is kept.
  - The transcripts are recorded with each line in voices.json.
- **The hero's sounds.** His hurt, fall and exhausted breathing are A56's generated takes performed again in his voice with the voice changer (`eleven_multilingual_sts_v2`), keeping their timing.

### In the game

- **Timing.** The [speech director](../../src/presentation/speech.ts) runs on the game clock, so a pause holds the next line back.
  - Interacting with someone starts their next exchange, unless one is under way. The hero's question comes first, and the answer follows 0.35 s after it ends.
  - A remark gives way: talking to someone in the middle of one cuts it short and starts the exchange.
  - Each speaker says one thing at a time. The hero's own remarks wait for a conversation to finish, and are dropped after 20 s of waiting.
  - A line whose voice is still loading waits up to 3 s, then shows its caption without the voice.
- **Where.**
  - Residents speak from their heads' positions, panned in stereo with inverse distance from 3 m, and with a little of the place's reverb.
  - The hero speaks close and centred.
  - Someone speaking stops, turns to whoever they are talking to, and talks with their hands.
- **The mix.** Speech plays on the dialogue bus at the Dialogue volume. While anyone speaks, the score steps back to 0.55 (−5.2 dB) within about a quarter of a second, and returns over about two seconds.
- **Loading.** Lines are packed per speaker into banks of at most 12 s; a longer line gets a bank of its own. There are 239 banks: 126 for the spoken lines and 113 for the story.
  - The hero's opening bank loads with the world.
  - Every half second, the game lists what each resident within 30 m may say soon: their next exchange (with the hero's question), the remarks that fit the hour and the story, and their part in any scene that could start.
  - Only the banks holding those lines are fetched and decoded. They are kept while wanted.
  - Any other line loads when it is first wanted, for example a hero's remark or an exchange started from further away.
  - A bank nobody has wanted for a minute is dropped from memory.
  - Memory therefore follows what may be said soon, not how much has been written: lines for other hours and other states of the story stay unloaded until they apply.

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
- [soundWorld.ts](../../src/presentation/sound/soundWorld.ts) turns those decisions into Web Audio nodes, and plays speech.
- [voiceManifest.ts](../../src/presentation/sound/voiceManifest.ts) is generated: each voice bank, and where every line sits in it.
- [speech.ts](../../src/presentation/speech.ts) decides who says what and when ([Voices](#in-the-game)).

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

- The sprites take about 56.5 MB: 294.1 s of mono audio at 48 kHz in float, of which the crafted bank is 52.8 s.
- A typical place adds two to five beds of 2.2–9.4 MB each.
- A generated danger or battle loop takes 10.6–14.7 MB while in use; a composed one about 7.6 MB.
- Speech holds 2.2–9 MB for each resident within 30 m, typically 5.6 MB. That is 51–68 MB if all eleven stood together, compared with 171 MB for every resident bank.

**Downloads.**

- The world's sound comes to 26.2 MB of Ogg Opus. Browsers that play Opus never fetch the 30.2 MB of AAC fallbacks.
- A browser that names Opus but cannot decode or stream it switches to AAC, as the menu score does.
- All seven sprite banks (1.6 MB) load at world entry.
- These load when first needed:
  - beds, 2.7 MB in all;
  - the generated score, 13.3 MB;
  - the composed score, 5.5 MB;
  - the inn's tunes, 1.4 MB, and its songs, 1.7 MB.
- The spoken lines add 5.5 MB of Opus (7.3 MB AAC), fetched bank by bank as people come near.
- The voiced story dialogue (6.4 MB Opus, 8.3 MB AAC) ships with the build but is not fetched until a conversation window uses it.

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

These levels were measured with A56's takes. A58's takes go through the same loudness matching to the same targets, but the table has not been measured again. Speech is matched to −19 dB active RMS, and the score steps back while anyone speaks ([Voices](#in-the-game)).

## Sources and provenance

### Generated

All 110 sources were generated on 6 October 2026 on a recorded paid subscription. They replace the 99 free-plan generations of 5 October. The game no longer uses those; they remain only in the repository's history.

- **Effects.** 84 effects, beds and calls with the Sound Effects API (`POST /v1/sound-generation`, model `eleven_text_to_sound_v2`, 44.1 kHz 128 kbit/s MP3), from A56's prompts and settings. Hand-chosen spans were re-cut where the new takes differ.
- **Music.** 23 pieces with the Eleven Music API (`POST /v1/music`, model `music_v2_5`, 44.1 kHz 192 kbit/s MP3):
  - twelve mood pieces of 75 s, four threat loops of 40 s and five stings, all requested as instrumental;
  - two songs of about two minutes, sung from composition plans with original lyrics.
- **The hero's sounds.** Three takes with the voice changer (`POST /v1/speech-to-speech`, model `eleven_multilingual_sts_v2`): A56's generated hurt, fall and breathing, performed again in the hero's designed voice.

They total 1,955 requested seconds.

- The unchanged generations are archived in [assets/audio/source/world/](../../assets/audio/source/world/) (40.2 MB).
- [world-audio-assets.json](world-audio-assets.json) records each source's prompt (or composition plan, or source take and voice), duration, model, processing rule, source hash and derivative hashes.
- The prompts and processing plan are in [tools/world-audio/plan.json](../../tools/world-audio/plan.json).
- No prompt names or imitates another game, composer, performer or work.

**Terms.** The paid plan's terms, as read on 6 October 2026, include a commercial licence for generated output and do not require attribution. The credit to ElevenLabs is kept in the game's About text and the NOTICE anyway. This summarises the service's terms as read on that date; it is not legal advice or an independent rights review. Check them again before a commercial release.

**Key handling.** The API key stays outside the repository. It does not appear in source, history or this record. The generate tool reads it from the environment only.

### Voices

- The 443 recordings (244 spoken lines and 199 story recordings) are archived unchanged in [assets/audio/source/voice/](../../assets/audio/source/voice/) (57.1 MB). Each is named by its line id; the story's are under `story/`, with `#` written as `~`.
- [voices.json](../../tools/world-audio/voices.json) holds:
  - each voice's description, design sample and id;
  - every line's words, model, date and transcript;
  - which story keys share a recording.
- [voice-assets.json](voice-assets.json) records every recording's source hash, its level, and the bank it went into, with the banks' hashes.
- The terms are as above: the voices were generated on the paid plan, and the credit "Voices generated with ElevenLabs" is kept. The voices are designed, not cloned from a person.

### Crafted

The crafted half has no source recording: the code and its seeds are the source. [world-audio-assets.json](world-audio-assets.json) lists each of its 25 renders under `composed` with:

- its title and render entry (`tools/world-audio/compose/index.mjs#<id>`);
- a SHA-256 of the rendered samples;
- the derivatives' hashes.

`node tools/world-audio/compose/index.mjs <id> out.wav` renders any one item to a float WAV for listening outside the game.

## Preparation

[tools/world-audio/prepare.mjs](../../tools/world-audio/prepare.mjs) rebuilds every derivative, both manifests and the provenance (`node tools/world-audio/prepare.mjs`; needs FFmpeg with libopus; about three minutes). It works from three inputs:

- the archived generations and the plan;
- the composer's renders;
- the voice recordings and voices.json.

Muxing is bit-exact, so two runs produce identical files.

- **One-shots.**
  - Each generation is decoded to 48 kHz float and split into takes by onset detection on its envelope, or by hand-chosen spans where onsets merge.
  - Crafted sounds arrive as separate takes.
  - DC is removed, then each take is matched on active loudness under a −1 dBFS peak ceiling and given short cosine fades.
  - Takes are laid end to end in seven sprites (steps, combat, items, world, nature, people, crafted) with 60 ms of silence between. They are encoded as 40 kbit/s mono Opus with an AAC fallback: 227 takes under 78 clip names.
- **Beds.** Loops are trimmed and loudness-matched. Their seam is an equal-power crossfade of the tail into the head, so the joint continues the sound. Point sources are mono; surrounding beds are stereo.
- **Score.**
  - Pieces, loops and stings are trimmed to their active span, loudness-matched (−19 to −22 dB active RMS) and faded.
  - Music is encoded at 48 kbit/s per channel, the sung songs at 56 kbit/s mono.
  - A generated threat loop is first cut to a span that repeats in time, then joined by an equal-power crossfade.
  - Composed loops join with a linear crossfade.
  - The inn's tunes and songs are mono.
- **Voices.**
  - Each recording is decoded to 48 kHz mono and trimmed to a breath either side.
  - It is matched to −19 dB active RMS and given short fades.
  - A speaker's lines are laid end to end, 80 ms apart, in banks of at most 12 s, in the order voice.ts declares them.
  - Banks are encoded as 40 kbit/s mono Opus tuned for speech, with an AAC fallback.

## Generation

[tools/world-audio/generate.mjs](../../tools/world-audio/generate.mjs) lets the sound grow with the game. It reads `ELEVENLABS_API_KEY` from the environment only, and never writes or prints it.

- `node tools/world-audio/generate.mjs voices` voices every line in voice.ts that is new or whose words changed, in its speaker's voice. With `--story` it does the same for dialogue.ts. Lines that are gone are dropped from voices.json, with their recordings.
- `node tools/world-audio/generate.mjs design <speaker> "<description>" "<sample line>"` designs a voice for a new speaker, keeps the first preview that reads its sample correctly, and records it.
- `node tools/world-audio/generate.mjs sounds [id ...]` generates the plan.json sources that have no file yet, or the ones named:
  - effects and beds;
  - music from a prompt or a composition plan;
  - voice-changed takes.
- `--dry-run` lists the work and an estimate without spending anything. `--max-credits N` stops once the account's usage has grown by N.

Every speech take is transcribed and retaken when its words come back wrong.

To add a line:

1. Write it in voice.ts with its speaker, and delivery directions in brackets if wanted.
2. Name it from an exchange, a remark, a scene or a hero cue.
3. Run `generate.mjs voices`, then `prepare.mjs`.

The tests check that every named line is voiced and banked.

## Audition page

`npm run dev`, then open `/tools/sound.html` (not part of the build). The page plays:

- every take of every clip;
- every game cue layered as in play: each item, surface, world action, fight sound, resident's work, the bell's sequences and the crafted life;
- each bed alone, starting just before its seam;
- each piece of score, generated and composed, by title;
- the inn's tunes and songs;
- every spoken line by speaker with its words (delivery directions shown), each overheard scene played through, and the story dialogue;
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
  - speech: a line from its speaker's bank on the dialogue bus, one line per speaker, the score stepping back, and voices loaded for the lines wanted soon and released after a minute;
  - the facade's lazy creation and fallbacks.
- [voice.test.ts](../../tests/presentation/voice.test.ts) checks the voices:
  - every line voiced for its speaker, with the words the game shows;
  - every line named by an exchange, remark, scene or cue is real, and everyone has something to say;
  - the hero has a remark for every place but the strand and for everything he can inspect;
  - delivery directions stay out of the words on screen;
  - scenes alternate between their two people;
  - the story dialogue is voiced word for word;
  - banks hold one speaker each, with lines in order and no overlap, and every file, hash and transcript is recorded;
  - the director:
    - introductions first, and questions before answers;
    - the valley's state, and repeatable exchanges in turn;
    - the hero's cues and cooldowns, timed by the game clock;
    - remarks giving way, and the hero waiting for a conversation;
    - scenes once a day, and waiting for a loading voice;
    - naming what each person may say soon, exactly as talking then plays it.
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
- Browser sessions on the dev server (6 October), after the voices were added, confirmed:
  - the hero's arrival lines with their captions;
  - an exchange with a resident, the hero's question and then the answer;
  - a remark giving way to a conversation;
  - in Rillford, with three residents within 30 m, only the ten banks holding their 13 wanted lines (and two of the hero's) decoded;
  - the score moving on to a piece;
  - no console errors and no decode failures;
  - the audition page's voices fetching the right banks.

## Limits

- **Not yet heard.** Taste, realism and how the parts sit together need the owner's ears.
  - The voices' accents, pace and feeling, and whether each suits its person, are unjudged.
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
- **Speech without faces.** Mouths do not move; a speaker stops, turns and gestures. Speech is panned like other world sounds, with no occlusion.
- **Designed voices can drift.** A designed voice can vary a little in accent between lines. Names the transcriber spelled differently were accepted, not retaken.
- **The story's voices wait for a window.** The voiced story dialogue ships but is unused until a conversation interface exists (A27).
- **The inn has no visible player.** The tunes come from inside the inn, which the player cannot enter yet.
- **Merge order.** This work touches the same audio, app, player and resident files as the open `0.0.11` work. Merging one after the other needs a conflict resolution. The voices are keyed by resident id, so a change of a resident's look keeps their lines.

## Combined 0.0.12 lifecycle and rights corrections

Integration retains owned sting voices within the music budget, invalidates pending
loads on menu/hide/disposal transitions, and disposes fading media as well as current
streams. Streamed pieces use their actual ended state rather than consuming their
allotted playback during buffering; rejected playback is retried on an eligible
native gesture. The menu score remains separate.

Current manifests replace earlier free-plan files with recorded paid-generation
sources. Paid-output terms do not establish unrestricted commercial game rights:
[Eleven Music model-specific terms](https://elevenlabs.io/eleven-music-model-specific-terms)
exclude Studio Games on self-serve plans and prohibit licensing output as a music
library. Studio Games are defined there as monetized games available through more
than one platform. Verify the intended Steam/browser distribution and appropriate
permission before commercialization. General effects/voice terms are distinct:
[ElevenLabs publication guidance](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform).
Neither these records nor Tervain's code license grant public asset reuse. Original
code-composed renders and the supplied menu score retain their own provenance.
The [built-site disclosure](../../public/world-audio-licenses.html) reflects this scope.

The source PR's earlier tests and browser observations above remain historical
component evidence. Final combined-source checks are recorded in the
[0.0.12 release record](../production/releases/0.0.12.md). No listening review,
commercial clearance or minimum-PC qualification is claimed.
