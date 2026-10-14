# Index placement supports only when queried

The placement audit eagerly transformed every triangle of each large support while building its broad phase. Even a prop needing one nearby support paid for distant terrain and trees. The live prop audit exposed how expensive scene-wide preparation can be; this fixture isolates the unnecessary work without claiming a live-scene duration.

Keep the same support bounds and exact triangle ray tests, but install each large support's triangle index only when a footprint probe actually queries it. Release every installed index at the end as before. No scene geometry, placement, rendered pixels or gameplay behavior changes.

The [production-module receipt](proofs/placement-support-index/report.json) uses 100 large supports and probes the origin, grid boundary and a translated support. Every complete audit result has an identical before/after hash.

| Probe x | Vertex transforms before | After |
| ---: | ---: | ---: |
| -0.25 | 615,260 | 7,004 |
| 64 | 615,251 | 6,995 |
| 512 | 615,262 | 7,006 |

These are deterministic work counts, not hardware or gameplay frame times. The regression fails on baseline 421d34b (615,262 versus a 20,000-transform ceiling). All 12 selected audit/index/CLI tests and the production build pass after the change.

```sh
node tools/repro-placement-support-index.mjs --baseline 421d34b --out placement-support-proof.json
npx vitest run tests/presentation/placementAudit.test.ts tests/presentation/verticalSupports.test.ts tests/tooling/placementAuditCli.test.ts
npm run build
```

This is independent of #481's partially unavailable terrain-sample correction. Neither change establishes that the live floating-sign report is fixed.
