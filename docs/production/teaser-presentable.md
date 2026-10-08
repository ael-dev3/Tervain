# Teaser: presentable

Recorded 7 October 2026 ([A64](../decisions.md)). The brief was a second teaser of up to 45 seconds, in the voice of the first one ([PR #28](https://github.com/ael-dev3/Tervain/pull/28)): self-deprecating, funny and calm, carried by real gameplay, with time for the jokes to land, a brief look at the newest work and a narrator. It is built on two comments on the project's Reddit post, both by CreativeProblem7803. The first said it is Gothic 3 from the first ten seconds, which is what it was asked to be. The second said the monsters were not presentable and that it was just one monster to polish, so the teaser polishes it: a top hat, a monocle and a bow tie. The joke is on the game and the people making it, not on the commenter. Video work stays closed otherwise ([A33](../decisions.md)).

**[Watch the teaser](../media/teaser/tervain-teaser-presentable.mp4)** ([poster frame](../media/teaser/tervain-teaser-presentable-poster.jpg)).

| | |
| --- | --- |
| Length | 44.9 s: 80 beats at 106.99 BPM, every cut on a beat |
| Picture | 1920 × 1080 at 60 fps; H.264 High 4.2, two-pass, BT.709, fast start |
| Sound | AAC-LC stereo, 256 kb/s, 48 kHz; −14.1 LUFS integrated, true peak −1.6 dBTP |
| Size | 41.8 MiB, under GitHub's 50 MiB warning |
| Narration | ElevenLabs `eleven_v4`, the premade voice George: a calm British storyteller, played dry |
| Captions | Burned-in subtitles for every line, because feeds start videos muted |

## The cut

| Starts | Shot | Narration |
| --- | --- | --- |
| 0.0 s | The hero wades through the ford meadow's long grass against the low sun | So. I asked AI to make a game… heavily inspired by Gothic 3. |
| 5.6 s | Lantern Point at sunset, where the first trailer began; the first comment's screenshot in the corner | CreativeProblem7803 said: "Bro, that's Gothic 3 from the first 10 seconds." |
| 12.3 s | The hero at the sea's edge at sunset; a fanfare swells and stops dead on "failed" | Mission failed… successfully. |
| 16.3 s | The hero walks through the long grass at midday, the trees moving behind him | Since then, we've been polishing. |
| 18.5 s | The hero swimming off the strand, seen through the water | You can swim now. |
| 20.2 s | Sel writes in the ledger on the ford camp's bench | And it took an entire pull request to teach the villagers how to sit on a bench. |
| 25.2 s | The thornback as it is; the second comment's screenshot in the corner | "The monsters are not presentable… it's just one monster to polish." *(sighs)* Fair. |
| 32.0 s | Jump cut, same framing: the same thornback in a top hat, monocle and bow tie. The monocle glints, a minuet starts, and it turns to look into the lens | Better? |
| 36.5 s | It is still the thornback: it charges, takes a sword blow and lands its own | |
| 39.3 s | Freeze on the blow, with a record scratch | Presentable. |
| 40.9 s | Title, with the version under it: v0.0.13 · still not 0.1 | Tervain. Now with one presentable monster. |

The montage stays brief and lets the picture show the newest work: the blade grass and the trees in one wind ([A61](../decisions.md), [A62](../decisions.md)), the water and swimming ([A60](../decisions.md)), and a resident seated on a measured bench and writing with a quill ([A63](../decisions.md)). The bench line is true: the seats came with the residents' pull request. The comments appear as screenshots of the thread, small, and the narrator reads them; the second is shortened in speech, with the full comment on screen. The version is the real one under the 0.0.x hold ([A15](../decisions.md), [versioning](versioning.md)). The formal wear is not in the game.

## How it was made

The tools of the first teaser in [tools/teaser/](../../tools/teaser/), sharing one [timeline](../../tools/teaser/timeline.mjs) of shots, beats, narration and captions, rebuild everything.

**Footage** ([film.mjs](../../tools/teaser/film.mjs)). A production build of the `0.0.13` prototype (High preset) is filmed in headless Chrome through the DevTools Protocol, one fresh page per shot, with the game's own frame loop stopped and the world advanced exactly 1/60 s per frame. `Math.random` is seeded before the game loads, so each shot plays out identically every time. Cameras are eased dollies, placed clear of geometry. The hero moves only through the game's own controls. The thornback is placed where its shot needs it and given its state of mind; in the reveal it follows a hidden hero who steps to where the camera stands, which is why it turns to look into the lens. The charge is timed so the blow lands four frames before the cut, and the freeze is that last frame, held with a slow push-in.

**Formal wear** ([costume.mjs](../../tools/teaser/costume.mjs)). The top hat, monocle (with its chain) and bow tie are built in the page at film time from the game's own Three.js classes and attached to the thornback's head, so they move with it. Nothing is added to the game, its assets or its saves.

**Narration** ([voice.mjs](../../tools/teaser/voice.mjs)). Eleven short lines, voiced with ElevenLabs `eleven_v4` in the premade voice George. Each take is transcribed with word timings (`scribe_v1`) and retaken when its words come back wrong; names and numbers are written as they are said, so "Tervain" is spelled for the voice as it sounds. The takes, transcripts, word timings and hashes are kept in [tools/teaser/voice/](../../tools/teaser/voice/). The timeline places each take in its shot, and the subtitles follow its words.

**Captions** ([captions.mjs](../../tools/teaser/captions.mjs)). Chrome draws each caption frame on a transparent page: the subtitles in Inter, the two screenshots popping into the top-left corner at three quarters of their size, the monocle's glint (placed from the film's log of where the monocle is on screen), the freeze and the version under the title. The font is fetched from Google Fonts while rendering; no font files are committed.

**Sound** ([score.mjs](../../tools/teaser/score.mjs)).

- **Narration.** Each take at its place, dry, in the middle. While it speaks, the music steps back 9 dB, the beds 6 dB and the game's sounds 3 dB.
- **Score.** Composed for this cut with [A57](../decisions.md)'s composer and the Tervain theme, at the menu score's measured tempo:
  - the theme on flute and harp over the meadow, the flute resting while the first comment is read;
  - a fanfare in D major on the strand, stopped like tape on "failed", then crickets;
  - an easy lute groove in four under the newest work;
  - a low build under the thornback that cuts out for the reveal;
  - a minuet in D major on harpsichord and viol for the formal wear, with a chime for the glint, until a record scratch at the freeze;
  - silence on the freeze for "Presentable.", then a harp roll, a bell and a short cadence for the title.
- **Effects.** The sounds the game played while each shot was filmed: the film logs every cue with its frame, clip, gain and position, and the score tool plays them from the game's own banks with the engine's distance law, air filtering and panning relative to the camera. A soft pop marks each screenshot. The town bell, which strikes early in every shot, and a stonecutter's distant chisel are left out.
- **Beds.** The game's own place loops: meadow and brook, the far sea and the cliff wind, sea and surf, meadow and forest, lapping water, brook and village, the cut, and the wind and fire of the title.
- **Master.** EQ for phone speakers, gentle bus compression and a look-ahead limiter to −14 LUFS and below −1 dBTP.

**Edit** ([assemble.mjs](../../tools/teaser/assemble.mjs)). The shots are cut together with the captions over them and encoded once: two-pass H.264 to the size budget (`--budget` makes a smaller copy for phones), AAC sound and fast start. It also pulls the poster frame from the reveal, and refuses to encode while a quoted comment is marked unconfirmed. It writes to the gitignored `outputs/teaser/`; the published copy and its poster are placed in [docs/media/teaser/](../media/teaser/) by hand.

To rebuild (about 30 minutes; roughly 2 GB of intermediates goes to `../tervain-teaser-output`, or to `TERVAIN_TEASER_OUT`), serve a build and run the tools. The narration is already recorded; `voice.mjs` only needs the ElevenLabs key in the environment when a line changes.

```bash
npm run build && npm run preview -- --port 5190 --host 127.0.0.1
```

```bash
TERVAIN_URL=http://127.0.0.1:5190/ node tools/teaser/film.mjs && node tools/teaser/captions.mjs && node tools/teaser/score.mjs && node tools/teaser/assemble.mjs
```

`film.mjs <shot> --stills` and `captions.mjs --at <seconds>` give quick frames for checking a change.

## Sources and credits

- **Picture.** Tervain's own prototype, captured from the browser; the formal wear is drawn in code. No Gothic 3 or Gothic 1 Remake data, captures or likenesses are used ([A14](../decisions.md)).
- **Narration.** Generated with ElevenLabs `eleven_v4` on 7 October 2026 under a generation-time verified paid Creator plan, in the premade voice George, from original lines; see the [NOTICE](../../NOTICE).
- **Sound.** The effects and beds are the game's own (including generated sounds credited in the NOTICE); the score is composed in code. The owner-supplied menu score is not used.
- **Comments.** Two screenshots of public comments on the project's Reddit post, by CreativeProblem7803, named in the narration. They are the commenter's words, quoted as written ([comments.mjs](../../tools/teaser/comments.mjs)); no license to them is granted.
- **Font.** Inter (Rasmus Andersson), SIL OFL 1.1, drawn into the picture.

## Posting

It has not been posted. Upload the MP4 as it is; X and Reddit both take 1080p60 H.264 with AAC. Suggested text:

> i asked AI to make a game heavily inspired by gothic 3. it is apparently gothic 3 from the first 10 seconds. the monster also needed polish, so we polished it.

Alt text: *Teaser for Tervain, a fantasy RPG prototype, with a calm British narrator. A man walks through tall golden grass at sunset; a lighthouse on a headland at dusk; the man stands on a beach facing the sea. Quick shots of him walking through long grass, swimming in clear water, and a villager writing in a book on a bench. A spiked, blocky beast stands in a forest clearing, then appears in the same spot wearing a top hat, a monocle and a red bow tie, and turns to stare at the camera. It charges the man, and the picture freezes on the blow. Screenshots of two Reddit comments say the game looks like Gothic 3 and that the monster needs polish.*

## Checks

- **Picture.** The finished file was reviewed as contact sheets at two and four frames a second and at full size at each cut, line and key moment, for framing, camera clearance, and how the subtitles, screenshots and formal wear read at phone size. That review re-aimed the swim shot, which had let the hero drift out of frame, and split two long subtitles at the narrator's pauses.
- **Narration.** Every take was transcribed after generation and matched its line, the name and number included; "Tervain" was respelled for the voice after the first take came back as another word. The subtitles are timed from the transcribed words.
- **Sound.** Checked by measurement only: loudness and true peak of the master, loudness per shot for the mix and each stem, and the narration against everything under it while it speaks (8 to 18 dB above it; "Presentable." in silence). The fanfare's stop is placed on the narrator's "failed" from the take's word timings, and the hero's hurt lands three frames before the freeze in the film's log. No listening review is asserted.
- **The Thornback.** Filming the first version showed see-through gaps in its body: it was drawn inside out. The game is corrected in the same change, with a test ([release record](releases/0.0.13.md#thornback-correction-7-october-2026)).
