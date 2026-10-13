# Continue: restored cargo must not undo safe placement

The live 0.0.16 Continue report shows a persistent sky/under-map view. This PR fixes a reproduced restore-height defect, **not a verified explanation of that persistent view**. Ordinary village saves at low/high settings, a saved height 20 m below current terrain, and a genuine 0.0.15 forest save all recover correctly in the controls. Investigation of the reported persistent failure remains open.

`placePlayerForEntry` first resolves a safe current standing/swimming height. It then checks restored physical objects against the old saved height and unconditionally adopts a matching contact. A crate buried beneath current terrain therefore puts the player and rig back below the ground during both graphics preparation and entry. Keep the higher of the resolved safe height and the matching contact. Matching above-ground crates still work; current stairs and swimming height cannot be lowered by this override.

## Native save/reload/Continue evidence

The probe saves at (-7, 45), reloads the page, clicks the actual Continue button, records both entry placements, and checks 61 native simulation samples. A separate stress fixture lowers the saved feet by 2 m and restores `camp_crate_0` with its top at that saved height. This is a deliberately generated old-height/cargo fixture, not the unavailable save from the reported video.

| Measurement | Published 0.0.16 | Candidate |
| --- | ---: | ---: |
| Ground height | 1.919794 m | 1.919794 m |
| First entry placement | -0.080471 m | 1.919794 m |
| Second entry placement | -0.080471 m | 1.919794 m |
| Below-ground entry placements | 2/2 | 0/2 |
| Below-ground playable samples | 0/61 | 0/61 |
| Minimum camera ground clearance in play | 3.812521 m | 3.812521 m |

The first simulation step already repairs this stress fixture on the published build. Consequently the numbers establish an unsafe placement override, but **do not establish that it caused the persistent failure in the video**. Screenshots show the playable view after entry, which already recovers on the baseline.

- [Baseline receipt](proofs/continue-ground/before.json) / [capture](proofs/continue-ground/before.png)
- [Candidate receipt](proofs/continue-ground/after.json) / [capture](proofs/continue-ground/after.png)
- [Passing control summaries](proofs/continue-ground/controls.json)
- [Reported video, frame at 14 seconds](proofs/continue-ground/reported-video-14s.png)
- [Reported menu frame](proofs/continue-ground/reported-video-menu.png), confirming 0.0.16 · 9ab40b3

Run the same compiled-build probe against either build:

```sh
node tools/repro-continue-ground.mjs --url "$BUILD_URL" --out outputs/continue-normal
node tools/repro-continue-ground.mjs --url "$BUILD_URL" --feet-offset -2 --buried-cargo --out outputs/continue-buried
```

Use `--quality high` for the full graphics path. `--seed-url "$OLDER_BUILD_URL" --x -182 --z 14` creates a genuine older-build save, transfers only that generated slot/settings, then continues it on the target build. The probe adds no production hooks: its placement trace wraps the existing method without changing its result. Assertions cover preparation placement, logical feet, rig root, camera clearance and play mode. After rendering it also checks program linking, WebGL errors/context loss and the camera's actual world matrix, to distinguish placement from missing-render failures. The candidate low-preset capture has 90 linked programs, zero graphics errors and the same 3.812521 m rendered-camera clearance. These diagnostics run once in the probe, never in production frame timing. `--headed` uses the host's normal graphics backend for a hardware reproduction.

These captures use Chrome software WebGL at 640×360. Published assets were transported through a certificate-verified HTTPS mirror because the sandbox browser's trust store rejected the public origin; certificate verification was retained. An external sandbox init extends only the graphics-startup deadline. No production timeout changes, hardware timing claim, appearance change or live deployment is included.

Validation: six entry regression cases cover buried/matching/unrelated contacts, absent contacts, stairs and swimming; 40 existing save/player-camera/swimming tests pass; production build/type-check passes.
