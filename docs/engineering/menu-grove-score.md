# The score-led hermitage awakening

Owner direction of 30 September 2026, [A30](../decisions.md), within `0.0.5`. At **30.000 seconds of The Sovereign's Oath**, the native door in the ancient tree begins opening. Luminous spirits emerge and dance around its roots and boughs in response to the actual song. The existing dusk vigil, title, camp and single Hegemony standard remain the composition.

The primary creative reference is the forest reverence of Hyperion's Brotherhood of the Muir, with Warcraft's night-elf forest spirits as a secondary visual reference. [Dan Simmons's interview](https://www.writerswrite.com/journal/dan-simmons-9012) describes the Templars' environmental religion; [Blizzard's historical Wisp page](https://classic.battle.net/war3/nightelf/units/wisp.shtml) describes ancient forest spirits connected to living trees. These inform ecology, age, quiet sacredness and cool forest light. The native pearl forms, colors, paths and doorway are authored for Tervain. This effect does not establish the books' or Warcraft's history, characters, religion, or supernatural rules as Tervain canon.

## Studied workflow and attribution

**Ael / Lyrics workflow**, [lyrics repository](https://github.com/ael-dev3/lyrics), studied at commit [`3a16ed499a3a6525c5a6dbba4e10c16a511a79c7`](https://github.com/ael-dev3/lyrics/tree/3a16ed499a3a6525c5a6dbba4e10c16a511a79c7). The owner-authored workflow/code/DSP is licensed [CC BY 4.0](https://github.com/ael-dev3/lyrics/blob/3a16ed499a3a6525c5a6dbba4e10c16a511a79c7/LICENSE.md). Credit and links are retained here. Tervain implements new native Three.js geometry and a new analysis of its own approved soundtrack; none of the case studies' music, artwork, lyrics, stems, fonts or models is imported.

The important references are the [Let You Down player](https://github.com/ael-dev3/lyrics/blob/3a16ed499a3a6525c5a6dbba4e10c16a511a79c7/projects/let-you-down-lyric-film/src/player.ts), [its scene sampler](https://github.com/ael-dev3/lyrics/blob/3a16ed499a3a6525c5a6dbba4e10c16a511a79c7/projects/let-you-down-lyric-film/src/scene.ts), and the [fire analyzer](https://github.com/ael-dev3/lyrics/blob/3a16ed499a3a6525c5a6dbba4e10c16a511a79c7/projects/if-the-sun-burns-out-tonight-lyric-film/scripts/analyze-fire.py) and [random-access fire dynamics](https://github.com/ael-dev3/lyrics/blob/3a16ed499a3a6525c5a6dbba4e10c16a511a79c7/projects/if-the-sun-burns-out-tonight-lyric-film/src/fire-dynamics.js). Their transferable approach uses one media clock, separate artistic cues and measured envelopes, stereo-power analysis, asymmetric smoothing, and source-time phase integration. The scientific guide's target architecture is distinguished from actual implementations.

## One playback clock

`AudioEngine.menuMusicPlayback` reads the real retained audio element's `currentTime`, finite duration, audible state and mix gain. `requestAnimationFrame` schedules rendering; it supplies no musical phase. Pending autoplay, buffering, seeking, mute, hidden tabs, stopped contexts and gameplay cannot let the grove's time advance independently of the score. Returning to the menu follows the retained song position. The ordinary controls do not restart or seek it.

The doorway and wisps use this source position, independently of the cosmetic wind/fire/ship clock. A seek reconstructs every head and historical trail point directly. Graphics rebuilds retain the last score pose; quality subsets preserve their common spirits. Reduced Motion holds the door, wisps, pulses, trails and light exactly in their current pose while music keeps playing. Disabling it reacquires the native song position. Muting the score holds its last grove position and hides the reactive spirits.

F3 has **Menu score timing** buttons for reviewing 0:28, 0:30, 0:40, 1:00 and the ending. They seek the real menu media element, preserve the same stream and do nothing in gameplay. They are developer controls, outside the ordinary menu flow.

## Authored cue and measured response

| Source time | Presentation |
| --- | --- |
| Before 30.000 s | Closed wooden door; the existing lantern and vigil continue. |
| 30–39 s | Smooth hinge opening to about 77 degrees, exposing a shallow cool-lit cavity. |
| From 31.2 s | Staggered emergence, with low spirits around roots and others rising toward lower boughs. |
| Following music | Bass, midrange, treble, energy and restrained transient accents drive pearl size, color, glow and the pace of curved paths. |
| Final 10 s | Spirits return along outside paths toward the doorway. |
| Final 6 s | Door closes gently; spirits disappear before the native song loop returns to its introduction. |

The door has a real **0.86 × 1.72 m** aperture through a **0.70 m** pocket carved after all tree wood is authored. This also clears an inward-curving low bough that would otherwise intersect the cavity. Side reveals, floor and ceiling complete the recess. Door wood, iron grille and its lamplight share a hinge just outside the post's front face, preserving the original closed pose and keeping the swinging leaf out of the post.

[The analyzer](../../tools/analyze-menu-score.py) checks the archived source and runtime Ogg hashes, then decodes the actual 48 kHz score to 12 kHz stereo for measured controls. Left/right **power** averaging avoids mono phase cancellation. A centered 2,048-sample Hann window produces 20 Hz controls: energy, 40–260 Hz bass, 260–2,200 Hz midrange, 2,200–5,500 Hz treble, and positive spectral flux. Track-relative references and 70 ms attack / 180 ms release provide calm response. Integrated energy-weighted motion is computed once, so changing intensity never causes an orbital-phase jump.

The measured energy increases from **0.459 at 29 s to 0.761 at 30 s**; onset rises from **0.090 to 0.663**. These normalized visual controls support the owner's entrance cue. They are not beat annotations, lyrical events or loudness measurements. The **50 ms feature hop**, **170.7 ms centered window**, browser buffering and intentional smoothing mean this is source-clock synchronization, not a claim of calibrated zero-latency audio/display alignment.

The generated [feature module](../../src/presentation/menu/menuScoreFeatures.ts) contains 4,285 five-channel samples, **21,425 bytes** quantized before base64 encoding, and source/runtime/payload hashes and analysis settings. There are no runtime FFTs, whole-song PCM buffers or additional media fetches. The [reproduction guide](../../tools/README-menu-score-analysis.md) records the exact command and verification boundary.

## Native geometry and review

The spirits use three texture-free instanced draws: small faceted pearl cores, radial shader halos and connected six-segment comet ribbons. Their own geometry/materials are disposed once, independently of borrowed camp materials. High/Medium/Low use **30 / 24 / 16** spirits and **1,020 / 816 / 544** triangles. Depth testing lets the actual tree occlude the parts behind it. The existing grille light supplies the local warm-to-cool transition; no individual wisp point lights or shadow maps are added.

The [0.0.5 handoff](../production/releases/0.0.5.md) records final implementation checks, browser captures and PR status. Tests distinguish deterministic sampling, actual geometry clearance, audible media lifecycle and freeze/rebuild behavior from visual review. Mobile performance and calibrated physical audio/display latency remain unverified. The earlier full-song video request remains paused; studying the render workflow does not resume recording.
