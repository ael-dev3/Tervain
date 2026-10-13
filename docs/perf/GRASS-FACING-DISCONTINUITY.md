# Grass camera-facing discontinuity diagnostic

The compiled grass shader rotates each blade's width axis partly toward the viewer. Its `sign(dot(...) + 1e-4)` switches the chosen facing direction abruptly when the camera crosses that boundary.

[Native receipt](grass-facing-proof/report.json): the tool extracts the expression from the actual build's compiled vertex shader, then evaluates it in an isolated WebGL2 transform-feedback program. This tests shader arithmetic directly, without changing product materials or rendering settings.

Across four blade orientations, a camera-angle change of 0.00002 radians (about 0.00115°) produces a width-basis chord change of about 0.9482, equivalent to about 56.6°. The same pan away from the crossing changes the basis by about 0.0000053. A capture-only continuous-sign control reduces the crossing change to about 0.00036. This control is not a product shader modification or an endorsed visual setting.

This establishes a basis discontinuity that can be investigated during grass pans. It does **not** establish how much of the recorded shimmer it causes, a full-scene pixel result, or a visual-quality PASS. Grass curvature, lighting, antialiasing and projection still need a native moving-clip comparison before a visual fix can be accepted.

## Reproduce

Serve the build and run:

```sh
node tools/check-grass-facing.mjs --url "$TERVAIN_URL" --out grass-facing-proof
```

The diagnostic asserts a large crossing jump and smooth negative/continuous controls at all four orientations. `reproductionPass` means the discontinuity was reproduced; `qualityPass` is deliberately null. A changed source expression requires the diagnostic control to be reviewed. All WebGL reads occur in this diagnostic, never the application's frame path or timing-only gate.

Node/browser-expression syntax checks and the native software-WebGL reproduction pass. The captured grass expression matches main 0b45a36a0; the preview also contained an unrelated hero scratch-object change. For image quality use the native postprocessing capture in #391, recorded clips, and the hardware gate. Live reference: https://ael-dev3.github.io/Tervain/ and [LATEST.md](LATEST.md).
