# Controlled grass pan capture

The general video metric previously required an externally recorded clip, which mixes wind, camera motion, shadows, compression and frame cadence. This tool adds a repeatable native-build camera-only capture with a stationary control. It changes no product materials or geometry.

```sh
node tools/capture-grass-shimmer.mjs --url http://127.0.0.1:4173/ --out grass-pan-proof
```

Default route: High preset, 640×360, terrain location (-7,45), 24 frames and a two-degree yaw sweep. The existing native grass geometry and shaders are rendered with frozen simulation, wind, interaction and lights. Other meshes are hidden to isolate grass against the scene background. This is a diagnostic silhouette view, not a final gameplay appearance comparison. Camera rotation does not trigger tile streaming during the capture.

PNG frames are encoded losslessly with FFV1. The 60 Hz encoding cadence is synthetic: it does not measure render speed or hardware frame pacing. Metric decoding preserves frame order and timestamps. `--frames`, `--x`, `--z`, `--degrees` and `--quality` select other controlled routes. The supplied URL must serve a built game; Chromium and ffmpeg/ffprobe are required.

## Actual-build receipt

The committed software-rendered clips contain 24 frames each, giving 22 temporal triplets. Assertions pass: grass is nonempty, repeated renders of identical state are byte-identical, all triplets are usable, and stationary residual sparkle is exactly zero. The native grass field reports 23,724 instances and 1,458,624 submitted triangles before camera culling.

Pan mean residual sparkle share is 6.22%, peak 6.82%; average motion-alignment coverage is 58.92%. These values apply only to this isolated capture and ROI, not to the uploaded gameplay recording or a general quality threshold. Unaligned pixels are excluded; partial coverage must remain visible when comparing candidates. Occlusion, subpixel raster coverage, parallax and view-dependent shading can all contribute. A nonzero pan score alone does not identify a shader bug.

## Thin-blade investigation path

The grass uses opaque double-sided Lambert geometry, rather than alpha-cutout leaf cards. Its vertex shader narrows tips and near-camera blades; lighting adds rounded normals, translucency and a view-dependent sheen. Tree alpha-mask changes therefore do not establish a grass fix. Compare the same capture before/after any proposed coverage or shading change, alongside full gameplay movement clips and rendering-cost counters. Do not infer Apple GPU frame time from the software renderer.

Validation: production build, six video/metric tests, and the actual-build assertions above. The companion native-cadence change is the base of this PR. This tool supplies controlled evidence, not an appearance change or a calibrated pass threshold.
