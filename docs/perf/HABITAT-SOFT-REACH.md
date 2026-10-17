# Reject soft grass exclusions outside their reach

Published fixture: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/); tracking [playtest checklist](https://github.com/ael-dev3/Tervain/issues/326).

The habitat raster's spatial buckets retain soft-circle candidates beyond each circle's fade. Positive-openness nodes still evaluated their radial distance even when one coordinate alone put the point outside the fade. With the bare-node skip already in the parent, the replay witnesses 2,404 such unnecessary radial checks.

The candidate rejects a circle when either coordinate is more than `hard + 2` away. The original radial fade ends at `hard + 1.8`; the extra 0.2 m keeps the rejection conservative. Surviving circles keep their original order, distance calculation and fade. Other habitat channels and hard collisions are unchanged.

## Matched software receipt

| Check | Parent | Candidate |
| --- | ---: | ---: |
| Soft-circle radial checks | 3,726 | 1,322 |
| Checks beyond the conservative axis reach | 2,404 | 0 |
| Field rectangle checks | 19,960 | 19,960 |
| Raster node evaluations | 10,404 | 10,404 |
| Raster words across 36 tiles | 52,020 | 52,020 |
| Regenerated native grass clumps | 8,172 | 8,172 |
| Draw calls / triangles | 66 / 316,798 | 66 / 316,798 |
| Changed pixel channels versus native | 0 | 0 |

**64.5% fewer radial checks** in this workload. Raster, point-sample and grass-attribute hashes match the independent native-original control exactly. Native counter fields are zero because the original method is not instrumented, not because it performs no work.

[Receipt](proofs/habitat-soft-reach/report.json) · [Failing unchanged-source control](proofs/habitat-soft-reach/control.json) · [Native capture](proofs/habitat-soft-reach/native.png) · [Parent](proofs/habitat-soft-reach/before.png) · [Candidate](proofs/habitat-soft-reach/after.png)

The script loads the published habitat, terrain, exclusions and planted-crown field. It swaps only the raster method, resets its cache, samples 324 points around the fence/run/bow/resume locations, and regenerates existing native grass tiles using their retained native generators. It does not substitute checkout grass placement code. The Low 640×360 capture at (46, 68) uses the native post path.

These are operation counts and deterministic output checks, **not hardware frame times or proof that an over-25 ms stall is fixed**. Grass appearance/pop-in and the hardware play gate remain separate checks.

## Reproduce

```sh
node tools/repro-live-habitat-soft-reach.mjs --out habitat-soft-proof
node tools/repro-live-habitat-soft-reach.mjs --candidate-ref 5615f1d73 --out habitat-soft-control
```

The candidate must pass and the unchanged-source control must fail. Both default to live Pages and software WebGL.

Validation: 25 habitat/grass tests pass, including a regression that fails before the fix on an unnecessary radial call and checks attenuation at/around the 1.8 m fade boundary. Production build/type check and diff checks pass. Hardware play-gate pending.
