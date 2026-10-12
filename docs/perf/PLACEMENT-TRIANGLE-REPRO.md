# Large support diagnostic repro

This diagnostic-only optimization partitions large support meshes by world triangle footprint. It keeps Three's exact triangle intersections, transforms, two-sided support material and original face identities. Ordinary gameplay does not build these indices.

Serve the build before this change and then the patched build:

```sh
node tools/placement-audit-repro.mjs --url <baseline-build-url> --large 1 --expect before --out before.json
node tools/placement-audit-repro.mjs --url <patched-build-url> --large 1 --expect after --out after.json
```

The actual compiled placement API audits 200 separated supports, one stacked prop and a 2048-triangle support surface crossing grid boundaries. Both builds must report complete fixture coverage, 201 props and zero floating candidates. [Before](placement-triangle-proof/before.json): 16,528 triangles submitted to exact mesh raycasts. [After](placement-triangle-proof/after.json): 400. These are deterministic diagnostic work counts, not measured GPU transfers or frame timings.

Tests compare hit distances and original face identities for transformed meshes, negative/boundary cells and misses; oblique rays retain the unindexed path. Diagnostic geometries and temporary overrides are released after the audit. No scene art, placements or live collision behavior changes.

The compiled low-preset static snapshot audit completed 22,649 prop components with no skipped/invalid geometry or truncation. Its [summary](placement-triangle-proof/props-summary.json) includes the decompressed report SHA-256; the [full report](placement-triangle-proof/props-complete.json.gz) is gzip-compressed JSON. It flags 2,418 geometric support candidates, including potentially intentional structural/hanging components. These are not confirmed gameplay bugs. Scope remains static scene components plus the full supplied populations; other camera-culling systems without population adapters are not guaranteed complete.

Reproduce the expanded snapshot coverage:

```sh
node tools/audit-placement.mjs --url <build-url> --quality low --defer-render 1 --kind prop --max-checks 100000 --timeout 600000 --out props.json
```

The renderer is paused only in the diagnostic browser. This is a geometry audit, not a frame-time test. Use the bounded browser driver from #365 for long offline requests; preserve its configured evaluation deadline.
