# Animated animal calls — 0.0.13

Each animated tiger, lion, bear, wolf, cat, dog, boar and deer has two prepared calls. The sound comes from the actor that begins its Call gesture, using its current world position. The wildlife controller emits `wildlife:animal-call` with `{ id, species, position: { x, y, z }, callVariant: 1 | 2 }` after the visible gesture starts. Its staggered 28–70 second rest prevents synchronized calling.

`AudioEngine` validates the event and gates it on a running, visible world with audible Master and Ambience levels. `SoundWorld` allows three animal voices at once, protects each actor against duplicate calls for 12 seconds, and applies the species' near distance and maximum hearing range. Web Audio uses the camera's real position and forward direction for panning. Distant calls lose high frequencies, and calls pass through the existing outdoor filter that muffles sound indoors. The mixer has no separate geometric wall-occlusion calculation. Calls stop on a menu, panel, death, hidden tab or mute. A clip that is still decoding is dropped rather than played after its visible gesture has passed.

The former village dog emitter is removed; barks now belong to the positioned dog actors. Birds, frogs, hens and the other established environmental emitters keep their existing rules.

The unchanged MP3 generations live in [assets/audio/source/animals](../../assets/audio/source/animals). [animals.json](../../tools/world-audio/animals.json) records the descriptions, requested lengths, dates, actual model and source hashes. [prepare-animals.mjs](../../tools/world-audio/prepare-animals.mjs) trims only quiet edges, removes DC, normalizes the louder half of short frames to −20 dB RMS with a −1 dBFS peak ceiling, and applies 8 ms / 50 ms edge fades. It writes mono 48 kHz Opus and AAC calls under [public/audio/animals](../../public/audio/animals), plus the source and derivative hashes in [animal-audio-assets.json](animal-audio-assets.json).

```sh
node tools/world-audio/prepare-animals.mjs
```

Preparation needs FFmpeg with libopus. The 16 calls total 39.20 seconds after trimming; the two browser formats together use approximately 696 KiB. Every clip lasts 0.98–3.37 seconds. FFmpeg analysis of all 32 decoded derivatives found finite non-silent output, one channel, and true peaks between −13.45 and −3.77 dBTP. This verifies file integrity and signal levels; it does not establish a subjective listening review.

For listening review, run the development server and open `/tools/sound.html`. The **Animated animal calls** controls play both takes of every species at the game level, close, to either side, or 30 metres ahead of the current listener. The main game plays those calls only during actual animal gestures. The audition page is a development tool and is excluded from the production build.

All animal calls were generated on 6 October 2026 using `eleven_text_to_sound_v2` under a paid Creator subscription. The animal sound-generation endpoint rejected the requested Eleven v4 speech-model identifier; its v3 sound-effects identifier also returned an unknown-model error. These assets are actual sound-effect generations, separate from Eleven Music and speech. [ElevenLabs' paid-output guidance](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform) remains subject to rights, applicable law, service-specific terms and the exclusion of Beta Services. Generated animal audio is not offered as Creative Commons; the software license does not grant reuse of these recordings.

Validation covers every source and derivative hash, codec headers and mono Opus metadata, all species and takes, finite event positions, listener orientation, distance rejection, duplicate protection, simultaneous voice limits, late decoding and playback retirement at each visibility or volume boundary.
