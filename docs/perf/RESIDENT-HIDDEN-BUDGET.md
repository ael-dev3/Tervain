# Check resident hidden-layer work budgets more frequently

The existing published crossing CPU trace includes resident hidden-layer detection and its ray traversal. That staged construction runs beside gameplay. Its clock check used every 256th source index, so expensive work could continue well past the scheduler's allowance; filtered indices could defer checks further.

Count actual budget-check work iterations instead, and check elapsed time every 32. Keep the existing 3 ms allowance and every geometry, ray and hidden-mask calculation unchanged. This is a smaller indivisible scheduling unit, not a complete night-hitch fix.

## Deterministic before/after proof

The [receipt](proofs/resident-hidden-budget/report.json) runs the actual production generator through Vite on two delivered resident meshes, their original skin joints and the default body axis. Both sources receive the same deterministic work clock, forcing an over-budget check at each checkpoint. Instrumentation counts calls to the production budget predicate between generator returns.

| Model | Maximum work calls between returns, before → after | Hidden vertices | Mask bytes |
| --- | ---: | ---: | --- |
| ash-recorder | 260 → 32 | 360 | identical SHA-256 |
| village-baker | 313 → 32 | 2,065 | identical SHA-256 |

Total work calls are identical (51,376 and 69,305). The controlled clock's turn counts are not actual frame counts or load-time measurements. In the game the scheduler can consume multiple inexpensive turns within its allowance. Clock checks become more frequent; overall work is not claimed to decrease.

The regression's controlled elapsed clock exposes too few opportunities to yield on baseline (21 versus at least 96 for its grid). All 21 selected surface/preparation/arrivals tests and the production build pass after the fix.

```sh
node tools/repro-resident-hidden-budget.mjs --baseline 421d34b --out resident-hidden-budget.json
npx vitest run tests/presentation/residentSurface.test.ts tests/presentation/residentRetargetPreparation.test.ts tests/presentation/residentArrivals.test.ts
npm run build
```

[Existing CPU trace and repro context](https://github.com/ael-dev3/Tervain/blob/codex/resident-retarget-frame-budget/docs/perf/RESIDENT-RETARGET-BUDGET.md) (source profile on #470). No direct attribution of a particular night-video frame to this loop is claimed. Setup/welding and an individual expensive ray or triangle can still overrun; this is not a hard 3 ms cap or a hardware play-gate PASS. Appearance and material parameters are unchanged.
