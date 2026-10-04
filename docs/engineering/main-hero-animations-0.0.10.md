# Wanderer animation integration — 0.0.10

The owner supplied **Meshy_AI_The_Weathered_Wandere_All_Animations.glb** on 4 October 2026 and requested that the game use its new motions and fit walking/running speed to them, within **0.0.10** ([A45](../decisions.md)). This replaces the older A37 runtime rig; protagonist identity, unarmed arrival, equipment/inventory, existing world contact and save restoration remain. Residents and the menu warden are unchanged.

## Source and preparation

The unchanged supplied GLB is 14,350,916 bytes, SHA-256 `82370608d175ca623a85a8eae1963726de82ef711a74db1e3e518cba83e1a1f1`. It has 130,530 triangles, one material/skin and 66 Mixamo joints. An offline Blender reduction and direct GLB repack produce the **65,000-triangle / 39,622-vertex**, 11,900,048-byte runtime [model](../../public/models/hero/weathered-wanderer-animated-hero.glb). The [asset record](main-hero-animations-assets.json) supplies exact derivative statistics/hashes and preparation evidence. All six original clips and embedded PBR JPEG payloads are retained; the source file is not edited. The derivative uniformly normalizes the source's 1.7000003 m height to 1.899 m, scaling geometry, node/animation translations and inverse-bind translations together. Quaternion/time tracks are not resampled. All 396 quaternion channels and the JPEG payloads remain byte-identical; translation rounding is below 0.00000006 m. Four collapsed finger vertices use nearest original bindings (0.894–3.744 mm away) to avoid excessive four-weight truncation. An independent Blender re-import compared 18 start/mid/end clip poses; the largest animated-bound difference from the scaled full source was 3.465 mm, which is a bounds comparison rather than a pointwise surface-error guarantee.

| Preserved clip | Duration | Runtime selection |
| --- | ---: | --- |
| Walking | 1.041667 s | Grounded walking cycle |
| Running | 0.666667 s | Grounded sprint cycle |
| Casual_Walk | 4.208333 s | Preserved alternate source motion; not a default loop |
| Run_03 | 0.833333 s | Preserved alternate source motion; not a default loop |
| Boxing_Practice | 6.833333 s | Preserved training motion; not idle or a single combat hit |
| Dead | 3.000000 s | Once, then held at its final pose |

The source has no dedicated idle, jump, dodge, blade attack or guard clip. A derived relaxed idle with restrained breathing and runtime action poses provide those states; they must not be described as extra imported animations. Boxing_Practice moves more than a metre laterally and contains multiple blows, so it is not used as an ordinary attack. Dead's authored fall is used without the older controller's extra 90-degree body topple. A bounded visual support correction prevents boot-floor sinking during its initial crossfade, and an 8.978 cm source-clearance offset settles the final body onto the floor; these corrections move the visual pivot, preserving source local bone curves and the gameplay collider. Reset clears the pivot offset.

## Stride calibration and movement authority

The audit measures skinned boot soles from source animation samples and scales them to the integrated height. Walking/Running are in-place: hip endpoint drift is below 0.00000013 m at source scale, with ankle loop errors below 0.0000004 m. Neither supplies a forward root-motion speed. Natural speed is **inferred** from the backward motion of low stance-sole vertices, rather than read from authored metadata.

| Clean cycle | Left / right median low-sole speed at 1.899 m | Chosen controller speed | Distance per full cycle | Footfall cadence at full speed |
| --- | ---: | ---: | ---: | ---: |
| Walking | 1.636 / 1.647 m/s | **1.65 m/s** | 1.71875 m | 1.92 / s |
| Running | 5.737 / 5.993 m/s | **5.85 m/s** | 3.90 m | 3.00 / s |

The old 3.5 m/s walking controller would outrun this walk's stride by about 2.13 times. `hero/locomotion.ts` shares the calibrated metre-scale speeds and cycle distances between the player and animation adapter. Sprint still requires the existing input/stamina conditions; guard movement is 65% of walking speed. Existing backward/input magnitude scaling, acceleration, gravity, slopes, jumps, collision, cargo and save behavior remain.

The world controller is the sole authority for travel and heading. Authored lower-body curves replace the old synthetic two-bone locomotion solver. Resolved distance advances gait phase; collision stops do not animate a treadmill. Smooth walk/run blending preserves phase during acceleration/deceleration. Animation root translation cannot move the gameplay collider. Footstep audio follows visible contact events and is suppressed while stopped/airborne. Teleports/restarts discard gait distance and action offsets. Equipment uses fitted Mixamo hand/hip sockets rather than the old rig's assumed local axes.

## Review and evidence

The rotatable development view at `tools/hero-motion-preview.html` uses the game's actual rig/adapter, dynamic triangle/joint counts, calibrated moving-ground speeds, and controls for idle/walk/sprint/actions/airborne/death and equipment. It is a development review tool, not a separate production game or video request.

Preparation, real-GLB animation/controller tests, complete local typecheck/tests/build, targeted native preview/game observations and final-source publication evidence are distinct gates. The earlier 881-test woodland/physics result belongs to the already published 0.0.10 baseline; it does not validate this follow-up. Final results are recorded here after validation and in the local animation delivery report. No benchmark, minimum hardware specification or Steam packaging is inferred from these checks.

Reproduce with the supplied source and recorded Blender version:

```sh
Blender --background --factory-startup --python tools/prepare-animated-hero.py -- --source /path/to/owner-supplied.glb --workshop /path/to/workshop --output public/models/hero/weathered-wanderer-animated-hero.glb
python3 tools/prepare-animated-hero.py --check
```

The check works without Blender or the Desktop source, verifying the exact shipped hash, triangle/skin/clip contract, native JPEG hashes and normalized geometry/weights. The complete local reproduction was byte-identical.

## Final local acceptance

The current follow-up passes strict TypeScript and **881 tests in 84 files (27.79 s)**, including 11 tests against the actual delivered GLB. The suite verifies native leg/arm sampling, phase/footfall consistency at 30/60/120 Hz, stopped/airborne travel, stable idle/death sampling, grounded death transition/final pose, guard legs, equipment/grip, reset and world-root invariance. Existing route/camera tests retain distance/contact assertions with travel time adjusted to the calibrated walk. Asset hash/JPEG/skin checks and all 854 relative documentation targets pass.

The fresh final preview additionally confirmed the grounded clamped death pose with no warnings/errors. Native desktop review used the rotatable actual-rig view for walk, sprint, idle, sword guard and death; a production-build High woodland view confirmed the new hero and a keyboard jump, landing and stamina recovery. The fresh game tab reported no runtime warnings/errors. Historical startup errors from an unfinished intermediate preview are excluded from final-source acceptance. The final production build passes (main bundle 5,301.59 kB minified / 2,042.78 kB gzip; existing large-chunk advisory remains). Post-deployment source/asset verification is a separate gate; exact output and publication IDs are retained in the local `outputs/tervain-0.0.10-animations` delivery evidence. No newly verified physical gamepad, save round-trip or reference-PC benchmark is claimed by this native review.
