# Selected-LOD root contact audit

Published 0.0.18 · 421d34b's forest placement adapter always exports near wood. Its app wrapper also calls that adapter without forwarding a requested LOD. A root-contact check can therefore repeat the complete near result while missing different middle/far geometry.

Add optional `lod: 0 | 1 | 2` selection through the app, scene-module adapter and CLI. Default near behavior remains unchanged. The existing expected-root count makes a selected LOD with missing wood incomplete. Report the selected LOD and reject invalid levels. When `--lod` is explicit, the CLI rejects older served builds that do not confirm that LOD in the report.

## Reproduction

```sh
node tools/repro-live-root-lod.mjs --out root-lod-proof
```

Default target: [live Pages](https://ael-dev3.github.io/Tervain/). Replay the actual baseline/candidate forest adapter and app audit-wrapper methods using retained native forest batches. Both use the published core contact detector unchanged, so the comparison isolates population selection and wrapper forwarding. Compare geometry identities and every placement-matrix value with the native canopy LOD inventory. The core detector's new LOD-report metadata/validation and CLI forwarding/older-build rejection have separate tests.

The unchanged-source control adds `--candidate-ref 421d34b` and must exit nonzero because requested middle/far selections still use near geometry. Full-scene post-processing/MSAA pixels must match original native, baseline and candidate captures.

On a build containing this PR, run the served API or CLI for each level:

```js
await window.tervain.auditPlacement({kind: 'root', lod: 2, maxChecks: 100000})
```

```sh
node tools/audit-placement.mjs --kind root --lod 2 --out far-root-audit.json
```

The CLI defaults to live Pages, and correctly rejects current 0.0.18's missing selection confirmation until the change is deployed. Incomplete selected-LOD coverage exits nonzero.

## Matched published-world receipt

[Report](../../proofs/root-lod/report.json) · [unchanged-source control](../../proofs/root-lod/unchanged-source-control.json) · [before](../../proofs/root-lod/before.png) · [after](../../proofs/root-lod/after.png)

| Requested root detail | Baseline actual result | Candidate actual result |
| --- | --- | --- |
| Near (0) | 341 near roots, 0 candidates, complete | Same |
| Middle (1) | 341 near roots, 0 candidates, complete | 341 middle roots, 0 candidates, complete |
| Far (2) | 341 near roots, 0 candidates, complete | 225 far roots, 1 candidate, incomplete: 116 missing wood targets |

Every selected geometry and placement matrix now matches the native LOD inventory. The far candidate is `tree:wild:40:42`, probe centre approximately (-126.82, 0.58, 98.37): three of nine basal samples exceed 8 cm clearance, with maximum gap 0.116855 m. This is separate from the missing-wood deficit; 116 missing targets are not 116 floaters. The near default remains byte-for-byte equivalent in target selection/matrices. Native, baseline and candidate scene pixels are identical; matched scene totals remain 245 draws / 1,889,302 triangles.

The unchanged-source control correctly fails selected-LOD coverage assertions. The new component regression test fails against the original adapter and passes with selection implemented. Validation: 28 tests across forest integration, placement auditing and CLI behavior pass; the CLI test was rerun after adding rejection of older reports. Type-check and production build pass.

## Interpretation

A candidate uses the existing 8 cm / at-least-25%-unsupported basal-ring rule. It is a rest-geometry support candidate, not proof that the whole tree levitates. Missing wood is a coverage deficit, not a count of floating trees. No tree mesh, placement, material, lighting or visual setting changes here; visual repair and recorded confirmation remain separate work. Software rendering is not hardware timing evidence.
