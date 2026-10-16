# Root baseline: do not hide a newly affected tree

A global candidate-count comparison accepts one supported root becoming unsupported when another root improves. The total can remain equal or decrease. Record every candidate tree label in the visual-gate metrics and reject candidates absent from the reference set.

The displayed worst-eight list remains a display, not a coverage source. The baseline label list is validated for non-empty unique identities and agreement with its candidate count. Root placement, geometric sampling, clearance and rendering are unchanged. This complements #574's unique-population validation.

## Reproduce

```sh
node tools/repro-live-root-baseline-regression.mjs --out root-baseline-regression-proof
```

The script defaults to [published Pages](https://ael-dev3.github.io/Tervain/). In the native audit adapter only, lift one real root's matrix 2 m for the reference audit, restore it, and lift another for the current audit. Retain all tree labels and records. A final unmodified audit is the improvement/zero-baseline control. The adapter is restored in `finally`. Exact baseline and candidate gate functions evaluate the retained raw native reports.

This is controlled diagnostic fault injection, not a claim either live tree is currently floating. Rendered trees and terrain are untouched. Screenshots and hardware timing do not establish this report-comparison bug.

Replay the exact inputs with original candidate source:

```sh
node tools/repro-live-root-baseline-regression.mjs --receipt-dir root-baseline-regression-proof --candidate-ref 421d34b --out root-baseline-regression-control
```

That negative control must exit 1 (`pass:false`): unchanged code still accepts the exchanged root and fails the fixed-gate assertion.

## Published-build receipt

Input **0.0.18 · 421d34b**; every audit is complete with **341 root records**.

| Case | Candidate roots | Original verdict | Fixed verdict |
| --- | --- | --- | --- |
| Reference root lifted | `tree:wild:54:3` | PASS | PASS |
| Reference restored, another root lifted | `tree:wild:47:4` | PASS | Reject: new root candidate |
| Unmodified native roots | none | PASS | PASS |

The exchanged audits each have exactly **one candidate**, so the aggregate-only check cannot distinguish them. Identity and genuine improvement controls still pass.

[Before/after verdicts](../../proofs/root-candidate-baseline/report.json) · [raw native audits](../../proofs/root-candidate-baseline/native-data.json) · [unchanged-source control](../../proofs/root-candidate-baseline/unchanged-source-control.json).

## Baseline compatibility and validation

The visual gate now supplies candidate identities explicitly. Existing zero-candidate references safely use an empty set. **Positive legacy references without the full `rootCandidateLabels` list must be recaptured**; the gate fails with `invalid-baseline`, rather than inventing identities from the truncated worst-eight display. A loaded baseline object without placement data also fails. Two-argument count-only library calls remain compatible for historical diagnostic helpers; the visual-gate caller always supplies the explicit third argument when a baseline is requested.

Two new regression cases fail on original source. **11 focused tests and production build pass**. Tests execute the actual visual-gate block against original/fixed verdict functions, verify all ten candidate labels survive an eight-item display limit, and cover zero/positive legacy references. No visual-quality, power or hardware frame-time claim is made.

CI follow-up: the regression test now loads the exact legacy gate block/verdict from a checked-in fixture with its source revision/hash, so a shallow checkout needs no historical Git object. The 11-test suite and build pass; all four gate-block tests also pass with Git object history deliberately unavailable. The original `git show` fails in that same control environment. Native receipts remain applicable because gate logic is unchanged.
