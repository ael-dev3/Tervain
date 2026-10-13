# Canopy transform validation

The canopy audit converts a world-space gap to local space using one scale. Equal basis-column lengths alone do not establish a uniform transform: equal-length columns may still be sheared, and a matrix may contain projective terms. Accepting these matrices can report complete coverage with invalid distance thresholds.

`node tools/repro-canopy-transform.mjs --out transform-proof.json` compares the baseline audit at `0b45a36` with the corrected validator on controlled geometry:

| Transform | Before | After |
| --- | --- | --- |
| Equal-column-length shear | Complete, zero candidates | Rejected as unsupported |
| Projective bottom row | Complete, zero candidates | Rejected as unsupported |
| Rotation with uniform reflected scale | Complete, zero candidates | Same result |

The validator now requires affine and approximately orthogonal basis columns in addition to its existing uniform-scale check. Rejection prevents unsupported input from producing a coverage receipt. It does not repair or change tree geometry.

[Machine-readable before/after receipt](canopy-transform-proof/report.json). Nine canopy tests, typecheck and build pass. This controlled reproduction does not establish that current authored trees use these transforms. No rendered behavior changes, so image comparisons are not a validation of this fix. Existing bounding-box proximity, sparse surface sampling and alpha limitations remain.
