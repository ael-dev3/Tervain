# Index compact dense supports during placement checks

The support broad phase uses 16 m cells. Only meshes spanning more than four cells were eligible for triangle indexing, so dense furniture and small terrain supports could be ray-tested in full at every footprint sample. Deferring the wide indexes in #482 did not address this case.

Make dense supports eligible regardless of their broad-phase footprint. Build the index on first use, with cells sized to one eighth of its horizontal world span (at least 0.125 m, at most the broad-phase cell size). Keep exact Three triangle tests, original face identities and cleanup. No placement, geometry or rendered material changes.

## Before/after production-module proof

[Receipt](proofs/compact-placement-supports/report.json), against parent runtime b77cb66f5. The Vite-compiled production audit on a supported-prop fixture reduces actual `Ray.intersectTriangle` calls **131,120 → 2,640**, with an identical complete audit-result hash. Submitted triangle candidates fall 262,240 → 5,280. The fixture also records the extra index construction: total vertex transforms rise 88 → 98,400. These are different work units, not interchangeable time measurements.

Delivered furniture is probed upward/downward at 169 X/Z grid points under rotated and mirrored, nonuniform transforms. Full hit arrays (distance, point, original face index, UV and normal) are identical.

| Model / transform | Actual triangle tests before → after | Index vertex transforms after |
| --- | ---: | ---: |
| table / rotated | 395,766 → 27,798 | 7,337 |
| table / mirrored | 327,362 → 19,122 | 7,337 |
| chair / rotated | 347,074 → 30,744 | 5,729 |
| chair / mirrored | 316,562 → 28,464 | 5,729 |
| bed / rotated | 596,646 → 31,292 | 11,057 |
| bed / mirrored | 493,522 → 26,172 | 11,057 |

The index trades one-time construction and temporary cache storage for fewer subsequent ray tests; released indexes dispose their caches as before. This is diagnostic CPU work, not gameplay FPS or a full-scene speedup claim.

```sh
node tools/repro-compact-placement-supports.mjs --baseline b77cb66f5 --out compact-support-proof.json
npx vitest run tests/presentation/placementAudit.test.ts tests/presentation/verticalSupports.test.ts tests/tooling/placementAuditCli.test.ts
npm run build
```

The new regression fails on the parent runtime (262,240 triangle candidates against a 20,000 ceiling). All 13 selected tests and the production build pass after the fix. Full floating-prop/sign coverage and the night hitch remain open until separately verified. This PR is stacked on #482.

## Native full-scene attempt

[Summary](proofs/compact-placement-supports/full-scene/summary.json) · [compressed raw report](proofs/compact-placement-supports/full-scene/report.json.gz) · [native context](proofs/compact-placement-supports/full-scene/context.png). The compiled 8f249f457 snapshot returned 22,053 prop-component checks and 2,643 directional candidates, with zero invalid components and no truncation. It remains **incomplete**, because `village:planks` exceeded the default 100,000-vertex guard.

The single software-browser audit took 378,189 ms; this is not presented gameplay timing or a controlled full-scene speedup measurement. Prior broad attempts exceeded their request deadline. Hanging, painted and side-supported components among the candidates require review. #487 adds an explicit vertex budget to cover the omitted mesh; neither report should be treated as a placement-quality PASS.
