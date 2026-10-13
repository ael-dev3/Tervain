# Rest-pose crown neighbourhood audit

The root placement check cannot detect a detached crown. The new opt-in `auditCanopies` diagnostic checks the registered forest's full near-source geometry, independent of camera visibility and current LOD. It does not change rendering or run in the frame loop.

Reproduce against a served production build:

```sh
node tools/audit-canopy.mjs --url http://127.0.0.1:4173/ --repro true --out canopy-audit.json --shot detached.png --restored-shot restored.png
```

The committed SwiftShader receipt covers 341 trees and 665,643 welded triangle components. The baseline has zero candidates and uses 8,540,370 charged checks within the default 20-million-check limit. Exhaustion, malformed geometry and incomplete population coverage fail instead of returning a successful partial audit. The default gate also fails if any candidates are found; `--baseline receipt.json` permits only a complete, matching-population/gap baseline with no increase in candidates.

The repro temporarily moves an actual shared crown geometry beyond its wood envelope. Both diagnostics inspect that same changed source: the root-only candidate count remains zero, while the crown check finds 33 candidates, including the selected native tree. Restoring the source returns the count to zero. Shared geometry means several trees change together. Screenshots isolate a native tree with cloned stock materials for a clear detached/restored comparison; they are not gameplay lighting or animated-wind comparisons.

## Scope

Triangle connectivity welds split-normal vertices and ignores unreferenced vertices. A spatial minimum-spanning forest connects component bounds within the configured world-space gap (default 0.75 m). Sampled component points test proximity to wood triangles through a bounded spatial hierarchy. Features are reused across uniformly scaled instances.

These are geometric **candidates**, not an alpha-aware visual judgement. Overlapping bounds can bridge cards whose visible opaque portions are separate. Samples can miss a wood contact. Alpha masks, wind deformation, occlusion and perceived silhouettes are excluded. Zero candidates does not prove every visible crown is attached. Review candidates alongside recorded movement clips.

Validation: eight focused tests, TypeScript checking, production build, and the actual-build defect/restoration script. The JSON receipt and software-rendered images are in `canopy-proof/`. No hardware frame-time claim is made.
