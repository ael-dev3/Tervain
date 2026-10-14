# Foliage interaction selection storage

Published baseline: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/). This reduces a per-step workload relevant to the open turn/frame-pacing item in [#326](https://github.com/ael-dev3/Tervain/issues/326); it does not establish the cause of the older `live16` missed refreshes.

`WorldScene.setFoliageMovers` mapped every incoming body to a temporary sphere, mapped again to attach distance, filtered, sorted and sliced to six. The candidate keeps six records per world and performs stable bounded insertion as it reads the same inputs. Hero lift, radius/centre arithmetic, the strict 40 m limit, invalid input filtering, equal-distance ordering, terrain sampling and untouched inactive uniform slots retain the existing behavior.

```sh
node tools/repro-foliage-mover-selection.mjs --baseline 421d34b --out foliage-mover-selection-proof
npx vitest run tests/presentation/foliageMovers.test.ts tests/presentation/foliageEngine.test.ts
npm run build
```

The native browser fixture invokes the actual baseline/candidate WorldScene method 600 times with 83 supplied entries (80 moving bodies plus three invalid controls). This is a stress workload, not a claim that every play scene contains 83 nearby bodies.

| Measured work | Before | After |
| --- | ---: | ---: |
| Observed map/filter/slice result array identities | 2,400 | 0 |
| Mapped candidate records / retained candidate slots | 100,200 temporary | 6 retained |
| Changed native RGB channels | — | 0 |
| Draw calls / triangles | 157 / 2,452 | identical |
| Source upload bytes / texture count | 67,580 / 5 | identical |

These counters deliberately exclude array literals, JS engine internals and total heap bytes. They are lower-bound allocation counts, not a GC timing measurement. All 600 uniform snapshots have the same SHA-256. The native floor-plant shader runs through Grade/4×MSAA; disabling interaction changes 1,631 RGB channels, so the image comparison exercises a visible response. WebGL errors are zero; nominal texture payload is unchanged at 1,621,796 bytes.

The unit test compares the original algorithm through 300 movement/population changes, stable ties and invalid focus coordinates. All 16 targeted tests and the production build pass.

[Receipt](proofs/foliage-mover-selection/report.json) · [before](proofs/foliage-mover-selection/before.png) · [after](proofs/foliage-mover-selection/after.png) · [interaction disabled control](proofs/foliage-mover-selection/without-movers.png).

This isolated workload and plant image do not measure whole-world Mac/M5 frame pacing or certify a hardware play-gate PASS. The receipt includes the tested WorldScene source hash.
