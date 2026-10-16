# Canopy baseline: newly missing foliage

The published canopy gate compares detached-crown candidates per tree. A target with wood but no leaves is deliberately classified as `leafless`, complete, and zero candidates. The baseline comparator ignored that flag, so dropping a previously leafy target's foliage could pass as an improvement.

The fix compares the leafless flag per tree and validates its summary count. A newly bare tree fails; an unchanged intentionally bare tree and restored foliage pass. Keeping the comparison per tree prevents an equal global total from hiding an exchange between trees. There are no rendering or tree-geometry changes.

## Reproduce

Run from the repository:

```sh
node tools/repro-live-canopy-leafless.mjs --out canopy-leafless-proof
```

The script opens [published Pages](https://ael-dev3.github.io/Tervain/), captures its full native near-LOD audit, temporarily drops one real leafy target's `leaves` reference in the audit adapter, audits again, and restores the adapter in `finally`. It then runs the actual baseline and candidate CLI/comparator against those reports using the CLI's existing driver interface. Native reports are retained for inspection.

This is controlled fault injection into the diagnostic adapter, not a claim that the selected live tree is currently missing foliage on screen. It changes no rendered geometry. Screenshots and GPU timing do not validate this report-comparison bug; the evidence is the native flags and CLI exit results.

An unchanged-source negative control can replay exactly those inputs:

```sh
node tools/repro-live-canopy-leafless.mjs --receipt-dir canopy-leafless-proof --candidate-ref 421d34b --out canopy-leafless-control
```

That control must exit 1: the original comparator still accepts the dropped foliage, so it cannot satisfy the proof's fixed-gate assertion.

## Validation

Three new regression tests fail against the original comparator. The focused canopy/baseline suite passes 27 tests after the fix; the production build passes. Positive controls preserve unchanged leafless trees and permit restored foliage. Existing candidate-regression checks remain in force.

This complements #571's detached-card/clump comparisons; it does not replace them. No hardware frame-time or visual-quality claim is made.

## Published-build receipt

Input: **0.0.18 · 421d34b**, 341 near-LOD trees; controlled target `tree:wild:54:3` (pine). Dropping its foliage reference changes components **643,165→642,499** and leafless trees **0→1**, while whole-crown candidates stay **0**. Population and species coverage remain complete.

| Case | Original CLI | Fixed CLI |
| --- | --- | --- |
| One previously leafy target loses foliage | PASS, exit 0 | Reject, exit 1 |
| Identical native baseline | PASS, exit 0 | PASS, exit 0 |

[Native reports](../../proofs/canopy-leafless/native-data.json) · [before/after receipt](../../proofs/canopy-leafless/report.json) · [unchanged-source negative control](../../proofs/canopy-leafless/unchanged-source-control.json) · [#571 comparator control](../../proofs/canopy-leafless/detached-gate-control.json).

The unchanged-source control correctly fails the proof assertion (`pass:false`); it still accepts the omitted foliage. The separate #571 comparator also accepts this omission: detached counts are unchanged. Its detached-count protection and this per-tree foliage check address different failures.
