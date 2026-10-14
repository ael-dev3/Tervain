# Budget large merged props explicitly

The broad village prop scan on 0.0.18 geometry returned 22,053 component checks but remained incomplete: `village:planks` exceeded the fixed 100,000-vertex limit. The limit could not be raised, so the scan could not cover this merged mesh.

Add an explicit `maxVertices` budget to the production audit and `--max-vertices` to its CLI. The default limit is retained; skipped geometry still makes coverage incomplete. Explicit limits must be positive safe integers and are echoed in the report. The CLI rejects a build that does not acknowledge the requested limit.

## Before/after proof

The [production-module receipt](proofs/placement-vertex-budget/report.json) uses a 101,424-vertex merged mesh with one grounded and one floating component. Before, an explicit 200,000 limit is ignored and the mesh is skipped. After, the report acknowledges the limit, scans both components and detects the floating one. The default-run report hash is identical before/after and still marks the skipped mesh incomplete.

Six new source regressions fail on parent 8f249f457. All 20 selected audit/index/CLI tests and the production build pass. CLI tests verify forwarding and reject missing budget acknowledgement.

```sh
node tools/repro-placement-vertex-budget.mjs --baseline 8f249f457 --out placement-vertex-budget.json
npx vitest run tests/presentation/placementAudit.test.ts tests/presentation/verticalSupports.test.ts tests/tooling/placementAuditCli.test.ts
npm run build
node tools/audit-placement.mjs --url https://ael-dev3.github.io/Tervain/ --kind prop --max-checks 50000 --max-vertices 1000000 --timeout 1200000 --out full-prop-audit.json
```

The final command requires a build containing this option; older builds are rejected. Choose the vertex limit to cover the observed geometry rather than treating an incomplete report as a pass. A complete component scan is not proof that all candidates are floating: side-mounted, painted and hanging components require contact review. No production placement or appearance changes. Stacked on #485.
