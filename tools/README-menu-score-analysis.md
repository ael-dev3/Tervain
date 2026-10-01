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

## Rhythm, accents and spectrum (0.0.7)

`analyze-menu-rhythm.py` adds the measurements the grove's dance needs (A32): a constant beat grid with its downbeat and
eight-bar phrase phase, transient accents, and a six-band spectrum. It reuses the score tool's manifest check, so the
same archived source and primary Ogg must match. It writes `src/presentation/menu/menuScoreRhythmData.ts`; the sampler
that reads it is the hand-written `menuScoreRhythm.ts`. The 0.0.7 generation used FFmpeg **9.0.1** and NumPy
**2.2.6** on Windows. From the repository root:

```sh
python3 tools/analyze-menu-rhythm.py
python3 tools/analyze-menu-rhythm.py --check
npx vitest run tests/presentation/menuScoreRhythm.test.ts
```

- **Beats.** The primary Ogg is decoded to 24 kHz stereo. A 2,048-sample Hann window every 10 ms gives a positive
  log-spectral-flux onset envelope over 40 log-spaced bands from 30 Hz to 10 kHz, with its one-second trend removed.
  Autocorrelation weighted toward 110 BPM gives the period. An Ellis (2007) dynamic-programming tracker follows the
  envelope. Its beats are fitted with one least-squares constant grid, refined against the envelope with a 20 ms
  Gaussian tolerance.
- **Bars and phrases.** The downbeat is the beat phase with the strongest low-frequency (below 200 Hz) onsets. Phrases
  of eight bars start at the phase with the largest changes in bar loudness. The module records the scores behind both
  choices.
- **Accents.** Local maxima of the onset envelope clearly above a two-second running level, at least 150 ms apart.
  Strength is relative to the 90th percentile of the kept peaks.
- **Spectrum.** The same 12 kHz stereo, 2,048-sample, 20 Hz centred-window convention as the score controls. Six bands
  (40–90, 90–200, 200–500, 500–1,200, 1,200–2,800 and 2,800–5,800 Hz) are normalised to each band's 95th percentile,
  square-root compressed, and smoothed with 40 ms attack / 160 ms release.

At this generation the score measured **106.99 BPM**. The 382 tracked beats lie within 8.4 ms RMS (38 ms worst) of the
fitted grid, the grid's onset alignment is 5.5 times that of randomised grids, and there are 550 accents. As with the
score controls, these time visuals to the recording. They are not musicians' beat annotations, lyrical events, or a
calibrated latency model.

Both scripts write their modules as UTF-8 with LF line endings. Before 0.0.7, `analyze-menu-score.py` wrote with the
platform's default text encoding, which fails part-way on Windows (the module holds non-ASCII text). On this machine
(NumPy 2.2.6), `--check` of the score controls reports a difference only in the recorded NumPy version and the tenth
significant digit of the reference amplitudes; the five-channel payload is identical. That module was not regenerated
for 0.0.7.
