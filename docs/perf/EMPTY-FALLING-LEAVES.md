# Skip an entirely discarded falling-leaf batch

When every falling leaf has coverage below the fragment discard cutoff, the mesh still entered the render list. At High, it submitted one draw and 2,560 triangles and re-uploaded 1,024 opacity bytes per warm frame, producing no pixels.

Set the batch visibility from the existing visible-leaf count. Simulation and opacity still update while hidden, and the latest matrices upload when leaves become visible again. The shader, leaf geometry, movement and fade thresholds are unchanged. The world's existing hidden-object shader preparation includes this material.

## Before/after proof

A source-backed native software-WebGL fixture exercises 256 streams through far, far, near, near, far and return states. It prepares the program using the same temporary-visibility approach as the world's hidden-object preparation. All six images match every RGB channel, and every matrix and opacity value matches. All draws report zero WebGL errors.

| Measurement | Original | Changed |
| --- | ---: | ---: |
| Empty warm-frame calls | 1 | 0 |
| Empty warm-frame triangles | 2,560 | 0 |
| Empty warm-frame source uploads | 1,024 B | 0 B |
| Visible warm-frame calls | 1 | 1 |
| Visible warm-frame triangles | 2,560 | 2,560 |
| Visible warm-frame source uploads | 17,408 B | 17,408 B |
| Material textures | 0 | 0 |
| Nominal default WebGL texture payload | 36 B | 36 B |
| Shader programs, including first visible frame | 1 | 1 |

The initial 20,936-byte geometry/instance allocation is deferred until the first visible frame; it is not eliminated. Accordingly that frame uploads 20,936 bytes rather than the original's 17,408-byte update. Later returns use the same 17,408 bytes as before. Payload counters exclude uniforms, driver overhead and framebuffer storage. These are correctness and source-cost counters, not hardware timings.

The regression fails on the original source because an all-discarded batch remains visible. Ten falling-leaf tests and the production build pass with the fix, including hide/reappear behavior.

[Receipt](proofs/empty-falling-leaves/report.json) · [Empty original](proofs/empty-falling-leaves/baseline-1.png) · [Empty changed](proofs/empty-falling-leaves/candidate-1.png) · [Visible original](proofs/empty-falling-leaves/baseline-2.png) · [Visible changed](proofs/empty-falling-leaves/candidate-2.png) · [Return original](proofs/empty-falling-leaves/baseline-5.png) · [Return changed](proofs/empty-falling-leaves/candidate-5.png)

```sh
npx vitest run tests/presentation/fallingLeaves.test.ts
node tools/repro-empty-falling-leaves.mjs --baseline 5da2776 --out empty-falling-proof
npm run build
```
