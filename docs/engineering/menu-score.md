# The Sovereign's Oath — menu score source record

Recorded 30 September 2026 for Tervain `0.0.5` ([A28](../decisions.md)). The owner supplied **The Sovereign's Oath.m4a**, requested its use in the menu, authorized merging that addition into the main game, and requested a menu video covering the complete song. This is a specific project-use instruction, not a new open-content license or an independent authorship review.

The archive preserves the supplied file byte for byte outside the runtime build. The runtime receives audio-only derivatives in two browser-compatible containers. No Warpkeep score, Gothic 3 recording, lyrics, timed subtitle stream, or artwork is substituted for the supplied track.

## Source and preparation

| Field | Record |
| --- | --- |
| Stable identity | `tervain.menu.the-sovereigns-oath.2026-09-30` |
| Supplied by | Ael, through the project conversation on 30 September 2026 |
| Supplied filename | `The Sovereign's Oath.m4a` |
| Source archive | [assets/audio/source/the-sovereigns-oath-original.m4a](../../assets/audio/source/the-sovereigns-oath-original.m4a) |
| Source integrity | 3,971,867 bytes; SHA-256 `6a2dc57c6e8c68bfa65ab6d1e5ff6cf782f670e28e5121f788c646034e1de8c1` |
| Actual audio | Opus in an MP4 container, 48 kHz, stereo; audio and container duration **214.200 s** (3:34.2) |
| Other source stream | `mov_text` timed text, 194.309 s; preserved in the source archive, excluded from runtime audio and the video |
| Creation disclosure | Container comment says `made with suno`, with creation time `2026-09-30T18:13:42Z` and ID `61c17b0e-ba9f-4caf-808e-36ddac3025bd`. This is embedded metadata, not independent verification of authorship, service model/version, account entitlement, or third-party rights |
| Tooling | FFmpeg / ffprobe 8.1.2 on macOS |
| Signal observation | FFmpeg `volumedetect` on the supplied audio reports maximum sample level −3.5 dBFS and mean level −16.3 dBFS; these are sample-amplitude measurements, not an integrated-loudness or listening-quality assessment |

The supplied timed text and descriptive metadata are source material, not project instructions. In particular, a duration mentioned in those descriptions does not override the measured audio duration. No text from that stream is imported into game lore or shown in the menu.

| Runtime derivative | Preparation | Integrity and media |
| --- | --- | --- |
| [public/assets/audio/the-sovereigns-oath.ogg](../../public/assets/audio/the-sovereigns-oath.ogg) | Audio stream copied into Ogg without audio re-encoding; non-audio streams and metadata excluded | 3,930,812 bytes; SHA-256 `46d8c5f6492490e8ed521459fde2c588af18f55dff11ab4fbd22e491259fbee8`; Opus, 48 kHz stereo, container duration 214.2065 s |
| [public/assets/audio/the-sovereigns-oath.m4a](../../public/assets/audio/the-sovereigns-oath.m4a) | AAC-LC fallback encoded at 256 kbit/s with `faststart`; non-audio streams and metadata excluded | 7,021,811 bytes; SHA-256 `0deffd62992d61e787e916eed745992d2ab9d4a133f0c3991a372ed3e7605084`; AAC, 48 kHz stereo, container duration 214.213 s |

The millisecond differences in the derivatives reflect container/codec timing. They are not deliberate cuts, extensions, or changes to the musical arrangement. The primary Ogg preserves the original compressed audio stream; the AAC derivative is a compatibility fallback. Both resolve through the game's configured base URL and are served locally with the build.

## Runtime boundary

This is **menu music only**: the title, pause menu, and nested menu forms use the supplied score. One lazy `HTMLAudioElement`, with `preload="none"` and looping enabled, is retained across those forms and graphics-quality rebuilds. The preferred source is Ogg/Opus, with AAC selection/fallback for browsers that cannot play it. It uses streamed browser media rather than decoding the whole song into a PCM buffer; Master and Music controls remain independent of Effects, Ambience, and Dialogue. A track gain of 0.8 retains headroom before the existing master/music gains.

Browser autoplay policies require a user gesture to unlock audible playback. Pointer/key input, a title action, controller confirmation, or the small **Play menu music** footer cue can supply it. A blocked or failed playback attempt does not obstruct menu controls or retry on every frame. Entering gameplay fades the envelope with a 0.15-second time constant, then pauses after 900 ms, retaining the track position. Returning to a menu resumes from that position with a smooth envelope. Hidden or muted playback pauses immediately; it resumes on visibility or unmute only after a prior gesture. Reduced Motion controls the picture, not the user's music preference. Developer diagnostics expose score state and time for inspection; they are not product sound-quality claims.

Gameplay ambience remains the existing procedural wind, channel and surf beds. Footsteps, contact effects, interface tones, spoken dialogue, the story bell, and an adaptive in-world score are not added by this change. This selection does not authorize the earlier Warpkeep candidate `Mesure Avancée.m4a` for Tervain.

## Terms, credit, and verification

Credit: **The Sovereign's Oath — supplied by Ael for Tervain; source metadata discloses creation with Suno.** No separate open license, general redistribution permission for other projects, exclusive ownership claim, or endorsement is asserted. The project owner's instruction records authority for this particular menu, repository delivery, and requested preview video. Author identity and applicable service/account terms were not independently reviewed.

Archive and runtime file sizes, SHA-256 values, codecs, channel counts, sample rates, and durations were checked locally on 30 September 2026. Runtime integration, automated lifecycle tests, browser review, full-song video verification, and main-branch delivery are tracked in the [0.0.5 handoff](../production/releases/0.0.5.md); this inventory does not substitute for that evidence. Desktop/Steam packaging and listening on reference hardware remain unverified.

The [machine-readable audio record](menu-audio-assets.json) preserves the source and derivative coordinates separately from the [Hegemony emblem record](menu-assets.json).
