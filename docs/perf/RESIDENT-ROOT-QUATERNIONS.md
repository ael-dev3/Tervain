# Retarget root quaternion reuse

Baseline: published 0.0.18 · 421d34b, https://ael-dev3.github.io/Tervain/.

Every source pose in `retargetClipSteps` allocated an identity quaternion for the root's parent and cloned the root's output quaternion. Neither object escapes the pose. Keep one identity for the clip and copy the root output into the same scratch quaternion already used for child output. The root's cached world rotation remains separate, so hemisphere correction cannot change the children's parent rotation.

```sh
node tools/repro-resident-root-quaternions.mjs resident-root-proof.json 421d34b
```

The repro loads the delivered rig and three motion clips. It instruments the two actual allocation sites in both sources and asserts their counts, unchanged generator turns, and an exact SHA-256 over all output track names, times, values, duration and cycle/hips metadata. The instrumentation exists only in the loader.

| Clip | Source poses | Root temporaries before | After |
| --- | ---: | ---: | ---: |
| walk.quick | 91 | 182 | 1 |
| talk.chat | 156 | 312 | 1 |
| sit.idle.m | 321 | 642 | 1 |
| Total | 568 | 1,136 | 3 |

All three output hashes compare exactly equal. This removes 1,133 quaternion allocations at these sites for these clips. Other retarget allocations remain. [Complete receipt](proofs/resident-root-quaternions/report.json).

Validation: 17 resident seat/retarget/arrival tests and the production build pass. This is an allocation and unchanged-output result, not a hardware frame-time result or proof that the full mud/water hitch is fixed. No asset or animation changes are included.
