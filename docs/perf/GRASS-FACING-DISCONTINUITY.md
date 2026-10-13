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

Node/browser-expression syntax checks and the native software-WebGL reproduction pass. The captured grass expression matches main 0b45a36a0; the preview also contained unrelated turn-controller performance changes. The refreshed control uses explicit multiplication for its square, avoiding undefined GLSL `pow` on negative inputs; it was verified with the isolated launcher from #397. For image quality use the native postprocessing capture in #391, recorded clips, and the hardware gate. Live reference: https://ael-dev3.github.io/Tervain/ and [LATEST.md](LATEST.md).

## Isolated native blade pixel reproduction

The [blade receipt](grass-facing-blade-proof/report.json) and eight paired screenshots extend the arithmetic probe to the actual grass material and geometry. The capture selects one existing instance and its complete first blade (seven triangles), extracts its seed/root/facing declarations from the compiled shader, and computes that root through WebGL transform feedback. It freezes the clock/wind and uses cloned world lights without shadow attenuation. The diagnostic camera uses an 18° field of view to magnify the blade; the High postprocessing target is measured at four samples.

Both directions move the camera by the same total 0.00002 radians. Changed pixels have a maximum RGB-channel difference greater than 8/255.

| Material / pan | Changed pixels | Largest channel difference | Foreground pixels before / after |
| --- | ---: | ---: | ---: |
| Native, across the sign boundary | 261 | 120 | 170 / 262 |
| Native, away from the boundary | 0 | 1 | 309 / 309 |
| Continuous capture-only control, crossing | 0 | 1 | 68 / 68 |
| Continuous capture-only control, away | 2 | 31 | 309 / 310 |

Repeated renders match exactly in decoded RGB for every endpoint. The check compares decoded pixels rather than PNG encodings because screenshot compression settings can differ.

Native crossing: [before](grass-facing-blade-proof/native-crossing-before.png), [after](grass-facing-blade-proof/native-crossing-after.png). Continuous control: [before](grass-facing-blade-proof/continuous-crossing-before.png), [after](grass-facing-blade-proof/continuous-crossing-after.png).

This reproduces a visible jump on one native blade, with smooth ordinary-pan controls. The continuous control changes blade orientation and its visible footprint; its lower foreground counts are recorded explicitly. It is **not** an acceptable product fix by itself, a full-scene shimmer score, or evidence that all recorded shimmer comes from this branch. Three's extra double-sided normal flip is already removed by the grass material's `NORMAL_BEGIN`; the measured basis transition remains upstream.

```sh
node tools/capture-grass-facing-blade.mjs --url "$TERVAIN_URL" --out grass-facing-blade-proof
```

Optional `--driver "$TERVAIN_CDP_DRIVER"` selects a driver module for comparison. This capture used the owned-endpoint launcher from #397; build e3b274bca has the same application grass shader as main 0b45a36a0. Node/browser-expression syntax checks and the native reproduction assertions pass. `qualityPass` remains null. No product shader, camera, lighting or art changes are included.
