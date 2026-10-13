# Transparent card bridges hide visible detached islands

The geometric canopy audit welds source vertices without examining opacity. A card can touch wood through completely transparent texels while its visible leaf pixels sit far away. The controlled native repro shows the same masked card receiving **zero** detached candidates from the geometry-only audit and **one** after transparent texel regions are removed. Restoring the opaque bridge returns the count to zero.

`alphaCardGeometry()` is an offline diagnostic adapter: it clips each UV triangle against kept base-mip texel rectangles, interpolates their world-local positions, and feeds the existing canopy connectivity/support algorithm. It has a hard visited-cell budget and rejects nonfinite geometry, wrapping UVs, degenerate UV triangles and mismatched attributes instead of claiming partial coverage. It is not imported by ordinary gameplay and never replaces rendered tree geometry.

## Reproduce

```sh
node tools/repro-alpha-card.mjs --out alpha-card-proof
node tools/audit-pine-alpha-source.mjs --out pine-source.json
npx vitest run tests/presentation/alphaCardGeometry.test.ts tests/presentation/canopyAudit.test.ts
```

The first command starts and stops an isolated Vite fixture server and its own Chrome instance. An optional `--driver` selects a compatible CDP launcher. The fixture imports the actual diagnostic modules and Three from the repository; it is not a live world capture. Node, Chromium, Vite and Sharp are required.

Native software-WebGL [receipt](alpha-card-proof/report.json): one raw connected card becomes two opaque components; one is detached. All three audit states pass their deterministic controls. See the [masked islands](alpha-card-proof/masked-islands.png) and [restored bridge](alpha-card-proof/restored-bridge.png). This reproduces a detector false-negative, not a verified floating tree on Pages.

## Public pine source inventory

The [inventory](alpha-card-proof/pine-source.json) decodes the embedded WebP source used by the three public pine assets, respecting `EXT_texture_webp` selection. All cutouts use a 0.42 cutoff and 1024×1024 textures:

| Asset detail | Base texels below cutoff | Separate opaque primitives |
| --- | ---: | ---: |
| Near | 776,084 (74.01%) | 1 |
| Mid | 776,084 (74.01%) | 1 |
| Far | 833,912 (79.53%) | 0 |

These are whole-texture counts, not UV occupancy or visible island counts. The far asset has one MASK primitive; this explains why an adapter requiring separate wood geometry omits it (#404). A trunk painted into the billboard is not separate wood support geometry, and its absence from this audit does not prove a visibly missing trunk.

## Limits and validation

This adapter models a discrete nearest-filter base mip in UV `[0,1]`. The real source sampler uses linear magnification and linear mip filtering; runtime alpha-to-coverage, texture transforms/wrapping, opacity maps, filtering derivatives and wind remain outside the adapter. Do not call a whole-tree scan visually complete from this fixture or the source inventory. Real filtered needle-island support still needs a renderer-aware follow-up.

12 alpha/canopy tests, TypeScript and production build pass. The native controlled fixture and source inventory pass. No game shaders, assets, placements, visuals, menus or sounds change. Hardware play gate remains required.
