# Reuse camera box rotations

On published [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/), every box test in the continuous camera sweep recalculates the box yaw's sine and cosine. Repeated boom tests during a turn query the same boxes again.

The candidate caches only that rotation, keyed weakly by collider identity. A changed yaw refreshes it. Position, dimensions, active state and vertical bounds are still read on every query; collision formulas and traversal order are unchanged.

## Matched native replay

`tools/repro-live-camera-box-rotations.mjs` uses the published world and native camera, terrain and colliders. It compiles baseline and candidate obstruction helpers plus the unchanged baseline camera rig, then borrows each rig's actual `follow` method onto that native camera. The unmodified published `follow` is a separate control.

At noon on Low, the replay runs 120 fixed 1/60-second follow updates at hero x=-2, z=34.6→39.5 while yaw makes a full turn. Camera reset, pitch, distance, shake and terrain samples are identical. It freezes simulation and compares native Grade/post output, not an isolated collision drawing.

| Measurement | Published / baseline | Candidate |
| --- | ---: | ---: |
| Whole-follow sine/cosine calls, including cold cache fills | 258,398 | 248,506 |
| Camera updates | 120 | 120 |
| Position/quaternion/FOV SHA-256 | `74099843…1ef0aa` | same |
| Native rendered pixels | baseline | identical |

That removes 9,892 repeated trigonometric calls in this replay. The baseline source and published native method also produce identical counts and complete path hashes.

A cloned authored non-square box is additionally queried at four yaw states (including return to the original), after translation/resizing, while inactive, and after raising its lower bound. All seven results match exactly; rotation changes do change the measured contact. The focused regression test independently checks the expected door contact distances.

Receipt: [report](../../proofs/camera-box-rotations/report.json), [before](../../proofs/camera-box-rotations/before.png), [after](../../proofs/camera-box-rotations/after.png).

## Reproduce

```sh
node tools/repro-live-camera-box-rotations.mjs --url https://ael-dev3.github.io/Tervain/ --out camera-box-rotations-proof
npx vitest run tests/presentation/cameraObstruction.test.ts tests/presentation/cameraRig.test.ts
npm run build
```

The repro defaults to software WebGL and fails on changed path hashes, box outcomes or pixels, or if calls do not decrease. The recorded run passed, all 26 focused tests passed, and the production build passed.

These are deterministic CPU-work counts and software-renderer comparisons, not measured hardware frame-time savings, total allocations or an Apple GPU receipt. This does not establish that the historical live16 missed refreshes or night/mud hitch are resolved. A complete candidate-build hardware play gate is still required.
