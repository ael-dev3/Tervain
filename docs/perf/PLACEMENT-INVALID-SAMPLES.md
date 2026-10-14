# Incomplete terrain footprints must not clear placement checks

The placement audit discarded nonfinite terrain gaps. If even one valid sample remained, it could report `complete: true` and a supported prop or root although part of its footprint had no valid terrain result.

The audit now rejects the entire affected component: `invalid` increases, the report is incomplete, and no supported/unsupported verdict is emitted from the partial footprint. This changes diagnostics only, not placement or appearance.

The [before/after receipt](proofs/placement-invalid-samples/report.json) executes the production TypeScript module through Vite against baseline 421d34b. For both a prop and a basal root ring:

- Partial NaN, positive Infinity and negative Infinity footprints: before `complete: true`, zero invalid components, one cleared check; after `complete: false`, one invalid component, zero cleared checks.
- Fully valid ground remains complete and supported.
- Fully unavailable ground remains incomplete.

This is a synthetic detector regression, not proof of a currently floating live sign or prop. No visual or timing result is claimed.

```sh
node tools/repro-placement-invalid-samples.mjs --baseline 421d34b --out placement-invalid-proof.json
npx vitest run tests/presentation/placementAudit.test.ts tests/presentation/verticalSupports.test.ts tests/tooling/placementAuditCli.test.ts
npm run build
```

Four new regression cases fail on the baseline; all 15 selected tests and the production build pass after the fix.
