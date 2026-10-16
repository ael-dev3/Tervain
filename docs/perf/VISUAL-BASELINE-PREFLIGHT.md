# A requested visual-gate baseline must load

The visual gate used `existsSync` to turn a requested but missing baseline into `null`. A mistyped reference silently became a run without regression comparisons. JSON `null` and other non-metrics top-level values also reached browser setup without a usable reference.

Read explicitly requested files directly and validate a metrics object with a `checks` object. Missing files, invalid JSON and invalid top-level structures fail before output directories are created or Chrome is launched. Omitting `--baseline` still intentionally starts a reference run. Individual check/measurement validation remains the responsibility of the existing verdict functions; this is structural input validation.

## Reproduce

```sh
node tools/repro-visual-baseline-preflight.mjs --out visual-baseline-preflight-proof
```

The script executes each actual source version's initialization through the point immediately before `openPage`, using real filesystem fixtures and output setup. It stops there deliberately: a missing reference is a CLI preflight bug, independent of the served game's rendering. No browser, game-frame, visual-quality or GPU timing claim is made.

| Input | Original preflight | Fixed preflight |
| --- | --- | --- |
| Explicit missing file | Continue with no reference | Reject |
| JSON null / array / number / boolean / missing checks | Continue | Reject |
| Invalid JSON | Reject | Reject |
| Valid metrics | Continue with reference | Continue with reference |
| Omitted baseline option | Continue without reference | Continue without reference |

Every invalid fixed-source case stops before output creation. The before results demonstrate continuing past preflight, **not a completed full-gate PASS**.

[Before/after receipt](../../proofs/visual-baseline-preflight/report.json) · [unchanged-source negative control](../../proofs/visual-baseline-preflight/unchanged-source-control.json).

```sh
node tools/repro-visual-baseline-preflight.mjs --candidate-ref 421d34b --out visual-baseline-preflight-control
```

This control must exit 1 (`pass:false`): unchanged source still proceeds with the missing/non-metrics reference and cannot satisfy the fixed-preflight assertion.

## Validation

**12 focused tests and production build pass.** Two actual CLI invocations with a missing/null reference assert exit 1 with no output directory; helper tests preserve valid/omitted references and reject malformed data. Existing root/shimmer verdict tests pass. No gameplay, art, menu or renderer changes.
