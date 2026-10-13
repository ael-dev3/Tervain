# Canopy card basis scratch

The canopy card loop cloned two temporary tangent vectors per card. They are used only while emitting that card's four corners. Reuse two local scratch vectors per builder invocation, keeping arithmetic and random calls unchanged.

Run `node tools/repro-canopy-card-basis.mjs canopy-card-proof.json`. It compares actual original/current builders on controlled leaf/wood geometry, four seeds and near/mid options (19,200 cards total).

Vector clone calls: **124,669 → 86,269**, removing **38,400** per-card clones. All **729,600 position, normal, UV and index elements** match byte for byte. These are clone counts, not total allocations or load-time measurements. Two scratch vectors are allocated once per builder invocation.

[Before/after receipt](canopy-card-proof/report.json). Build/typecheck and seven canopy tests pass. Card/triangle count and all rendered geometry remain unchanged. This shared-builder control is not a benchmark of later crown revisions or evidence that their added load time is fixed. Hardware play-gate receipt remains outstanding.
