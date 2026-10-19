# Ornamental fern placement-support classification

The prop audit's existing grass/leaf exclusion misses native `forest_floor_fern:` batches. It reports individual fern fronds as floating props and accepts their surfaces as rigid support for other props. The native forest-floor builder explicitly treats these pieces as nonblocking decoration. Extend the existing foliage exclusion to this exact native prefix; timber/log supports remain included.

## Paired published-scene audit

Published **0.0.33 · b317734**, High, frozen after arrival. Original and candidate diagnostics use the same scene, geometry, full supplied populations and native terrain. Candidate diagnostic source is **2c1dc21ea**; hashes and all retained records are attached.

| Metric | Original | Candidate |
| --- | ---: | ---: |
| Prop component checks | 24,607 | 22,983 |
| Directional candidates | 3,944 | 2,931 |
| Fern components classified as props | 1,624 | 0 |
| Fern-frond prop candidates | 1,013 | 0 |
| Retained non-fern checks | 22,983 | 22,983, every record exact |
| Invalid / truncated | 0 / false | 0 / false |
| Skipped oversized meshes | 2 | 2, identical |
| Complete world coverage | false | false |

The existing omissions, `scatter:-3:0:rock` and `village:planks`, remain explicit. This comparison does not establish complete world-placement clearance. Removing fern prop records does not certify fern roots, wind or leaf connectivity, and no authored non-fern prop changed classification in this snapshot.

## Native support witness

A controlled **1×20×1 mm contact marker**, in an isolated diagnostic scene, sits over actual fern variant 0 / instance 0 / triangle 2 near **(17.613, 5.923, -69.611)**. The original diagnostic accepts the fern face 0.0193 m below the marker and clears it. With the fix, the actual terrain gap is 0.25375 m and the marker is flagged. This is a support-classification reproduction, not an authored floating-crate or physical mass test. The marker is never inserted into the game scene.

A separate regression uses a full-size 1 m cargo box with its bottom 0.52 m above terrain and a fern surface 0.02 m underneath it. The original audit incorrectly clears it; the candidate flags it. Renaming the support to the native log category preserves valid support. The new test fails on the original source; 36 placement/forest-floor tests and the production build pass on the candidate.

## Native render controls and cost

Three unchanged-scene renders taken after the paired audits (control/control/restore) have **identical RGB**, **294 draws / 3,287,634 triangles**, High post/MSAA4 and zero console errors. They are scene-stability controls, not visualizations of diagnostic flags or candidate-build motion clips. [Control](before.png) · [comparison](after.png). PNG hashes, including the restore, are in the report.

Application geometry, materials, shader code and texture taps are unchanged. This on-demand diagnostic is outside the normal frame loop; no gameplay FPS, hardware GPU time or laptop-heat improvement is claimed. [Exact-head stock budget: PASS](budget.md). Live and candidate both reached **285 draws / 3,048,306 triangles**, with **zero console errors**. The gate used two live probes and four distinct completed frames per probe, and verified the served candidate revision `2c1dc21ea`.

## Reproduce

From the candidate checkout, with headless software WebGL configured:

```sh
node tools/repro-fern-placement-support.mjs --url "$BUILD_URL" --out artifacts/fern-placement
npx vitest run tests/presentation/placementAudit.test.ts tests/presentation/forestFloor.test.ts
npm run build
```

The full paired scan is CPU-heavy. The tool validates all retained check identities, omissions, the native support witness, render stability and console errors. Raw [original](before.json.gz) / [candidate](after.json.gz) audits retain the known coverage limitations. [Structured receipt](report.json) · [regression result](regression.json).
