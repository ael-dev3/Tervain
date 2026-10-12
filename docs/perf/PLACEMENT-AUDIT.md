# Placement audit

Run a build containing the diagnostic, then:

```sh
node tools/audit-placement.mjs --url <build-url> --out placement-audit.json
```

The tool starts the existing capture journey and runs a geometry snapshot check. It does not change placement or run during ordinary play. `--place` chooses the capture start; `--clearance` defaults to 0.08 metres and `--max-checks` to 20000. The loaded build revision is included in the report.

The forest adapter exports the full selected tree population, including camera-culled trees. The furniture adapter exports all loaded room instances, including hidden rooms. Other static scene meshes are checked at their current draw populations. Split-normal vertices are welded and disconnected components of batched prop geometry are checked separately. Animated skeletons, leaf/grass effects, sky, water and contact-shadow cards are excluded from prop candidates.

Prop bottom vertices are tested against terrain and scene triangles. A candidate has no sampled support within the clearance tolerance. Flush stacked supports are accepted; a component cannot support itself. Tree checks sample the outer basal ring and report min/max terrain gaps and the unsupported fraction. A root candidate has at least a quarter of those samples above the tolerance.

Each check has a label, component, world position, sample count and measured gaps. Candidates require review: intentional hanging objects, unusual root geometry, shader deformation and supports not represented by geometry can affect interpretation. This is a geometric diagnostic, not an art-quality score. Confirm candidates in a recorded clip before counting a placement fix as live.

Truncated, oversized or invalid geometry and nonfinite terrain sampling make a report incomplete (exit 2). The root count is compared with the forest's full population. Other camera-culling systems without a population adapter remain outside the full-population guarantee. Exit 0 means the configured audit completed, not that every candidate is a confirmed bug or that the playtest is complete.

For software-renderer checks, use `--quality low --defer-render 1`. This pauses drawing inside the diagnostic browser while deferred populations load and the geometry audit runs, then restores drawing; it is not a performance measurement. The timeout covers readiness and the audit. Incomplete reports must remain failures for coverage. The browser driver from the software WebGL check also bounds protocol requests and cleans up disconnected workers.

Support probes index world X/Z bounds, including individual transformed instances. Large supports remain eligible across cells. This changes diagnostic cost, not placement, support tolerances or candidate interpretation.

To reproduce the support-query cost against a compiled build:

```sh
node tools/placement-audit-repro.mjs --url <build-url> --expect before --out before.json
node tools/placement-audit-repro.mjs --url <patched-build-url> --expect after --out after.json
```

The script uses the served application's actual mesh constructors and placement diagnostic with 200 separated supports plus a stacked prop straddling a grid boundary. Both builds must report 201 props, zero floating candidates and complete coverage of this fixture. [Before](placement-proof/before.json): 1608 mesh raycasts. [After](placement-proof/after.json): 12. These are deterministic diagnostic work counts, not GPU timings. A full populated-world audit still exceeded a 120-second request budget in the software renderer; these fixture receipts do not certify that full audit.
