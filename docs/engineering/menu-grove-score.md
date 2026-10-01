# The score-led hermitage awakening

Owner direction of 30 September 2026, [A30](../decisions.md), first built in `0.0.5`. At **30.000 seconds of The Sovereign's Oath**, the native door in the ancient tree opens and luminous spirits emerge and dance round the tree in response to the actual song. The owner's follow-up of 1 October 2026, [A32](../decisions.md), reworked it for `0.0.7`. The spirits should look better, actually dance round the tree, and act as a visualiser for the menu song. The request also covered their physics and collisions and the inside of the tree door. The existing dusk vigil, title, camp and single Hegemony standard remain the composition.

The primary creative reference is the forest reverence of Hyperion's Brotherhood of the Muir, with Warcraft's night-elf forest spirits as a secondary visual reference. [Dan Simmons's interview](https://www.writerswrite.com/journal/dan-simmons-9012) describes the Templars' environmental religion; [Blizzard's historical Wisp page](https://classic.battle.net/war3/nightelf/units/wisp.shtml) describes ancient forest spirits connected to living trees. These inform ecology, age, quiet sacredness and cool forest light. The spirits' forms, colours, dance and the hollow are authored for Tervain. This effect does not establish the books' or Warcraft's history, characters, religion, or supernatural rules as Tervain canon. What the spirits are, and what the light in the hollow is, remain unnamed presentation.

## Studied workflow and attribution

**Ael / Lyrics workflow**, [lyrics repository](https://github.com/ael-dev3/lyrics), studied at commit [`3a16ed499a3a6525c5a6dbba4e10c16a511a79c7`](https://github.com/ael-dev3/lyrics/tree/3a16ed499a3a6525c5a6dbba4e10c16a511a79c7). The owner-authored workflow/code/DSP is licensed [CC BY 4.0](https://github.com/ael-dev3/lyrics/blob/3a16ed499a3a6525c5a6dbba4e10c16a511a79c7/LICENSE.md). Credit and links are retained here. Tervain implements new native Three.js geometry and a new analysis of its own approved soundtrack; none of the case studies' music, artwork, lyrics, stems, fonts or models is imported.

The important references are the [Let You Down player](https://github.com/ael-dev3/lyrics/blob/3a16ed499a3a6525c5a6dbba4e10c16a511a79c7/projects/let-you-down-lyric-film/src/player.ts), [its scene sampler](https://github.com/ael-dev3/lyrics/blob/3a16ed499a3a6525c5a6dbba4e10c16a511a79c7/projects/let-you-down-lyric-film/src/scene.ts), and the [fire analyzer](https://github.com/ael-dev3/lyrics/blob/3a16ed499a3a6525c5a6dbba4e10c16a511a79c7/projects/if-the-sun-burns-out-tonight-lyric-film/scripts/analyze-fire.py) and [random-access fire dynamics](https://github.com/ael-dev3/lyrics/blob/3a16ed499a3a6525c5a6dbba4e10c16a511a79c7/projects/if-the-sun-burns-out-tonight-lyric-film/src/fire-dynamics.js). Their transferable approach uses one media clock, separate artistic cues and measured envelopes, stereo-power analysis, asymmetric smoothing, and source-time phase integration. The scientific guide's target architecture is distinguished from actual implementations.

## One playback clock

`AudioEngine.menuMusicPlayback` reads the real retained audio element's `currentTime`, finite duration, audible state and mix gain. `requestAnimationFrame` schedules rendering; it supplies no musical phase. Pending autoplay, buffering, seeking, mute, hidden tabs, stopped contexts and gameplay cannot let the grove's time advance independently of the score. Returning to the menu follows the retained song position. The ordinary controls do not restart or seek it.

The awakening is a **deterministic simulation of that clock** ([menuGrove.ts](../../src/presentation/menu/menuGrove.ts)). It integrates fixed 1/60 s steps on an absolute grid that starts at the 30-second cue, from one fixed initial state. A pose is therefore a function of song time alone: seeking, pausing, a different frame rate or a graphics rebuild all arrive at exactly the same door angle, spirit positions and trails. Snapshots every two seconds keep a backwards seek short. Forward playback costs one step per frame. A cold reconstruction of the whole song measured about 0.4 s on the development machine. Graphics rebuilds hand the running simulation to the new scene rather than re-running it. All presets simulate the same 40 spirits; Low and Medium draw the first 16 and 28. Reduced Motion still holds the door, spirits, trails, pulses and light exactly in their current pose while music keeps playing, and disabling it reacquires the native song position. Muting the score holds the grove and hides the spirits.

F3 has **Menu score timing** buttons for reviewing 0:28, 0:30, 0:33, 1:00, 1:15, 1:50, 3:25 and 3:31. They seek the real menu media element, preserve the same stream and do nothing in gameplay.

## Measured music

The dance reads two generated, checked-in modules; runtime never runs an FFT or fetches extra media.

- **Energy envelopes** ([menuScoreFeatures.ts](../../src/presentation/menu/menuScoreFeatures.ts), from [analyze-menu-score.py](../../tools/analyze-menu-score.py), `0.0.5`). Energy, bass, mid, treble and positive spectral flux at 20 Hz. Left/right power averaging avoids mono phase cancellation. They are track-relative visual controls, not loudness measurements.
- **Rhythm and spectrum** ([menuScoreRhythmData.ts](../../src/presentation/menu/menuScoreRhythmData.ts), from [analyze-menu-rhythm.py](../../tools/analyze-menu-rhythm.py), `0.0.7`), with its sampler in [menuScoreRhythm.ts](../../src/presentation/menu/menuScoreRhythm.ts).
  - **Beat grid.** A positive-spectral-flux onset envelope at 100 Hz gives the tempo by autocorrelation. A dynamic-programming beat tracker follows it, and the tracked beats are fitted with one constant grid. The song measures **106.99 BPM** (0.5608 s a beat). The 382 tracked beats lie within 8.4 ms RMS (38 ms worst) of the grid, and the grid sits on onsets about 5.5 times more strongly than a randomised grid.
  - **Downbeats and phrases.** The downbeat is the beat phase with the strongest low-frequency onsets. A separate chord-change check and the song's largest loudness rises (13 of the 16 largest fall on it) agree. Eight-bar phrases start where bar loudness changes most: 15.9, 33.9, 51.8 s and so on.
  - **Six-band spectrum.** Sub 40–90 Hz, bass 90–200, low-mid 200–500, mid 500–1,200, high-mid 1,200–2,800 and presence 2,800–5,800 Hz, at the same 20 Hz convention as the envelopes, with 40 ms attack and 160 ms release.
  - **Accents.** 550 transient accents with strengths.

These are measurements of the approved recording for visual timing. They are not beat annotations by a musician, lyrical events, or a calibrated model of audio/display latency. The centred analysis windows and deliberate smoothing remain source-clock choreography. The [analysis guide](../../tools/README-menu-score-analysis.md) records how to regenerate and check both modules.

## The cue and the dance

| Source time | Presentation |
| --- | --- |
| Before 30.000 s | Closed plank door; the warm lantern and grille light continue. |
| 30.0 s | The latch gives. The heavy leaf swings out on a damped hinge, knocks against its stop (about 77°) and rests there from about 34 s. The hollow and the spirits inside it show through the gap as it opens. |
| From 32.75 s | One spirit leaves through the doorway on each half beat: out over the doorstep, then into the dance. |
| Each eight-bar phrase | A formation follows the phrase: a two-strand helix winding up and down the bole; three counter-rotating rings (roots, bole, under the crown); a maypole weave of two circles passing in and out of each other; or fireflies hopping perch to perch along the low boughs and through the lower crown. A bar's blend carries one into the next. |
| Every beat | Spirits bounce, down on the beat and up between beats, more for a louder band. The rings breathe outward on loud low notes at the downbeat. |
| Every accent | A measured accent pushes the dancers out from the bole and brightens them. The hollow's heart flares. |
| From 204.4 s | They leave the dance for a wide spinning ring before the door, dimming a little as they gather. Each spirals in to the doorstep on its own sixteenth note and goes home. |
| From 211.7 s | Once the last is in, the door is drawn shut, lands against the frame with a small rebound, and latches before the song loops. |

Each spirit listens to one of the six bands (interleaved, so every preset hears the whole spectrum). Low notes dance low, near the roots; high notes dance in and under the crown. The tree therefore reads as a spectrum from root to crown, and its colours run from cool violet-blue at the roots to warm amber and rose above.

## Physics and collisions

Each spirit is pulled toward its place in the dance by a damped spring with feed-forward of the place's own motion, so it moves with inertia, overshoots a little and settles. Accents add outward impulses. A smooth flutter grows with the treble. Each spirit gives way to those before it in the line: one-way separation, so any prefix of the 40 dances unchanged on Low and Medium. Speeds and accelerations are bounded.

The obstacles are the tree as built:
- **the trunk:** its measured radius at every height and angle, door face included;
- **tapered capsules:** along the limbs, boughs and surface roots;
- **the lanterns** hung from the low boughs;
- **the ground;**
- **the door leaf** at its current hinge angle.

Soft avoidance turns spirits before contact. Contact projects them out with a little restitution and a brief flare of light. When the straight way to a goal runs through the bole, a spirit flies round on the shorter side. Inside the trunk, spirits stay within the carved hollow and leave or enter only through the doorway. Across the whole song no spirit enters wood or the ground. Contact flares are occasional; most come where the climbing helix brushes the low boughs.

## The hollow behind the door

The door's shallow 0.7 m pocket and flat glowing panel are replaced by a **hollow carved into the heartwood** ([menuHollow.ts](../../src/presentation/menu/menuHollow.ts)). A tunnel the size of the 0.86 × 1.72 m aperture opens into a rounded cell about 1.5 m across, 2.2 m high and 1.7 m deep. It has adze-rough walls, roots hanging from its roof and others over its floor, and pale fungi on the walls. The tree cuts everything of itself out of two boxes for it (doorway and chamber). Low boughs that start at the bole's axis and roots that start inside its wall can no longer cross the hollow. At the back, a burl holds the grove's heart: a small knot of light with fine veins running out through the old wood. It brightens with the low bands, flares on accents, and lights the cell from within, with a warm spill of dusk and lantern near the entrance. The cell lights itself in its own shader. No scene light is added, so nothing shines through the bole onto the bark outside, and the cell is not drawn while the door is shut.

## Rendering

- **Spirits.** Camera-facing flames rather than faceted pearls: a white-hot heart in a coloured glow whose rim flickers like a flame, a small tongue licking upward, and a streak back along the flight that lengthens with speed ([menuWisps.ts](../../src/presentation/menu/menuWisps.ts)).
- **Trails.** A fading ribbon is drawn through each spirit's actual simulated path (the last 0.67 s).
- **Sparks.** Each spirit sheds a few sparks that drift down from the trail, more with the treble and the accents.
- **Brightness.** Size and flare follow the spirit's band level and the accents. Spirits still inside the hollow are dimmer, so the crowd there is not a white blur.
- **Draws.** Three additive, texture-free draws, depth-tested against the tree so the bole hides spirits behind it.
- **Light on the wood.** The brightest spirits nearest the wood light the bark, leaves and ground: 3 on Low, 5 on Medium, 7 on High ([menuWispLight.ts](../../src/presentation/menu/menuWispLight.ts)). They are packed into shared uniforms added in those materials' own shaders, so there are no extra scene lights, recompiles or shadow maps. Selection fades continuously, and a spirit inside the trunk lights only the hollow.

## Review and limits

The [0.0.7 notes](../production/releases/0.0.7.md) record the checks, measurements and pull request. Tests cover the rhythm data's integrity and sampling; the door's timeline; every spirit leaving and returning; no contact with wood or ground across the song; the dance going round the whole tree; exact reconstruction from source time; the bounce, phrase formations and accent push; the hollow's fit inside the tree and its closure; the camera's view through the doorway; and the renderer's layers, visibility, colours, brightness, wood light, presets and disposal. Visual review is headless captures on one development machine. Mobile performance, other browsers, calibrated audio/display latency, and the motion as seen by a person in real time remain unverified. The earlier full-song video request remains paused.

`tools/grove.html` (served by `npm run dev`, not part of the build) previews the grove at any song time with the real menu overlay, and can play it with the actual song.
