# Keep missing source LODs in crown coverage receipts

The live crown-transition tool recorded a missing selected-LOD wood mesh, then dropped that tree from the canopy targets. An empty far-LOD target list was treated as a complete audit. The tool could set `measurementPass: true` despite reporting zero of one registered tree at that level.

Retain every registered tree at every requested source LOD, using null for absent wood or leaves. Let the canopy audit report missing support, and require all three level counts to match the registered population before coverage passes. Ordinary candidate counts remain separate from measurement completeness and visual quality. Neither geometry nor rendering changes.

## Native before/after repro

Run `node tools/repro-crown-source-coverage.mjs --baseline 421d34b --out crown-source-proof`.

| One-tree fixture | Before far-LOD reported trees / measurement pass | After |
| --- | --- | --- |
| Full wood + leaves | 1 / true | 1 / true |
| Leaves without wood | 0 / true (false completeness) | 1 / false |
| No far-LOD wood or leaves | 0 / true (false completeness) | 1 / false |

The 14 transition queries still execute in each case. The fix closes population omission; it does not fix or visually judge the missing geometry. Native rendering stays identical, with no GL error/context loss. [Receipt](proofs/crown-source-coverage/report.json) includes source hashes and per-level counts; [native context](proofs/crown-source-coverage/fixture.png) shows full, leaf-only and absent far models left to right.

The native fixture runs the actual receipt assembly and canopy audit with a deterministic synthetic forest adapter. Its transition packing is fixed; this is not a real forest transition or live-quality PASS. Unit controls cover selected geometry, native/legacy species metadata, missing source models, dropped denominators and empty populations. All 17 selected tooling/canopy tests and production build pass.

For a real build, run the existing live crown-transition command with the updated diagnostic-module server. Do not reuse older `measurementPass` values as proof of full source-LOD coverage when their missing list is nonempty or level counts differ.
