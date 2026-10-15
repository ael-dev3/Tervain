# Do not retain stale placement PASS receipts

If a placement-audit rerun failed, the CLI left an existing output file untouched. A downstream consumer could mistake that older successful JSON for current evidence. The CLI now removes its previous output before validation or browser work. Successful complete and incomplete reports are still saved, with their existing exit statuses.

The [before/after receipt](proofs/placement-stale-receipt/report.json) runs the actual Node CLI with a controlled CDP adapter. Browser-open failure, unsupported build, audit-query failure, timeout and invalid limits all return exit 1. Before the fix all five retain the seeded old PASS; after it none do. No live browser, rendering or placement result is claimed by this failure-path fixture.

```sh
node tools/repro-placement-stale-receipt.mjs --baseline 421d34b --out placement-stale-proof.json
npx vitest run tests/tooling/placementAuditCli.test.ts
```

The five new regression cases fail on baseline 421d34b; all six tests pass after the fix, including successful complete and incomplete report controls. Tooling only; the production runtime is unchanged.
