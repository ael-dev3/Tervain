# Recorded grass shimmer diagnostics

Compare recorded movement clips of the same build route, camera, crop, resolution and encoding. Select a grass-only rectangle; sky, silhouettes and moving characters can dominate the result. This is a diagnostic, not a calibrated visual pass threshold or proof of a live fix.

Requires ffmpeg and ffprobe. Analyze a native decoded-pixel crop (normalized x,y,width,height):

```sh
node tools/video-shimmer.mjs --input clip.mp4 --roi 0.2,0.5,0.5,0.3 --start 10 --max-frames 600 --out shimmer.json
```

The play gate can produce the sidecar after its recorded run:

```sh
node tools/play-gate.mjs --profile mac --shimmer-roi 0.2,0.5,0.5,0.3 --shimmer-start 10 --shimmer-max-frames 600
```

Choose start/duration by inspecting the clip. The rectangle is fixed in screen space, so keep the selected interval outdoors with grass in that rectangle. Do not combine interior or menu footage into a grass score. Use a separate timing-only gate (`--video false`) for frame-time evidence; recording perturbs performance. The existing gate screencast is resolution-limited; independent native-resolution clips may reveal detail it cannot capture.

Reports contain per-frame positive high-frequency brightness flashes (sparkle share), temporal residual mean/p95, alignment coverage, exposure offsets and peak timestamps. Three-frame gradient block matching compensates translation with quarter-pixel refinement; median offsets compensate uniform exposure changes. Low-confidence or out-of-bounds matches are excluded. No usable matches produce null metrics and a failed diagnostic, rather than a perfect score.

Limitations: parallax, occlusion, changing wind deformation, compression and motion exceeding the search radius can affect residuals. Check coverage and watch peak timestamps. Analysis defaults to the source cadence and rejects a requested cadence above it, because inserted duplicate frames dilute transient flashes. Inspect sourceAverageFps and compare matching source cadences. Reports omit input filenames and metadata. The default limit is 1800 decoded frames; `truncated` records when it is reached. A lower score alone cannot establish improved foliage quality; retain comparable clips for review.


Recorded gates require at least three usable triplets and 80% alignment by default; `--min-frames` and `--min-alignment` configure coverage. Set explicit calibrated visual ceilings with `--max-sparkle` (share, 0–1) and `--max-residual` (mean brightness residual, 0–255). The play gate accepts corresponding `--shimmer-min-frames`, `--shimmer-min-alignment`, `--shimmer-max-sparkle` and `--shimmer-max-residual` options. Failed coverage or quality limits exit nonzero. A report without explicit quality ceilings remains an uncalibrated diagnostic, even if coverage passes. Calibrate ceilings against comparable accepted and rejected GPU clips; no universal art-quality threshold is supplied.

`tools/shimmer-cadence-repro.mjs` generates a five-frame 30 Hz lossless fixture with a single-pixel flash and checks both cadence preservation and explicit ceiling rejection. Run it with `--tool <baseline-tool> --expect before` and then `--expect after`. The committed [before](shimmer-proof/cadence-before.json) and [after](shimmer-proof/cadence-after.json) receipts show artificial ten-frame/60 Hz analysis corrected to five frames/30 Hz, with explicit upsampling and zero-sparkle limits rejected.

For a software-rendered build repro:

```sh
node tools/capture-shimmer-repro.mjs --url <build-url> --out shimmer-repro
node tools/video-shimmer.mjs --input shimmer-repro/pan.mkv --roi 0.56,0.52,0.26,0.08 --max-frames 12 --out shimmer-repro/metric.json
```

The [clip](shimmer-proof/software-pan.mkv), [first frame](shimmer-proof/software-frame.png), [capture settings](shimmer-proof/capture.json) and [metric](shimmer-proof/software-metric.json) demonstrate the pipeline against the production application. This is a short stepped camera-pan fixture with frozen simulation, low preset and a 640×360 software renderer. Its encoded 60 Hz cadence is logical capture progression, not wall-clock frame pacing. It neither reproduces native-resolution Mac sparkle severity nor certifies a foliage fix. GPU gates should use real recorded motion and inspect peak timestamps.
