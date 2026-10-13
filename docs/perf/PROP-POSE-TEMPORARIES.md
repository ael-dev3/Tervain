# Prop-pose temporary records

The live build at https://ael-dev3.github.io/Tervain/ uses `RealmPhysics.poses(false)` to place physical barrels and crates. Both pose modes first constructed a temporary pose and copied its position and rotation, then discarded all three records while constructing the returned pose.

Read the Rapier position and rotation directly during interpolation instead. Keep quaternion normalization, shortest-path blending, accumulator clamping, sleeping flags and independent plain output records unchanged. Fixed-step history capture still uses `poseOf`.

Run `node tools/repro-prop-pose-temporaries.mjs report.json` against this branch. The script loads the original implementation from `0b45a36` and compares both implementations on the same actual Rapier bodies. It advances nine authored props through 240 updates at alternating 120/60/40 Hz intervals and checks both interpolation modes, including output mutation independence.

[Receipt](prop-pose-proof/report.json): 4,320 equal poses; temporary plain records constructed by `poseOf` fall from 12,960 to zero. Rapier-returned objects and final output records remain. These are executed factory counts, not measured heap allocations, GC pauses or hardware frame times. No Mac frame-time improvement is claimed. No rendering or visual behavior changes.

Validation: existing rigid-body physics tests and production build. Hardware play-gate verification remains separate; historical GPU evidence is tracked in [LATEST.md](LATEST.md).
