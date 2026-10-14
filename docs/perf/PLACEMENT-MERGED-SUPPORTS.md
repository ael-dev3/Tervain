# Exclude represented static parts from placement support probes

`mergeStaticParts` preserves source meshes for lookups, hides them, and sets `userData.mergedInto` to their visible batch. The placement audit traversed both representations. The hidden originals and their rendered copies could support one another, falsely clearing objects floating 1.5 m above terrain. They also inflated component-check counts.

Skip a hidden source part only when its replacement mesh belongs to the audited scene. Ordinary hidden objects remain in full-population coverage. A removed replacement does not suppress the original. This changes diagnostics, not static batching, object positions, rendering or gameplay.

## Reproduce

Run `node tools/repro-placement-merged-supports.mjs --baseline 421d34b --out placement-merged-proof`. The fixture runs the production static batcher and both audit implementations in native software WebGL.

| Case | Before checks / candidates | After checks / candidates |
| --- | --- | --- |
| Two unmerged floating boxes (control) | 2 / 2 | 2 / 2 |
| Same placement after static batching | 4 / 0 (false pass) | 2 / 2 |
| One grounded, one floating, batched | 4 / 0 (false pass) | 2 / 1 |

The corrected floating gaps are 1.5 m. [Receipt](proofs/placement-merged-supports/report.json) records production source hash and all gaps. [Native context](proofs/placement-merged-supports/fixture.png), left to right, shows those cases. Rendered pixels are identical before/after audits: 5 draws, 74 triangles, no GL error or context loss.

The batching regression fails on baseline. All 18 selected placement/support/CLI/verdict tests and production build pass. Extra controls retain hidden props without an attached replacement and grounded/independently supported batched parts.

This is a diagnostic correctness repro. The production batcher is used for the hunter counter and animal camp, but this fixture does not claim a particular live object was relocated or a hardware performance gain. The expanded full-scene report on #487 predates this correction; its source/component counts include both representations and must not be treated as a count of distinct rendered props. Candidate review and a fresh corrected scan are still needed.
