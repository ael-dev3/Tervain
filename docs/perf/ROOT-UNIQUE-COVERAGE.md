# Root-audit gate: unique population coverage

A root audit can contain the expected number of records while omitting a tree: duplicate another root record in its place. The visual gate previously accepted that report because it checked total root count and candidate flags without checking tree identities.

Require a non-empty, unique root label for every root check before accepting candidate-count comparisons. Reordered unique roots still pass; prop labels are excluded from this root-only check. Candidate thresholds and geometry sampling are unchanged. This does not add a full tree-catalogue identity comparison; it closes the duplicate/anonymous-record blind spot.

## Reproduce against published Pages

```sh
node tools/repro-live-root-unique-coverage.mjs --out root-unique-coverage-proof
```

The script opens [live Pages](https://ael-dev3.github.io/Tervain/) and obtains a real complete root audit. It temporarily replaces one native full-population root target with a copy of another real target, audits again, and restores the adapter in `finally`. The native root audit still reports the expected count and `complete:true`, despite the missing unique tree. The script runs the exact baseline and candidate `rootAuditVerdict` functions used by the visual gate against both raw reports.

This is controlled audit-adapter fault injection. It is not a claim that the normal published adapter already duplicates this tree, or that a particular live root is floating. The original native audit is the positive control. No geometry or rendering changes, and no screenshot or hardware-timing claim, are involved.

Replay exactly the same native inputs with unchanged candidate source:

```sh
node tools/repro-live-root-unique-coverage.mjs --receipt-dir root-unique-coverage-proof --candidate-ref 421d34b --out root-unique-coverage-control
```

That negative control must exit 1 (`pass:false`): the original verdict still accepts the missing unique root, so it cannot satisfy the fixed-gate assertion.

## Validation

Two new regressions fail against baseline source. All **7 root-gate tests** and the production build pass after the fix. Tests also preserve reordered root populations, prop-label independence and existing candidate-count regression checks.

## Published-build receipt

Input **0.0.18 · 421d34b**, Low profile. Controlled substitution: root `tree:wild:54:3` is copied over `tree:wild:47:4` in the audit adapter only.

| Check | Unmodified native audit | Duplicate-record fault |
| --- | ---: | ---: |
| Expected roots | 341 | 341 |
| Root records | 341 | 341 |
| Unique root labels | 341 | 340 |
| Native report complete | true | true |
| Candidate count | 0 | 0 |
| Original gate verdict | PASS | PASS |
| Fixed gate verdict | PASS | Reject: incomplete root coverage |

[Before/after verdicts](../../proofs/root-unique-coverage/report.json) · [raw native audits](../../proofs/root-unique-coverage/native-data.json) · [unchanged-source negative control](../../proofs/root-unique-coverage/unchanged-source-control.json).

The raw native audit's completeness flag remains unchanged in this controlled replay; this patch hardens the visual gate's independent coverage validation. It does not alter root placement, sampling or rendered tree geometry.
