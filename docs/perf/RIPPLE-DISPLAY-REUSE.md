# Reuse the unchanged ripple display field

The live 0.0.18 ripple path derives a slopes/foam texture on every prepare call, even when the 60 Hz simulation has not ticked and its origin has not moved. The derived texture is unchanged in those calls. This adds one full-target draw with five texture samples per pixel (512² on High).

The change retains that texture between solver ticks. First initialization, recentering and every solver step still refresh it; queued impacts retain their existing fixed-step timing. No shaders, field resolution, wave parameters or visible water behavior change.

## Reproduce and compare

```sh
node tools/repro-live-ripple-display.mjs --out live-ripple-display-proof
node tools/repro-ripple-display.mjs ripple-display-proof
npx vitest run tests/presentation/rippleDisplay.test.ts tests/presentation/waterSurfaces.test.ts
npm run build
```

[Published baseline receipt](../../proofs/ripple-display/live-baseline.json): 0.0.18 · 421d34b, 256² field, draws `[1,2,1,2,1,2,1,2,1,2,1,2]`.

The live tool defaults to https://ael-dev3.github.io/Tervain/. It drives the native medium-quality field at a fixed focus with twelve 1/120 s updates and counts its renderer calls. Use `--expect after` against a served candidate build to assert alternating zero/two draws. This deliberately exposes solver-subtick work; it is not a natural 60 Hz timing trace.

The source comparison uses actual baseline `421d34b` and candidate classes with software WebGL. It runs 48 updates per field: 120 Hz intervals, frozen updates, recentering, queued impacts exceeding one batch, a catch-up interval, invalid dt and ordinary 60 Hz updates. All full RGBA16F display readbacks match after every update. Final diagnostic field images also match; they are not full-game water screenshots.

| Field | Draws / triangles before → after | Source upload bytes before → after | Three-target texture payload |
| --- | ---: | ---: | ---: |
| 64² | 82 → 66 | 0 → 0 | 98,304 B |
| 256² | 82 → 66 | 0 → 0 | 1,572,864 B |
| 512² | 82 → 66 | 0 → 0 | 6,291,456 B |

[Compiled receipt](../../proofs/ripple-display/report.json), [raw per-update traces](../../proofs/ripple-display/traces.json.gz), [before High field preview](../../proofs/ripple-display/before-512.png), [after](../../proofs/ripple-display/after-512.png).

Counters exclude warmup, preview/readback work and uniform uploads. Texture payload is nominal RGBA16F storage, excluding driver overhead. Each saved call removes one triangle and one target-sized derived-field pass. At steady 60 Hz with one solver tick per prepare, there is no draw saving. No hardware GPU timings, M5 frame rate, or claim that the night/mud hitch is fixed follows from this receipt.

The regression test fails on the baseline's first subtick (one redundant draw instead of zero), passes on the candidate, and covers queued impulses, a no-tick recenter, invalid dt, rewarm invalidation and renderer-state restoration. Twelve focused water tests and the production build pass.
