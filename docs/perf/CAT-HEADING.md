# Cat movement against displayed heading

Reported on [published 0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/). The delivered tavern cat is `1005232556`.

The straight-line clip calibration is close: its walking reference is 0.140320 m/s and the measured backward stance-joint speed is 0.140323 m/s. Mean absolute residual is 0.000535 m/s across 516 interior stance samples. This paw-joint measurement excludes skin/sole deformation, transitions, turning and slopes; it does not dismiss the observed sliding.

A real controller repro finds a separate mechanical mismatch: navigation yaw reaches the new path before the displayed root finishes its eased turn. The old movement test checks navigation yaw alone. The cat therefore starts translating along one direction while its animated legs still face another.

Wait for the displayed body's heading to meet the existing 0.18-radian turn allowance too. No clip, mesh, gait speed, interpolation constant or material changes.

## Before/after proof

The native fixture loads the delivered cat with its textures, actual terrain and static navigation obstacles. A seeded 2,400-step route gives:

| Metric | Published source | Candidate |
| --- | ---: | ---: |
| Maximum movement/heading error | 26.5425° | 8.1336° |
| Maximum lateral root speed relative to displayed heading | 0.062704 m/s | 0.019853 m/s |
| First movement step | 325 | 333 |
| First movement speed | 0.140320 m/s | 0.140320 m/s |
| Moving steps | 1,760 | 1,760 |
| Draws / triangles in isolated view | 2 / 47,846 | 2 / 47,846 |
| GL errors | 0 | 0 |

[Receipt](proofs/cat-heading/report.json) · [before](proofs/cat-heading/before.png) · [after](proofs/cat-heading/after.png) · [both standing cats' stance calibration](proofs/cat-heading/stance.json).

Screenshots show each controller's first movement, not the same simulation step. The delay lets the existing body turn finish. Lateral root speed is a heading-mismatch measurement, not a direct skinned-sole contact metric. Residual turning/transition/slope foot slip and a matched live video check remain open.

```sh
node tools/repro-cat-heading.mjs artifacts/cat-heading 421d34b
node tools/measure-cat-stance.mjs
npx vitest run tests/presentation/animals.test.ts
npm run build
```

The delivered-model regression fails on published source (0.46325 radians against a 0.18-radian allowance). All 35 animal/controller/hunting-model tests and the production build pass. Software rendering supplies functional proof; no hardware frame-time gain is claimed.
