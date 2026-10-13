# Empty tree-strike leaf pool work

The struck-tree leaf pool updated all 48 matrices and dirtied its attribute every simulation step, even with no active leaves. It also read `GrassWind.direction`, whose getter constructs a fresh two-element tuple on each read.

An idle guard skips this work while preserving releases pending between simulation steps. The release policy still follows reduced-motion settings while idle. A new release is presented even with zero dt; expiry clears the pool before idle updates are skipped. Geometry, material and live-leaf animation are unchanged.

## Built-game repro

```sh
node tools/repro-idle-leaf-burst.mjs --url http://127.0.0.1:4173/ --expect before --out leaves-before
node tools/repro-idle-leaf-burst.mjs --url http://127.0.0.1:4173/ --expect after --out leaves-after
```

Serve the original production build for the first command, then the changed production build for the second. Chromium with software WebGL is sufficient. The script calls the native forest module, instruments the real pool's `setMatrixAt` and the shared wind getter, strikes a registered native tree, and verifies release, expiry and another idle period.

| Each 120-frame idle sample | Original | Changed |
| --- | ---: | ---: |
| Matrix writes | 5,760 | 0 |
| Attribute-version increments | 120 | 0 |
| Wind-direction reads / fresh tuple arrays | 120 | 0 |
| Active leaves / submitted pool count | 0 / 0 | 0 / 0 |

Both the initial and post-expiry samples give these results. The native strike is accepted and emits four leaves on both builds; both expire after 454 steps of 0.1 s. Reduced-motion, pending zero-dt releases and pool reuse are also tested directly. The committed screenshot shows the native tree context; it is not a before/after appearance comparison.

This removes CPU matrix copying and allocations in an empty effect. It is not a measured frame-time, heat or GPU-upload reduction: the empty pool already submits no instances. Counts are specific to this effect, not the entire scene. JSON receipts and the context screenshot are in `idle-leaf-burst-proof/`.

Validation: six focused/adjacent leaf tests, TypeScript check, production builds and native before/after lifecycle assertions.
