# Keep tangentless twig bark UVs forward at the seam

The twig generator duplicated the closing UV endpoint only when the source wood had tangent attributes. Tangentless wood still has an albedo atlas: its last face ran backward from U=2/3 of the bark interval to U=0 instead of continuing to U=1. This folds the bark mapping across that face. The normal-mapped path was addressed separately in #604.

Duplicate the closing endpoint whenever UVs exist, retaining the previous tangent-bearing behavior and three-vertex layout for geometry without UVs/tangents. Indexed positions, normals, colours and triangle counts stay unchanged; only the closing face's UV interpolation changes. The source model's attributes are preserved.

## Native receipt: 0.0.18 · 421d34b

[Report](proofs/twig-uv-seam/report.json) · [before](proofs/twig-uv-seam/before.png) · [after](proofs/twig-uv-seam/after.png) · [independent reference](proofs/twig-uv-seam/reference.png) · [no-albedo before](proofs/twig-uv-seam/noMapBefore.png) · [no-albedo after](proofs/twig-uv-seam/noMapAfter.png)

- **11 native tangentless templates**, **2,283 reversed ring seams → 0**.
- The parent reconstructs every affected published template exactly. All indexed positions, normals and colours, source attribute prefixes and triangle counts match native after the fix.
- The three tangent-bearing templates are unchanged controls, byte-for-byte against the parent.
- Macro of a native closing twig face: native vs parent **0 changed channels**; parent vs corrected reference **57,076**; candidate vs reference **0**.
- Removing the albedo map makes parent/candidate images **pixel-identical**. Native material hooks, post-rendering and a controlled white instance tint are retained.
- Matched **18 draws / 72,291 triangles** in all captures.

The reference expands the original indexed triangles and unwraps only the closing face's UV endpoints. It does not call the candidate ring generator. The macro isolates two triangles on one actual twig face; it is not a whole-tree art-quality verdict.

**Cost:** 2,283 additional seam vertices across the eleven shared templates; no additional triangles. This is a UV correctness fix, not a GPU-cost reduction.

## Reproduction

```sh
node tools/repro-live-twig-uv-seam.mjs --url https://ael-dev3.github.io/Tervain/ --out twig-uv-seam-proof
npx vitest run tests/presentation/twigTangentFrame.test.ts tests/presentation/twigBarkSearch.test.ts tests/presentation/canopy.test.ts tests/presentation/meshyTrees.test.ts --testTimeout=90000
npm run build
```

The script reconstructs wood from the published source prefixes and retained twig plans; native geometry is not modified. `--candidate-ref 772effbf1` uses the original generator as a negative control and must fail the seam/reference assertions. The focused unit regression also fails on that parent. All **25 tests**, type checking and production build pass. Hardware play-gate verification remains pending.
