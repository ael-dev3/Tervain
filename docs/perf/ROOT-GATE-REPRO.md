# Incomplete root audits must fail

The visual gate previously compared root candidate counts without checking whether the audit completed or covered the expected population. A truncated report containing zero candidates could pass even though most trees were never checked.

Serve the production build and reproduce both verdicts:

```sh
git show <baseline-revision>:tools/visual-gate.mjs > baseline-visual-gate.mjs
node tools/repro-root-audit-gate.mjs --url <build-url> --baseline-gate baseline-visual-gate.mjs --out repro.json
```

The [compiled-build receipt](root-gate-proof/repro.json) records a deliberate one-check truncation: one of 341 roots checked, `complete: false`, zero candidates, old verdict PASS. The patched verdict rejects incomplete coverage. Its complete control checks all 341 roots with zero candidates and passes.

The gate requests the full root scope independently of expensive prop-support tests, requires loaded populations, an explicit expected-root count and matching audited counts, and fails missing diagnostics or invalid baselines. Static prop candidates retain their separate informational audit. Explicit `--skip-audit` remains available for diagnostic capture runs; it does not produce root coverage evidence.

This is a gate-validity fix. It does not change tree geometry, placement or art, and does not establish GPU timing or full gameplay coverage. The low-preset build repro pauses rendering only inside the diagnostic browser while populations load.
