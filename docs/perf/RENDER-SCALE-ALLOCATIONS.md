# Dynamic-resolution window allocation repro

Each resolution sample calculated recent missed-refresh shares using `slice` and `filter`, even after reaching the scale floor. That repeatedly allocated temporary arrays. A reusable 600-entry byte ring with recent/steady counters provides the same window statistics without per-sample array creation or shifting.

```sh
node tools/repro-render-scale-allocations.mjs --url http://127.0.0.1:4173/ --expect before --out before.json
# Build and serve the fixed revision.
node tools/repro-render-scale-allocations.mjs --url http://127.0.0.1:4173/ --expect after --baseline before.json --out after.json
```

The script instantiates the native resolution controller from the built journey and feeds 4,200 deterministic refresh intervals. It instruments only the controller's array and its derived slices, not unrelated application arrays. **8,536 temporary arrays / 1,151,650 element slots → zero**. All six change indices and scale values are exactly preserved. Element slots are not a measured byte total.

[Before receipt](render-scale-proof/before.json) · [After receipt](render-scale-proof/after.json)

Five tests include comparison with the original algorithm across 36,000 samples, wraparound, resets, floors, invalid samples and stalls. Type checking and production build pass. This removes demonstrated allocation churn; it does not establish hardware frame-time or thermal improvement. Resolution thresholds and visual output are unchanged.
