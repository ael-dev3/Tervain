# Two-channel foliage and grass gust texture

Baseline: published **0.0.33 · b317734**. Candidate: **ef1be3460**.

The generated gust field contains variable red (gust) and green (turbulence), with blue fixed at 0 and alpha at 255. Uploading RG8 provides the same sampled vec4: `(r, g, 0, 1)`. The candidate packs those two variable channels during texture construction. The canonical RGBA CPU sampling cache, shader code, filtering, repeat wrapping and wind simulation remain unchanged.

## Scope and costs

Each owned texture's typed-array payload and nominal RG8 texel storage shrink from **65,536 to 32,768 bytes (50%)**. The canonical CPU cache stays at 65,536 bytes. This is not a claim that total application RAM halves, or that the driver's entire physical allocation equals nominal texel storage. There is a small load-time packing loop and no added per-frame update code. Texture count and shader texture instructions do not change.

The probe imports the actual candidate `GrassWind` factory, compares every red/green byte with the retained published field, checks the original constant blue/alpha channels, then swaps only its texture uniform into the native scene. Instrumented WebGL reports the field's nominal storage and the candidate's isolated initial upload. No shader rewriting or geometry editing is used.

## Matched native captures

High preset, native post/MSAA4, 640×360, five dense-forest poses with distinct frozen wind phases and one meadow pose. The report records exact coordinates and times. Both modes are warmed; before/after/restored RGB and draw/triangle counts must match at every pose. This is a controlled pose sequence, not interactive gameplay or a hardware frame-time benchmark. The normal terrain, vegetation, actors, shadows and post processing remain present.

Run `node tools/repro-live-gust-format.mjs --url <published-build-url> --out artifacts/gust-format` with a software-WebGL Chrome configuration.

## Validation

38 focused tests plus build/type check pass. The new exhaustive packing test fails on the original RGBA factory and passes on the candidate. Existing toroidal bilinear CPU sampling controls remain unchanged.

Static detached foliage is still open. No safe geometry repair was established in this pass; this PR does not claim a crown, root, sparkle, FPS or heat fix.

## Completed native results

| Pose | Before/after draws | Before/after triangles | RGB | Restore |
| --- | ---: | ---: | --- | --- |
| [0 before](pose-0-before.png) / [after](pose-0-after.png) | 451 / 451 | 6,081,053 / 6,081,053 | exact | exact |
| [1 before](pose-1-before.png) / [after](pose-1-after.png) | 410 / 410 | 5,946,886 / 5,946,886 | exact | exact |
| [2 before](pose-2-before.png) / [after](pose-2-after.png) | 412 / 412 | 5,996,887 / 5,996,887 | exact | exact |
| [3 before](pose-3-before.png) / [after](pose-3-after.png) | 412 / 412 | 6,006,072 / 6,006,072 | exact | exact |
| [4 before](pose-4-before.png) / [after](pose-4-after.png) | 413 / 413 | 6,006,242 / 6,006,242 | exact | exact |
| [5 before](pose-5-before.png) / [after](pose-5-after.png) | 251 / 251 | 3,041,905 / 3,041,905 | exact | exact |

Zero console errors. Native texture formats are RGBA8 and RG8; instrumented nominal field storage is 65,536 and 32,768 bytes. Candidate isolated initial upload is 32,768 bytes. Full source arrays agree in red/green and original unused channels are exactly blue 0, alpha 255. [Raw report](report.json).

## Exact-head stock budget

[PASS receipt](budget.md): live 285 draws / 3,048,306 triangles; candidate 285 draws / 3,048,306 triangles; zero errors. No increase, no triangle allowance. Source shader and per-frame JS unchanged. This does not measure hardware frame time.
