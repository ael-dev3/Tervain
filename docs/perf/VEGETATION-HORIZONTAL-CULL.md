# Cull empty horizontal grass bounds

Grass tiles already declare a maximum horizontal shader extent. Their spherical bounds nevertheless extend past that footprint, submitting entire instanced tiles outside the camera view. This matters when turning through dense meadow geometry.

The render callback intersects each original sphere with the known X/Z footprint. It keeps the entire original vertical sphere, evaluates each render camera independently, and restores incoming instance counts after the draw. Temporary counts used for shader preparation survive. Layers without explicit horizontal bounds retain the existing sphere check. No density, geometry, shading or streaming settings change.

## Native before/after

The [receipt](vegetation-horizontal-proof/report.json) and paired screenshots come from the compiled candidate at 640×360, High, software WebGL. The control disables only the additional horizontal guard in the same frozen scene. The build metadata identifies the base revision; the receipt separately identifies the candidate source commit.

| Hero/camera route X/Z, yaw radians | Control triangles | Candidate triangles | Control/candidate draws |
| --- | ---: | ---: | ---: |
| -7 / 45, 0 | 1,571,979 | 1,534,431 | 107 / 106 |
| -7 / 57, 0 | 1,421,070 | 1,343,706 | 94 / 93 |
| -7 / 60.6, 0 | 1,326,859 | 1,326,859 | 91 / 91 |
| 18 / 20, 0 | 1,958,874 | 1,903,854 | 138 / 137 |
| 46 / 68, 0 | 1,563,076 | 1,560,976 | 83 / 82 |
| -7 / 45, 0.8 | 1,858,281 | 1,547,901 | 117 / 112 |

All six PNG pairs are byte-identical. Uploads match: zero on the first five routes, 2,304 bytes on the turned route. The largest saving is 310,380 triangles (16.7%). These are native submitted-geometry counters, not measured hardware execution time or an Apple frame-rate claim.

Turned meadow: [control](vegetation-horizontal-proof/-7-45-0.8-sphere.png), [candidate](vegetation-horizontal-proof/-7-45-0.8-actual.png).

## Reproduce

Build and serve the candidate, then run against its preview URL:

```sh
node tools/repro-vegetation-horizontal-cull.mjs --url "$TERVAIN_URL" --out vegetation-horizontal-proof
```

The script fails unless all images match, uploads match, draws/triangles never increase, and at least one route saves triangles. Optional `--prototype true` evaluates a capture-only conservative 4 m guard against an unpatched build; it is separate from the production evidence above.

Type check, production build and 29 focused tests pass. Tests cover analytic support bounds, sampled points, transformed groups, sphere false positives, changing cameras, restoration and caller-requested temporary counts. Required live hardware gates remain separate: https://ael-dev3.github.io/Tervain/ and [LATEST.md](LATEST.md).
