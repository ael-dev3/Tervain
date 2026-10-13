# Use the native pipeline for grass motion captures

The controlled grass capture requested High grass but drew directly into the canvas. The game creates that canvas without antialiasing and supplies multisampling through its post-processing target. The old capture therefore skipped High's four samples, bloom and grading. Its residual score could not represent that selected rendering pipeline.

The capture now uses the existing preset post-processing path with a frozen post clock. Pending world look restoration and current night state follow the native render path; no product settings, shaders or styling change. Optional raw controls replay the same frozen camera route and geometry in the same page, bypassing post-processing to reproduce the previous path.

```sh
node tools/capture-grass-shimmer.mjs --url http://127.0.0.1:4173/ --frames 8 --raw-control true --out grass-pipeline-proof
# For a hardware-backed capture, add --headed true.
```

The native scene's actual framebuffer sample count is recorded once per path. The check requires it to match the enabled target's supported sample request. Raw controls must match the default framebuffer's count. Both paths require nonempty grass, byte-identical repeated renders, zero stationary residual and complete video frame/triplet counts. These assertions verify capture integrity; `qualityPass` stays null.

Actual 0.0.15 software-WebGL A/B capture, High at 640×360, eight frames per route, two-degree pan:

| Counter | Old raw path | Native preset path |
| --- | ---: | ---: |
| Actual scene framebuffer samples | 0 | 4 |
| Stationary residual sparkle | 0 | 0 |
| Repeated identical-state PNGs | identical | identical |
| Decoded frames / temporal triplets | 8 / 6 | 8 / 6 |
| Pan residual sparkle share | 5.68% | 6.45% |
| Motion-alignment coverage | 67.2% | 79.4% |

The residual scores are **not** comparable quality verdicts: post-processing and the valid pixel sets differ. Coverage remains below the play gate's 80% alignment requirement, so neither pan capture establishes a calibrated quality PASS. The correction supplies representative pipeline evidence; it does not fix the game's remaining shimmer or prove that antialiasing alone explains it.

The receipt uses the 0.0.15 renderer with the independent cooperative-validation patch, which does not change the graphics path. Images isolate grass against the scene background and omit other meshes, water composition and gameplay interaction. They are not full gameplay appearance captures. Encoding at 60 Hz is synthetic and does not measure render speed or hardware frame pacing.

Validation: syntax check, six video/shimmer tests, and all native A/B capture assertions pass. Four lossless clips, start/end images and the report are in `grass-native-pipeline-proof/`. The previous raw archive remains explicitly labelled in `GRASS-PAN-CAPTURE.md`.
