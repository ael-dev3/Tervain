# Missing shimmer data must fail

The recorded visual gate previously ignored the analyzer's exit status and treated `score === null` as a pass. Missing footage, decode failure, insufficient frames and stale output could therefore appear green without a measurement.

The committed [two-frame clip](shimmer-gate-proof/short-game.mkv) comes from the actual low-preset SwiftShader production-game pan fixture (640×360, build 0.0.14 / 5d39ea118). It intentionally cannot supply the three frames needed for a shimmer sample. Reproduce the old and new verdicts with:

```sh
git show <baseline-revision>:tools/visual-gate.mjs > baseline-visual-gate.mjs
node tools/repro-shimmer-gate.mjs --clip docs/perf/shimmer-gate-proof/short-game.mkv --baseline-gate baseline-visual-gate.mjs --out repro.json
```

The [receipt](shimmer-gate-proof/repro.json) records decoder exit 1, old verdict `pass: true` with a null score, and new verdict `pass: false` with `analysis-failed`. The script executes the actual baseline verdict expression and patched verdict against the analyzer result from recorded game frames.

The patched gate removes stale receipts before analysis, requires successful decoding, at least three usable samples and at least 80% alignment, and fails missing/invalid metrics or clips. Valid measurements retain the existing five-percent regression ceiling. Without a baseline, a valid first measurement can establish the reference; it does not certify foliage art quality. Error artifacts use structured reasons rather than raw logs or paths.
