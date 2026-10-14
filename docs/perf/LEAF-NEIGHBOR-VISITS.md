# Avoid repeated shared-cell leaf neighbor tests

The load-time leaf-island repair indexes opaque card parts into a spatial grid. A pair can share several cells, and `neighbours` previously repeated its bounds-distance calculation and appended the same neighbor for every shared cell. The later `take` operation discarded duplicates, so those repeated checks and array entries did not contribute to connectivity.

A reusable generation-stamp array now checks each neighbor once per query, preserving first-visit order. It adds one four-byte stamp per opaque part, with no per-query Set. Generation wrap clears the stamps explicitly. No sampling, contact, move, drop or rendering rules change.

## Published-source before/after proof

Native software-WebGL loaded **0.0.18 · 421d34b**. The exact prepared live tree sources were cloned into the published and corrected repair routines, with identical default reach 0.5 m and gap 0.6 m. No rendered tree geometry was changed.

| Source | Triangles | Before bounds checks | After bounds checks |
| --- | ---: | ---: | ---: |
| Pine | 5,328 | 163,698 | 53,595 |
| Oak | 10,534 | 304,640 | 104,427 |
| Pine translated 50 m (controlled repair case) | 5,328 | 165,971 | 54,299 |

Repair counts and SHA-256 hashes of serialized values for every output attribute/index match exactly in every case. The shifted control moves three islands in both versions. The unshifted live sources move none. Receipts include build, target, source/dependency hashes and comparison results under `proofs/leaf-neighbor-visits/`.

```sh
node tools/repro-live-leaf-neighbors.mjs --url https://ael-dev3.github.io/Tervain/ --species pine --out pine.json
node tools/repro-live-leaf-neighbors.mjs --url https://ael-dev3.github.io/Tervain/ --species oak --out oak.json
node tools/repro-live-leaf-neighbors.mjs --url https://ael-dev3.github.io/Tervain/ --species pine --offset-x 50 --out shifted-pine.json
npx vitest run tests/presentation/leafIslands.test.ts
npm run typecheck
```

The fixture chooses the smallest selected near source with 100–12,000 triangles, optionally restricted by species. A changed build can select different geometry; each receipt identifies the actual target and build. The script measures counted bounds checks, not wall-clock timing, GPU cost, complete cold-load speed or floating-crown quality. Production loading can use different reach/gap settings. This is an exact-output load-time optimization; it does not establish that live16 frame stalls are gone. Tracking: #326; live reference: https://ael-dev3.github.io/Tervain/ .
