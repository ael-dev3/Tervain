# Canopy gate must check detached clumps

Published 0.0.18 · 421d34b reports whole-crown candidates separately from cards/clumps hanging clear of wood. A crown can remain connected by leaf-to-leaf links while containing distant leaf clumps. The CLI absolute gate checked only whole-crown candidates, and its baseline comparator ignored detached metrics and the wood-reach threshold.

Check detached-card/clump counts in the absolute gate. Baselines compare both metrics per tree, validate their totals, and require the same positive wood-reach threshold. Missing/malformed detached measurements are rejected. An identical or improving nonzero baseline remains valid; this does not demand zero candidates from a deliberately reviewed baseline.

## Published-world witness

[Gate report](../../proofs/canopy-detached-gate/report.json) · [native audit inputs](../../proofs/canopy-detached-gate/native-data.json) · [unchanged-source control](../../proofs/canopy-detached-gate/unchanged-source-control.json) · [before context](../../proofs/canopy-detached-gate/before.png) · [after context](../../proofs/canopy-detached-gate/after.png)

The full native low-quality near-detail cohort contains 341 trees and reports complete coverage. At the default 1.5 m wood reach, it reports **0 whole-crown candidates, 9,766 detached-card candidates and 6,172 detached-clump candidates**. These are geometry-only rest diagnostics, not a count of confirmed visible floaters.

| Actual CLI replay on native inputs | Before | After |
| --- | --- | --- |
| No baseline, default-reach report | PASS / exit 0 | Reject / exit 1 |
| Baseline at 3 m reach vs current 1.5 m reach | PASS / exit 0 | Reject / exit 1 |
| Identical nonzero 1.5 m baseline | PASS / exit 0 | PASS / exit 0 |

The 3 m report has 1,252 detached cards / 557 clumps. Tightening the audit threshold changes those counts without changing any trees. This is an incomparable-configuration witness, **not a before/after visual regression**; the comparator now refuses it and lists per-tree metric increases. Tests separately cover same-parameter regressions, including a newly affected tree hidden by aggregate improvement.

Native endpoint frames remain pixel-identical (245 draws / 1,889,302 triangles). The images are frozen context controls; they do not visually confirm the candidate counts. No game geometry, rendering, placement, shaders or menus change.

## Reproduction

```sh
node tools/repro-live-canopy-detached-gate.mjs --out canopy-detached-proof
node tools/repro-live-canopy-detached-gate.mjs --receipt-dir canopy-detached-proof --candidate-ref 421d34b --out canopy-detached-control
```

The first command defaults to [live Pages](https://ael-dev3.github.io/Tervain/), captures actual native reports and context frames, then replays the actual baseline/candidate CLI and comparator against those reports through a saved-report driver. The second reuses that exact captured input with unchanged gate code and must exit nonzero because the false PASS remains. No geometry is fabricated or moved in the browser.

Validation: 21 comparator/CLI tests and production build pass; four new comparator tests fail on the original code. Clean absolute checks, identity baselines and genuine improvements remain positive controls. Older baselines missing detached metrics need regeneration with matching settings. No hardware timing or visual-repair claim; alpha/mip/wind verification and hardware play-gate receipts remain separate.
