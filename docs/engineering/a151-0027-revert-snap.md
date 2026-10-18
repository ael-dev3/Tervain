# A151: 0.0.27, revert the oak clump snap

- 0.0.26 moved oak clumps as whole groups. A same-pose video against 0.0.24 showed a sparser upper crown, and a radius-gated retry still moved triangles above live. This release removes the snap call; the oak canopy matches 0.0.24.
- The shared detached-clump module (src/diagnostics/canopyConnectivity.ts) and its flagged-set test remain on main for the next attempt.
