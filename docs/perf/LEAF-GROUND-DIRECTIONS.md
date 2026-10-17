# Reuse falling-leaf terrain-clearance directions

Published reference: [Pages](https://ael-dev3.github.io/Tervain/), **0.0.18 · 421d34b**. Tracking: [#326](https://github.com/ael-dev3/Tervain/issues/326).

`groundClearance` samples the centre and eight surrounding points to keep a tiny falling leaf above the soil. It recalculated the same eight sine/cosine pairs on every contact-search sample and near-ground update. Prepare those exact pairs once per module and retain the indexed loop. Sampling order, radius, all nine terrain queries and clearance offsets remain unchanged. In particular, do not round the tiny sine/cosine values at right angles to zero.

## Before/after proof

| Measured direction-trig expressions | Baseline | Candidate |
| --- | ---: | ---: |
| Module initialization | 0 | 16 |
| Construction/contact preparation, 77 streams | 61,600 | 0 |
| Controlled landing replay | 320 | 0 |

Thus module initialization plus contact preparation falls **61,600 → 16**, with no repeated direction trig during the recorded updates. This measures source-expression evaluations, not CPU instruction counts or elapsed time.

The complete module uses selected native trees, variants and terrain. Both variants share #618's flight-factor cache; the measured `groundClearance` baseline is checked against published source. All 77 origins match the actual native release origins. Construction metadata—including contact time/position, cycle and terrain ceiling—matches exactly. All 120 recorded complete matrix/opacity buffer pairs match, including camera range exit/re-entry, ten reduced-motion updates and landing.

The clock is deliberately aligned so one seeded leaf approaches landing, then advanced at 1/60 s for 120 updates. This is a deterministic component replay on native inputs, not a natural play trace. The initial zero-delta pose and phase-alignment update are included in the runtime counter. Four post/MSAA image pairs differ in **0 channels**; hidden-leaf controls change **235, 250, 311 and 219 channels**.

| Captured update | Draw calls, both | Triangles, both | Texture count, both |
| --- | ---: | ---: | ---: |
| 0 | 56 | 158,841 | 94 |
| 30 | 58 | 175,225 | 94 |
| 60 | 59 | 182,249 | 94 |
| 119 | 58 | 175,225 | 94 |

The matrix/opacity source-buffer capacity remains **5,236 bytes** per variant; this is not measured upload traffic or texture-memory bytes. The CPU cost is one shared table of eight direction records, with no new per-call object or iterator. No shader, geometry, palette, density, motion rule or terrain sample changes.

[Full counts/hashes](proofs/leaf-ground-directions/report.json). Representative captures (the script emits all four triplets):

- Update 0: [before](proofs/leaf-ground-directions/before-0.png), [after](proofs/leaf-ground-directions/after-0.png), [hidden control](proofs/leaf-ground-directions/empty-0.png).
- Update 119: [before](proofs/leaf-ground-directions/before-119.png), [after](proofs/leaf-ground-directions/after-119.png), [hidden control](proofs/leaf-ground-directions/empty-119.png).

## Reproduce

```sh
node tools/repro-live-leaf-flight-constants.mjs --metric ground --baseline-ref 6b0a1ae72 --out leaf-ground-proof
# Expected failure: identical source must not satisfy the reduction assertions.
node tools/repro-live-leaf-flight-constants.mjs --metric ground --baseline-ref 6b0a1ae72 --candidate-ref 6b0a1ae72 --out leaf-ground-control
npx vitest run tests/presentation/fallingLeaves.test.ts tests/presentation/foliageEngine.test.ts --testTimeout=90000
npm run build
```

The [unchanged-source control](proofs/leaf-ground-directions/unchanged-source.json) retains 61,600 preparation and 320 runtime evaluations on both sides and correctly fails the reduction assertions.

28 falling-leaf/foliage tests and production type-check/build pass. The same reusable script retains its original flight metric; that earlier receipt is pinned to #618's candidate reference.

The sandbox used a temporary verified-HTTPS mirror because Chrome did not trust its HTTPS proxy certificate. Model size/SHA-256 and the game's integrity checks remained active; TLS verification was not disabled. The tool defaults to Pages in normally trusted Chrome environments.

Hardware play-gate remains required. This does not establish a Mac frame-time, heat or FPS improvement, nor close the visible foliage, grass sparkle, pop-in or `live16` missed-refresh reports.
