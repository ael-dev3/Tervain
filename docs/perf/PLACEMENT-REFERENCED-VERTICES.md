# Audit only vertices referenced by triangles

The prop audit counted unused position data as a separate floating component. The root audit used those same unused points to choose its basal ring: an unused point below the mesh could hide a root floating 0.3 m above terrain.

The audit now excludes components without faces and computes the root sampling bounds from vertices referenced by complete triangles. This changes diagnostic results only; geometry, materials and gameplay are untouched. This does not add draw-range filtering.

## Reproduce

Run `node tools/repro-placement-references.mjs --baseline 421d34b --out placement-reference-proof` after installing dependencies and headless Chrome. It loads both production implementations in a native software-WebGL fixture and asserts the following:

| Fixture | Before | After |
| --- | --- | --- |
| Grounded cube plus unused vertex | 2 components, 1 phantom candidate | 1 component, 0 candidates |
| Root floating 0.3 m plus unused low vertex | 0 candidates, minimum gap −100 m | 1 candidate, minimum gap 0.3 m |
| Clean grounded cube / floating root controls | Correct | Unchanged |

[Receipt](proofs/placement-references/report.json) includes the source hash. [Native context image](proofs/placement-references/fixture.png): the cube is grounded and the cylinder floats; unused points are never drawn. Three regression cases fail on the baseline (including indexed and non-indexed roots). All 18 selected placement/support/CLI/verdict tests pass after the fix; production build passes. Native fixture: 3 draws, 78 triangles, no GL error or context loss.

This is a synthetic correctness repro of the diagnostic API, not proof of a specific live floating tree or prop, nor a frame-time improvement.
