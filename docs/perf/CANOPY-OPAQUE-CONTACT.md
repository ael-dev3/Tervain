# Keep transparent leaf-card space out of wood contacts

Alpha-aware canopy auditing bounded each triangle's opaque samples, then added that bounding box's centre as a wood-contact sample. That centre need not be opaque. Three isolated opaque tips around a transparent centre could therefore pass as wood-connected when only the invisible centre touched the branch.

Choose the opaque sample nearest the box centre instead. This changes diagnostics only, not trees, textures, materials or rendering. Bounds-based inter-card proximity and the existing finite alpha sampling grid remain approximations; this is not an exact texel-connectivity solver.

## Reproduce and proof

Run `node tools/repro-canopy-opaque-contact.mjs --baseline 421d34b --out canopy-opaque-proof`. It compares the actual baseline and candidate audits in native software WebGL using a cutout data texture.

| Case | Before candidates | After candidates |
| --- | ---: | ---: |
| Three opaque tips; only transparent centre touches wood | 0 (false pass) | 1 |
| Same cutout with wood touching an opaque tip | 0 | 0 |
| Uncut triangle crossing the wood | 0 | 0 |

[Machine receipt](proofs/canopy-opaque-contact/report.json) includes the production source hash, full case counts and render assertions. [Native fixture](proofs/canopy-opaque-contact/fixture.png): left is the detached cutout, middle has a supported tip, right is the solid control. The rendered image is identical before and after auditing (6 draws / 39 triangles; no GL error or context loss).

The regression fails on baseline and passes after the fix. All 34 selected canopy tests and the production build pass. This synthetic API repro demonstrates a false pass; it does not establish a particular live tree's island count or a hardware performance gain. Existing forest population receipts should be rerun before making stronger coverage claims.
