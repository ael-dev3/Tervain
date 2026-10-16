# Reject distant foliage interactions before measuring distance

Repro target: [published 0.0.18](https://ael-dev3.github.io/Tervain/), revision `421d34b`, native oak `tree:wild:40:42`.

The wind vertex program evaluates every selected actor against every tree/plant vertex. Actors outside the interaction box cannot affect the spherical falloff, but previously still executed `length(d)` and `smoothstep`. Reject those cases after the existing vertical squash. Keep the original response inside the box and preserve the existing path for nonpositive radii. Colour, shadow and forest-floor program keys are refreshed because they share this declaration.

## Reproduce

```sh
node tools/repro-live-foliage-mover-distance.mjs --out foliage-mover-proof
node tools/repro-live-foliage-mover-distance.mjs --candidate-ref 421d34b --images 0 --out foliage-mover-control
```

The first command must pass; the unchanged-source control must fail. The script loads the published world, verifies its native wind declaration, then overlays the actual before/candidate declaration. It samples 256 native vertices from each of the oak's wood and leaf parts with their native instance transform and actor uniforms. A separate contact fixture places one actor sphere over a sampled vertex; this must change the pose, retain contact work, and match the original positions exactly after the fix.

Full-forest before/after images use uninstrumented native post rendering, both with zero and active wind. Geometry, sampled GPU positions, pixel comparisons, draw calls and triangle counts are recorded. Instrumentation counts logical GLSL distance calls; it does not measure GPU instructions, frame time, power or physical memory traffic.

## Evidence

[Passing receipt](proofs/foliage-mover-distance/report.json) · [unchanged-source control: FAIL](proofs/foliage-mover-distance/control.json).

| Fixture (256 vertices per part) | Wood before → after | Leaves before → after |
| --- | ---: | ---: |
| Native four actor spheres | 1,024 → 0 | 1,024 → 0 |
| One sphere in contact | 256 → 3 | 256 → 4 |

All four sampled GPU-position hashes match across the change. The contact fixture differs from the native fixture, so this is not a zero-motion-only comparison. Geometry hashes match. Both zero-wind and active-wind full-scene pairs have **0 changed channels**, with 184 draws / 1,166,205 triangles each.

| Wind | Before | After |
| --- | --- | --- |
| Zero | [image](proofs/foliage-mover-distance/before-0.png) | [image](proofs/foliage-mover-distance/after-0.png) |
| Active | [image](proofs/foliage-mover-distance/before-1.png) | [image](proofs/foliage-mover-distance/after-1.png) |

## Validation and limits

46 affected foliage, bark, pine-integration and forest-floor tests pass; production build passes. Hardware/play-gate verification remains pending. This cost reduction does not establish a frame-rate gain or close canopy shape, root contact or grass shimmer issues.
