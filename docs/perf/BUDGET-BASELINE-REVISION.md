# Reject mixed-revision budget baselines

The CLI probes the published build twice and uses the larger draw/triangle budget. Before this fix, it retained the first revision without checking the second. A deployment between probes could therefore approve a candidate against an obsolete larger budget.

The regression runs the real CLI with a controlled browser/CDP fixture. These are synthetic counters and revisions, not a hardware or live-site receipt:

| Probe | Revision | Draws | Triangles |
| --- | --- | ---: | ---: |
| First baseline | 1111111 | 285 | 3,061,335 |
| Second baseline | 2222222 | 226 | 2,414,180 |
| Candidate | 3333333 | 285 | 3,061,335 |

Original producer exits 0 despite the candidate exceeding the second published baseline. The guard exits 1 before candidate evaluation, requesting a retry against one revision. Same-revision count spread still passes using the maximum. Missing/invalid baseline revisions also fail closed.

[Controlled results and producer hashes](proofs/budget-baseline-revision/controlled-repro.json). The paired fixture additionally uses the byte-verified #678 completed-frame sampler and #673 startup correction; only the new revision guard differs. The checked-in regression is `tests/tooling/budgetBaselineRevision.test.ts` and runs eleven CLI scenarios, including existing draw, triangle, console-error and head-mismatch rejection. Original code fails the changed-revision scenario. Candidate passes all scenarios, the focused tooling suite, type-check and production build.

Application code, draws, triangles, shader taps, uploads and ordinary-frame JS are unchanged: this adds one identity check to the Node gate orchestrator. No image change is possible from this code. A separate native software-renderer budget check is pending on compiled head `8699ac2e0ac2baa54c5c87a5ee532ff1b2591ef9`; no native PASS is claimed here yet.
