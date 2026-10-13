# Cold Continue at night: missing opaque geometry

Published 0.0.16 · 9ab40b3 reproduces the reported sky-only/under-map view after saving at night, reloading the page and clicking Continue with High settings. The player is on terrain and the rendered camera is above ground. Shadow-receiving surfaces fail to draw; this reproduction does not require a bad saved position, terrain streaming race or old-save migration.

## Cause and fix

The sun remains a shadow-casting light at night to preserve shader variants. Its intensity fades to zero and `shadow.autoUpdate` stops. A fresh night world consequently has no sun shadow map, although receiving materials still bind a comparison sampler. Three's fallback shadow texture for sampler arrays has no comparison function; drawing a receiver returns WebGL `INVALID_OPERATION` (1282). Unshadowed objects and depth-only foliage silhouettes remain, which makes the view resemble being underneath the map. All 205 programs link successfully: this is a draw-time sampler failure.

Request the sun's first map through `LightShadow.needsUpdate` when it is missing. Also request the renderer's first shadow update before graphics preparation: reflection/window captures pause the renderer's normal updates, so the light request alone cannot initialize the map during those passes. Both requests are consumed once. Existing night intensity, lighting, shader variants, camera placement and subsequent paused shadow updates remain intact.

## Full native Continue proof

The generated save is at (-7, 45), Day 2 around 21:31. The probe reloads the page, clicks the actual Continue button, records entry placement and 61 native simulation samples, and renders through the game's normal presentation/post path at 640×360. Both the published baseline and final candidate create the seed on Low, persist High settings, then test the cold High Continue using the same final probe and save recipe.

| Measurement | Published build | Candidate |
| --- | ---: | ---: |
| Player height / terrain height | 1.919794 / 1.919794 m | 1.919794 / 1.919794 m |
| Below-ground playable samples | 0/61 | 0/61 |
| Minimum camera clearance | 3.812521 m | 3.812521 m |
| Linked programs / failed links | 205 / 0 | 205 / 0 |
| Opaque ground, house and hero | missing | present |
| WebGL error | 1282 | none at startup or checked frame |
| Sun comparison map after Continue | absent, automatic updates paused | initialized, comparison function 515 |

The matched probe records startup errors separately, clears them before its controlled draw, then checks that draw's errors. The published build reports error 1282 in both checks; both lists are empty on the candidate. The isolated baseline below also reproduces error 1282 independently.

- [Published-build receipt](proofs/night-continue/before.json) / [before](proofs/night-continue/before.png)
- [Candidate receipt](proofs/night-continue/after.json) / [after](proofs/night-continue/after.png)
- [Reported video at 14 seconds](proofs/night-continue/reported-video-14s.png)

The candidate receipt records the compiled program filename and SHA-256. Its on-screen revision still identifies the base commit used for this pre-commit production build; the candidate changes are the two initialization requests.

## Isolated sampler and capture proof

Fresh native renderer, sky, receiving floor, geometry, camera and material are identical; only initialization requests differ. The build's own classes are used, without the depth-only shadow wrapper or saved game state.

| Renderer policy | Error | Map | Initial shadow updates | Further updates across 60 night frames |
| --- | --- | --- | ---: | ---: |
| No initialization | 1282 | absent | 0 | — |
| Light requests initialization | none | present | 1 | 0 |
| Capture pauses renderer; only light requests it | 1282 | absent | 0 | — |
| Capture pauses renderer; both request it | none | present | 1 | 0 |

The restored floor changes 12,154 of 16,384 pixels (74.2%, maximum RGB-channel delta >10). The geometry and lighting are unchanged. [Receipt](proofs/night-continue/isolated.json), [missing-map image](proofs/night-continue/isolated-before.png), [initialized image](proofs/night-continue/isolated-after.png), [paused-capture failure](proofs/night-continue/capture-light-only.png), [initialized capture](proofs/night-continue/capture-initialized.png).

```sh
node tools/repro-night-continue.mjs --url "$BUILD_URL" --quality high --seed-quality low --out outputs/night-continue
node tools/repro-night-shadow-map.mjs --url "$BUILD_URL" --out outputs/night-shadow-map
```

The Continue probe has ten deterministic assertions, including player/rig/camera clearance, shadow-map readiness, shader linking, startup errors and controlled-frame errors. The isolated probe has ten assertions, including both capture policies and bounded initialization. `--headed` on the Continue probe uses normal host graphics for a hardware reproduction.

Validation: 52 sky/save/water-render tests pass, including three new cold-night/initialized-night/day-transition cases; production build/type-check and both software-rendered probes pass. Hardware/Mac play-gate validation and live publication remain pending.

Published assets were transported through a certificate-verified HTTPS mirror because the sandbox browser trust store rejected the public origin. Certificate verification stayed enabled. Only the sandbox graphics-startup deadline was extended. These are correctness captures, not hardware frame-time measurements.
