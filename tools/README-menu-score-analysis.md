# Offline menu score controls

`analyze-menu-score.py` turns the approved **The Sovereign's Oath** recording into measured controls for original menu
effects. It adds no audio samples, lyrics, timed subtitles, artwork, FFT library, or media request to the runtime.
Source authority and credit remain in [the score record](../docs/engineering/menu-score.md).

## Regenerate and verify

Use an existing Python 3 interpreter with NumPy and an existing `ffmpeg` on `PATH`; the tool installs nothing.
The recorded local generation used FFmpeg **8.1.2** and NumPy **2.3.5**. From the repository root:

```sh
python3 tools/analyze-menu-score.py
python3 tools/analyze-menu-score.py --check
npx vitest run tests/presentation/menuScoreFeatures.test.ts
```

The tool checks both the archived source and the primary Ogg derivative against
[`menu-audio-assets.json`](../docs/engineering/menu-audio-assets.json). A mismatch stops generation. `--check` also
compares the complete regenerated TypeScript module without writing it. The module records source and runtime hashes,
the envelope payload hash, settings, reference amplitudes, and NumPy version. Tool-version changes may alter quantized
boundaries; inspect and validate regenerated controls before accepting such a change.

## Measurements and timing

The primary Ogg is decoded to **12 kHz stereo**. RMS and spectral power average left/right channel power; an inverted
stereo channel therefore cannot cancel the analysis as a mono downmix would. The spectrum uses a **2,048-sample
symmetric Hann window**, **170.6667 ms** wide, centered on source time, with an exact **50 ms hop / 20 Hz** output rate.
The first and last windows are zero-padded. Bass covers **40–260 Hz**, midrange **260–2,200 Hz**, and treble
**2,200–5,500 Hz**. Positive spectral flux supplies an onset control.

These are score-relative visual controls, with a −65 dBFS numerical floor, each channel's 95th-percentile reference,
square-root compression for RMS/bands, and linear onset normalization. RMS/bands use **70 ms attack / 180 ms release**;
onset uses **35 ms attack / 150 ms release**. They are not integrated loudness, beat labels, lyrical events, or a
calibrated model of physical playback/display latency. The centered window includes approximately 85 ms on either
side of its timestamp, and visual smoothing is deliberate source-time choreography.

The curve spans **214.2 seconds**, the archived source duration, with **4,285 samples** including both endpoints.
Derivative codec/container tails extend by milliseconds; lookups beyond the curve hold its final quiet frame. This
does not trim or change the music files. Five unsigned 8-bit channels occupy **21,425 bytes**, base64-encoded in the
generated module (34,806 bytes at this generation). Runtime performs one base64 decode and one motion integration.

The measured rise around 30 seconds is visible in the generated controls: energy increases from **0.459 at 29 s**
to **0.761 at 30 s**, and onset from **0.090 to 0.663**. Highest measured window RMS occurs at **60.9 s** and strongest
positive flux at **54.1 s**; these locate analyzed signal changes, not independently identified musical sections.

## Runtime sampler

`sampleMenuScore(time, target?)` returns `energy`, `bass`, `mid`, `treble`, and `onset` in `[0, 1]`, plus `motion`.
Pass the native score element's `currentTime`; the native loop supplies its own reset. Samples interpolate between
feature frames, clamp finite times to the source duration, and treat malformed times as zero. An optional caller-owned
target avoids per-sample object allocation, useful when sampling a current position and older trail positions.

`motion` integrates `0.55 + 0.45 × energy` once from the quantized table, in weighted source seconds. It allows a seek
or quality rebuild to reconstruct exactly the same calm orbital phase without frame-by-frame accumulation. For a
loop-continuous orbit, use `motion / MENU_SCORE_MOTION_LENGTH × 2π × integerTurns`; choose the number of turns to keep
the effect slow. Music mute/hidden state and Reduced Motion remain responsibilities of the consuming presentation.
