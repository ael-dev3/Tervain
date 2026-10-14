# Grass mover selection: reuse private storage

The published 0.0.17 code filters movers and slices a new selected-body array on every grass update. Its validation creates a three-number array per input body, and reading the active count creates another filtered array. These short-lived collections recur while walking through grass.

The change reuses private candidate and selected-body buffers, checks the three finite numbers directly, and counts active movers with a loop. It keeps the existing nearest-body ranking, stable ties, 48-body limit, original body references and field-boundary rules. The temporary candidate list releases its references after selection. Shader code, grass settings and draw passes are unchanged.

## Reproduce

```sh
npx vitest run tests/presentation/grassMoverReuse.test.ts tests/presentation/grassEngine.test.ts --testTimeout=90000
node tools/repro-grass-mover-reuse.mjs --baseline 5da2776 --out grass-mover-proof
```

The storage regression test fails on the baseline: 600 distinct selected arrays instead of one. The source-backed software-WebGL fixture runs the original and candidate trample code with 83 mover inputs, including invalid bodies, over 600 updates. The original input order is retained; nearest selections and active-body counts are compared on every update.

| Measurement | Before | After |
| --- | ---: | ---: |
| Distinct selected-body arrays | 600 | 1 |
| Updates | 600 | 600 |
| Draw calls | 301 | 301 |
| Triangles | 302 | 302 |
| WebGL draw errors | 0 | 0 |

All 28,800 selected body indices and all 600 active counts match. The final nonempty 32×32 half-float field matches in all 4,096 stored channels; displayed images match exactly. These are storage identity and correctness measurements, not total heap or hardware frame-time measurements.

[Receipt](proofs/grass-mover-selection/report.json) · [Before](proofs/grass-mover-selection/before.png) · [After](proofs/grass-mover-selection/after.png)
