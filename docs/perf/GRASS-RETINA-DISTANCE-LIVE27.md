# Grass motion: Retina distance buckets, live 0.0.27

Captured compiled **0.0.27 · 163ee68** before Pages advanced. Both datasets below remain on that revision; no cross-release comparison is used. No production shader, grass colour or tree placement was changed.

## Requested strafe and turn

High, browser **1470×956, DPR 2**; native drawing buffer **2205×1434** (the preset cap), screenshot **2940×1912**, post enabled and MSAA4. ANGLE SwiftShader; these are not Apple hardware timings.

25 synthetic 60 Hz poses, spanning **0.4 s**, **1.04 m strafe**, and **−8° to +8° yaw**. Camera at `(6 + 2.6*t, terrain.heightAt(6 + 2.6*t,26) + 1.6, 23)`, looking 80 m along its yaw with a 1.2 m downward offset. Hour 17.5; recorded wind/sky/grade clocks, actors and shadows held. This isolates camera motion, not input locomotion, footsteps or animated wind. World presentation updates with `dt=0`; the native picture passes through Grade/post/MSAA, while App water/interior capture preparation is outside the replay.

Distance labels reuse native `gDist`, the **camera-to-clump-root Euclidean world distance** used by grass rendering. Bands are `[0,20)`, `[20,60)`, `[60,120)` metres, not per-fragment depth estimates. A separate raw MSAA4 geometric-label pass preserves depth/grass geometry and bypasses post. Labels are linearly resampled to screenshot dimensions. A mask hit needs ≥25% grass coverage and ≥80% dominance by one band; uncertain mixtures are reported separately. The “both full” subset needs ≥90% coverage at the same screen pixel in both frames. It does not guarantee the same world blade.

Decoded-RGB luminance uses exact integer coefficients `(2126*R + 7152*G + 722*B)/10000`. **Absolute consecutive change >60** is tested at identical screen coordinates, without motion compensation. These counts include ordinary movement, occlusion and post effects; they are **not a shimmer-only score**.

| Camera-to-root band | Current-frame grass: jumps >60 | Current-frame eligible pairs | Rate | Either-frame grass: jumps >60 | Both frames ≥90% grass | Bright endpoint ≥180, either-frame |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 0-20 | 1,969,209 | 46,113,988 | 4.270% | 2,708,462 | 356,550 | 1,194 |
| 20-60 | 153,523 | 1,526,217 | 10.059% | 246,144 | 5,643 | 208 |
| 60-120 | 8,745 | 92,513 | 9.453% | 16,426 | 38 | 0 |
| ambiguous | 15,399 | 250,869 | 6.138% | 22,658 | 942 | 17 |

The union log also includes departures from grass, assigning the current band where grass is present and otherwise the previous band. It contains **2,993,690 records**, including 22,658 with ambiguous distance mixtures. All three requested strata have nonzero samples: **47,936,284 / 1,582,310 / 93,147** pixel observations respectively. The far result therefore is not a vacuous zero, but its sample area is much smaller.

Only **38 / 16,426** far-band union events retain ≥90% grass coverage in both frames; none has an endpoint ≥180. Most far events involve coverage changes. That supports inspecting geometric edge sampling, but does not establish a faulty mip, culling bug or temporal flicker on the same blade.

Of the 1,419 union events with a bright endpoint ≥180 (including ambiguous bands), the brighter endpoint is ≥90% geometrically grass-covered in **1,290**, partly covered in **9**, and not grass-covered in **120**. **528** retain full grass coverage in both frames. These are geometric labels; post/bloom can still mix neighbouring radiance.

[Short native-resolution clip, slowed 8×](proofs/grass-retina-distance-live27/strafe-turn-8x-slow.mp4) · [Start](proofs/grass-retina-distance-live27/frame-00.png) · [End](proofs/grass-retina-distance-live27/frame-24.png) · [Raw distance-label example](proofs/grass-retina-distance-live27/bins-00.png). The lossy clip is a viewing aid; measurements use lossless PNGs. Red/green/blue in the diagnostic label image mean near/middle/far, not product colours.

## Where the earlier 1,099 bright observations came from

These are the previous **1440×900 @2×** backlit route, not the new Retina path. All 1,099 original coordinates are retained. Cropped, depth-tested MSAA4 labels distinguish grass, sky and other scene surfaces, then align to the original screenshot grid. Normal replays at frames **0, 23 and 60 match the original PNGs exactly**, with zero changed channels.

| Surface assignment | Observations |
| --- | ---: |
| ≥90% grass-covered | 1,029 |
| Mixed grass / other surface | 52 |
| Mostly another surface, admitted by the contribution mask | 18 |
| Sky | 0 |

The 70 non-interior observations lie at the cat/grass overlap (screen X 2446–2589, Y 955–1035); the old mask was a contribution mask, not an ownership guarantee. Actual grass interiors range **180.0316–185.2534** in luminance, with blue only **112–124**. They are warm bright blade tips, not neutral white pixels.

Diagnostic lighting ablations at the three matched poses cover **43 grass-interior observations**: removing sheen leaves all 43 above 180 with **zero luminance change** at those locations; removing the thin-leaf transmission term puts **all 43 below 180**, mean drop **75.8664**. This attributes the sampled brightness to transmission/backlighting, not specular sheen. It is a representative causal check, not an all-frame lighting decomposition.

Both live grass materials are opaque `MeshLambertMaterial` with **no colour map, no alpha map, alphaTest=0, alphaToCoverage=false, opacity=1 and depthWrite=true**. Thus an alpha-texture far-mip path is not an explanation for these blades. The gust texture controls deformation, not colour/alpha. No sky leak is witnessed by the old bright set.

[All locations and RGB values](proofs/grass-retina-distance-live27/locations-1099.json) · [Surface weights and lighting pairs](proofs/grass-retina-distance-live27/attribution.json) · [Transmission-disabled diagnostic, frame 0](proofs/grass-retina-distance-live27/transmission-disabled-frame0.png). Compare that diagnostic only with the [matched normal frame](proofs/grass-live27-walk/start.png); it is not a proposed art change.

The data establish bright transmission and sampling/coverage events, **not a clear non-visual game defect**. No production fix PR follows from this receipt. General motion sparkle remains open.

## Verification and reuse

Inactive instrumentation changes **0 channels**; the stationary Retina repeat changes **0 channels**. All three historical normal references match exactly. Thirteen metric tests and type-check pass. The binary-record verifier reconstructs every event count and all per-frame totals; [collection controls](proofs/grass-retina-distance-live27/collection-controls.json) reject altered totals, nonzero stationary differences, missing strata and truncated event data. These are collection checks, not a visual or hardware performance PASS.

The [per-pixel log](proofs/grass-retina-distance-live27/events.bin.gz) contains every qualifying union event. [Metrics/schema](proofs/grass-retina-distance-live27/metrics.json) define its 18-byte little-endian records, coordinates and luminance units. [Verification](proofs/grass-retina-distance-live27/verification.json) includes bright-endpoint ownership examples; [capture metadata](proofs/grass-retina-distance-live27/capture.json) has all camera poses.

```sh
node tools/capture-grass-retina-distance.mjs --url <pinned-build-url> --phase motion --frames 25 --out <capture>
node tools/analyze-grass-retina-distance.mjs <capture> <metrics>
node tools/verify-grass-retina-events.mjs <metrics>
```

The capture rejects a live version other than 0.0.27. Since Pages has advanced, serve the [pinned source commit](https://github.com/ael-dev3/Tervain/tree/163ee68ee089e59b7cf6902a3e8c6eee837b3e7e) and pass its URL with `--url` for this archived baseline. This is intentional; do not replace the recorded revision using the current `version.json`.

The historical attribution can use the already committed three reference images and stored locations:

```sh
node tools/capture-grass-retina-distance.mjs --url <pinned-build-url> --phase attribution --previous docs/perf/proofs/grass-live27-walk --locations docs/perf/proofs/grass-retina-distance-live27/locations-1099.json --out <attribution-capture>
node tools/analyze-grass-bright-attribution.mjs <attribution-capture> docs/perf/proofs/grass-retina-distance-live27/locations-1099.json docs/perf/proofs/grass-live27-walk <attribution-output.json>
```

To independently reclassify the published 1,099 coordinates without rerendering, run the same attribution analyzer against `docs/perf/proofs/grass-retina-distance-live27`, with `--labels-only`. All 61 small geometric-label crops are included. No game source, tree placement, palette or menu is modified.
