# Retarget output copies without temporary arrays

The [published shallow-channel CPU profile in #470](https://github.com/ael-dev3/Tervain/pull/470) contains resident preparation and garbage collection. Retargeting currently creates a temporary number array for every quaternion and hips-position output, then immediately copies it into an existing typed array. Write through the existing vector/quaternion `toArray` methods instead.

The delivered ash-recorder rig and three delivered clips give:

| Clip | Temporary typed-copy input arrays, before → after | Output |
| --- | ---: | --- |
| walk.quick | 2,093 → 0 | byte-identical |
| talk.chat | 3,588 → 0 | byte-identical |
| sit.idle.m | 7,383 → 0 | byte-identical |
| Total | **13,064 → 0** | all hashes identical |

[Receipt](proofs/resident-retarget-arrays/report.json). The fixture observes real number-array inputs to `Float32Array.set`, comparing the published source with the candidate. Hashes cover track names, every time/value byte and cycle/hips metadata. Other allocations remain. Diagnostic wall times are included but are noisy (the candidate's worst walk turn is higher); no frame-time improvement or full resolution of the recorded crossing hitch is claimed.

```sh
node tools/repro-resident-retarget-arrays.mjs artifacts/retarget-arrays.json 421d34b
npx vitest run tests/presentation/residentRetargetPreparation.test.ts tests/presentation/residentArrivals.test.ts
npm run build
```

Fifteen preparation/arrivals tests and production build pass. This changes neither animation samples nor yield cadence and can apply independently of the smaller-turn scheduling change in #470.
