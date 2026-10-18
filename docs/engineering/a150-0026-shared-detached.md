# A150: 0.0.26, shared detached-clump rule

- The canopy audit's component graph (component builder, bounds tree, spanning edges, contact search and the far-clump rule) lives in src/diagnostics/canopyConnectivity.ts. The audit and the generator both call it.
- The generator moves each far clump as a whole onto its nearest wood point (90% of the way). No card is removed.
- A test asserts the shared function's flagged set equals the audit's on a fixture (tests/presentation/canopyFlaggedSet.test.ts).
- Canopy audit on this build: oak detached clumps 516 → 508; total 686 → 678 clumps. Detached cards rose (oak 5,368 → 7,487), because clumps moved as whole groups; this is recorded as a known cost.
- Budget gate against live 0.0.25: draws 237 (live 237); triangles 2,858,566 (live 2,860,704); no console errors.
- Same-pose upper-crown still matches the expected dense crown; a woods play clip passes the gate.
