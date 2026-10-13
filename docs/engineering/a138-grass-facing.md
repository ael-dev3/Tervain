# A138 — continuous grass facing

## Problem

Grass blades lean their across axis 35% toward the side of the view so a blade seen edge-on still shows some width.
The side was chosen with `sign(dot(across, sideEye))`. Where a blade's across axis passes edge-on to the camera the
dot product crosses zero and the sign flips: a camera turn of 0.00002 rad turned the blade's facing by about 57°
(diagnostic: `tools/check-grass-facing.mjs`, from the compiled shader through transform feedback).

## Change

The sideways pull is now scaled by the dot product itself, clamped: `clamp(dot(across, sideEye) * 3.0, -1.0, 1.0)`.
At a third of full side-on the blend is the old one; nearer edge-on it fades to nothing, so facing turns smoothly.
The grass program cache key moved to `v4`.

## Evidence

- Facing diagnostic on the built shader: the basis moves by 0.00003 for a 0.00002 rad turn at all four tested
  facings (it jumped by about 0.95 before).
- Meadow shimmer (visual gate, mac profile, same batch with and without the change, two runs each):
  0.0390 · 0.0373 without, 0.0370 · 0.0361 with. The difference is within run noise.

## Result

The discontinuity is gone, but it was not the main source of the sparkle seen in motion: a flipping blade is edge-on
and covers few pixels. The remaining sparkle is most likely thin blades aliasing as they move; that is the next grass
item and stays open on the playtest issue.
