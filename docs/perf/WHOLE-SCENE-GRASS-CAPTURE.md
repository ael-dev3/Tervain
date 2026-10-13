# Whole-scene grass motion comparison

The isolated-blade facing discontinuity does not establish the cause of the whole-view sparkle. This check captures the complete `App.renderWorld()` path, including water/interior passes and High post/MSAA, with simulation and post clocks frozen. It changes only the camera between frames. The bounded facing transition is a capture-only shader control; application shaders are unchanged.

Run against a served production build:

```sh
node tools/capture-whole-scene-grass.mjs --url http://127.0.0.1:4173/ --frames 8 --width 320 --height 180 --warm 3 --x -7 --z 45 --out whole-scene-grass-proof
```

`--degrees`, `--travel`, coordinates and normalized `--roi x,y,width,height` select the route. Choose and inspect a grass-only crop for each view. The default crop covers foreground grass beside the house. Node, Chromium, Sharp, ffmpeg and ffprobe are required. `--driver` can select a compatible CDP launcher.

## Recorded comparison

The attached [report](whole-scene-grass-proof/report.json) is from revision `62af8c8d1`: its grass, post, camera and actor code matches the live `0b45a36` baseline; the only application difference is the idle quarry-dust upload optimization. This is a software-WebGL diagnostic, not a live hardware frame-time receipt.

Eight lossless frames cover a 2-degree pan with no translation. All eight capture assertions passed: hero at the intended focus, populated full scene and grass, actual 4-sample native target, two patched control shaders, complete frames, identical decoded RGB on repeated draws, and zero stationary residual in both modes.

| Crop diagnostic | Native | Bounded control |
| --- | ---: | ---: |
| Mean sparkle share | 5.6514% | 5.5287% |
| Peak sparkle share | 7.8108% | 7.3415% |
| Mean aligned-pixel share | 88.65% | 88.48% |

The mean residual falls only about 2.17% relatively. Alignment excludes roughly 11% of crop pixels, and the comparison has only six usable three-frame windows. This is insufficient evidence to ship the transition as a grass shimmer fix. Coverage inside the transition band can change; the metric is not calibrated against human perception, and does not distinguish all aliasing, occlusion and specular causes. `qualityPass` remains `null`.

Review the [native clip](whole-scene-grass-proof/native-pan.mkv), [control clip](whole-scene-grass-proof/bounded-control-pan.mkv), [native starting frame](whole-scene-grass-proof/native-start.png) and [control ending frame](whole-scene-grass-proof/control-end.png). FFV1 preserves captured pixels. The encoded 60 Hz cadence is synthetic; capture duration and encoded timestamps do not measure game frame pacing.
