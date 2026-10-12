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

Limitations: parallax, occlusion, changing wind deformation, compression and motion exceeding the search radius can affect residuals. Check coverage and watch peak timestamps. The default analysis resamples to 60 Hz; inspect sourceAverageFps and avoid comparing different source cadences. Reports omit input filenames and metadata. The default limit is 1800 decoded frames; `truncated` records when it is reached. A lower score alone cannot establish improved foliage quality; retain comparable clips for review.
