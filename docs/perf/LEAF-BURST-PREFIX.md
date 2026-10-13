# Stop submitting empty struck-leaf slots

A standard tree strike releases ten leaves, but the leaf pool drew all 48 slots and uploaded all 48 matrices every active update. The unused tail consists of zero-scale transforms. Keep the same simulation and matrix writes, set the draw count to the slot after the last living leaf, and upload only that prefix. This is a draw/upload reduction; it does not compact or reorder leaves.

Using the number of living leaves as the draw count would be wrong when lower slots expire before higher ones. The implementation tracks the highest live slot; tests expire the first ten while slots 10–19 remain aloft, then refill lower slots.

## Native before/after proof

Baseline `0b45a36`. The reusable fixture calls the production leaf module with a standard ten-leaf release, fixed seed, flat ground and the production material. It advances 121 poses and instruments actual WebGL calls only for that instance-matrix array. The renderer's triangle counter includes both transparent double-sided passes.

| Measurement | Before | After |
| --- | ---: | ---: |
| Submitted triangles/frame | 384 | 80 |
| Upload bytes, including first allocation | 371,712 | 79,872 |
| Moving-frame matrix upload | 3,072 bytes | 640 bytes |
| Changed full-pool matrix words | — | 0 |
| Changed RGB pixels across four captures | — | 0 |

Moving uploads and triangles fall 79%. The initial buffer allocation remains the same 3,072 bytes; partial update ranges affect subsequent uploads. All 48 CPU matrix slots are compared every step, so the unused tail is checked too. This is software WebGL, not hardware frame timing. No leaf shape, motion, colour, material, randomness or release policy changes.

[Receipt and source hash](leaf-prefix-proof/report.json). Re-run:

```sh
node tools/repro-leaf-prefix.mjs --baseline 0b45a36 --out leaf-prefix-proof
npx vitest run tests/presentation/leafBurstIdle.test.ts tests/presentation/foliageEngine.test.ts
npm run build
```

The script accepts `--driver` for another CDP launcher. It reads the baseline module from Git without switching the checkout, starts a temporary Vite server, and fails on any matrix/pixel difference or no reduction in upload bytes/triangles. 18 focused tests and typecheck pass.

| Before | After |
| --- | --- |
| ![Before](leaf-prefix-proof/before.png) | ![After](leaf-prefix-proof/after.png) |

This leaf-pool reduction is bounded. It does not attribute the tracked 32 ms bow frames or the roughly 700 MiB whole-run upload total. Full-world/hardware integration checks remain required.
