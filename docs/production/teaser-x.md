# Teaser for X

Recorded 5 October 2026 for the owner's request ([A52](../decisions.md)): "Make a video teaser about Tervain of what we have done so far, main audience is X, upload the video to our repo, make it as high quality as possible", followed by "try to make it funny and self depreciting". A33 had closed video work after the 0.0.7 menu video; this request reopens it for this teaser only.

**[Watch the teaser](../media/teaser/tervain-teaser-0.0.10.mp4)** ([poster frame](../media/teaser/poster.jpg)).

| | |
| --- | --- |
| Length | 47.7 s: 85 beats at 106.99 BPM, with every cut on a beat |
| Picture | 1920 × 1080 at 60 fps; H.264 High 4.2, two-pass, BT.709, fast start |
| Sound | AAC-LC stereo, 256 kb/s, 48 kHz; −14.1 LUFS integrated, true peak −1.7 dBTP, loudness range 3.7 LU |
| Size | 47.8 MiB (50.2 MB), below GitHub's 50 MiB warning |
| Captions | Burned in, because X starts videos muted |

## The cut

A trailer voice (Cinzel capitals) makes each claim, and a plain lowercase voice answers it a beat later.

| Shot | Starts | Trailer voice | Honest voice |
| --- | --- | --- | --- |
| Lantern Point at sunset | 0.0 s | In a world… | (a fairly small one) |
| The hero on the strand | 4.5 s | One man wakes with no memory | our AI developers can relate |
| The arrival trail, walking | 9.5 s | An ancient forest | 7 of our 27 pull requests are about trees. please look at the trees. |
| Rillford: the baker at her door | 14.6 s | A living, breathing village | everyone has a job. the job is mostly standing. |
| A barrel, lifted and thrown | 19.6 s | Next-generation physics | (one barrel) |
| The thornback in the cut | 24.1 s | Brutal, tactical combat | the thornback is undefeated. we cannot beat it either. |
| Freeze frame | 29.2 s | | \*record scratch\* yep, that's our hero. |
| The inn at dusk | 31.4 s | An unforgettable score | composed in code by an AI that can't hear. it checked the music with spectrograms. |
| The menu grove | 36.5 s | A breathtaking main menu | honestly our most finished feature |
| Title | 40.9 s | | still v0.0.10. not 0.1. we asked. the answer was no. / release date: when the trees are done / made by one human, a few AIs and 27 pull requests · sound partly by ElevenLabs |

The jokes stay close to the record. PRs #12 to #18 are all woodland work, which makes 7 of #1 to #27. The version is 0.0.10 under the 0.0.x hold ([A15](../decisions.md), [versioning](versioning.md)). [A51](../decisions.md)'s music was checked by measurement because nobody had listened to it. The rest are exaggerations. The world has nine things you can pick up and throw, and the shot shows one of them. The thornback can in fact be beaten; the fight in the teaser stops just as it lands its blow.

## How it was made

Everything is rebuilt by four tools in [tools/teaser/](../../tools/teaser/), which share one [timeline](../../tools/teaser/timeline.mjs) of shots, beats and captions.

**Footage** ([film.mjs](../../tools/teaser/film.mjs)). The browser prototype itself (0.0.10, High preset) is filmed in headless Chrome through the DevTools Protocol, one fresh page per shot. The tool stops the game's own frame loop and advances the world exactly 1/60 s per frame. Each frame is captured as a lossless PNG and stored in a near-lossless intermediate. `Math.random` is seeded before the game loads, so each shot plays out identically every time. The camera is scripted: eased dollies and a follow camera on the trail. The hero is driven only through the game's own controls: the walk key, the light and heavy attack keys, and its grab and throw. Nothing is added to the world. The freeze is the fight's last frame held with a slow push-in; the hero's pink tint is the game's own hit flash. The thornback's blow lands four frames before the cut.

**Captions** ([captions.mjs](../../tools/teaser/captions.mjs)). Chrome draws each caption frame on a transparent page. The fonts are Cinzel and Inter, both under the SIL Open Font License; they are fetched from Google Fonts while rendering, and no font files are committed. Long trailer lines are scaled to fit the frame.

**Sound** ([score.mjs](../../tools/teaser/score.mjs)).

- **Score.** Composed for this cut with A51's composer and the Tervain theme in D Dorian:
  - a war drum, a bell and a braam open on D;
  - the theme as a waltz: flute over harp, with fiddle and lute in Rillford;
  - a build that stops dead as the barrel lands;
  - a 12/8 fight in the voice of the ford's battle loop;
  - a record scratch made from that fight music;
  - the theme in Aeolian on the harp at dusk;
  - a rise in four-four into D major for the title.

  It runs at the menu score's measured tempo, 106.99 BPM. The grove's spirits dance on that grid ([A30/A32](../engineering/menu-grove-score.md)), so in the grove shot they bounce to the teaser's own drums. The menu score itself ([A28](../decisions.md)) is not used.
- **Effects.** These are the sounds the game played while each shot was filmed. The film logs every cue with its frame, clip, take, gain and position. The score tool plays them from the game's own banks with the engine's distance law, air filtering and panning relative to the camera. Three distant gull calls from the same bank were added on the coast. The teaser's mix brings feet, blows and the barrel forward and takes the daytime crickets down. The gains are listed in the tool.
- **Beds.** The game's own place loops, high-passed, with their odd loud knocks limited.
- **Master.** EQ for phone speakers, gentle bus compression, and a look-ahead limiter to −14 LUFS and −1 dBTP.

**Edit** ([assemble.mjs](../../tools/teaser/assemble.mjs)). The tool cuts the shots together, lays the captions over them and encodes once: two-pass H.264 to the size budget, with AAC sound and fast start. It also pulls the poster frame from the title card.

To rebuild (about 20 minutes; roughly 1.5 GB of intermediates goes to `../tervain-teaser-output`, or to `TERVAIN_TEASER_OUT`):

```bash
npm run dev
```

```bash
node tools/teaser/film.mjs && node tools/teaser/captions.mjs && node tools/teaser/score.mjs && node tools/teaser/assemble.mjs
```

Set `TERVAIN_URL` when the dev server is not on `http://127.0.0.1:5173/`. `film.mjs <shot> --stills` and `captions.mjs --at <seconds>` give quick frames for checking a change.

## Sources and credits

- **Picture.** Tervain's own prototype, captured from the browser. No Gothic 3 or Gothic 1 Remake data, captures or likenesses are used ([A14](../decisions.md)).
- **Sound.** A50's effects and beds were generated with ElevenLabs. That credit is required; it is given on the title card and in the NOTICE. A51's crafted sounds and this score are composed in code. The owner-supplied menu score is not used.
- **Fonts.** Cinzel (Natanael Gama) and Inter (Rasmus Andersson), SIL OFL 1.1, drawn into the picture.

## Posting on X

Upload the MP4 as it is. X re-encodes it; 1080p60 H.264 with AAC is its recommended format. The first frame is the lighthouse at sunset, and "In a world…" arrives within half a second. Suggested posts, each under 280 characters:

> We made a trailer for our fantasy RPG. We tried very hard to make it epic. It is version 0.0.10. 🌲
> Tervain: single-player, in your browser, mostly trees.
> https://ael-dev3.github.io/Tervain/

> Tervain, an honest trailer: one man, one barrel, one thornback we cannot beat. Built in the open by one human, a few AIs and 27 pull requests. Play the prototype in your browser: https://ael-dev3.github.io/Tervain/ #gamedev #indiedev

> Every trailer promises next-generation physics. Ours has one barrel. Tervain 0.0.10, playable in your browser: https://ael-dev3.github.io/Tervain/ #indiegame

Alt text: *Teaser for Tervain, a fantasy RPG prototype. A lighthouse at sunset, a man on a beach, a forest trail, a village, a thrown barrel, and a fight with a spiked beast that ends on a freeze frame. Then an inn at dusk, glowing spirits around a tree and the Tervain title, all with jokey captions.*

## Checks

Recorded when the file was made; see the [change log](../decisions.md).

- **Picture.** Contact sheets of stills from every shot, and of every caption over its footage, were reviewed for framing, legibility and the cut points.
- **Sound.** Measured, not heard: loudness and true peak per shot for the mix and each stem, spectrograms of the cuts (the build's dead stop, the scratch, the silence), and the timing of the barrel's landing and the hero's hurt read from the film's logs. As with A50 and A51, nobody has listened to it yet, so the owner's review by ear is pending.
- **Determinism.** Repeated filmings of the barrel and the fight gave the same simulation, with the barrel landing and the hero hurt on the same frames each time.
